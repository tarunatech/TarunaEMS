import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { and, asc, count, desc, eq, gt, gte, inArray, isNotNull, lt, lte, ne, notInArray, or, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { users } from '../db/schema/user.js';

const hiddenFields = new Set([
  'password',
  'resetPasswordToken',
  'resetPasswordExpire',
  'emailVerificationToken',
  'emailVerificationExpire',
  'loginAttempts',
  'lockUntil',
]);

// Fields that are safe to write back to Postgres via .set()/.values().
// Anything not in this list (e.g. internal helper props like __includePassword)
// is stripped before it ever reaches Drizzle.
const WRITABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'password',
  'role',
  'employeeId',
  'isActive',
  'profileImage',
  'lastLogin',
  'loginAttempts',
  'lockUntil',
  'resetPasswordToken',
  'resetPasswordExpire',
  'emailVerified',
  'emailVerificationToken',
  'emailVerificationExpire',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: users.id,
  _id: users.id,
  name: users.name,
  email: users.email,
  phone: users.phone,
  password: users.password,
  role: users.role,
  employeeId: users.employeeId,
  isActive: users.isActive,
  profileImage: users.profileImage,
  lastLogin: users.lastLogin,
  loginAttempts: users.loginAttempts,
  lockUntil: users.lockUntil,
  resetPasswordToken: users.resetPasswordToken,
  resetPasswordExpire: users.resetPasswordExpire,
  emailVerified: users.emailVerified,
  emailVerificationToken: users.emailVerificationToken,
  emailVerificationExpire: users.emailVerificationExpire,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

// Only pulls whitelisted, writable fields out of arbitrary input (including
// UserDocument instances, which carry extra internal props like __includePassword).
const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const normalizeUserInput = (data = {}, { hashPassword = false } = {}) => {
  const normalized = pickWritable(data);

  if (normalized.email) normalized.email = normalized.email.toLowerCase();
  if (normalized.employeeId) normalized.employeeId = normalized.employeeId.toUpperCase();
  if (normalized.lockUntil !== undefined) normalized.lockUntil = normalizeDate(normalized.lockUntil);
  if (normalized.lastLogin !== undefined) normalized.lastLogin = normalizeDate(normalized.lastLogin);
  if (normalized.resetPasswordExpire !== undefined) normalized.resetPasswordExpire = normalizeDate(normalized.resetPasswordExpire);
  if (normalized.emailVerificationExpire !== undefined) normalized.emailVerificationExpire = normalizeDate(normalized.emailVerificationExpire);
  if (hashPassword && normalized.password) normalized.password = bcrypt.hashSync(normalized.password, bcrypt.genSaltSync(10));

  normalized.updatedAt = new Date();
  return normalized;
};

// Supported Mongo-style operators. Anything outside this list throws instead
// of being silently dropped — a dropped condition means a query silently
// returns MORE rows than intended, which is a correctness/security bug
// waiting to happen. Fail loud instead.
const buildWhere = (query = {}) => {
  const conditions = [];

  for (const [key, value] of Object.entries(query)) {
    if (key === '$or' && Array.isArray(value)) {
      conditions.push(or(...value.map(buildWhere)));
      continue;
    }
    if (key === '$and' && Array.isArray(value)) {
      conditions.push(and(...value.map(buildWhere)));
      continue;
    }

    const column = columnByField[key];
    if (!column) {
      throw new Error(`buildWhere: unknown query field "${key}" — add it to columnByField before using it`);
    }

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      const opKeys = Object.keys(value);
      for (const op of opKeys) {
        switch (op) {
          case '$in':
            conditions.push(inArray(column, value.$in));
            break;
          case '$nin':
            conditions.push(notInArray(column, value.$nin));
            break;
          case '$gt':
            conditions.push(gt(column, normalizeDate(value.$gt)));
            break;
          case '$gte':
            conditions.push(gte(column, normalizeDate(value.$gte)));
            break;
          case '$lt':
            conditions.push(lt(column, normalizeDate(value.$lt)));
            break;
          case '$lte':
            conditions.push(lte(column, normalizeDate(value.$lte)));
            break;
          case '$ne':
            conditions.push(ne(column, value.$ne));
            break;
          case '$exists':
            conditions.push(value.$exists ? isNotNull(column) : sql`${column} IS NULL`);
            break;
          default:
            throw new Error(`buildWhere: unsupported operator "${op}" on field "${key}" — add support before using it`);
        }
      }
      continue;
    }

    conditions.push(eq(column, value));
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

const sanitize = (row, includePassword = false) => {
  if (!row) return null;
  const json = { ...row, _id: row.id };

  if (!includePassword) {
    for (const field of hiddenFields) delete json[field];
  }

  return json;
};

const assignRow = (target, row, extra = {}) => {
  const { id, ...rest } = row;
  Object.assign(target, rest, { _id: id }, extra);
};

class UserDocument {
  constructor(row, options = {}) {
    assignRow(this, row);
    this.__includePassword = options.includePassword ?? Boolean(row.password);
  }

  get id() {
    return this._id;
  }

  get isLocked() {
    return !!(this.lockUntil && this.lockUntil > new Date());
  }

  async save() {
    // NOTE ON BEHAVIOR CHANGE FROM THE ORIGINAL MODEL:
    // The original pre('save') hook was missing a `return` before `next()`,
    // so the password got re-hashed on every save() call —
    // including calls from handleFailedLogin()/updateLastLogin()/unlockAccount()
    // that never touch the password field.
    // This version only re-hashes when the password actually changed, which is
    // the intended behavior but IS a behavior change from the buggy original.
    // Confirm this is acceptable before deploying — test login after several
    // failed attempts followed by a successful one.
    const current = await User.findById(this._id).select('+password');
    const passwordChanged = current?.password !== this.password;
    const values = normalizeUserInput(this, { hashPassword: passwordChanged });

    const [row] = await db
      .update(users)
      .set(values)
      .where(eq(users.id, this._id))
      .returning();

    assignRow(this, row, { __includePassword: true });
    return this;
  }

  getSignedJwtToken() {
    return jwt.sign(
      {
        id: this._id,
        role: this.role,
        email: this.email,
        employeeId: this.employeeId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '30d',
      },
    );
  }

  async matchPassword(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
  }

  getResetPasswordToken() {
    const resetToken = crypto.randomBytes(20).toString('hex');

    this.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
    return resetToken;
  }

  async handleFailedLogin() {
    this.loginAttempts = (this.loginAttempts || 0) + 1;

    const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 10;
    const lockTimeMinutes = parseInt(process.env.LOCK_TIME_MINUTES) || 10;

    if (this.loginAttempts >= maxAttempts) {
      this.lockUntil = new Date(Date.now() + lockTimeMinutes * 60 * 1000);
    }

    await this.save();
  }

  async updateLastLogin() {
    this.lastLogin = new Date();
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }

  async unlockAccount() {
    this.loginAttempts = 0;
    this.lockUntil = null;
    await this.save();
  }

  toObject() {
    return sanitize(this, this.__includePassword);
  }

  toJSON() {
    return sanitize(this, false);
  }
}

class UserQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.includePassword = options.includePassword || false;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
  }

  // Handles the select patterns actually used in this codebase.
  // Grep confirmed only '+password' / '-password' / { password: 0/1 } forms
  // are used anywhere User.find/findOne is called — extend this if a new
  // pattern shows up.
  select(selection = '') {
    if (typeof selection === 'string') {
      if (selection.includes('+password')) this.includePassword = true;
      if (selection.includes('-password')) this.includePassword = false;
    } else if (selection && typeof selection === 'object') {
      if (selection.password === 1) this.includePassword = true;
      if (selection.password === 0) this.includePassword = false;
    }
    return this;
  }

  sort(sortSpec) {
    this.sortSpec = sortSpec;
    return this;
  }

  limit(value) {
    this.limitValue = Number(value);
    return this;
  }

  skip(value) {
    this.skipValue = Number(value);
    return this;
  }

  lean() {
    this.asLean = true;
    return this;
  }

  async exec() {
    const result = await this.executor({
      sortSpec: this.sortSpec,
      limitValue: this.limitValue,
      skipValue: this.skipValue,
    });

    const wrap = (row) => {
      if (!row) return null;
      if (this.asLean) return sanitize(row, this.includePassword);
      return new UserDocument(row, { includePassword: this.includePassword });
    };

    return this.many ? result.map(wrap) : wrap(result);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const applyQueryOptions = (builder, { sortSpec, limitValue, skipValue }) => {
  let query = builder;

  if (sortSpec) {
    const [[field, direction]] = Object.entries(sortSpec);
    const column = columnByField[field];
    if (column) query = query.orderBy(direction === -1 ? desc(column) : asc(column));
  }

  if (limitValue) query = query.limit(limitValue);
  if (skipValue) query = query.offset(skipValue);

  return query;
};

const generateEmployeeId = async () => {
  const [lastEmployee] = await db
    .select()
    .from(users)
    .where(and(eq(users.role, 'employee'), isNotNull(users.employeeId)))
    .orderBy(desc(users.employeeId))
    .limit(1);

  if (!lastEmployee?.employeeId) return 'EMP001';

  const lastNumber = parseInt(lastEmployee.employeeId.replace(/\D/g, ''), 10) || 0;
  return `EMP${(lastNumber + 1).toString().padStart(3, '0')}`;
};

const User = {
  findOne(query = {}, projection = {}, options = {}) {
    return new UserQuery(async () => {
      const where = buildWhere(query);
      let builder = db.select().from(users);
      if (where) builder = builder.where(where);
      builder = applyQueryOptions(builder, { sortSpec: options.sort });
      const rows = await builder.limit(1);
      return rows[0] || null;
    });
  },

  findById(id) {
    return new UserQuery(async () => {
      const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return rows[0] || null;
    });
  },

  find(query = {}) {
    return new UserQuery(
      async (options) => {
        const where = buildWhere(query);
        let builder = db.select().from(users);
        if (where) builder = builder.where(where);
        builder = applyQueryOptions(builder, options);
        return builder;
      },
      { many: true },
    );
  },

  async create(data) {
    const values = normalizeUserInput(data, { hashPassword: true });
    if (values.role === 'employee' && !values.employeeId) {
      values.employeeId = await generateEmployeeId();
    }
    values.createdAt = new Date();

    const [row] = await db.insert(users).values(values).returning();
    return new UserDocument(row, { includePassword: true });
  },

  async countDocuments(query = {}) {
    const where = buildWhere(query);
    let builder = db.select({ value: count() }).from(users);
    if (where) builder = builder.where(where);
    const [row] = await builder;
    return Number(row?.value || 0);
  },

  async findByIdAndUpdate(id, data) {
    const [row] = await db
      .update(users)
      .set(normalizeUserInput(data))
      .where(eq(users.id, id))
      .returning();
    return row ? new UserDocument(row) : null;
  },

  async findByIdAndDelete(id) {
    const [row] = await db.delete(users).where(eq(users.id, id)).returning();
    return row ? new UserDocument(row) : null;
  },

  async findByCredentials(email, password) {
    const user = await User.findOne({
      email: email.toLowerCase(),
      isActive: true,
    }).select('+password');

    if (!user) throw new Error('Invalid credentials');
    if (user.isLocked) throw new Error('Account temporarily locked due to too many failed login attempts');

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await user.handleFailedLogin();
      throw new Error('Invalid credentials');
    }

    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    return user;
  },

  // Rewritten to compute stats in a single SQL aggregate query instead of
  // loading the entire users table into memory and counting in JS. The old
  // approach works fine at low row counts but degrades linearly as the table
  // grows — this scales the same way the original Mongo $group aggregation did.
  async getStats() {
    const [row] = await db
      .select({
        totalUsers: count(),
        activeUsers: count(sql`CASE WHEN ${users.isActive} THEN 1 END`),
        inactiveUsers: count(sql`CASE WHEN ${users.isActive} = false THEN 1 END`),
        admins: count(sql`CASE WHEN ${users.role} = 'admin' THEN 1 END`),
        employees: count(sql`CASE WHEN ${users.role} = 'employee' THEN 1 END`),
      })
      .from(users);

    return (
      row || {
        totalUsers: 0,
        activeUsers: 0,
        inactiveUsers: 0,
        admins: 0,
        employees: 0,
      }
    );
  },

  async createIndexes() {
    return undefined;
  },
};

export default User;
