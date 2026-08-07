// models/FaceData.js
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import db from '../db/index.js';
import { faceData } from '../db/schema/faceData.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';

const WRITABLE_FIELDS = [
  'employee',
  'user',
  'faceDescriptor',
  'landmarks',
  'faceImageUrl',
  'confidence',
  'isActive',
  'registrationDate',
  'lastUpdated',
  'metadata',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: faceData.id,
  _id: faceData.id,
  employee: faceData.employee,
  user: faceData.user,
  faceImageUrl: faceData.faceImageUrl,
  confidence: faceData.confidence,
  isActive: faceData.isActive,
  registrationDate: faceData.registrationDate,
  lastUpdated: faceData.lastUpdated,
  createdAt: faceData.createdAt,
  updatedAt: faceData.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported FaceData query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const toId = (value) => {
  if (!value) return value;
  if (typeof value === 'object') return value.id || value._id;
  return value;
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const pickWritable = (data = {}) => Object.fromEntries(
  WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]),
);

const normalizeFaceDescriptor = (value) => {
  if (!Array.isArray(value)) throw new Error('Face descriptor must be an array');
  if (value.length !== 128) throw new Error('Face descriptor must be exactly 128 dimensions (face-api.js)');
  return value.map((entry) => {
    const number = Number(entry);
    if (!Number.isFinite(number)) throw new Error('Face descriptor must contain only numbers');
    return number;
  });
};

const normalizeLandmarks = (value = []) => {
  if (!Array.isArray(value)) unsupported('landmarks must be an array');
  return value.map((point) => {
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Landmarks require numeric x and y values');
    }
    return { x, y };
  });
};

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);

  if (!partial && !normalized.employee) throw new Error('Employee is required');
  if (!partial && !normalized.user) throw new Error('User is required');
  if (!partial && normalized.faceDescriptor === undefined) throw new Error('Face descriptor is required');
  if (!partial && !String(normalized.faceImageUrl ?? '').trim()) throw new Error('Face image URL is required');

  if (normalized.employee !== undefined) normalized.employee = toId(normalized.employee);
  if (normalized.user !== undefined) normalized.user = toId(normalized.user);
  if (normalized.faceDescriptor !== undefined) normalized.faceDescriptor = normalizeFaceDescriptor(normalized.faceDescriptor);
  if (normalized.landmarks !== undefined) normalized.landmarks = normalizeLandmarks(normalized.landmarks);
  if (normalized.faceImageUrl !== undefined) normalized.faceImageUrl = String(normalized.faceImageUrl);
  if (normalized.confidence !== undefined) {
    normalized.confidence = Number(normalized.confidence);
    if (normalized.confidence < 0 || normalized.confidence > 100) throw new Error('Confidence must be between 0 and 100');
  }
  if (normalized.landmarks === undefined && !partial) normalized.landmarks = [];
  if (normalized.metadata === undefined && !partial) normalized.metadata = {};
  if (normalized.registrationDate !== undefined) normalized.registrationDate = normalizeDate(normalized.registrationDate);
  if (normalized.lastUpdated !== undefined) normalized.lastUpdated = normalizeDate(normalized.lastUpdated);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  if (normalized.registrationDate === undefined && !partial) normalized.registrationDate = new Date();
  normalized.lastUpdated = normalized.lastUpdated || new Date();
  normalized.updatedAt = new Date();

  return normalized;
};

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);
    conditions.push(value === null ? isNull(column) : eq(column, toId(value)));
  }
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

const serialize = (row) => row ? { ...row, _id: row.id } : null;

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const fields = selection.split(/\s+/).filter(Boolean);
  if (fields.length === 0) return obj;
  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };
  for (const field of fields) {
    const value = getNested(obj, field);
    if (value === undefined) continue;
    const parts = field.split('.');
    let target = picked;
    for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] = target[parts[i]] || {};
    target[parts[parts.length - 1]] = value;
  }
  return picked;
};

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  const paths = String(path).split(/\s+/).filter(Boolean);
  for (const singlePath of paths) {
    if (singlePath === 'employee' && doc.employee) {
      const [employee] = await db.select().from(employees).where(eq(employees.id, toId(doc.employee))).limit(1);
      doc.employee = pickFields(employee ? { ...employee, _id: employee.id } : null, select);
      continue;
    }
    if (singlePath === 'user' && doc.user) {
      const [user] = await db.select().from(users).where(eq(users.id, toId(doc.user))).limit(1);
      doc.user = pickFields(user ? { ...user, _id: user.id } : null, select);
      continue;
    }
    unsupported(`populate path "${singlePath}"`);
  }
  return doc;
};

class FaceDataDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      landmarks: [],
      confidence: 0,
      isActive: true,
      metadata: {},
    }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async populate(path, select) {
    await populateOne(this, path, select);
    return this;
  }

  async save() {
    const values = normalizeInput(this, { partial: !this.__isNew });
    if (this.__isNew) {
      const [row] = await db.insert(faceData).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }

    const [row] = await db.update(faceData).set(values).where(eq(faceData.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  async updateDescriptor(newDescriptor, confidence = 0) {
    this.faceDescriptor = newDescriptor;
    this.confidence = confidence;
    this.lastUpdated = new Date();
    return this.save();
  }

  async deactivate() {
    this.isActive = false;
    this.lastUpdated = new Date();
    return this.save();
  }

  async deleteOne() {
    await db.delete(faceData).where(eq(faceData.id, this._id));
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class FaceDataQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.populateSpecs = [];
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.asLean = false;
  }

  populate(path, select) { this.populateSpecs.push({ path, select }); return this; }
  sort(sortSpec) { this.sortSpec = sortSpec; return this; }
  limit(value) { this.limitValue = Number(value); return this; }
  skip(value) { this.skipValue = Number(value); return this; }
  select() { return this; }
  lean() { this.asLean = true; return this; }

  async exec() {
    const result = await this.executor({
      sortSpec: this.sortSpec,
      limitValue: this.limitValue,
      skipValue: this.skipValue,
    });
    const wrap = (row) => this.asLean ? serialize(row) : new FaceDataDocument(row);
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];
    for (const doc of docs) for (const spec of this.populateSpecs) await populateOne(doc, spec.path, spec.select);
    return wrapped;
  }

  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
}

const applyQueryOptions = (builder, { sortSpec, limitValue, skipValue }) => {
  let query = builder;
  if (sortSpec) {
    query = query.orderBy(...Object.entries(sortSpec).map(([field, direction]) => {
      const column = columnByField[field];
      if (!column) unsupported(`sort field "${field}"`);
      return direction === -1 ? desc(column) : asc(column);
    }));
  }
  if (skipValue) query = query.offset(skipValue);
  if (limitValue) query = query.limit(limitValue);
  return query;
};

function FaceData(data) {
  return new FaceDataDocument(data, { isNew: true });
}

FaceData.find = (query = {}) => new FaceDataQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(faceData);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

FaceData.findOne = (query = {}) => new FaceDataQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(faceData);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

FaceData.findById = (id) => new FaceDataQuery(async () => {
  const rows = await db.select().from(faceData).where(eq(faceData.id, id)).limit(1);
  return rows[0] || null;
});

FaceData.create = async (data) => new FaceDataDocument(data, { isNew: true }).save();

FaceData.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(faceData);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

FaceData.findByEmployee = (employeeId) => FaceData.findOne({ employee: employeeId, isActive: true })
  .populate('employee', 'personalInfo workInfo')
  .populate('user', 'name email employeeId');

FaceData.findByUser = (userId) => FaceData.findOne({ user: userId, isActive: true })
  .populate('employee', 'personalInfo workInfo')
  .populate('user', 'name email employeeId');

export default FaceData;
