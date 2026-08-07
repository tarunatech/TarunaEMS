import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { groups } from '../db/schema/group.js';
import { users } from '../db/schema/user.js';

const MEMBER_ROLES = new Set(['owner', 'admin', 'member']);
const WRITABLE_FIELDS = [
  'name',
  'description',
  'avatar',
  'owner',
  'members',
  'settings',
  'isActive',
  'lastMessage',
  'createdAt',
  'updatedAt',
];

const defaultSettings = {
  onlyAdminsCanSend: false,
  onlyAdminsCanAddMembers: false,
  onlyAdminsCanEditInfo: true,
};

const columnByField = {
  id: groups.id,
  _id: groups.id,
  name: groups.name,
  description: groups.description,
  avatar: groups.avatar,
  owner: groups.owner,
  isActive: groups.isActive,
  createdAt: groups.createdAt,
  updatedAt: groups.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Group query: ${message}`);
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

const idEquals = (a, b) => String(toId(a)) === String(toId(b));

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const pickWritable = (data = {}) => Object.fromEntries(
  WRITABLE_FIELDS.filter((field) => data[field] !== undefined).map((field) => [field, data[field]]),
);

const normalizeMember = (member = {}) => {
  if (!member.user) throw new Error('Member user is required');
  const role = member.role || 'member';
  if (!MEMBER_ROLES.has(role)) unsupported(`member role value "${role}"`);
  return {
    ...member,
    user: toId(member.user),
    role,
    joinedAt: normalizeDate(member.joinedAt || new Date()),
    addedBy: member.addedBy ? toId(member.addedBy) : member.addedBy,
  };
};

const normalizeMembers = (members = []) => {
  if (!Array.isArray(members)) unsupported('members must be an array');
  return members.map(normalizeMember);
};

const normalizeLastMessage = (value = {}) => {
  if (!value || Object.keys(value).length === 0) return {};
  return {
    ...value,
    sender: value.sender ? toId(value.sender) : value.sender,
    timestamp: value.timestamp ? normalizeDate(value.timestamp) : value.timestamp,
  };
};

const normalizeInput = (data = {}, { partial = false } = {}) => {
  const normalized = pickWritable(data);

  if (!partial && !String(normalized.name || '').trim()) throw new Error('Group name is required');
  if (!partial && !normalized.owner) throw new Error('Owner is required');

  if (normalized.name !== undefined) {
    normalized.name = String(normalized.name).trim();
    if (normalized.name.length > 100) unsupported('name exceeds 100 characters');
  }
  if (normalized.description !== undefined) normalized.description = String(normalized.description).trim().substring(0, 500);
  if (normalized.owner !== undefined) normalized.owner = toId(normalized.owner);
  if (normalized.members !== undefined) normalized.members = normalizeMembers(normalized.members);
  if (normalized.settings !== undefined) normalized.settings = { ...defaultSettings, ...normalized.settings };
  if (normalized.lastMessage !== undefined) normalized.lastMessage = normalizeLastMessage(normalized.lastMessage);
  if (normalized.members === undefined && !partial) normalized.members = [];
  if (normalized.settings === undefined && !partial) normalized.settings = { ...defaultSettings };
  if (normalized.createdAt !== undefined) normalized.createdAt = normalizeDate(normalized.createdAt);
  if (normalized.updatedAt !== undefined) normalized.updatedAt = normalizeDate(normalized.updatedAt);
  normalized.updatedAt = new Date();

  return normalized;
};

const memberContains = (userId) => sql`${groups.members} @> ${JSON.stringify([{ user: toId(userId) }])}::jsonb`;

const buildWhere = (query = {}) => {
  const conditions = [];

  for (const [field, value] of Object.entries(query)) {
    if (field === 'members.user') {
      conditions.push(memberContains(value));
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

const populateUser = async (value, select) => {
  if (!value) return value;
  const [user] = await db.select().from(users).where(eq(users.id, toId(value))).limit(1);
  return pickFields(user ? { ...user, _id: user.id } : null, select);
};

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  const paths = String(path).split(/\s+/).filter(Boolean);

  for (const singlePath of paths) {
    if (singlePath === 'owner') {
      doc.owner = await populateUser(doc.owner, select);
      continue;
    }

    if (singlePath === 'members.user') {
      doc.members = await Promise.all((doc.members || []).map(async (member) => ({
        ...member,
        user: await populateUser(member.user, select),
      })));
      continue;
    }

    if (singlePath === 'members.addedBy') {
      doc.members = await Promise.all((doc.members || []).map(async (member) => ({
        ...member,
        addedBy: member.addedBy ? await populateUser(member.addedBy, select) : member.addedBy,
      })));
      continue;
    }

    if (singlePath === 'lastMessage.sender') {
      if (doc.lastMessage?.sender) {
        doc.lastMessage = {
          ...doc.lastMessage,
          sender: await populateUser(doc.lastMessage.sender, select),
        };
      }
      continue;
    }

    unsupported(`populate path "${singlePath}"`);
  }

  return doc;
};

class GroupDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      description: '',
      avatar: null,
      members: [],
      settings: { ...defaultSettings },
      isActive: true,
    }, serialize(row));
    this.settings = { ...defaultSettings, ...(this.settings || {}) };
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
      const [row] = await db.insert(groups).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }

    const [row] = await db.update(groups).set(values).where(eq(groups.id, this._id)).returning();
    Object.assign(this, serialize(row), { __isNew: false });
    this.settings = { ...defaultSettings, ...(this.settings || {}) };
    return this;
  }

  isMember(userId) {
    return (this.members || []).some((member) => idEquals(member.user, userId));
  }

  isAdmin(userId) {
    const member = (this.members || []).find((entry) => idEquals(entry.user, userId));
    return member && (member.role === 'admin' || member.role === 'owner');
  }

  isOwner(userId) {
    return idEquals(this.owner, userId);
  }

  getMemberRole(userId) {
    const member = (this.members || []).find((entry) => idEquals(entry.user, userId));
    return member ? member.role : null;
  }

  canSendMessage(userId) {
    if (!this.isMember(userId)) return false;
    if (!this.settings.onlyAdminsCanSend) return true;
    return this.isAdmin(userId);
  }

  canAddMembers(userId) {
    if (!this.isMember(userId)) return false;
    if (!this.settings.onlyAdminsCanAddMembers) return true;
    return this.isAdmin(userId);
  }

  canEditInfo(userId) {
    if (!this.isMember(userId)) return false;
    if (!this.settings.onlyAdminsCanEditInfo) return true;
    return this.isAdmin(userId);
  }

  toObject() { return serialize(this); }
  toJSON() { return this.toObject(); }
}

class GroupQuery {
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
  select() { return this; }
  lean() { this.asLean = true; return this; }

  async exec() {
    const result = await this.executor({
      sortSpec: this.sortSpec,
      limitValue: this.limitValue,
      skipValue: this.skipValue,
    });
    const wrap = (row) => this.asLean ? serialize(row) : new GroupDocument(row);
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

function Group(data) {
  return new GroupDocument(data, { isNew: true });
}

Group.find = (query = {}) => new GroupQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(groups);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Group.findOne = (query = {}) => new GroupQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(groups);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Group.findById = (id) => new GroupQuery(async () => {
  const rows = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
  return rows[0] || null;
});

Group.create = async (data) => new GroupDocument(data, { isNew: true }).save();

export default Group;
