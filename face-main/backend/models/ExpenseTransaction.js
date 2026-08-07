import { and, asc, count, desc, eq, gte, ilike, isNull, lt, lte, or } from 'drizzle-orm';
import db from '../db/index.js';
import { expenseTransactions } from '../db/schema/expenseTransaction.js';
import { users } from '../db/schema/user.js';
import { employees } from '../db/schema/employee.js';
import { departments } from '../db/schema/department.js';

const TYPES = new Set(['expense', 'payment']);
const PAYMENT_METHODS = new Set(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other']);
const SOURCES = new Set(['admin', 'employee']);

const WRITABLE_FIELDS = [
  'type',
  'date',
  'amount',
  'paymentMethod',
  'paidTo',
  'clientName',
  'category',
  'description',
  'referenceNumber',
  'invoiceNumber',
  'remarks',
  'createdBy',
  'employee',
  'source',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: expenseTransactions.id,
  _id: expenseTransactions.id,
  type: expenseTransactions.type,
  date: expenseTransactions.date,
  amount: expenseTransactions.amount,
  paymentMethod: expenseTransactions.paymentMethod,
  paidTo: expenseTransactions.paidTo,
  clientName: expenseTransactions.clientName,
  category: expenseTransactions.category,
  description: expenseTransactions.description,
  referenceNumber: expenseTransactions.referenceNumber,
  invoiceNumber: expenseTransactions.invoiceNumber,
  remarks: expenseTransactions.remarks,
  createdBy: expenseTransactions.createdBy,
  employee: expenseTransactions.employee,
  source: expenseTransactions.source,
  createdAt: expenseTransactions.createdAt,
  updatedAt: expenseTransactions.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported ExpenseTransaction query: ${message}`);
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

const trimString = (value) => (value === undefined || value === null ? value : String(value).trim());

const normalizeInput = (data = {}) => {
  const normalized = pickWritable(data);

  if (normalized.type !== undefined && !TYPES.has(normalized.type)) unsupported(`type value "${normalized.type}"`);
  if (normalized.date !== undefined) normalized.date = normalizeDate(normalized.date);
  if (normalized.amount !== undefined) {
    normalized.amount = Number(normalized.amount);
    if (Number.isNaN(normalized.amount)) throw new Error('Amount is required');
    if (normalized.amount < 0) throw new Error('Amount cannot be negative');
  }
  if (normalized.paymentMethod !== undefined && !PAYMENT_METHODS.has(normalized.paymentMethod)) {
    unsupported(`paymentMethod value "${normalized.paymentMethod}"`);
  }
  for (const field of ['paidTo', 'clientName', 'category', 'description', 'referenceNumber', 'invoiceNumber', 'remarks']) {
    if (normalized[field] !== undefined) normalized[field] = trimString(normalized[field]);
  }
  if (normalized.source !== undefined && !SOURCES.has(normalized.source)) unsupported(`source value "${normalized.source}"`);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  normalized.updatedAt = new Date();

  return normalized;
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

    if (value instanceof RegExp) {
      conditions.push(ilike(column, `%${value.source}%`));
      continue;
    }

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
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
    if (expected instanceof RegExp) {
      if (!expected.test(String(actual || ''))) return false;
      continue;
    }
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      for (const [op, value] of Object.entries(expected)) {
        if (op === '$gte' && !(new Date(actual) >= value)) return false;
        else if (op === '$lte' && !(new Date(actual) <= value)) return false;
        else if (op === '$lt' && !(new Date(actual) < value)) return false;
        else unsupported(`aggregate match operator "${op}" on field "${field}"`);
      }
      continue;
    }
    if (actual !== expected) return false;
  }
  return true;
};

const serialize = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    amount: Number(row.amount || 0),
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

const populateOne = async (doc, spec) => {
  const path = spec.path || spec;
  if (path === 'createdBy') {
    if (!doc.createdBy) return doc;
    const userId = typeof doc.createdBy === 'object' ? doc.createdBy.id || doc.createdBy._id : doc.createdBy;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    doc.createdBy = pickFields(user ? { ...user, _id: user.id } : null, spec.select);
    return doc;
  }

  if (path === 'employee') {
    if (!doc.employee) {
      doc.employee = null;
      return doc;
    }
    const employeeId = typeof doc.employee === 'object' ? doc.employee.id || doc.employee._id : doc.employee;
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    const employeeDoc = employee
      ? {
          ...employee,
          _id: employee.id,
          workInfo: {
            ...(employee.workInfo || {}),
            department: employee.workInfoDepartment || employee.workInfo?.department || null,
          },
        }
      : null;
    doc.employee = pickFields(employeeDoc, spec.select);
    if (spec.populate?.path === 'workInfo.department' && doc.employee?.workInfo?.department) {
      const departmentId = doc.employee.workInfo.department;
      const [department] = await db.select().from(departments).where(eq(departments.id, departmentId)).limit(1);
      doc.employee.workInfo.department = pickFields(department ? { ...department, _id: department.id } : null, spec.populate.select);
    }
    return doc;
  }

  unsupported(`populate path "${path}"`);
};

class ExpenseTransactionDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { source: 'admin' }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async populate(path, select) {
    if (Array.isArray(path)) {
      for (const item of path) await populateOne(this, item);
      return this;
    }
    await populateOne(this, typeof path === 'object' ? path : { path, select });
    return this;
  }

  async save() {
    const values = normalizeInput(this);
    if (this.__isNew) {
      values.createdAt = new Date();
      const [row] = await db.insert(expenseTransactions).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }
    const [row] = await db.update(expenseTransactions).set(values).where(eq(expenseTransactions.id, this._id)).returning();
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

class ExpenseTransactionQuery {
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
    else this.populateSpecs.push(typeof path === 'object' ? path : { path, select });
    return this;
  }

  sort(sortSpec) { this.sortSpec = sortSpec; return this; }
  limit(value) { this.limitValue = Number(value); return this; }
  skip(value) { this.skipValue = Number(value); return this; }
  lean() { this.asLean = true; return this; }

  async exec() {
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => (this.asLean ? serialize(row) : new ExpenseTransactionDocument(row));
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];
    for (const doc of docs) for (const spec of this.populateSpecs) await populateOne(doc, spec);
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

function ExpenseTransaction(data) {
  return new ExpenseTransactionDocument(data, { isNew: true });
}

ExpenseTransaction.find = (query = {}) => new ExpenseTransactionQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(expenseTransactions);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

ExpenseTransaction.findOne = (query = {}) => new ExpenseTransactionQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(expenseTransactions);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

ExpenseTransaction.create = async (data) => new ExpenseTransactionDocument(data, { isNew: true }).save();

ExpenseTransaction.findOneAndUpdate = (query, data) => new ExpenseTransactionQuery(async () => {
  const where = buildWhere(query);
  let builder = db.select().from(expenseTransactions);
  if (where) builder = builder.where(where);
  const [existing] = await builder.limit(1);
  if (!existing) return null;
  const values = normalizeInput({ ...serialize(existing), ...data });
  const [row] = await db.update(expenseTransactions).set(values).where(eq(expenseTransactions.id, existing.id)).returning();
  return row || null;
});

ExpenseTransaction.findOneAndDelete = async (query) => {
  const where = buildWhere(query);
  let builder = db.delete(expenseTransactions);
  if (where) builder = builder.where(where);
  const [row] = await builder.returning();
  return row ? new ExpenseTransactionDocument(row) : null;
};

ExpenseTransaction.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(expenseTransactions);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

ExpenseTransaction.aggregate = async (pipeline = []) => {
  let rows = (await db.select().from(expenseTransactions)).map(serialize);
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matchRow(row, stage.$match));
    else if (stage.$group) {
      const grouped = new Map();
      for (const row of rows) {
        const key = typeof stage.$group._id === 'string' && stage.$group._id.startsWith('$')
          ? getNested(row, stage.$group._id.slice(1))
          : stage.$group._id;
        const bucket = grouped.get(key) || [];
        bucket.push(row);
        grouped.set(key, bucket);
      }
      rows = Array.from(grouped.entries()).map(([key, groupRows]) => {
        const result = { _id: key };
        for (const [field, expr] of Object.entries(stage.$group)) {
          if (field === '_id') continue;
          if (expr.$sum === 1) result[field] = groupRows.length;
          else if (typeof expr.$sum === 'string' && expr.$sum.startsWith('$')) {
            result[field] = groupRows.reduce((sum, row) => sum + Number(getNested(row, expr.$sum.slice(1)) || 0), 0);
          } else unsupported(`aggregate group accumulator "${field}"`);
        }
        return result;
      });
    } else unsupported(`aggregate stage "${Object.keys(stage)[0]}"`);
  }
  return rows;
};

export default ExpenseTransaction;
