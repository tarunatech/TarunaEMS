import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { projects } from '../db/schema/project.js';
import { users } from '../db/schema/user.js';
import { employees } from '../db/schema/employee.js';

const STATUSES = new Set(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled']);

const WRITABLE_FIELDS = [
  'projectCode',
  'name',
  'description',
  'leadId',
  'pipelineId',
  'status',
  'contractValue',
  'approvedBudget',
  'billingSchedule',
  'currency',
  'startDate',
  'endDate',
  'projectManager',
  'clientName',
  'createdBy',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: projects.id,
  _id: projects.id,
  projectCode: projects.projectCode,
  name: projects.name,
  description: projects.description,
  leadId: projects.leadId,
  pipelineId: projects.pipelineId,
  status: projects.status,
  contractValue: projects.contractValue,
  approvedBudget: projects.approvedBudget,
  billingSchedule: projects.billingSchedule,
  currency: projects.currency,
  startDate: projects.startDate,
  endDate: projects.endDate,
  projectManager: projects.projectManager,
  clientName: projects.clientName,
  createdBy: projects.createdBy,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Project query: ${message}`);
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

  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) {
    unsupported(`status value "${normalized.status}"`);
  }
  if (normalized.contractValue !== undefined) {
    normalized.contractValue = Number(normalized.contractValue || 0);
  }
  if (normalized.approvedBudget !== undefined) {
    normalized.approvedBudget = Number(normalized.approvedBudget || 0);
  }
  if (normalized.startDate !== undefined) normalized.startDate = normalizeDate(normalized.startDate);
  if (normalized.endDate !== undefined) normalized.endDate = normalizeDate(normalized.endDate);

  for (const field of ['projectCode', 'name', 'description', 'currency', 'clientName']) {
    if (normalized[field] !== undefined) normalized[field] = trimString(normalized[field]);
  }

  if (normalized.billingSchedule !== undefined && !Array.isArray(normalized.billingSchedule)) {
    normalized.billingSchedule = [];
  }

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
    if (field === '$and') {
      if (!Array.isArray(value)) unsupported('$and must be an array');
      conditions.push(and(...value.map(buildWhere)));
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
        else if (op === '$in') {
          if (!Array.isArray(operand) || operand.length === 0) {
            conditions.push(sql`1=0`);
          } else {
            const valid = operand.filter((item) => item !== '__none__');
            if (valid.length === 0) {
              conditions.push(sql`1=0`);
            } else {
              conditions.push(inArray(column, valid));
            }
          }
        }
        else if (op === '$options') continue;
        else unsupported(`operator "${op}" on field "${field}"`);
      }
      continue;
    }
    if (value === '__none__') {
      conditions.push(sql`1=0`);
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
    contractValue: Number(row.contractValue || 0),
    approvedBudget: Number(row.approvedBudget || 0),
    billingSchedule: Array.isArray(row.billingSchedule) ? row.billingSchedule : [],
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
  const leadDoc = await Lead.findById(typeof id === 'object' ? id.id || id._id : id);
  if (!leadDoc) return null;
  if (leadDoc.assignedTo) {
    try {
      await leadDoc.populate('assignedTo', 'employeeId personalInfo workInfo');
    } catch (e) {}
  }
  const lead = leadDoc.toObject ? leadDoc.toObject() : leadDoc;
  return pickFields(lead, select);
};

const loadEmployee = async (id, select) => {
  if (!id) return null;
  const Employee = (await import('./Employee.js')).default;
  const emp = await Employee.findById(typeof id === 'object' ? id.id || id._id : id).lean();
  return pickFields(emp, select);
};

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  if (path === 'leadId' || path === 'lead') {
    doc.leadId = await loadLead(doc.leadId, select);
    return doc;
  }
  if (path === 'projectManager') {
    doc.projectManager = await loadEmployee(doc.projectManager, select);
    return doc;
  }
  if (path === 'createdBy' && doc.createdBy) {
    const userId = typeof doc.createdBy === 'object' ? doc.createdBy.id || doc.createdBy._id : doc.createdBy;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    doc.createdBy = pickFields(user ? { ...user, _id: user.id } : null, select);
    return doc;
  }
  return doc;
};

class ProjectDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { status: 'Planning', billingSchedule: [], contractValue: 0, approvedBudget: 0 }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async populate(path, select) {
    if (Array.isArray(path)) {
      for (const item of path) await populateOne(this, item.path || item, item.select);
    } else {
      await populateOne(this, path, select);
    }
    return this;
  }

  async save() {
    const values = normalizeInput(this);
    if (this.__isNew) {
      const [inserted] = await db.insert(projects).values(values).returning();
      Object.assign(this, serialize(inserted));
      this.__isNew = false;
      return this;
    }
    const [updated] = await db.update(projects).set(values).where(eq(projects.id, this.id)).returning();
    Object.assign(this, serialize(updated));
    return this;
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class ProjectQuery {
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
    const wrap = (row) => (this.asLean ? serialize(row) : new ProjectDocument(row));
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];
    for (const doc of docs) {
      for (const spec of this.populateSpecs) await populateOne(doc, spec.path || spec, spec.select);
    }
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

function Project(data) {
  return new ProjectDocument(data, { isNew: true });
}

Project.find = (query = {}) => new ProjectQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(projects);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Project.findOne = (query = {}) => new ProjectQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(projects);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Project.findById = (id) => Project.findOne({ id: typeof id === 'object' ? id?.id || id?._id : id });

Project.create = async (data) => new ProjectDocument(data, { isNew: true }).save();

Project.findByIdAndUpdate = (id, data, options = {}) => new ProjectQuery(async () => {
  const targetId = typeof id === 'object' ? id?.id || id?._id : id;
  const [existing] = await db.select().from(projects).where(eq(projects.id, targetId)).limit(1);
  if (!existing) return null;
  const values = normalizeInput({ ...serialize(existing), ...data });
  const [row] = await db.update(projects).set(values).where(eq(projects.id, targetId)).returning();
  return row || null;
});

Project.findByIdAndDelete = async (id) => {
  const targetId = typeof id === 'object' ? id?.id || id?._id : id;
  const [row] = await db.delete(projects).where(eq(projects.id, targetId)).returning();
  return row ? new ProjectDocument(row) : null;
};

Project.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(projects);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export const generateProjectCode = async () => {
  const year = new Date().getFullYear();
  const total = await Project.countDocuments();
  let sequence = total + 1;
  let code = `PRJ-${year}-${String(sequence).padStart(4, '0')}`;

  while (await Project.findOne({ projectCode: code })) {
    sequence += 1;
    code = `PRJ-${year}-${String(sequence).padStart(4, '0')}`;
  }
  return code;
};

Project.generateProjectCode = generateProjectCode;

export default Project;
