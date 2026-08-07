import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import db from '../db/index.js';
import { suppliers } from '../db/schema/supplier.js';

const WRITABLE_FIELDS = ['name', 'email', 'phone', 'address', 'isActive', 'createdAt', 'updatedAt'];

const columnByField = {
  id: suppliers.id,
  _id: suppliers.id,
  name: suppliers.name,
  email: suppliers.email,
  phone: suppliers.phone,
  address: suppliers.address,
  isActive: suppliers.isActive,
  createdAt: suppliers.createdAt,
  updatedAt: suppliers.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Supplier query: ${message}`);
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

  if (normalized.name !== undefined) {
    normalized.name = String(normalized.name).trim();
    if (!normalized.name) throw new Error('Supplier name is required');
  }
  if (normalized.email !== undefined && normalized.email !== null) normalized.email = String(normalized.email).trim().toLowerCase();
  if (normalized.phone !== undefined && normalized.phone !== null) normalized.phone = String(normalized.phone).trim();
  if (normalized.address !== undefined && normalized.address !== null) normalized.address = String(normalized.address).trim();
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  normalized.updatedAt = new Date();

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
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

const serialize = (row) => (row ? { ...row, _id: row.id } : null);

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

class SupplierDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { isActive: true }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async save() {
    const values = normalizeInput(this);
    if (this.__isNew) {
      values.createdAt = new Date();
      const [row] = await db.insert(suppliers).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }
    const [row] = await db.update(suppliers).set(values).where(eq(suppliers.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class SupplierQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.selection = '';
    this.asLean = false;
  }

  select(selection = '') {
    this.selection = selection;
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
      const value = this.asLean ? serialize(row) : new SupplierDocument(row);
      return pickFields(value, this.selection);
    };
    return this.many ? result.map(wrap) : result ? wrap(result) : null;
  }

  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
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

function Supplier(data) {
  return new SupplierDocument(data, { isNew: true });
}

Supplier.find = (query = {}) => new SupplierQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(suppliers);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Supplier.findOne = (query = {}) => new SupplierQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(suppliers);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Supplier.findById = (id) => new SupplierQuery(async () => {
  const rows = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return rows[0] || null;
});

Supplier.create = async (data) => new SupplierDocument(data, { isNew: true }).save();

Supplier.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(suppliers);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default Supplier;
