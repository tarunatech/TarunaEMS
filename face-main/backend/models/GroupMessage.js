import { and, asc, count, desc, eq, isNull, lt } from 'drizzle-orm';
import db from '../db/index.js';
import { groupMessages } from '../db/schema/groupMessage.js';
import { users } from '../db/schema/user.js';

const TYPES = new Set(['text', 'system']);
const WRITABLE_FIELDS = [
  'group',
  'sender',
  'text',
  'type',
  'readBy',
  'isDeleted',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: groupMessages.id,
  _id: groupMessages.id,
  group: groupMessages.group,
  sender: groupMessages.sender,
  text: groupMessages.text,
  type: groupMessages.type,
  isDeleted: groupMessages.isDeleted,
  createdAt: groupMessages.createdAt,
  updatedAt: groupMessages.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported GroupMessage query: ${message}`);
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

const normalizeReadBy = (value = []) => {
  if (!Array.isArray(value)) unsupported('readBy must be an array');
  return value.map((entry) => ({
    ...entry,
    user: toId(entry.user),
    readAt: normalizeDate(entry.readAt || new Date()),
  }));
};

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);

  if (!partial && !normalized.group) throw new Error('Group is required');
  if (!partial && !normalized.sender) throw new Error('Sender is required');
  if (!partial && !String(normalized.text || '').trim()) throw new Error('Text is required');

  if (normalized.group !== undefined) normalized.group = toId(normalized.group);
  if (normalized.sender !== undefined) normalized.sender = toId(normalized.sender);
  if (normalized.text !== undefined) normalized.text = String(normalized.text).trim();
  if (normalized.type !== undefined && !TYPES.has(normalized.type)) unsupported(`type value "${normalized.type}"`);
  if (normalized.readBy !== undefined) normalized.readBy = normalizeReadBy(normalized.readBy);
  if (normalized.readBy === undefined && !partial) normalized.readBy = [];
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  normalized.updatedAt = new Date();

  return normalized;
};

const buildFieldCondition = (field, value) => {
  const column = columnByField[field];
  if (!column) unsupported(`unknown field "${field}"`);

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const operators = Object.keys(value);
    return and(...operators.map((operator) => {
      if (operator === '$lt') return lt(column, normalizeDate(value[operator]));
      unsupported(`operator "${operator}" on field "${field}"`);
    }));
  }

  return value === null ? isNull(column) : eq(column, value);
};

const buildWhere = (query = {}) => {
  const conditions = Object.entries(query).map(([field, value]) => buildFieldCondition(field, value));
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
    if (singlePath === 'sender' && doc.sender) {
      const [user] = await db.select().from(users).where(eq(users.id, toId(doc.sender))).limit(1);
      doc.sender = pickFields(user ? { ...user, _id: user.id } : null, select);
      continue;
    }

    unsupported(`populate path "${singlePath}"`);
  }

  return doc;
};

class GroupMessageDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      type: 'text',
      readBy: [],
      isDeleted: false,
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
      const [row] = await db.insert(groupMessages).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }

    const [row] = await db.update(groupMessages).set(values).where(eq(groupMessages.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class GroupMessageQuery {
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
    const wrap = (row) => this.asLean ? serialize(row) : new GroupMessageDocument(row);
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

function GroupMessage(data) {
  return new GroupMessageDocument(data, { isNew: true });
}

GroupMessage.find = (query = {}) => new GroupMessageQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(groupMessages);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

GroupMessage.findOne = (query = {}) => new GroupMessageQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(groupMessages);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

GroupMessage.findById = (id) => new GroupMessageQuery(async () => {
  const rows = await db.select().from(groupMessages).where(eq(groupMessages.id, id)).limit(1);
  return rows[0] || null;
});

GroupMessage.create = async (data) => new GroupMessageDocument(data, { isNew: true }).save();

GroupMessage.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(groupMessages);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default GroupMessage;
