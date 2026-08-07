import { and, asc, count, desc, eq, gte, isNull, lt, lte } from 'drizzle-orm';
import db from '../db/index.js';
import { dayBooks } from '../db/schema/dayBook.js';
import { employees } from '../db/schema/employee.js';
import { tasks } from '../db/schema/task.js';

const STATUSES = new Set(['Pending', 'Draft', 'Submitted', 'Approved', 'Rejected']);
const WORK_TYPES = new Set(['Task', 'Meeting', 'Learning', 'Internal Work', 'Break', 'Lunch Break', 'Other']);
const WRITABLE_FIELDS = ['employee', 'date', 'slots', 'status', 'adminComment', 'createdAt', 'updatedAt'];

const columnByField = {
  id: dayBooks.id,
  _id: dayBooks.id,
  employee: dayBooks.employee,
  date: dayBooks.date,
  status: dayBooks.status,
  adminComment: dayBooks.adminComment,
  createdAt: dayBooks.createdAt,
  updatedAt: dayBooks.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported DayBook query: ${message}`);
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

const normalizeSlots = (slots = []) => {
  if (!Array.isArray(slots)) throw new Error('Slots must be an array');
  return slots.map((slot) => {
    const slotType = String(slot.slotType || '').trim();
    if (!slotType) throw new Error('Time slot is required');
    if (slotType.length > 40) throw new Error('Time slot cannot exceed 40 characters');
    if (!WORK_TYPES.has(slot.workType)) unsupported(`workType value "${slot.workType}"`);

    return {
      slotType,
      workType: slot.workType,
      taskRef: slot.taskRef || null,
      description: slot.description === undefined || slot.description === null ? '' : String(slot.description).trim(),
    };
  });
};

const normalizeInput = (data = {}) => {
  const normalized = pickWritable(data);
  if (normalized.date !== undefined) normalized.date = normalizeDate(normalized.date);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  if (normalized.slots !== undefined) normalized.slots = normalizeSlots(normalized.slots);
  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) unsupported(`status value "${normalized.status}"`);
  if (normalized.adminComment !== undefined && normalized.adminComment !== null) {
    normalized.adminComment = String(normalized.adminComment).trim();
  }
  normalized.updatedAt = new Date();
  return normalized;
};

const postgresUniqueToMongoError = (error) => {
  if (error?.code !== '23505') return error;
  const duplicate = new Error('Day book already exists for this employee and date');
  duplicate.code = 11000;
  duplicate.keyPattern = { employee: 1, date: 1 };
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
    slots: Array.isArray(row.slots) ? row.slots : [],
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

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  if (path === 'employee' && doc.employee) {
    const employeeId = typeof doc.employee === 'object' ? doc.employee.id || doc.employee._id : doc.employee;
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    doc.employee = pickFields(employee ? { ...employee, _id: employee.id } : null, select);
    return doc;
  }

  if (path === 'slots.taskRef') {
    const taskRows = await db.select().from(tasks);
    doc.slots = doc.slots.map((slot) => {
      if (!slot.taskRef) return slot;
      const taskId = typeof slot.taskRef === 'object' ? slot.taskRef.id || slot.taskRef._id : slot.taskRef;
      const task = taskRows.find((row) => row.id === taskId);
      return { ...slot, taskRef: task ? { ...task, _id: task.id } : null };
    });
    return doc;
  }

  unsupported(`populate path "${path}"`);
};

class DayBookDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { slots: [], status: 'Draft' }, serialize(row));
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
        const [row] = await db.insert(dayBooks).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false });
        return this;
      }
      const [row] = await db.update(dayBooks).set(values).where(eq(dayBooks.id, this._id)).returning();
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

class DayBookQuery {
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
    if (Array.isArray(path)) this.populateSpecs.push(...path.map((item) => ({ path: item.path || item, select: item.select })));
    else this.populateSpecs.push({ path, select });
    return this;
  }

  sort(sortSpec) { this.sortSpec = sortSpec; return this; }
  limit(value) { this.limitValue = Number(value); return this; }
  skip(value) { this.skipValue = Number(value); return this; }
  lean() { this.asLean = true; return this; }

  async exec() {
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => (this.asLean ? serialize(row) : new DayBookDocument(row));
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];
    for (const doc of docs) {
      for (const spec of this.populateSpecs) await populateOne(doc, spec.path, spec.select);
    }
    return wrapped;
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

function DayBook(data) {
  return new DayBookDocument(data, { isNew: true });
}

DayBook.find = (query = {}) => new DayBookQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(dayBooks);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

DayBook.findOne = (query = {}) => new DayBookQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(dayBooks);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

DayBook.findById = (id) => new DayBookQuery(async () => {
  const rows = await db.select().from(dayBooks).where(eq(dayBooks.id, id)).limit(1);
  return rows[0] || null;
});

DayBook.create = async (data) => new DayBookDocument(data, { isNew: true }).save();

DayBook.findByIdAndUpdate = (id, data) => new DayBookQuery(async () => {
  const [existing] = await db.select().from(dayBooks).where(eq(dayBooks.id, id)).limit(1);
  if (!existing) return null;
  const values = normalizeInput({ ...serialize(existing), ...data });
  const [row] = await db.update(dayBooks).set(values).where(eq(dayBooks.id, id)).returning();
  return row || null;
});

DayBook.findOneAndUpdate = (query, data, options = {}) => new DayBookQuery(async () => {
  const where = buildWhere(query);
  let builder = db.select().from(dayBooks);
  if (where) builder = builder.where(where);
  const [existing] = await builder.limit(1);
  if (!existing) {
    if (options.upsert) return DayBook.create({ ...query, ...data });
    return null;
  }
  const values = normalizeInput({ ...serialize(existing), ...data });
  const [row] = await db.update(dayBooks).set(values).where(eq(dayBooks.id, existing.id)).returning();
  return row || null;
});

DayBook.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(dayBooks).where(eq(dayBooks.id, id)).returning();
  return row ? new DayBookDocument(row) : null;
};

DayBook.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(dayBooks);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default DayBook;
