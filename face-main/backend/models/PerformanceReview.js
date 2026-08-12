import { and, asc, desc, eq } from 'drizzle-orm';
import db from '../db/index.js';
import { performanceReviews } from '../db/schema/performanceReview.js';
import Task from './Task.js';

const WRITABLE_FIELDS = [
  'employeeId',
  'month',
  'totalTasks',
  'onTimeCount',
  'lateCount',
  'autoScore',
  'suggestedRating',
  'adminRating',
  'adminComment',
  'ratedBy',
  'ratedAt',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: performanceReviews.id,
  _id: performanceReviews.id,
  employeeId: performanceReviews.employeeId,
  month: performanceReviews.month,
  totalTasks: performanceReviews.totalTasks,
  onTimeCount: performanceReviews.onTimeCount,
  lateCount: performanceReviews.lateCount,
  autoScore: performanceReviews.autoScore,
  suggestedRating: performanceReviews.suggestedRating,
  adminRating: performanceReviews.adminRating,
  adminComment: performanceReviews.adminComment,
  ratedBy: performanceReviews.ratedBy,
  ratedAt: performanceReviews.ratedAt,
  createdAt: performanceReviews.createdAt,
  updatedAt: performanceReviews.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported PerformanceReview query: ${message}`);
};

const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const normalizeInput = (data = {}) => {
  const normalized = pickWritable(data);
  for (const field of ['ratedAt', 'createdAt', 'updatedAt']) {
    if (normalized[field] !== undefined) normalized[field] = normalizeDate(normalized[field]);
  }
  for (const field of ['totalTasks', 'onTimeCount', 'lateCount', 'suggestedRating', 'adminRating']) {
    if (normalized[field] !== undefined && normalized[field] !== null) normalized[field] = Number(normalized[field]);
  }
  if (normalized.autoScore !== undefined) normalized.autoScore = Number(normalized.autoScore || 0);
  if (normalized.adminComment !== undefined && normalized.adminComment !== null) {
    normalized.adminComment = String(normalized.adminComment).slice(0, 1000);
  }
  normalized.updatedAt = new Date();
  return normalized;
};

const serialize = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    autoScore: Number(row.autoScore || 0),
  };
};

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);
    conditions.push(eq(column, value));
  }
  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
};

class PerformanceReviewDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, serialize(row));
    this.__isNew = options.isNew || !this._id;
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class PerformanceReviewQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.asLean = false;
  }

  sort(sortSpec) { this.sortSpec = sortSpec; return this; }
  limit(value) { this.limitValue = Number(value); return this; }
  skip(value) { this.skipValue = Number(value); return this; }
  lean() { this.asLean = true; return this; }

  async exec() {
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => (this.asLean ? serialize(row) : new PerformanceReviewDocument(row));
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

const monthBounds = (month) => {
  const [year, monthIndex] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, monthIndex - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  return { start, end };
};

const dateOnlyTime = (value) => {
  const date = new Date(value);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

const isOnTime = (task) => {
  if (!task.completedDate || !task.dueDate) return false;
  return dateOnlyTime(task.completedDate) <= dateOnlyTime(task.dueDate);
};

function PerformanceReview(data) {
  return new PerformanceReviewDocument(data, { isNew: true });
}

PerformanceReview.find = (query = {}) => new PerformanceReviewQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(performanceReviews);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

PerformanceReview.findOne = (query = {}) => new PerformanceReviewQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(performanceReviews);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

PerformanceReview.findById = (id) => new PerformanceReviewQuery(async () => {
  const rows = await db.select().from(performanceReviews).where(eq(performanceReviews.id, id)).limit(1);
  return rows[0] || null;
});

PerformanceReview.create = async (data) => {
  const values = normalizeInput(data);
  values.createdAt = new Date();
  const [row] = await db.insert(performanceReviews).values(values).returning();
  return new PerformanceReviewDocument(row);
};

PerformanceReview.findByIdAndUpdate = (id, data) => new PerformanceReviewQuery(async () => {
  const values = normalizeInput(data);
  const [row] = await db.update(performanceReviews).set(values).where(eq(performanceReviews.id, id)).returning();
  return row || null;
});

PerformanceReview.computeForEmployeeMonth = async (employeeId, month) => {
  const { start, end } = monthBounds(month);
  const completedTasks = await Task.find({
    assignedTo: employeeId,
    status: 'Completed',
    completedDate: { $gte: start, $lt: end },
  }).lean();

  const totalTasks = completedTasks.length;
  const onTimeCount = completedTasks.filter(isOnTime).length;
  const lateCount = totalTasks - onTimeCount;
  const autoScore = totalTasks > 0 ? Math.round((onTimeCount / totalTasks) * 100) : 0;
  const suggestedRating = autoScore >= 90 ? 5
    : autoScore >= 75 ? 4
      : autoScore >= 60 ? 3
        : autoScore >= 40 ? 2
          : totalTasks > 0 ? 1
            : 0;

  const computedFields = { totalTasks, onTimeCount, lateCount, autoScore, suggestedRating };
  const existing = await PerformanceReview.findOne({ employeeId, month }).lean();

  if (existing) {
    const updated = await PerformanceReview.findByIdAndUpdate(existing._id, computedFields).lean();
    return updated;
  }

  return PerformanceReview.create({ employeeId, month, ...computedFields });
};

PerformanceReview.isTaskOnTime = isOnTime;
PerformanceReview.monthBounds = monthBounds;

export default PerformanceReview;
