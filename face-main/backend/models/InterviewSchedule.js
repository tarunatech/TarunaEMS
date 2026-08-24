import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import db from '../db/index.js';
import { interviewSchedules } from '../db/schema/interviewSchedule.js';
import { users } from '../db/schema/user.js';

const MODES = new Set(['Online', 'Offline', 'Telephonic']);
const STATUSES = new Set(['Scheduled', 'Completed', 'Selected', 'Rejected', 'Cancelled']);
const REQUIRED_FIELDS = ['candidateName', 'email', 'phone', 'resumeFile', 'position', 'experience', 'interviewDate', 'interviewTime', 'interviewMode', 'interviewRound', 'skills', 'notes', 'createdBy'];
const PROFILE_FIELDS = ['education', 'experienceHistory', 'certifications', 'documents'];
const WRITABLE_FIELDS = [...REQUIRED_FIELDS, ...PROFILE_FIELDS, 'resumeUrl', 'status', 'createdAt', 'updatedAt'];

const columnByField = {
  id: interviewSchedules.id,
  _id: interviewSchedules.id,
  candidateName: interviewSchedules.candidateName,
  email: interviewSchedules.email,
  phone: interviewSchedules.phone,
  position: interviewSchedules.position,
  experience: interviewSchedules.experience,
  interviewDate: interviewSchedules.interviewDate,
  interviewTime: interviewSchedules.interviewTime,
  interviewMode: interviewSchedules.interviewMode,
  interviewRound: interviewSchedules.interviewRound,
  status: interviewSchedules.status,
  createdBy: interviewSchedules.createdBy,
  createdAt: interviewSchedules.createdAt,
  updatedAt: interviewSchedules.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported InterviewSchedule query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const pickWritable = (data = {}) => Object.fromEntries(WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));

const trim = (value) => (value === undefined || value === null ? value : String(value).trim());

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);
  if (partial && normalized.createdBy && typeof normalized.createdBy === 'object') {
    delete normalized.createdBy;
  }

  if (!partial) {
    for (const field of REQUIRED_FIELDS) {
      if (normalized[field] === undefined || normalized[field] === null || (typeof normalized[field] === 'string' && !normalized[field].trim())) {
        throw new Error(`${field} is required`);
      }
    }
  }

  for (const field of ['candidateName', 'phone', 'resumeUrl', 'position', 'experience', 'interviewTime', 'interviewRound', 'skills', 'notes']) {
    if (normalized[field] !== undefined && normalized[field] !== null) normalized[field] = trim(normalized[field]);
  }
  if (normalized.email !== undefined) normalized.email = trim(normalized.email).toLowerCase();
  if (normalized.interviewDate !== undefined) normalized.interviewDate = normalizeDate(normalized.interviewDate);
  if (normalized.interviewMode !== undefined && !MODES.has(normalized.interviewMode)) unsupported(`interviewMode value "${normalized.interviewMode}"`);
  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) unsupported(`status value "${normalized.status}"`);
  if (normalized.resumeFile !== undefined) {
    const resumeFile = normalized.resumeFile || {};
    for (const field of ['path', 'originalName', 'mimeType']) {
      if (!trim(resumeFile[field])) throw new Error(`resumeFile.${field} is required`);
    }
    if (resumeFile.size === undefined || resumeFile.size === null) throw new Error('resumeFile.size is required');
    normalized.resumeFile = {
      path: trim(resumeFile.path),
      originalName: trim(resumeFile.originalName),
      mimeType: trim(resumeFile.mimeType),
      size: Number(resumeFile.size),
    };
  }
  for (const field of PROFILE_FIELDS) {
    if (normalized[field] !== undefined && !Array.isArray(normalized[field])) {
      throw new Error(`${field} must be an array`);
    }
  }
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
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

const serialize = (row) => row ? {
  ...row,
  _id: row.id,
  resumeFile: row.resumeFile || null,
  education: Array.isArray(row.education) ? row.education : [],
  experienceHistory: Array.isArray(row.experienceHistory) ? row.experienceHistory : [],
  certifications: Array.isArray(row.certifications) ? row.certifications : [],
  documents: Array.isArray(row.documents) ? row.documents : [],
} : null;

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
  if (path === 'createdBy' && doc.createdBy) {
    const [user] = await db.select().from(users).where(eq(users.id, typeof doc.createdBy === 'object' ? doc.createdBy.id || doc.createdBy._id : doc.createdBy)).limit(1);
    doc.createdBy = pickFields(user ? { ...user, _id: user.id } : null, select);
    return doc;
  }
  unsupported(`populate path "${path}"`);
};

class InterviewScheduleDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { status: 'Scheduled' }, serialize(row));
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
      const [row] = await db.insert(interviewSchedules).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }
    const [row] = await db.update(interviewSchedules).set(values).where(eq(interviewSchedules.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class InterviewScheduleQuery {
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
    const wrap = (row) => this.asLean ? serialize(row) : new InterviewScheduleDocument(row);
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

function InterviewSchedule(data) {
  return new InterviewScheduleDocument(data, { isNew: true });
}

InterviewSchedule.find = (query = {}) => new InterviewScheduleQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(interviewSchedules);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

InterviewSchedule.findOne = (query = {}) => new InterviewScheduleQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(interviewSchedules);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

InterviewSchedule.findById = (id) => new InterviewScheduleQuery(async () => {
  const rows = await db.select().from(interviewSchedules).where(eq(interviewSchedules.id, id)).limit(1);
  return rows[0] || null;
});

InterviewSchedule.create = async (data) => new InterviewScheduleDocument(data, { isNew: true }).save();

InterviewSchedule.findByIdAndUpdate = (id, data) => new InterviewScheduleQuery(async () => {
  const values = normalizeInput(data, { partial: true });
  const [row] = await db.update(interviewSchedules).set(values).where(eq(interviewSchedules.id, id)).returning();
  return row || null;
});

InterviewSchedule.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(interviewSchedules).where(eq(interviewSchedules.id, id)).returning();
  return row ? new InterviewScheduleDocument(row) : null;
};

InterviewSchedule.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(interviewSchedules);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

export default InterviewSchedule;
