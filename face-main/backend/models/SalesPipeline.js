import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import db from '../db/index.js';
import { salesPipelines } from '../db/schema/salesPipeline.js';
import { users } from '../db/schema/user.js';

const STAGES = new Set(['client_details', 'quotation', 'admin_approval', 'proposal', 'sent_to_client', 'negotiation', 'won_closed']);
const APPROVAL_STATUSES = new Set(['not_submitted', 'pending', 'approved', 'rejected', 'revision_requested']);
const CLIENT_METHODS = new Set(['Email', 'WhatsApp', 'Portal', 'In-Person', 'Other']);
const OUTCOME_STATUSES = new Set(['open', 'won', 'lost']);
const WRITABLE_FIELDS = ['lead', 'currentStage', 'clientDetails', 'quotation', 'approval', 'proposal', 'sentToClient', 'negotiation', 'outcome', 'stageHistory', 'createdAt', 'updatedAt'];

const columnByField = {
  id: salesPipelines.id,
  _id: salesPipelines.id,
  lead: salesPipelines.lead,
  currentStage: salesPipelines.currentStage,
  createdAt: salesPipelines.createdAt,
  updatedAt: salesPipelines.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported SalesPipeline query: ${message}`);
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

const pickWritable = (data = {}) => Object.fromEntries(WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]));
const asArray = (value) => Array.isArray(value) ? value : [];

const withToObject = (value) => {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(withToObject);
  const copy = { ...value };
  copy.toObject = () => ({ ...copy });
  return copy;
};

const defaultApproval = () => ({ status: 'not_submitted', history: [] });
const defaultOutcome = () => ({ status: 'open' });
const defaultProposal = () => ({ status: 'draft', version: 0, contentVersion: 0, sections: {}, pricing: { currency: 'INR' }, validity: {}, versions: [] });

const normalizeHistory = (history = []) => asArray(history).map((item) => ({
  ...item,
  changedAt: item.changedAt ? normalizeDate(item.changedAt) : undefined,
  actedAt: item.actedAt ? normalizeDate(item.actedAt) : undefined,
}));

const normalizeInput = (data = {}) => {
  const normalized = pickWritable(data);
  if (normalized.currentStage !== undefined && !STAGES.has(normalized.currentStage)) unsupported(`currentStage value "${normalized.currentStage}"`);

  if (normalized.clientDetails !== undefined) {
    normalized.clientDetails = { ...(normalized.clientDetails || {}) };
    if (normalized.clientDetails.updatedAt) normalized.clientDetails.updatedAt = normalizeDate(normalized.clientDetails.updatedAt);
  }
  if (normalized.quotation !== undefined) {
    normalized.quotation = { ...(normalized.quotation || {}) };
    if (normalized.quotation.amount !== undefined) normalized.quotation.amount = Number(normalized.quotation.amount);
    if (normalized.quotation.validUntil) normalized.quotation.validUntil = normalizeDate(normalized.quotation.validUntil);
    if (normalized.quotation.updatedAt) normalized.quotation.updatedAt = normalizeDate(normalized.quotation.updatedAt);
    normalized.quotation.lineItems = asArray(normalized.quotation.lineItems);
  }
  if (normalized.approval !== undefined) {
    normalized.approval = { ...defaultApproval(), ...(normalized.approval || {}) };
    if (!APPROVAL_STATUSES.has(normalized.approval.status)) unsupported(`approval.status value "${normalized.approval.status}"`);
    if (normalized.approval.submittedAt) normalized.approval.submittedAt = normalizeDate(normalized.approval.submittedAt);
    if (normalized.approval.approvedAt) normalized.approval.approvedAt = normalizeDate(normalized.approval.approvedAt);
    normalized.approval.history = normalizeHistory(normalized.approval.history);
  }
  if (normalized.proposal !== undefined) {
    normalized.proposal = { ...defaultProposal(), ...(normalized.proposal || {}) };
    if (!['draft', 'generated', 'finalized'].includes(normalized.proposal.status)) unsupported(`proposal.status value "${normalized.proposal.status}"`);
    for (const field of ['generatedAt', 'updatedAt', 'aiGeneratedAt', 'lastEditedAt']) {
      if (normalized.proposal[field]) normalized.proposal[field] = normalizeDate(normalized.proposal[field]);
    }
    normalized.proposal.version = Number(normalized.proposal.version || 0);
    normalized.proposal.contentVersion = Number(normalized.proposal.contentVersion || normalized.proposal.version || 0);
    normalized.proposal.sections = { ...(normalized.proposal.sections || {}) };
    normalized.proposal.pricing = { currency: 'INR', ...(normalized.proposal.pricing || {}) };
    normalized.proposal.validity = { ...(normalized.proposal.validity || {}) };
    normalized.proposal.versions = asArray(normalized.proposal.versions);
  }
  if (normalized.sentToClient !== undefined) {
    normalized.sentToClient = { ...(normalized.sentToClient || {}) };
    if (normalized.sentToClient.sentAt) normalized.sentToClient.sentAt = normalizeDate(normalized.sentToClient.sentAt);
    if (normalized.sentToClient.method && !CLIENT_METHODS.has(normalized.sentToClient.method)) unsupported(`sentToClient.method value "${normalized.sentToClient.method}"`);
  }
  if (normalized.negotiation !== undefined) {
    normalized.negotiation = { ...(normalized.negotiation || {}) };
    for (const field of ['enteredAt', 'lastNegotiationAt', 'expectedCloseDate']) {
      if (normalized.negotiation[field]) normalized.negotiation[field] = normalizeDate(normalized.negotiation[field]);
    }
  }
  if (normalized.outcome !== undefined) {
    normalized.outcome = { ...defaultOutcome(), ...(normalized.outcome || {}) };
    if (!OUTCOME_STATUSES.has(normalized.outcome.status)) unsupported(`outcome.status value "${normalized.outcome.status}"`);
    if (normalized.outcome.finalValue !== undefined) normalized.outcome.finalValue = Number(normalized.outcome.finalValue);
    if (normalized.outcome.closedAt) normalized.outcome.closedAt = normalizeDate(normalized.outcome.closedAt);
  }
  if (normalized.stageHistory !== undefined) normalized.stageHistory = normalizeHistory(normalized.stageHistory);
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  normalized.updatedAt = new Date();
  return normalized;
};

const serialize = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    clientDetails: withToObject(row.clientDetails || {}),
    quotation: withToObject(row.quotation || {}),
    approval: withToObject({ ...defaultApproval(), ...(row.approval || {}), history: asArray(row.approval?.history) }),
    proposal: withToObject({ ...defaultProposal(), ...(row.proposal || {}) }),
    sentToClient: withToObject(row.sentToClient || {}),
    negotiation: withToObject(row.negotiation || {}),
    outcome: withToObject({ ...defaultOutcome(), ...(row.outcome || {}) }),
    stageHistory: asArray(row.stageHistory),
  };
};

const matchValue = (actual, expected) => {
  if (Array.isArray(actual)) return actual.some((item) => matchValue(item, expected));
  return actual === expected;
};

const matchRow = (row, query = {}) => Object.entries(query).every(([field, expected]) => matchValue(field.includes('.') ? getNested(row, field) : row[field], expected));

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) return null;
    conditions.push(value === null ? isNull(column) : eq(column, value));
  }
  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

const selectRows = async (query = {}, options = {}) => {
  const where = buildWhere(query);
  let rows;
  if (where === null) rows = await db.select().from(salesPipelines);
  else {
    let builder = db.select().from(salesPipelines);
    if (where) builder = builder.where(where);
    rows = await builder;
  }
  rows = rows.map(serialize).filter((row) => matchRow(row, query));
  if (options.sortSpec) {
    rows = [...rows].sort((a, b) => {
      for (const [field, direction] of Object.entries(options.sortSpec)) {
        const av = getNested(a, field);
        const bv = getNested(b, field);
        if (av === bv) continue;
        return av > bv ? direction : -direction;
      }
      return 0;
    });
  }
  if (options.skipValue) rows = rows.slice(options.skipValue);
  if (options.limitValue) rows = rows.slice(0, options.limitValue);
  return rows;
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

const loadUser = async (id, select) => {
  if (!id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, typeof id === 'object' ? id.id || id._id : id)).limit(1);
  return pickFields(user ? { ...user, _id: user.id } : null, select);
};

const populateOne = async (doc, path, select) => {
  if (path === 'lead') {
    const Lead = (await import('./Lead.js')).default;
    doc.lead = await Lead.findById(typeof doc.lead === 'object' ? doc.lead.id || doc.lead._id : doc.lead).lean();
    doc.lead = pickFields(doc.lead, select);
  } else if (path === 'approval.submittedBy') {
    doc.approval.submittedBy = await loadUser(doc.approval.submittedBy, select);
  } else if (path === 'approval.approvedBy') {
    doc.approval.approvedBy = await loadUser(doc.approval.approvedBy, select);
  } else if (path === 'approval.history.actedBy') {
    doc.approval.history = await Promise.all(asArray(doc.approval.history).map(async (item) => ({ ...item, actedBy: await loadUser(item.actedBy, select) })));
  } else if (path === 'stageHistory.changedBy') {
    doc.stageHistory = await Promise.all(asArray(doc.stageHistory).map(async (item) => ({ ...item, changedBy: await loadUser(item.changedBy, select) })));
  } else unsupported(`populate path "${path}"`);
  return doc;
};

class SalesPipelineDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      currentStage: 'client_details',
      clientDetails: {},
      quotation: {},
      approval: defaultApproval(),
      proposal: defaultProposal(),
      sentToClient: {},
      negotiation: {},
      outcome: defaultOutcome(),
      stageHistory: [],
    }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async populate(path, select) {
    await populateOne(this, path, select);
    return this;
  }

  async save() {
    try {
      const values = normalizeInput(this);
      if (this.__isNew) {
        values.createdAt = new Date();
        const [row] = await db.insert(salesPipelines).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false });
        return this;
      }
      const [row] = await db.update(salesPipelines).set(values).where(eq(salesPipelines.id, this._id)).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    } catch (error) {
      if (error?.code === '23505') {
        error.code = 11000;
        error.keyPattern = { lead: 1 };
      }
      throw error;
    }
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class SalesPipelineQuery {
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
    const wrap = (row) => this.asLean ? serialize(row) : new SalesPipelineDocument(row);
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const docs = this.many ? wrapped : wrapped ? [wrapped] : [];
    for (const doc of docs) for (const spec of this.populateSpecs) await populateOne(doc, spec.path, spec.select);
    return wrapped;
  }
  then(resolve, reject) { return this.exec().then(resolve, reject); }
  catch(reject) { return this.exec().catch(reject); }
}

function SalesPipeline(data) {
  return new SalesPipelineDocument(data, { isNew: true });
}

SalesPipeline.find = (query = {}) => new SalesPipelineQuery((options) => selectRows(query, options), { many: true });
SalesPipeline.findOne = (query = {}) => new SalesPipelineQuery(async (options) => (await selectRows(query, { ...options, limitValue: 1 }))[0] || null);
SalesPipeline.findById = (id) => new SalesPipelineQuery(async () => (await selectRows({ _id: id }, { limitValue: 1 }))[0] || null);
SalesPipeline.create = async (data) => new SalesPipelineDocument(data, { isNew: true }).save();
SalesPipeline.countDocuments = async (query = {}) => (await selectRows(query)).length;

export default SalesPipeline;
