import { and, asc, count, desc, eq, gte, ilike, isNull, lt, lte, or } from 'drizzle-orm';
import db from '../db/index.js';
import { purchaseOrders } from '../db/schema/purchaseOrder.js';
import { users } from '../db/schema/user.js';

export const SERVICE_TYPES = [
  'Domain',
  'Hosting',
  'VPS Server',
  'Cloud Server',
  'SSL Certificate',
  'Business Email',
  'API Subscription',
  'Software License',
  'Other',
];

export const SERVICE_VENDORS = [
  'GoDaddy',
  'Namecheap',
  'Hostinger',
  'AWS',
  'Azure',
  'Google Cloud',
  'Cloudflare',
  'DigitalOcean',
  'OpenAI',
  'Twilio',
  'Razorpay',
  'Other',
];

const BILLING_CYCLES = new Set(['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One Time']);
const STATUSES = new Set(['Active', 'Pending', 'Expired', 'Cancelled']);

const WRITABLE_FIELDS = [
  'poNumber',
  'client',
  'clientName',
  'project',
  'serviceType',
  'vendor',
  'serviceName',
  'billingCycle',
  'purchaseDate',
  'renewalDate',
  'amount',
  'status',
  'notes',
  'supplier',
  'deliveryDate',
  'paymentTerms',
  'lineItems',
  'totalAmount',
  'grandTotal',
  'createdBy',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: purchaseOrders.id,
  _id: purchaseOrders.id,
  poNumber: purchaseOrders.poNumber,
  client: purchaseOrders.client,
  clientName: purchaseOrders.clientName,
  project: purchaseOrders.project,
  serviceType: purchaseOrders.serviceType,
  vendor: purchaseOrders.vendor,
  serviceName: purchaseOrders.serviceName,
  billingCycle: purchaseOrders.billingCycle,
  purchaseDate: purchaseOrders.purchaseDate,
  renewalDate: purchaseOrders.renewalDate,
  amount: purchaseOrders.amount,
  status: purchaseOrders.status,
  supplier: purchaseOrders.supplier,
  deliveryDate: purchaseOrders.deliveryDate,
  totalAmount: purchaseOrders.totalAmount,
  grandTotal: purchaseOrders.grandTotal,
  createdBy: purchaseOrders.createdBy,
  createdAt: purchaseOrders.createdAt,
  updatedAt: purchaseOrders.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported PurchaseOrder query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const trim = (value) => (value === undefined || value === null ? value : String(value).trim());

const normalizeInput = (data = {}) => {
  const normalized = pickWritable(data);

  for (const field of ['poNumber', 'clientName', 'project', 'serviceType', 'vendor', 'serviceName', 'notes', 'paymentTerms']) {
    if (normalized[field] !== undefined) normalized[field] = trim(normalized[field]);
  }

  if (normalized.project !== undefined && normalized.project.length > 100) throw new Error('Project name cannot exceed 100 characters');
  if (normalized.serviceType !== undefined && normalized.serviceType.length > 60) throw new Error('Service type cannot exceed 60 characters');
  if (normalized.vendor !== undefined && normalized.vendor.length > 80) throw new Error('Vendor cannot exceed 80 characters');
  if (normalized.serviceName !== undefined && normalized.serviceName.length > 120) throw new Error('Service name cannot exceed 120 characters');
  if (normalized.billingCycle !== undefined && !BILLING_CYCLES.has(normalized.billingCycle)) unsupported(`billingCycle value "${normalized.billingCycle}"`);
  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) unsupported(`status value "${normalized.status}"`);

  for (const field of ['purchaseDate', 'renewalDate', 'deliveryDate', 'createdAt', 'updatedAt']) {
    if (normalized[field] !== undefined) normalized[field] = normalizeDate(normalized[field]);
  }

  if (normalized.amount !== undefined) {
    normalized.amount = Number(normalized.amount || 0);
    if (normalized.amount < 0) throw new Error('Amount cannot be negative');
  }

  if (normalized.lineItems !== undefined) normalized.lineItems = Array.isArray(normalized.lineItems) ? normalized.lineItems : [];

  const amount = normalized.amount ?? Number(data.amount || 0);
  normalized.totalAmount = amount;
  normalized.grandTotal = amount;
  if (normalized.renewalDate !== undefined) normalized.deliveryDate = normalized.renewalDate;
  normalized.updatedAt = new Date();
  return normalized;
};

const postgresUniqueToMongoError = (error) => {
  if (error?.code !== '23505') return error;
  const duplicate = new Error('PO number already exists');
  duplicate.code = 11000;
  duplicate.keyPattern = { poNumber: 1 };
  return duplicate;
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
      if ('$regex' in value) {
        conditions.push(ilike(column, `%${value.$regex}%`));
        continue;
      }
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
        else if (op === '$options') continue;
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

const serialize = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    amount: Number(row.amount || 0),
    totalAmount: Number(row.totalAmount || 0),
    grandTotal: Number(row.grandTotal || 0),
    lineItems: Array.isArray(row.lineItems) ? row.lineItems : [],
  };
};

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };
  for (const field of selection.split(/\s+/).filter(Boolean)) {
    const value = getNested(obj, field);
    if (value === undefined) continue;
    const parts = field.split('.');
    let target = picked;
    for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] = target[parts[i]] || {};
    target[parts[parts.length - 1]] = value;
  }
  return picked;
};

const loadLead = async (id, select) => {
  if (!id) return null;
  const Lead = (await import('./Lead.js')).default;
  const lead = await Lead.findById(typeof id === 'object' ? id.id || id._id : id).lean();
  return pickFields(lead, select);
};

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  if (path === 'client') {
    doc.client = await loadLead(doc.client, select);
    return doc;
  }
  if (path === 'createdBy' && doc.createdBy) {
    const userId = typeof doc.createdBy === 'object' ? doc.createdBy.id || doc.createdBy._id : doc.createdBy;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    doc.createdBy = pickFields(user ? { ...user, _id: user.id } : null, select);
    return doc;
  }
  unsupported(`populate path "${path}"`);
};

class PurchaseOrderDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { status: 'Active', lineItems: [], totalAmount: 0, grandTotal: 0 }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async populate(path, select) {
    if (Array.isArray(path)) {
      for (const item of path) await populateOne(this, item.path || item, item.select);
      return this;
    }
    await populateOne(this, path, select);
    return this;
  }

  async save() {
    try {
      const values = normalizeInput(this);
      if (this.__isNew) {
        values.createdAt = new Date();
        const [row] = await db.insert(purchaseOrders).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false });
        return this;
      }
      const [row] = await db.update(purchaseOrders).set(values).where(eq(purchaseOrders.id, this._id)).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    } catch (error) {
      throw postgresUniqueToMongoError(error);
    }
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class PurchaseOrderQuery {
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
    const wrap = (row) => (this.asLean ? serialize(row) : new PurchaseOrderDocument(row));
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

function PurchaseOrder(data) {
  return new PurchaseOrderDocument(data, { isNew: true });
}

PurchaseOrder.find = (query = {}) => new PurchaseOrderQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(purchaseOrders);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

PurchaseOrder.findOne = (query = {}) => new PurchaseOrderQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(purchaseOrders);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

PurchaseOrder.findById = (id) => new PurchaseOrderQuery(async () => {
  const rows = await db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).limit(1);
  return rows[0] || null;
});

PurchaseOrder.create = async (data) => new PurchaseOrderDocument(data, { isNew: true }).save();

PurchaseOrder.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(purchaseOrders).where(eq(purchaseOrders.id, id)).returning();
  return row ? new PurchaseOrderDocument(row) : null;
};

PurchaseOrder.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(purchaseOrders);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default PurchaseOrder;
