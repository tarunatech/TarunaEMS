// backend/models/Problem.js
import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import db from '../db/index.js';
import { problems } from '../db/schema/problem.js';
import { users } from '../db/schema/user.js';

const STATUSES = new Set(['Pending', 'Solved']);
const WRITABLE_FIELDS = ['description', 'reportedBy', 'solvedBy', 'status', 'solvedAt', 'createdAt'];

const columnByField = {
  id: problems.id,
  _id: problems.id,
  description: problems.description,
  reportedBy: problems.reportedBy,
  solvedBy: problems.solvedBy,
  status: problems.status,
  solvedAt: problems.solvedAt,
  createdAt: problems.createdAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Problem query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const pickWritable = (data = {}) => Object.fromEntries(
  WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]),
);

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);

  if (!partial && !String(normalized.description || '').trim()) {
    throw new Error('Description is required');
  }
  if (!partial && !normalized.reportedBy) throw new Error('Reported by is required');

  if (normalized.description !== undefined) normalized.description = String(normalized.description).trim();
  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) unsupported(`status value "${normalized.status}"`);
  if (normalized.solvedAt !== undefined) normalized.solvedAt = normalizeDate(normalized.solvedAt);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  return normalized;
};

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);
    conditions.push(value === null ? isNull(column) : eq(column, value));
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
    if ((singlePath === 'reportedBy' || singlePath === 'solvedBy') && doc[singlePath]) {
      const userId = typeof doc[singlePath] === 'object' ? doc[singlePath].id || doc[singlePath]._id : doc[singlePath];
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      doc[singlePath] = pickFields(user ? { ...user, _id: user.id } : null, select);
    } else if (singlePath === 'solvedBy' && !doc[singlePath]) {
      doc[singlePath] = null;
    } else {
      unsupported(`populate path "${singlePath}"`);
    }
  }
  return doc;
};

class ProblemDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { status: 'Pending' }, serialize(row));
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
      values.createdAt = new Date();
      const [row] = await db.insert(problems).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }
    const [row] = await db.update(problems).set(values).where(eq(problems.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class ProblemQuery {
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
  lean() { this.asLean = true; return this; }
  async exec() {
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => this.asLean ? serialize(row) : new ProblemDocument(row);
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

function Problem(data) {
  return new ProblemDocument(data, { isNew: true });
}

Problem.find = (query = {}) => new ProblemQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(problems);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Problem.findOne = (query = {}) => new ProblemQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(problems);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Problem.findById = (id) => new ProblemQuery(async () => {
  const rows = await db.select().from(problems).where(eq(problems.id, id)).limit(1);
  return rows[0] || null;
});

Problem.create = async (data) => new ProblemDocument(data, { isNew: true }).save();

Problem.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(problems);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default Problem;
