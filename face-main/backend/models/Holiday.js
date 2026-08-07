import { and, asc, count, desc, eq, gte, isNull, lt, lte } from 'drizzle-orm';
import db from '../db/index.js';
import { holidays } from '../db/schema/holiday.js';

const HOLIDAY_TYPES = new Set(['Public', 'Optional', 'Company']);
const WRITABLE_FIELDS = ['title', 'date', 'description', 'type', 'createdAt', 'updatedAt'];

const columnByField = {
  id: holidays.id,
  _id: holidays.id,
  title: holidays.title,
  date: holidays.date,
  description: holidays.description,
  type: holidays.type,
  createdAt: holidays.createdAt,
  updatedAt: holidays.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Holiday query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const normalizeInput = (data = {}) => {
  const normalized = pickWritable(data);

  if (normalized.title !== undefined) {
    normalized.title = String(normalized.title).trim();
    if (!normalized.title) throw new Error('Holiday title is required');
  }
  if (normalized.description !== undefined && normalized.description !== null) {
    normalized.description = String(normalized.description).trim();
  }
  if (normalized.date !== undefined) normalized.date = normalizeDate(normalized.date);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  if (normalized.type !== undefined && !HOLIDAY_TYPES.has(normalized.type)) {
    throw new Error(`Holiday type must be one of: ${Array.from(HOLIDAY_TYPES).join(', ')}`);
  }

  normalized.updatedAt = new Date();
  return normalized;
};

const postgresUniqueToMongoError = (error) => {
  if (error?.code !== '23505') return error;
  const duplicate = new Error('A holiday already exists on this date');
  duplicate.code = 11000;
  duplicate.keyPattern = { date: 1 };
  return duplicate;
};

const buildWhere = (query = {}) => {
  const conditions = [];

  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
        else unsupported(`operator "${op}" on field "${field}"`);
      }
      continue;
    }

    conditions.push(value === null ? isNull(column) : eq(column, field === 'date' ? normalizeDate(value) : value));
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

const serialize = (row) => {
  if (!row) return null;
  return { ...row, _id: row.id };
};

class HolidayDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { type: 'Public' }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async save() {
    try {
      const values = normalizeInput(this);
      if (this.__isNew) {
        values.createdAt = new Date();
        const [row] = await db.insert(holidays).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false });
        return this;
      }

      const [row] = await db.update(holidays).set(values).where(eq(holidays.id, this._id)).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    } catch (error) {
      throw postgresUniqueToMongoError(error);
    }
  }

  async deleteOne() {
    if (!this._id) return null;
    const [row] = await db.delete(holidays).where(eq(holidays.id, this._id)).returning();
    return row ? new HolidayDocument(row) : null;
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class HolidayQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.asLean = false;
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
    const wrap = (row) => (this.asLean ? serialize(row) : new HolidayDocument(row));
    return this.many ? result.map(wrap) : result ? wrap(result) : null;
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
    if (!column) unsupported(`sort field "${field}"`);
    query = query.orderBy(direction === -1 ? desc(column) : asc(column));
  }
  if (skipValue) query = query.offset(skipValue);
  if (limitValue) query = query.limit(limitValue);
  return query;
};

function Holiday(data) {
  return new HolidayDocument(data, { isNew: true });
}

Holiday.find = (query = {}) =>
  new HolidayQuery(
    async (options) => {
      const where = buildWhere(query);
      let builder = db.select().from(holidays);
      if (where) builder = builder.where(where);
      builder = applyQueryOptions(builder, options);
      return builder;
    },
    { many: true },
  );

Holiday.findOne = (query = {}) =>
  new HolidayQuery(async (options) => {
    const where = buildWhere(query);
    let builder = db.select().from(holidays);
    if (where) builder = builder.where(where);
    builder = applyQueryOptions(builder, { ...options, limitValue: 1 });
    const rows = await builder;
    return rows[0] || null;
  });

Holiday.findById = (id) =>
  new HolidayQuery(async () => {
    const rows = await db.select().from(holidays).where(eq(holidays.id, id)).limit(1);
    return rows[0] || null;
  });

Holiday.create = async (data) => {
  const doc = new HolidayDocument(data, { isNew: true });
  return doc.save();
};

Holiday.findByIdAndUpdate = async (id, data, options = {}) => {
  try {
    const values = normalizeInput(data);
    const [row] = await db.update(holidays).set(values).where(eq(holidays.id, id)).returning();
    if (!row) return null;
    return options.lean ? serialize(row) : new HolidayDocument(row);
  } catch (error) {
    throw postgresUniqueToMongoError(error);
  }
};

Holiday.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(holidays).where(eq(holidays.id, id)).returning();
  return row ? new HolidayDocument(row) : null;
};

Holiday.findOneAndUpdate = async (query, data, options = {}) => {
  const existing = await Holiday.findOne(query);
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return options.lean ? existing.toObject() : existing;
  }

  if (options.upsert) return Holiday.create({ ...query, ...data });
  return null;
};

Holiday.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(holidays);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default Holiday;
