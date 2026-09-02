import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { notifications } from '../db/schema/notification.js';
import { users } from '../db/schema/user.js';

const TYPES = new Set(['info', 'success', 'warning', 'error']);
const CATEGORIES = new Set(['attendance', 'leave', 'task', 'employee', 'system']);
const RELATED_MODELS = new Set(['Attendance', 'Leave', 'Task', 'Employee', 'DayBook']);
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

const WRITABLE_FIELDS = [
  'title',
  'message',
  'type',
  'category',
  'targetUsers',
  'sender',
  'relatedEntity',
  'isRead',
  'readBy',
  'priority',
  'metadata',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: notifications.id,
  _id: notifications.id,
  title: notifications.title,
  message: notifications.message,
  type: notifications.type,
  category: notifications.category,
  sender: notifications.sender,
  isRead: notifications.isRead,
  priority: notifications.priority,
  createdAt: notifications.createdAt,
  updatedAt: notifications.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Notification query: ${message}`);
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const toId = (value) => {
  if (!value) return value;
  if (typeof value === 'object') return value.id || value._id;
  return value;
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const pickWritable = (data = {}) => Object.fromEntries(
  WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]),
);

const normalizeRelatedEntity = (value = {}) => {
  if (!value || Object.keys(value).length === 0) return {};
  const normalized = { ...value };
  if (normalized.model !== undefined && !RELATED_MODELS.has(normalized.model)) {
    unsupported(`relatedEntity.model value "${normalized.model}"`);
  }
  if (normalized.id !== undefined) normalized.id = toId(normalized.id);
  return normalized;
};

const normalizeReadBy = (value = []) => {
  if (!Array.isArray(value)) unsupported('readBy must be an array');
  return value.map((entry) => ({
    ...entry,
    user: toId(entry.user),
    readAt: normalizeDate(entry.readAt || new Date()),
  }));
};

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);

  if (!partial && !String(normalized.title || '').trim()) throw new Error('Title is required');
  if (!partial && !String(normalized.message || '').trim()) throw new Error('Message is required');
  if (!partial && !normalized.category) throw new Error('Category is required');
  if (!partial && !normalized.sender) throw new Error('Sender is required');

  if (normalized.title !== undefined) normalized.title = String(normalized.title).trim();
  if (normalized.message !== undefined) normalized.message = String(normalized.message).trim();
  if (normalized.type !== undefined && !TYPES.has(normalized.type)) unsupported(`type value "${normalized.type}"`);
  if (normalized.category !== undefined && !CATEGORIES.has(normalized.category)) unsupported(`category value "${normalized.category}"`);
  if (normalized.priority !== undefined && !PRIORITIES.has(normalized.priority)) unsupported(`priority value "${normalized.priority}"`);
  if (normalized.targetUsers !== undefined) {
    if (!Array.isArray(normalized.targetUsers)) unsupported('targetUsers must be an array');
    normalized.targetUsers = normalized.targetUsers.map(toId);
  }
  if (normalized.sender !== undefined) normalized.sender = toId(normalized.sender);
  if (normalized.relatedEntity !== undefined) normalized.relatedEntity = normalizeRelatedEntity(normalized.relatedEntity);
  if (normalized.readBy !== undefined) normalized.readBy = normalizeReadBy(normalized.readBy);
  if (normalized.metadata === undefined && !partial) normalized.metadata = {};
  if (normalized.relatedEntity === undefined && !partial) normalized.relatedEntity = {};
  if (normalized.readBy === undefined && !partial) normalized.readBy = [];
  if (normalized.targetUsers === undefined && !partial) normalized.targetUsers = [];
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  normalized.updatedAt = new Date();

  return normalized;
};

const jsonArrayContains = (column, value) => sql`${column} @> ${JSON.stringify([toId(value)])}::jsonb`;

const buildWhere = (query = {}) => {
  const conditions = [];

  for (const [field, value] of Object.entries(query)) {
    if (field === 'targetUsers') {
      conditions.push(jsonArrayContains(notifications.targetUsers, value));
      continue;
    }

    if (field === 'relatedEntity.model') {
      conditions.push(sql`${notifications.relatedEntity}->>'model' = ${value}`);
      continue;
    }

    if (field === 'relatedEntity.id') {
      conditions.push(sql`${notifications.relatedEntity}->>'id' = ${toId(value)}`);
      continue;
    }

    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);
    conditions.push(value === null ? isNull(column) : eq(column, value));
  }

  if (conditions.length === 0) return undefined;
  return conditions.length === 1 ? conditions[0] : and(...conditions);
};

const serialize = (row) => row ? { ...row, _id: row.id } : null;

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const fields = selection.split(/\s+/).filter(Boolean);
  if (fields.length === 0) return obj;
  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };
  for (const field of fields) {
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
  const paths = String(path).split(/\s+/).filter(Boolean);

  for (const singlePath of paths) {
    if (singlePath === 'sender' && doc.sender) {
      const [user] = await db.select().from(users).where(eq(users.id, toId(doc.sender))).limit(1);
      doc.sender = pickFields(user ? { ...user, _id: user.id } : null, select);
      continue;
    }

    if (singlePath === 'relatedEntity.id') {
      continue;
    }

    unsupported(`populate path "${singlePath}"`);
  }

  return doc;
};

class NotificationDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      type: 'info',
      isRead: false,
      readBy: [],
      priority: 'medium',
      metadata: {},
    }, serialize(row));
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
      const [row] = await db.insert(notifications).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }

    const [row] = await db.update(notifications).set(values).where(eq(notifications.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    return this;
  }

  async markAsRead(userId) {
    try {
      if (!this.isRead) {
        this.isRead = true;
        this.readBy = Array.isArray(this.readBy) ? this.readBy : [];
        this.readBy.push({ user: userId, readAt: new Date() });
        await this.save();
      }
      return this;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async deleteOne() {
    await db.delete(notifications).where(eq(notifications.id, this._id));
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class NotificationQuery {
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
    const result = await this.executor({
      sortSpec: this.sortSpec,
      limitValue: this.limitValue,
      skipValue: this.skipValue,
    });
    const wrap = (row) => this.asLean ? serialize(row) : new NotificationDocument(row);
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

function Notification(data) {
  return new NotificationDocument(data, { isNew: true });
}

Notification.find = (query = {}) => new NotificationQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(notifications);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Notification.findOne = (query = {}) => new NotificationQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(notifications);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Notification.findById = (id) => new NotificationQuery(async () => {
  const rows = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
  return rows[0] || null;
});

Notification.create = async (data) => new NotificationDocument(data, { isNew: true }).save();

Notification.createNotification = async (data) => {
  try {
    const notification = await Notification.create(data);
    await notification.populate('sender', 'name email');
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

Notification.getUserNotifications = async (userId, options = {}) => {
  try {
    const { page = 1, limit = 20, category, isRead, type } = options;
    const query = { targetUsers: userId };

    if (category) query.category = category;
    if (typeof isRead === 'boolean') query.isRead = isRead;
    if (type) query.type = type;

    const userNotifications = await Notification.find(query)
      .populate('sender', 'name email')
      .populate('relatedEntity.id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);

    return {
      notifications: userNotifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

Notification.getUnreadCount = async (userId) => {
  try {
    return await Notification.countDocuments({ targetUsers: userId, isRead: false });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

Notification.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(notifications);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Notification.aggregate = async (pipeline = []) => {
  if (
    pipeline.length === 2
    && pipeline[0]?.$match
    && pipeline[1]?.$group?.count?.$sum === 1
  ) {
    const groupId = pipeline[1].$group._id;
    const field = typeof groupId === 'string' && groupId.startsWith('$') ? groupId.slice(1) : null;
    const column = columnByField[field];
    if (!column) unsupported(`aggregate group field "${groupId}"`);

    const where = buildWhere(pipeline[0].$match);
    let builder = db.select({ _id: column, count: count() }).from(notifications);
    if (where) builder = builder.where(where);
    return builder.groupBy(column);
  }

  unsupported('aggregate pipeline');
};

export default Notification;
