import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, ne, or } from 'drizzle-orm';
import db from '../db/index.js';
import { leaves } from '../db/schema/leave.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';

const LEAVE_TYPES = new Set(['casual', 'sick', 'earned', 'maternity', 'paternity', 'emergency', 'personal']);
const LEAVE_STATUSES = new Set(['Pending', 'Approved', 'Rejected', 'Cancelled']);
const HALF_DAY_SESSIONS = new Set(['Morning', 'Evening']);
const PRIORITIES = new Set(['Low', 'Medium', 'High', 'Emergency']);

const WRITABLE_FIELDS = [
  'employee',
  'user',
  'leaveType',
  'startDate',
  'endDate',
  'totalDays',
  'reason',
  'status',
  'appliedDate',
  'actionDate',
  'actionBy',
  'approverComments',
  'attachment',
  'isHalfDay',
  'halfDaySession',
  'contactDuringLeave',
  'workHandover',
  'priority',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: leaves.id,
  _id: leaves.id,
  employee: leaves.employee,
  user: leaves.user,
  leaveType: leaves.leaveType,
  startDate: leaves.startDate,
  endDate: leaves.endDate,
  totalDays: leaves.totalDays,
  reason: leaves.reason,
  status: leaves.status,
  appliedDate: leaves.appliedDate,
  actionDate: leaves.actionDate,
  actionBy: leaves.actionBy,
  isHalfDay: leaves.isHalfDay,
  halfDaySession: leaves.halfDaySession,
  priority: leaves.priority,
  createdAt: leaves.createdAt,
  updatedAt: leaves.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Leave query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => {
  if (Array.isArray(acc)) return acc.map((item) => item?.[key]);
  return acc?.[key];
}, obj);

const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const calculateTotalDays = (startDate, endDate, isHalfDay) => {
  if (!startDate || !endDate) return undefined;
  if (isHalfDay) return 0.5;
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const diffTime = Math.abs(end - start);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

const normalizeInput = (data = {}, existing = null) => {
  const normalized = pickWritable(data);

  const normalizeRef = (value) => {
    if (!value || typeof value !== 'object') return value;
    return value.id || value._id;
  };

  if (normalized.employee !== undefined) normalized.employee = normalizeRef(normalized.employee);
  if (normalized.user !== undefined) normalized.user = normalizeRef(normalized.user);
  if (normalized.actionBy !== undefined) normalized.actionBy = normalizeRef(normalized.actionBy);

  if (normalized.startDate !== undefined) normalized.startDate = normalizeDate(normalized.startDate);
  if (normalized.endDate !== undefined) normalized.endDate = normalizeDate(normalized.endDate);
  if (normalized.appliedDate !== undefined) normalized.appliedDate = normalizeDate(normalized.appliedDate);
  if (normalized.actionDate !== undefined) normalized.actionDate = normalizeDate(normalized.actionDate);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);

  if (normalized.reason !== undefined) {
    normalized.reason = String(normalized.reason).trim();
    if (!normalized.reason) throw new Error('Reason is required');
    if (normalized.reason.length > 500) throw new Error('Reason cannot exceed 500 characters');
  }

  if (normalized.approverComments !== undefined && normalized.approverComments !== null) {
    normalized.approverComments = String(normalized.approverComments).trim();
    if (normalized.approverComments.length > 300) throw new Error('Comments cannot exceed 300 characters');
  }

  if (normalized.leaveType !== undefined && !LEAVE_TYPES.has(normalized.leaveType)) {
    throw new Error(`Leave type must be one of: ${Array.from(LEAVE_TYPES).join(', ')}`);
  }
  if (normalized.status !== undefined && !LEAVE_STATUSES.has(normalized.status)) {
    throw new Error(`Leave status must be one of: ${Array.from(LEAVE_STATUSES).join(', ')}`);
  }
  if (normalized.halfDaySession !== undefined && normalized.halfDaySession !== null && !HALF_DAY_SESSIONS.has(normalized.halfDaySession)) {
    throw new Error(`Half day session must be one of: ${Array.from(HALF_DAY_SESSIONS).join(', ')}`);
  }
  if (normalized.priority !== undefined && !PRIORITIES.has(normalized.priority)) {
    throw new Error(`Leave priority must be one of: ${Array.from(PRIORITIES).join(', ')}`);
  }

  const nextStart = normalized.startDate ?? existing?.startDate;
  const nextEnd = normalized.endDate ?? existing?.endDate;
  const nextIsHalfDay = normalized.isHalfDay ?? existing?.isHalfDay;
  if (nextStart && nextEnd && (normalized.startDate !== undefined || normalized.endDate !== undefined || normalized.isHalfDay !== undefined)) {
    normalized.totalDays = calculateTotalDays(nextStart, nextEnd, nextIsHalfDay);
  }

  if ((normalized.isHalfDay ?? existing?.isHalfDay) && !((normalized.halfDaySession ?? existing?.halfDaySession))) {
    throw new Error('Half day session is required');
  }

  if (normalized.status !== undefined && existing && normalized.status !== existing.status && normalized.status !== 'Pending') {
    normalized.actionDate = normalized.actionDate || new Date();
  }

  normalized.updatedAt = new Date();
  return normalized;
};

const serialize = (row) => {
  if (!row) return null;
  const totalDays = row.totalDays === null || row.totalDays === undefined ? row.totalDays : Number(row.totalDays);
  const serialized = {
    ...row,
    totalDays,
    _id: row.id,
  };
  serialized.duration = serialized.isHalfDay
    ? `0.5 day (${serialized.halfDaySession})`
    : `${serialized.totalDays} ${serialized.totalDays === 1 ? 'day' : 'days'}`;
  serialized.statusColor = {
    Pending: 'yellow',
    Approved: 'green',
    Rejected: 'red',
    Cancelled: 'gray',
  }[serialized.status] || 'gray';
  return serialized;
};

const buildWhere = (query = {}) => {
  const conditions = [];

  for (const [field, value] of Object.entries(query)) {
    if (field === '$or') {
      if (!Array.isArray(value)) unsupported('$or must be an array');
      conditions.push(or(...value.map(buildWhere)));
      continue;
    }

    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
        else if (op === '$in') conditions.push(inArray(column, operand));
        else if (op === '$ne') conditions.push(ne(column, operand));
        else unsupported(`operator "${op}" on field "${field}"`);
      }
      continue;
    }

    conditions.push(value === null ? isNull(column) : eq(column, value));
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

const matchRow = (row, query = {}) => {
  for (const [field, expected] of Object.entries(query)) {
    if (field === '$or') {
      if (!Array.isArray(expected)) unsupported('$or must be an array');
      if (!expected.some((condition) => matchRow(row, condition))) return false;
      continue;
    }

    const actual = field.includes('.') ? getNested(row, field) : row[field];
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      for (const [op, value] of Object.entries(expected)) {
        if (op === '$gte') {
          if (!(new Date(actual) >= value)) return false;
        } else if (op === '$lte') {
          if (!(new Date(actual) <= value)) return false;
        } else if (op === '$lt') {
          if (!(new Date(actual) < value)) return false;
        } else if (op === '$in') {
          if (!value.includes(actual)) return false;
        } else if (op === '$ne') {
          if (actual === value) return false;
        } else {
          unsupported(`aggregate match operator "${op}" on field "${field}"`);
        }
      }
      continue;
    }
    if (actual !== expected) return false;
  }
  return true;
};

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const fields = selection.split(/\s+/).filter(Boolean);
  if (fields.length === 0) return obj;
  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };

  for (const field of fields) {
    if (obj[field] !== undefined) picked[field] = obj[field];
  }

  return picked;
};

const loadUser = async (id, select) => {
  if (!id) return null;
  const userId = typeof id === 'object' ? id.id || id._id : id;
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return pickFields(row ? { ...row, _id: row.id } : null, select);
};

const loadEmployee = async (id, select) => {
  if (!id) return null;
  const employeeId = typeof id === 'object' ? id.id || id._id : id;
  const [row] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  const employee = row ? { ...row, _id: row.id } : null;
  return pickFields(employee, select);
};

const populateOne = async (doc, spec) => {
  if (!doc) return doc;
  const path = spec.path || spec;

  if (path === 'employee' && doc.employee) {
    doc.employee = await loadEmployee(doc.employee, spec.select);
    if (spec.populate && doc.employee) {
      const nested = Array.isArray(spec.populate) ? spec.populate : [spec.populate];
      for (const nestedSpec of nested) {
        if (nestedSpec.path === 'user') doc.employee.user = await loadUser(doc.employee.user, nestedSpec.select);
        else unsupported(`nested populate path "employee.${nestedSpec.path}"`);
      }
    }
    return doc;
  }

  if (path === 'user' || path === 'actionBy') {
    doc[path] = doc[path] ? await loadUser(doc[path], spec.select) : null;
    return doc;
  }

  unsupported(`populate path "${path}"`);
};

class LeaveDocument {
  constructor(row = {}, options = {}) {
    const defaults = {
      status: 'Pending',
      appliedDate: new Date(),
      isHalfDay: false,
      priority: 'Medium',
    };
    Object.assign(this, defaults, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
    this.__original = serialize(row);
  }

  async populate(spec, select) {
    if (Array.isArray(spec)) {
      for (const item of spec) await populateOne(this, item);
      return this;
    }
    await populateOne(this, { path: spec, select });
    return this;
  }

  async save() {
    const existing = this.__isNew ? null : this.__original;
    const values = normalizeInput(this, existing);

    if (this.__isNew) {
      values.createdAt = new Date();
      if (values.appliedDate === undefined) values.appliedDate = new Date();
      const [row] = await db.insert(leaves).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
      return this;
    }

    const [row] = await db.update(leaves).set(values).where(eq(leaves.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
    return this;
  }

  async approve(approver, comments = '') {
    this.status = 'Approved';
    this.actionBy = approver._id;
    this.actionDate = new Date();
    this.approverComments = comments;
    return this.save();
  }

  async reject(approver, comments = '') {
    this.status = 'Rejected';
    this.actionBy = approver._id;
    this.actionDate = new Date();
    this.approverComments = comments;
    return this.save();
  }

  async cancel() {
    if (this.status === 'Pending') {
      this.status = 'Cancelled';
      this.actionDate = new Date();
      return this.save();
    }
    throw new Error('Only pending leaves can be cancelled');
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class LeaveQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.populateSpecs = [];
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.asLean = false;
  }

  populate(path, select) {
    if (Array.isArray(path)) this.populateSpecs.push(...path);
    else this.populateSpecs.push({ path, select });
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
    const wrap = (row) => (this.asLean ? serialize(row) : new LeaveDocument(row));
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];

    for (const doc of docs) {
      for (const spec of this.populateSpecs) await populateOne(doc, spec);
    }

    return wrapped;
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
    for (const [field, direction] of Object.entries(sortSpec)) {
      const column = columnByField[field];
      if (!column) unsupported(`sort field "${field}"`);
      query = query.orderBy(direction === -1 ? desc(column) : asc(column));
      break;
    }
  }
  if (skipValue) query = query.offset(skipValue);
  if (limitValue) query = query.limit(limitValue);
  return query;
};

function Leave(data) {
  return new LeaveDocument(data, { isNew: true });
}

Leave.find = (query = {}) =>
  new LeaveQuery(
    async (options) => {
      const where = buildWhere(query);
      let builder = db.select().from(leaves);
      if (where) builder = builder.where(where);
      builder = applyQueryOptions(builder, options);
      return builder;
    },
    { many: true },
  );

Leave.findOne = (query = {}) =>
  new LeaveQuery(async (options) => {
    const where = buildWhere(query);
    let builder = db.select().from(leaves);
    if (where) builder = builder.where(where);
    builder = applyQueryOptions(builder, { ...options, limitValue: 1 });
    const rows = await builder;
    return rows[0] || null;
  });

Leave.findById = (id) =>
  new LeaveQuery(async () => {
    const rows = await db.select().from(leaves).where(eq(leaves.id, id)).limit(1);
    return rows[0] || null;
  });

Leave.create = async (data) => {
  const doc = new LeaveDocument(data, { isNew: true });
  return doc.save();
};

Leave.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(leaves);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Leave.aggregate = async (pipeline = []) => {
  let rows = (await db.select().from(leaves)).map(serialize);

  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matchRow(row, stage.$match));
    else if (stage.$sort) {
      const entries = Object.entries(stage.$sort);
      rows = [...rows].sort((a, b) => {
        for (const [field, direction] of entries) {
          const av = getNested(a, field);
          const bv = getNested(b, field);
          if (av === bv) continue;
          return av > bv ? direction : -direction;
        }
        return 0;
      });
    } else if (stage.$skip !== undefined) rows = rows.slice(stage.$skip);
    else if (stage.$limit !== undefined) rows = rows.slice(0, stage.$limit);
    else if (stage.$count) rows = [{ [stage.$count]: rows.length }];
    else if (stage.$group) {
      const groupId = stage.$group._id;
      const grouped = new Map();
      for (const row of rows) {
        const key = typeof groupId === 'string' && groupId.startsWith('$') ? getNested(row, groupId.slice(1)) : groupId;
        const acc = grouped.get(key) || [];
        acc.push(row);
        grouped.set(key, acc);
      }
      rows = Array.from(grouped.entries()).map(([key, groupRows]) => {
        const result = { _id: key };
        for (const [field, expression] of Object.entries(stage.$group)) {
          if (field === '_id') continue;
          if (expression.$sum === 1) result[field] = groupRows.length;
          else if (typeof expression.$sum === 'string' && expression.$sum.startsWith('$')) {
            const sumField = expression.$sum.slice(1);
            result[field] = groupRows.reduce((sum, row) => sum + Number(getNested(row, sumField) || 0), 0);
          } else unsupported(`aggregate group accumulator "${field}"`);
        }
        return result;
      });
    } else unsupported(`aggregate stage "${Object.keys(stage)[0]}"`);
  }

  return rows;
};

Leave.getLeaveStats = async (employeeId, year = new Date().getFullYear()) => {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  return Leave.aggregate([
    {
      $match: {
        employee: employeeId,
        status: 'Approved',
        startDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: '$leaveType',
        totalDays: { $sum: '$totalDays' },
        count: { $sum: 1 },
      },
    },
  ]);
};

Leave.checkConflicts = async (employeeId, startDate, endDate, excludeId = null) => {
  const query = {
    employee: employeeId,
    status: { $in: ['Pending', 'Approved'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
      },
    ],
  };

  if (excludeId) query._id = { $ne: excludeId };
  return Leave.find(query);
};

export default Leave;
