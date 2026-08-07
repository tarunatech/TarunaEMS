// backend/models/Message.js
import { and, asc, count, desc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import db from '../db/index.js';
import { messages } from '../db/schema/message.js';
import { users } from '../db/schema/user.js';

const WRITABLE_FIELDS = ['from', 'to', 'text', 'timestamp', 'fromBot', 'createdAt', 'updatedAt'];

const columnByField = {
  id: messages.id,
  _id: messages.id,
  from: messages.from,
  to: messages.to,
  text: messages.text,
  timestamp: messages.timestamp,
  fromBot: messages.fromBot,
  createdAt: messages.createdAt,
  updatedAt: messages.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Message query: ${message}`);
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

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);

  if (!partial && !normalized.to) throw new Error('To is required');
  if (!partial && !String(normalized.text || '').trim()) throw new Error('Text is required');

  if (normalized.from !== undefined) normalized.from = normalized.from === null ? null : toId(normalized.from);
  if (normalized.to !== undefined) normalized.to = toId(normalized.to);
  if (normalized.text !== undefined) normalized.text = String(normalized.text).trim();
  if (normalized.timestamp !== undefined) normalized.timestamp = normalizeDate(normalized.timestamp);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  if (normalized.timestamp === undefined && !partial) normalized.timestamp = new Date();
  normalized.updatedAt = new Date();

  return normalized;
};

const buildFieldCondition = (field, value) => {
  const column = columnByField[field];
  if (!column) unsupported(`unknown field "${field}"`);

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const conditions = [];
    for (const [operator, operand] of Object.entries(value)) {
      if (operator === '$in') conditions.push(inArray(column, operand.map(toId)));
      else if (operator === '$ne') conditions.push(ne(column, operand));
      else unsupported(`operator "${operator}" on field "${field}"`);
    }
    return conditions.length === 1 ? conditions[0] : and(...conditions);
  }

  return value === null ? isNull(column) : eq(column, toId(value));
};

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    if (field === '$or') {
      if (!Array.isArray(value)) unsupported('$or must be an array');
      conditions.push(or(...value.map(buildWhere)));
      continue;
    }
    conditions.push(buildFieldCondition(field, value));
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

const populateUser = async (value, select) => {
  if (!value) return value;
  const [user] = await db.select().from(users).where(eq(users.id, toId(value))).limit(1);
  return pickFields(user ? { ...user, _id: user.id } : null, select);
};

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  const paths = String(path).split(/\s+/).filter(Boolean);
  for (const singlePath of paths) {
    if (singlePath === 'from') {
      doc.from = await populateUser(doc.from, select);
      continue;
    }
    if (singlePath === 'to') {
      doc.to = await populateUser(doc.to, select);
      continue;
    }
    unsupported(`populate path "${singlePath}"`);
  }
  return doc;
};

class MessageDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { from: null, fromBot: false }, serialize(row));
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
      const [row] = await db.insert(messages).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }

    const [row] = await db.update(messages).set(values).where(eq(messages.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class MessageQuery {
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
    const wrap = (row) => this.asLean ? serialize(row) : new MessageDocument(row);
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

function Message(data) {
  return new MessageDocument(data, { isNew: true });
}

Message.find = (query = {}) => new MessageQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(messages);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Message.findOne = (query = {}) => new MessageQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(messages);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Message.findById = (id) => new MessageQuery(async () => {
  const rows = await db.select().from(messages).where(eq(messages.id, id)).limit(1);
  return rows[0] || null;
});

Message.create = async (data) => new MessageDocument(data, { isNew: true }).save();

Message.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(messages);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Message.aggregate = async (pipeline = []) => {
  const isLatestPeerPipeline = (
    pipeline.length === 4
    && pipeline[0]?.$match
    && pipeline[1]?.$sort
    && pipeline[2]?.$addFields?.peerId
    && pipeline[3]?.$group?._id === '$peerId'
  );

  if (!isLatestPeerPipeline) unsupported('aggregate pipeline');

  const match = pipeline[0].$match;
  const currentId = match.$or?.[0]?.from;
  const peerIds = match.$or?.[0]?.to?.$in || match.$or?.[1]?.from?.$in || [];
  if (!currentId || !Array.isArray(peerIds)) unsupported('latest peer aggregate match');

  const rows = await Message.find(match).sort({ timestamp: -1, createdAt: -1 }).lean();
  const latestByPeer = new Map();

  for (const row of rows) {
    const peerId = String(row.from) === String(currentId) ? row.to : row.from;
    if (!peerIds.map(String).includes(String(peerId)) || latestByPeer.has(String(peerId))) continue;
    latestByPeer.set(String(peerId), {
      _id: peerId,
      lastMessage: row.text,
      lastMessageAt: row.timestamp,
      lastMessageFrom: row.from,
    });
  }

  return Array.from(latestByPeer.values());
};

export default Message;
