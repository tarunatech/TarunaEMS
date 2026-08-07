import { and, asc, count, desc, eq, gte, ilike, inArray, isNotNull, isNull, lt, lte, ne, notInArray, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import db from '../db/index.js';
import { tasks } from '../db/schema/task.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';

const PRIORITIES = new Set(['Low', 'Medium', 'High', 'Critical']);
const STATUSES = new Set(['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled']);
const CATEGORIES = new Set(['Development', 'Design', 'Testing', 'Documentation', 'Research', 'Bug Fix', 'Feature', 'Maintenance', 'Other']);
const RECURRING_PATTERNS = new Set(['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly']);

const WRITABLE_FIELDS = [
  'title', 'description', 'assignedTo', 'assignedBy', 'project', 'priority', 'status', 'dueDate',
  'startDate', 'completedDate', 'estimatedHours', 'actualHours', 'category', 'tags', 'attachments',
  'comments', 'subtasks', 'dependencies', 'progress', 'isRecurring', 'recurringPattern',
  'lastRecurringDate', 'nextRecurringDate', 'isSelfAssigned', 'createdAt', 'updatedAt',
];

const columnByField = {
  id: tasks.id,
  _id: tasks.id,
  title: tasks.title,
  description: tasks.description,
  assignedTo: tasks.assignedTo,
  assignedBy: tasks.assignedBy,
  project: tasks.project,
  priority: tasks.priority,
  status: tasks.status,
  dueDate: tasks.dueDate,
  startDate: tasks.startDate,
  completedDate: tasks.completedDate,
  estimatedHours: tasks.estimatedHours,
  actualHours: tasks.actualHours,
  category: tasks.category,
  progress: tasks.progress,
  isRecurring: tasks.isRecurring,
  recurringPattern: tasks.recurringPattern,
  isSelfAssigned: tasks.isSelfAssigned,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Task query: ${message}`);
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

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const validateLength = (value, max, message) => {
  if (value !== undefined && value !== null && String(value).length > max) throw new Error(message);
};

const normalizeInput = (data = {}, existing = null) => {
  const normalized = pickWritable(data);

  for (const field of ['dueDate', 'startDate', 'completedDate', 'lastRecurringDate', 'nextRecurringDate', 'createdAt', 'updatedAt']) {
    if (normalized[field] !== undefined) normalized[field] = normalizeDate(normalized[field]);
  }

  if (normalized.title !== undefined) {
    normalized.title = String(normalized.title || 'Task').trim() || 'Task';
    validateLength(normalized.title, 100, 'Task title cannot exceed 100 characters');
  }
  if (normalized.description !== undefined) {
    normalized.description = String(normalized.description).trim();
    if (!normalized.description) throw new Error('Task description is required');
    validateLength(normalized.description, 1000, 'Task description cannot exceed 1000 characters');
  }
  if (normalized.project !== undefined) {
    normalized.project = String(normalized.project || '').trim();
    validateLength(normalized.project, 50, 'Project name cannot exceed 50 characters');
  }
  if (normalized.priority !== undefined && !PRIORITIES.has(normalized.priority)) unsupported(`priority value "${normalized.priority}"`);
  if (normalized.status !== undefined && !STATUSES.has(normalized.status)) unsupported(`status value "${normalized.status}"`);
  if (normalized.category !== undefined && !CATEGORIES.has(normalized.category)) unsupported(`category value "${normalized.category}"`);
  if (normalized.recurringPattern !== undefined && normalized.recurringPattern !== null && !RECURRING_PATTERNS.has(normalized.recurringPattern)) {
    unsupported(`recurringPattern value "${normalized.recurringPattern}"`);
  }

  if (normalized.estimatedHours !== undefined && normalized.estimatedHours !== null) {
    normalized.estimatedHours = Number(normalized.estimatedHours);
    if (normalized.estimatedHours < 0) throw new Error('Estimated hours cannot be negative');
    if (normalized.estimatedHours > 1000) throw new Error('Estimated hours cannot exceed 1000');
  }
  if (normalized.actualHours !== undefined) {
    normalized.actualHours = Number(normalized.actualHours || 0);
    if (normalized.actualHours < 0) throw new Error('Actual hours cannot be negative');
  }
  if (normalized.progress !== undefined) normalized.progress = Math.max(0, Math.min(100, Number(normalized.progress)));

  if (normalized.tags !== undefined) {
    normalized.tags = normalizeArray(normalized.tags).map((tag) => {
      const value = String(tag).trim();
      validateLength(value, 20, 'Tag cannot exceed 20 characters');
      return value;
    }).filter(Boolean);
  }

  if (normalized.comments !== undefined) {
    normalized.comments = normalizeArray(normalized.comments).map((comment) => ({
      ...comment,
      _id: comment._id || comment.id || randomUUID(),
      user: comment.user,
      text: String(comment.text || '').trim(),
      createdAt: comment.createdAt ? normalizeDate(comment.createdAt) : new Date(),
    }));
    for (const comment of normalized.comments) {
      if (!comment.text) throw new Error('Comment text is required');
      validateLength(comment.text, 500, 'Comment cannot exceed 500 characters');
    }
  }

  if (normalized.subtasks !== undefined) {
    normalized.subtasks = normalizeArray(normalized.subtasks).map((subtask) => ({
      ...subtask,
      _id: subtask._id || subtask.id || randomUUID(),
      title: String(subtask.title || '').trim(),
      completed: Boolean(subtask.completed),
      completedAt: subtask.completedAt ? normalizeDate(subtask.completedAt) : undefined,
      createdAt: subtask.createdAt ? normalizeDate(subtask.createdAt) : new Date(),
    }));
    for (const subtask of normalized.subtasks) {
      if (!subtask.title) throw new Error('Subtask title is required');
      validateLength(subtask.title, 100, 'Subtask title cannot exceed 100 characters');
    }
  }

  if (normalized.attachments !== undefined) normalized.attachments = normalizeArray(normalized.attachments);
  if (normalized.dependencies !== undefined) normalized.dependencies = normalizeArray(normalized.dependencies);

  const nextStatus = normalized.status ?? existing?.status;
  const nextSubtasks = normalized.subtasks ?? existing?.subtasks ?? [];
  if (nextStatus === 'Completed' && !normalized.completedDate && !existing?.completedDate) {
    normalized.completedDate = new Date();
    normalized.progress = 100;
  }
  if (normalized.status !== undefined && nextStatus !== 'Completed') normalized.completedDate = null;
  if (nextSubtasks.length > 0 && nextStatus !== 'Completed') {
    const completed = nextSubtasks.filter((subtask) => subtask.completed).length;
    normalized.progress = Math.round((completed / nextSubtasks.length) * 100);
  }
  if ((normalized.isRecurring ?? existing?.isRecurring) && !(normalized.recurringPattern ?? existing?.recurringPattern)) {
    throw new Error('Recurring pattern is required');
  }

  normalized.updatedAt = new Date();
  return normalized;
};

const addVirtuals = (row) => {
  const serialized = { ...row, _id: row.id };
  serialized.statusColor = {
    'Not Started': 'gray',
    'In Progress': 'blue',
    Review: 'yellow',
    Completed: 'green',
    'On Hold': 'orange',
    Cancelled: 'red',
  }[serialized.status] || 'gray';
  serialized.priorityColor = {
    Low: 'green',
    Medium: 'yellow',
    High: 'orange',
    Critical: 'red',
  }[serialized.priority] || 'gray';
  serialized.isOverdue = serialized.status !== 'Completed' && new Date() > new Date(serialized.dueDate);
  serialized.daysRemaining = serialized.status === 'Completed'
    ? 0
    : Math.ceil((new Date(serialized.dueDate) - new Date()) / (1000 * 60 * 60 * 24));
  serialized.subtasksProgress = serialized.subtasks?.length
    ? Math.round((serialized.subtasks.filter((subtask) => subtask.completed).length / serialized.subtasks.length) * 100)
    : 0;
  return serialized;
};

const serialize = (row) => {
  if (!row) return null;
  return addVirtuals({
    ...row,
    estimatedHours: row.estimatedHours === null || row.estimatedHours === undefined ? row.estimatedHours : Number(row.estimatedHours),
    actualHours: Number(row.actualHours || 0),
    tags: normalizeArray(row.tags),
    attachments: normalizeArray(row.attachments),
    comments: normalizeArray(row.comments),
    subtasks: normalizeArray(row.subtasks),
    dependencies: normalizeArray(row.dependencies),
  });
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
        else if (op === '$in') conditions.push(inArray(column, operand));
        else if (op === '$nin') conditions.push(notInArray(column, operand));
        else if (op === '$ne') conditions.push(ne(column, operand));
        else if (op === '$exists') conditions.push(operand ? isNotNull(column) : isNull(column));
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
        else if (op === '$in' && !value.includes(actual)) return false;
        else if (op === '$nin' && value.includes(actual)) return false;
        else if (op === '$ne' && actual === value) return false;
        else if (op === '$exists' && (value ? actual === undefined || actual === null : actual !== undefined && actual !== null)) return false;
        else unsupported(`aggregate match operator "${op}" on field "${field}"`);
      }
      continue;
    }
    if (actual !== expected) return false;
  }
  return true;
};

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };
  for (const field of selection.split(/\s+/).filter(Boolean)) {
    const value = getNested(obj, field);
    if (value !== undefined) {
      const parts = field.split('.');
      let target = picked;
      for (let i = 0; i < parts.length - 1; i++) target = target[parts[i]] = target[parts[i]] || {};
      target[parts[parts.length - 1]] = value;
    }
  }
  return picked;
};

const loadUser = async (id, select) => {
  const userId = typeof id === 'object' ? id.id || id._id : id;
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return pickFields(row ? { ...row, _id: row.id } : null, select);
};

const loadEmployee = async (id, select) => {
  const employeeId = typeof id === 'object' ? id.id || id._id : id;
  const [row] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  return pickFields(row ? { ...row, _id: row.id } : null, select);
};

const populateOne = async (doc, spec) => {
  const path = spec.path || spec;
  if (path === 'assignedTo' && doc.assignedTo) {
    doc.assignedTo = await loadEmployee(doc.assignedTo, spec.select);
    if (spec.populate?.path === 'user' && doc.assignedTo) doc.assignedTo.user = await loadUser(doc.assignedTo.user, spec.populate.select);
    return doc;
  }
  if (path === 'assignedBy' && doc.assignedBy) {
    doc.assignedBy = await loadUser(doc.assignedBy, spec.select);
    return doc;
  }
  if (path === 'comments.user') {
    doc.comments = await Promise.all(normalizeArray(doc.comments).map(async (comment) => ({
      ...comment,
      user: await loadUser(comment.user, spec.select),
    })));
    return doc;
  }
  unsupported(`populate path "${path}"`);
};

class TaskDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      title: 'Task',
      project: '',
      priority: 'Medium',
      status: 'Not Started',
      actualHours: 0,
      category: 'Other',
      tags: [],
      attachments: [],
      comments: [],
      subtasks: [],
      dependencies: [],
      progress: 0,
      isRecurring: false,
      isSelfAssigned: false,
    }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
    this.__original = serialize(row);
  }

  async populate(spec, select) {
    const specs = Array.isArray(spec) ? spec : [{ path: spec, select }];
    for (const item of specs) await populateOne(this, item);
    return this;
  }

  async save() {
    const values = normalizeInput(this, this.__isNew ? null : this.__original);
    if (this.__isNew) {
      values.createdAt = new Date();
      const [row] = await db.insert(tasks).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
      return this;
    }
    const [row] = await db.update(tasks).set(values).where(eq(tasks.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
    return this;
  }

  async addComment(userId, text) {
    this.comments.push({ _id: randomUUID(), user: userId, text, createdAt: new Date() });
    return this.save();
  }

  async addSubtask(title) {
    this.subtasks.push({ _id: randomUUID(), title, completed: false, createdAt: new Date() });
    return this.save();
  }

  async toggleSubtask(subtaskId) {
    const subtask = this.subtasks.find((item) => item._id === subtaskId || item.id === subtaskId);
    if (!subtask) throw new Error('Subtask not found');
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;
    return this.save();
  }

  async updateProgress(progress) {
    this.progress = Math.max(0, Math.min(100, Number(progress)));
    if (this.progress === 100 && this.status !== 'Completed') {
      this.status = 'Completed';
      this.completedDate = new Date();
    } else if (this.progress > 0 && this.status === 'Not Started') {
      this.status = 'In Progress';
    }
    return this.save();
  }

  async changeStatus(newStatus) {
    this.status = newStatus;
    if (newStatus === 'Completed') {
      this.completedDate = new Date();
      this.progress = 100;
    } else if (newStatus === 'In Progress' && this.progress === 0) {
      this.progress = 10;
    }
    return this.save();
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class TaskQuery {
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
    else this.populateSpecs.push({ path, select });
    return this;
  }
  sort(sortSpec) { this.sortSpec = sortSpec; return this; }
  limit(value) { this.limitValue = Number(value); return this; }
  skip(value) { this.skipValue = Number(value); return this; }
  lean() { this.asLean = true; return this; }
  async exec() {
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => (this.asLean ? serialize(row) : new TaskDocument(row));
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
    const [[field, direction]] = Object.entries(sortSpec);
    const column = columnByField[field];
    if (!column) unsupported(`sort field "${field}"`);
    query = query.orderBy(direction === -1 ? desc(column) : asc(column));
  }
  if (skipValue) query = query.offset(skipValue);
  if (limitValue) query = query.limit(limitValue);
  return query;
};

function Task(data) {
  return new TaskDocument(data, { isNew: true });
}

Task.find = (query = {}) => new TaskQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(tasks);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Task.findOne = (query = {}) => new TaskQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(tasks);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Task.findById = (id) => new TaskQuery(async () => {
  const rows = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return rows[0] || null;
});

Task.create = async (data) => new TaskDocument(data, { isNew: true }).save();

Task.findByIdAndUpdate = (id, data) => new TaskQuery(async () => {
  const existing = await Task.findById(id);
  if (!existing) return null;
  const values = normalizeInput({ ...existing.toObject(), ...data }, existing.toObject());
  const [row] = await db.update(tasks).set(values).where(eq(tasks.id, id)).returning();
  return row || null;
});

Task.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(tasks).where(eq(tasks.id, id)).returning();
  return row ? new TaskDocument(row) : null;
};

Task.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(tasks);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Task.aggregate = async (pipeline = []) => {
  let rows = (await db.select().from(tasks)).map(serialize);
  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matchRow(row, stage.$match));
    else if (stage.$group) {
      const grouped = new Map();
      for (const row of rows) {
        const key = typeof stage.$group._id === 'string' && stage.$group._id.startsWith('$') ? getNested(row, stage.$group._id.slice(1)) : stage.$group._id;
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
    } else if (stage.$project) {
      rows = rows.map((row) => {
        const projected = {};
        for (const [field, expr] of Object.entries(stage.$project)) {
          if (expr === 0) continue;
          projected[field] = typeof expr === 'string' && expr.startsWith('$') ? getNested(row, expr.slice(1)) : row[field];
        }
        return projected;
      });
    } else if (stage.$sort) {
      const entries = Object.entries(stage.$sort);
      rows = [...rows].sort((a, b) => {
        for (const [field, direction] of entries) {
          const av = getNested(a, field);
          const bv = getNested(b, field);
          if (av === bv) continue;
          return av > bv ? direction : -direction;
        }
        return 0;
      });
    } else unsupported(`aggregate stage "${Object.keys(stage)[0]}"`);
  }
  return rows;
};

Task.getEmployeeStats = async (employeeId) => {
  const stats = await Task.aggregate([
    { $match: { assignedTo: employeeId } },
    { $group: { _id: '$status', count: { $sum: 1 }, totalHours: { $sum: '$actualHours' } } },
  ]);
  const overdue = await Task.countDocuments({ assignedTo: employeeId, status: { $nin: ['Completed', 'Cancelled'] }, dueDate: { $lt: new Date() } });
  return { statusStats: stats, overdue };
};

Task.getByProject = (projectName) => Task.find({ project: projectName })
  .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
  .populate('assignedBy', 'name')
  .sort({ createdAt: -1 });

Task.getOverdueTasks = () => Task.find({ status: { $nin: ['Completed', 'Cancelled'] }, dueDate: { $lt: new Date() } })
  .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
  .sort({ dueDate: 1 });

export default Task;
