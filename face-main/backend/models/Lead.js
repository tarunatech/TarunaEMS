import { and, asc, count, desc, eq, gte, inArray, isNull, lt, lte, ne, notInArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import db from '../db/index.js';
import { leads } from '../db/schema/lead.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';

const SOURCES = new Set(['Website', 'Social Media', 'Email Campaign', 'Cold Call', 'Referral', 'Trade Show', 'Advertisement', 'Other']);
const STATUSES = new Set(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost']);
const PRIORITIES = new Set(['Low', 'Medium', 'High', 'Hot']);
const ENGAGEMENTS = new Set(['Low', 'Medium', 'High']);
const MEETING_TYPES = new Set(['Call', 'Video Meeting', 'In-Person', 'Email Follow-up', 'Demo', 'Presentation', 'Negotiation']);
const MEETING_STATUSES = new Set(['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show']);
const NOTE_TYPES = new Set(['General', 'Meeting', 'Call', 'Email', 'Follow-up']);

const WRITABLE_FIELDS = [
  'leadId', 'firstName', 'lastName', 'email', 'phone', 'company', 'position', 'source', 'status', 'priority',
  'interestedProducts', 'estimatedValue', 'actualValue', 'expectedCloseDate', 'actualCloseDate', 'assignedTo',
  'assignedBy', 'meetings', 'totalMeetings', 'completedMeetings', 'upcomingMeetings', 'nextMeetingDate',
  'lastMeetingDate', 'averageMeetingDuration', 'notes', 'lastContactDate', 'nextFollowUpDate', 'address',
  'wonDetails', 'leadScore', 'engagementLevel', 'responseRate', 'tags', 'customFields', 'createdAt', 'updatedAt',
  'convertedAt',
];

const columnByField = {
  id: leads.id, _id: leads.id, leadId: leads.leadId, firstName: leads.firstName, lastName: leads.lastName,
  email: leads.email, phone: leads.phone, company: leads.company, position: leads.position, source: leads.source,
  status: leads.status, priority: leads.priority, estimatedValue: leads.estimatedValue, actualValue: leads.actualValue,
  expectedCloseDate: leads.expectedCloseDate, actualCloseDate: leads.actualCloseDate, assignedTo: leads.assignedTo,
  assignedBy: leads.assignedBy, totalMeetings: leads.totalMeetings, completedMeetings: leads.completedMeetings,
  upcomingMeetings: leads.upcomingMeetings, nextMeetingDate: leads.nextMeetingDate, lastMeetingDate: leads.lastMeetingDate,
  averageMeetingDuration: leads.averageMeetingDuration, lastContactDate: leads.lastContactDate,
  nextFollowUpDate: leads.nextFollowUpDate, leadScore: leads.leadScore, engagementLevel: leads.engagementLevel,
  responseRate: leads.responseRate, convertedAt: leads.convertedAt, createdAt: leads.createdAt, updatedAt: leads.updatedAt,
};

const unsupported = (message) => { throw new Error(`Unsupported Lead query: ${message}`); };
const normalizeDate = (value) => value === undefined ? undefined : value === null ? null : value instanceof Date ? value : new Date(value);
const getNested = (obj, path) => path.split('.').reduce((acc, key) => Array.isArray(acc) ? acc.map((item) => item?.[key]) : acc?.[key], obj);
const asArray = (value) => Array.isArray(value) ? value : [];
const pickWritable = (data = {}) => Object.fromEntries(WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));

const normalizeMeeting = (meeting = {}, index = 0, leadId = '') => {
  const normalized = {
    ...meeting,
    _id: meeting._id || meeting.id || randomUUID(),
    meetingId: meeting.meetingId || (leadId ? `${leadId}-M${(index + 1).toString().padStart(3, '0')}` : undefined),
    duration: Number(meeting.duration || 30),
    status: meeting.status || 'Scheduled',
    attendees: asArray(meeting.attendees),
    documents: asArray(meeting.documents),
    createdAt: meeting.createdAt ? normalizeDate(meeting.createdAt) : new Date(),
    updatedAt: meeting.updatedAt ? normalizeDate(meeting.updatedAt) : new Date(),
  };
  if (!MEETING_TYPES.has(normalized.type)) unsupported(`meeting type value "${normalized.type}"`);
  if (!MEETING_STATUSES.has(normalized.status)) unsupported(`meeting status value "${normalized.status}"`);
  if (normalized.scheduledDate !== undefined) normalized.scheduledDate = normalizeDate(normalized.scheduledDate);
  if (normalized.nextMeetingDate !== undefined) normalized.nextMeetingDate = normalizeDate(normalized.nextMeetingDate);
  normalized.toObject = () => ({ ...normalized });
  return normalized;
};

const normalizeNote = (note = {}) => {
  const normalized = {
    ...note,
    _id: note._id || note.id || randomUUID(),
    content: String(note.content || '').trim(),
    type: note.type || 'General',
    addedAt: note.addedAt ? normalizeDate(note.addedAt) : new Date(),
  };
  if (!normalized.content) throw new Error('Note content is required');
  if (!NOTE_TYPES.has(normalized.type)) unsupported(`note type value "${normalized.type}"`);
  return normalized;
};

const buildNextLeadId = async () => {
  const rows = await db.select({ leadId: leads.leadId }).from(leads);
  const maxNumber = rows.reduce((max, row) => {
    const match = String(row.leadId || '').match(/^LEAD(\d+)$/i);
    if (!match) return max;
    return Math.max(max, Number(match[1]));
  }, 0);
  return `LEAD${String(maxNumber + 1).padStart(6, '0')}`;
};

const recomputeDerived = async (values, existing = null) => {
  const merged = { ...(existing || {}), ...values };
  if (!merged.leadId) {
    values.leadId = await buildNextLeadId();
    merged.leadId = values.leadId;
  }
  const meetings = asArray(merged.meetings).map((meeting, index) => normalizeMeeting(meeting, index, merged.leadId));
  values.meetings = meetings;
  values.totalMeetings = meetings.length;
  values.completedMeetings = meetings.filter((meeting) => meeting.status === 'Completed').length;
  values.upcomingMeetings = meetings.filter((meeting) => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) > new Date()).length;
  const upcoming = meetings.filter((meeting) => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) > new Date()).sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  const completed = meetings.filter((meeting) => meeting.status === 'Completed').sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  values.nextMeetingDate = upcoming[0]?.scheduledDate || null;
  values.lastMeetingDate = completed[0]?.scheduledDate || null;
  const completedWithDuration = completed.filter((meeting) => meeting.duration);
  values.averageMeetingDuration = completedWithDuration.length
    ? Math.round(completedWithDuration.reduce((sum, meeting) => sum + Number(meeting.duration || 0), 0) / completedWithDuration.length)
    : 0;
  values.notes = asArray(merged.notes).map(normalizeNote);
  if (merged.status === 'Won' && !merged.wonDetails?.wonDate) {
    values.wonDetails = { ...(merged.wonDetails || {}), wonDate: new Date(), finalValue: merged.estimatedValue || 0 };
    values.actualCloseDate = new Date();
    values.convertedAt = new Date();
    values.actualValue = merged.estimatedValue || 0;
  } else if (merged.status === 'Lost' && !merged.actualCloseDate) {
    values.actualCloseDate = new Date();
    values.convertedAt = new Date();
  }
};

const normalizeInput = async (data = {}, existing = null) => {
  const normalized = pickWritable(data);
  for (const field of ['firstName', 'lastName', 'phone', 'company', 'position']) {
    if (normalized[field] !== undefined && normalized[field] !== null) normalized[field] = String(normalized[field]).trim();
  }
  if (normalized.email !== undefined) normalized.email = String(normalized.email).trim().toLowerCase();
  if (normalized.source !== undefined && !SOURCES.has(normalized.source)) unsupported(`source value "${normalized.source}"`);
  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) unsupported(`status value "${normalized.status}"`);
  if (normalized.priority !== undefined && !PRIORITIES.has(normalized.priority)) unsupported(`priority value "${normalized.priority}"`);
  if (normalized.engagementLevel !== undefined && !ENGAGEMENTS.has(normalized.engagementLevel)) unsupported(`engagementLevel value "${normalized.engagementLevel}"`);
  for (const field of ['estimatedValue', 'actualValue', 'leadScore', 'responseRate']) {
    if (normalized[field] !== undefined && normalized[field] !== null) normalized[field] = Number(normalized[field]);
  }
  for (const field of ['expectedCloseDate', 'actualCloseDate', 'lastContactDate', 'nextFollowUpDate', 'convertedAt', 'createdAt', 'updatedAt']) {
    if (normalized[field] !== undefined) normalized[field] = normalizeDate(normalized[field]);
  }
  if (normalized.interestedProducts !== undefined) normalized.interestedProducts = asArray(normalized.interestedProducts).map((item) => String(item).trim()).filter(Boolean);
  if (normalized.tags !== undefined) normalized.tags = asArray(normalized.tags).map((item) => String(item).trim()).filter(Boolean);
  if (normalized.address !== undefined) normalized.address = normalized.address || {};
  if (normalized.wonDetails !== undefined) normalized.wonDetails = normalized.wonDetails || {};
  if (normalized.customFields !== undefined) normalized.customFields = normalized.customFields || {};
  await recomputeDerived(normalized, existing);
  normalized.updatedAt = new Date();
  return normalized;
};

const addVirtuals = (row) => {
  const fullName = `${row.firstName} ${row.lastName}`;
  return {
    ...row,
    _id: row.id,
    fullName,
    daysSinceLastContact: row.lastContactDate ? Math.ceil(Math.abs(new Date() - new Date(row.lastContactDate)) / (1000 * 60 * 60 * 24)) : null,
    isOverdue: row.nextFollowUpDate ? new Date() > new Date(row.nextFollowUpDate) : false,
    conversionRate: row.totalMeetings === 0 ? 0 : Math.round((row.completedMeetings / row.totalMeetings) * 100),
  };
};

const serialize = (row) => row ? addVirtuals({
  ...row,
  interestedProducts: asArray(row.interestedProducts),
  meetings: asArray(row.meetings).map((meeting) => ({ ...meeting, toObject: () => ({ ...meeting }) })),
  notes: asArray(row.notes),
  address: row.address || {},
  wonDetails: row.wonDetails || {},
  tags: asArray(row.tags),
  customFields: row.customFields || {},
  estimatedValue: row.estimatedValue === null || row.estimatedValue === undefined ? row.estimatedValue : Number(row.estimatedValue),
  actualValue: row.actualValue === null || row.actualValue === undefined ? row.actualValue : Number(row.actualValue),
}) : null;

const OPERATOR_HANDLERS = {
  $gte: (actual, operand) => new Date(actual) >= operand,
  $lte: (actual, operand) => new Date(actual) <= operand,
  $lt: (actual, operand) => new Date(actual) < operand,
  $in: (actual, operand) => operand.includes(actual),
  $nin: (actual, operand) => !operand.includes(actual),
};

const matchValue = (actual, expected) => {
  if (Array.isArray(actual)) return actual.some((item) => matchValue(item, expected));
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    for (const [op, operand] of Object.entries(expected)) {
      const handler = OPERATOR_HANDLERS[op];
      if (!handler) unsupported(`operator "${op}"`);
      if (!handler(actual, operand)) return false;
    }
    return true;
  }
  return actual === expected;
};

const matchRow = (row, query = {}) => Object.entries(query).every(([field, expected]) => matchValue(field.includes('.') ? getNested(row, field) : row[field], expected));

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) return null;
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
        else if (op === '$in') conditions.push(inArray(column, operand));
        else if (op === '$nin') conditions.push(notInArray(column, operand));
        else if (op === '$ne') conditions.push(ne(column, operand));
        else unsupported(`operator "${op}" on field "${field}"`);
      }
    } else conditions.push(value === null ? isNull(column) : eq(column, value));
  }
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

const selectRows = async (query = {}, options = {}) => {
  const where = buildWhere(query);
  let rows;
  if (where === null) rows = await db.select().from(leads);
  else {
    let builder = db.select().from(leads);
    if (where) builder = builder.where(where);
    rows = await builder;
  }
  rows = rows.map(serialize).filter((row) => matchRow(row, query));
  if (options.sortSpec) rows = [...rows].sort((a, b) => {
    for (const [field, direction] of Object.entries(options.sortSpec)) {
      const av = getNested(a, field); const bv = getNested(b, field);
      if (av === bv) continue;
      return av > bv ? direction : -direction;
    }
    return 0;
  });
  if (options.skipValue) rows = rows.slice(options.skipValue);
  if (options.limitValue) rows = rows.slice(0, options.limitValue);
  return rows;
};

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };
  for (const field of selection.split(/\s+/).filter(Boolean)) {
    const value = getNested(obj, field);
    if (value !== undefined) {
      const parts = field.split('.'); let target = picked;
      for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] = target[parts[i]] || {};
      target[parts[parts.length - 1]] = value;
    }
  }
  return picked;
};

const loadUser = async (id, select) => {
  if (!id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, typeof id === 'object' ? id.id || id._id : id)).limit(1);
  return pickFields(user ? { ...user, _id: user.id } : null, select);
};
const loadEmployee = async (id, select) => {
  if (!id) return null;
  const [employee] = await db.select().from(employees).where(eq(employees.id, typeof id === 'object' ? id.id || id._id : id)).limit(1);
  return pickFields(employee ? { ...employee, _id: employee.id } : null, select);
};

const populateOne = async (doc, path, select) => {
  if (path === 'assignedTo') doc.assignedTo = await loadEmployee(doc.assignedTo, select);
  else if (path === 'assignedBy') doc.assignedBy = await loadUser(doc.assignedBy, select);
  else if (path === 'wonDetails.customerSuccessManager') {
    if (doc.wonDetails?.customerSuccessManager) {
      doc.wonDetails.customerSuccessManager = await loadEmployee(doc.wonDetails.customerSuccessManager, select);
    }
  }
  else if (path === 'notes.addedBy') doc.notes = await Promise.all(doc.notes.map(async (note) => ({ ...note, addedBy: await loadUser(note.addedBy, select) })));
  else if (path === 'meetings.createdBy') doc.meetings = await Promise.all(doc.meetings.map(async (meeting) => ({ ...meeting, createdBy: await loadUser(meeting.createdBy, select), toObject: () => ({ ...meeting }) })));
  else unsupported(`populate path "${path}"`);
  return doc;
};

class LeadDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, { status: 'New', priority: 'Medium', meetings: [], notes: [], wonDetails: {}, tags: [], interestedProducts: [] }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
    this.__original = serialize(row);
  }
  markModified() {}
  async populate(path, select) { await populateOne(this, path, select); return this; }
  async save() {
    try {
      const values = await normalizeInput(this, this.__isNew ? null : this.__original);
      if (this.__isNew) {
        values.createdAt = new Date();
        for (let attempt = 0; attempt < 3; attempt += 1) {
          try {
            const [row] = await db.insert(leads).values(values).returning();
            Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
            return this;
          } catch (error) {
            if (error?.code === '23505' && String(error?.constraint || '').includes('leadId')) {
              values.leadId = await buildNextLeadId();
              continue;
            }
            throw error;
          }
        }
        throw new Error('Failed to generate a unique leadId after multiple attempts.');
      }
      const [row] = await db.update(leads).set(values).where(eq(leads.id, this._id)).returning();
      Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
      return this;
    } catch (error) {
      if (error?.code === '23505') {
        error.code = 11000;
        error.keyValue = { leadId: this.leadId };
      }
      throw error;
    }
  }
  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class LeadQuery {
  constructor(executor, options = {}) { this.executor = executor; this.many = options.many || false; this.populateSpecs = []; this.sortSpec = null; this.limitValue = null; this.skipValue = null; this.asLean = false; }
  populate(path, select) { this.populateSpecs.push({ path, select }); return this; }
  sort(sortSpec) { this.sortSpec = sortSpec; return this; }
  limit(value) { this.limitValue = Number(value); return this; }
  skip(value) { this.skipValue = Number(value); return this; }
  lean() { this.asLean = true; return this; }
  async exec() {
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => this.asLean ? serialize(row) : new LeadDocument(row);
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];
    for (const doc of docs) for (const spec of this.populateSpecs) await populateOne(doc, spec.path, spec.select);
    return wrapped;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
}

function Lead(data) { return new LeadDocument(data, { isNew: true }); }
Lead.find = (query = {}) => new LeadQuery((options) => selectRows(query, options), { many: true });
Lead.findOne = (query = {}) => new LeadQuery(async (options) => (await selectRows(query, { ...options, limitValue: 1 }))[0] || null);
Lead.findById = (id) => new LeadQuery(async () => (await selectRows({ _id: id }, { limitValue: 1 }))[0] || null);
Lead.create = async (data) => new LeadDocument(data, { isNew: true }).save();
Lead.findByIdAndUpdate = (id, data) => new LeadQuery(async () => {
  const existing = await Lead.findById(id);
  if (!existing) return null;
  const values = await normalizeInput({ ...existing.toObject(), ...data }, existing.toObject());
  const [row] = await db.update(leads).set(values).where(eq(leads.id, id)).returning();
  return row || null;
});
Lead.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(leads).where(eq(leads.id, id)).returning();
  return row ? new LeadDocument(row) : null;
};
Lead.countDocuments = async (query = {}) => (await selectRows(query)).length;

const sum = (rows, path) => rows.reduce((total, row) => total + Number(getNested(row, path) || 0), 0);
const avg = (rows, path) => rows.length ? Math.round((sum(rows, path) / rows.length) * 100) / 100 : 0;

Lead.aggregate = async (pipeline = []) => {
  let rows = (await db.select().from(leads)).map(serialize);
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matchRow(row, stage.$match));
    else if (stage.$unwind === '$meetings') rows = rows.flatMap((row) => row.meetings.map((meeting) => ({ ...row, meetings: meeting })));
    else if (stage.$group) {
      const grouped = new Map();
      for (const row of rows) {
        let key;
        if (typeof stage.$group._id === 'string') key = getNested(row, stage.$group._id.slice(1));
        else if (stage.$group._id?.year && stage.$group._id?.month) key = JSON.stringify({ year: new Date(row.createdAt).getFullYear(), month: new Date(row.createdAt).getMonth() + 1 });
        else key = stage.$group._id;
        const bucket = grouped.get(key) || []; bucket.push(row); grouped.set(key, bucket);
      }
      rows = Array.from(grouped.entries()).map(([rawKey, bucket]) => {
        const key = rawKey?.startsWith?.('{') ? JSON.parse(rawKey) : rawKey;
        const result = { _id: key };
        for (const [field, expr] of Object.entries(stage.$group)) {
          if (field === '_id') continue;
          if (expr.$sum === 1) result[field] = bucket.length;
          else if (typeof expr.$sum === 'string') result[field] = sum(bucket, expr.$sum.slice(1));
          else if (expr.$sum?.$ifNull) result[field] = sum(bucket, expr.$sum.$ifNull[0].slice(1));
          else if (expr.$sum?.$cond) result[field] = bucket.reduce((t, row) => t + (getNested(row, expr.$sum.$cond[0].$eq[0].slice(1)) === expr.$sum.$cond[0].$eq[1] ? Number(typeof expr.$sum.$cond[1] === 'string' ? getNested(row, expr.$sum.$cond[1].slice(1)) || 0 : expr.$sum.$cond[1]) : Number(expr.$sum.$cond[2] || 0)), 0);
          else if (typeof expr.$avg === 'string') result[field] = avg(bucket, expr.$avg.slice(1));
          else unsupported(`aggregate group accumulator "${field}"`);
        }
        return result;
      });
    } else if (stage.$sort) rows = [...rows].sort((a, b) => {
      for (const [field, direction] of Object.entries(stage.$sort)) {
        const av = getNested(a, field); const bv = getNested(b, field);
        if (av === bv) continue; return av > bv ? direction : -direction;
      }
      return 0;
    });
    else if (stage.$lookup || stage.$project) continue;
    else unsupported(`aggregate stage "${Object.keys(stage)[0]}"`);
  }
  return rows;
};

Lead.getLeadStats = (employeeId) => Lead.aggregate([{ $match: { assignedTo: employeeId } }, { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$estimatedValue' }, actualValue: { $sum: '$actualValue' }, avgMeetings: { $avg: '$totalMeetings' } } }]);
Lead.getWonLeadsStats = (employeeId) => Lead.aggregate([{ $match: { ...(employeeId ? { assignedTo: employeeId } : {}), status: 'Won' } }, { $group: { _id: null, totalWon: { $sum: 1 }, totalRevenue: { $sum: '$wonDetails.finalValue' }, avgDealSize: { $avg: '$wonDetails.finalValue' }, totalRecurringRevenue: { $sum: '$wonDetails.recurringRevenue' }, avgMeetingsToClose: { $avg: '$completedMeetings' }, avgSatisfactionScore: { $avg: '$wonDetails.satisfactionScore' } } }]);
Lead.getMeetingStats = (employeeId) => Lead.aggregate([{ $match: employeeId ? { assignedTo: employeeId } : {} }, { $unwind: '$meetings' }, { $group: { _id: '$meetings.type', count: { $sum: 1 }, completed: { $sum: { $cond: [{ $eq: ['$meetings.status', 'Completed'] }, 1, 0] } }, avgDuration: { $avg: '$meetings.duration' } } }]);
Lead.getUpcomingMeetings = async (employeeId, days = 7) => {
  const endDate = new Date(); endDate.setDate(endDate.getDate() + days);
  const rows = await selectRows(employeeId ? { assignedTo: employeeId } : {});
  return rows.flatMap((row) => row.meetings.filter((meeting) => meeting.status === 'Scheduled' && new Date(meeting.scheduledDate) >= new Date() && new Date(meeting.scheduledDate) <= endDate).map((meeting) => ({ leadId: row.leadId, fullName: row.fullName, company: row.company, meeting, assignedTo: row.assignedTo }))).sort((a, b) => new Date(a.meeting.scheduledDate) - new Date(b.meeting.scheduledDate));
};
Lead.getOverdueLeads = (employeeId) => Lead.find({ assignedTo: employeeId, nextFollowUpDate: { $lt: new Date() }, status: { $nin: ['Won', 'Lost'] } }).populate('assignedTo', 'personalInfo.firstName personalInfo.lastName');

export default Lead;
