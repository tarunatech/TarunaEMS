import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { projectBudgets, projectBudgetItems } from '../db/schema/budget.js';
import { projects } from '../db/schema/project.js';
import { users } from '../db/schema/user.js';

const STATUSES = new Set(['Draft', 'Pending Approval', 'Approved', 'Rejected', 'Superseded']);

const WRITABLE_BUDGET_FIELDS = [
  'projectId',
  'budgetNumber',
  'version',
  'status',
  'totalPlannedAmount',
  'totalApprovedAmount',
  'currency',
  'notes',
  'createdBy',
  'approvedBy',
  'approvedAt',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: projectBudgets.id,
  _id: projectBudgets.id,
  projectId: projectBudgets.projectId,
  budgetNumber: projectBudgets.budgetNumber,
  version: projectBudgets.version,
  status: projectBudgets.status,
  totalPlannedAmount: projectBudgets.totalPlannedAmount,
  totalApprovedAmount: projectBudgets.totalApprovedAmount,
  currency: projectBudgets.currency,
  notes: projectBudgets.notes,
  createdBy: projectBudgets.createdBy,
  approvedBy: projectBudgets.approvedBy,
  approvedAt: projectBudgets.approvedAt,
  createdAt: projectBudgets.createdAt,
  updatedAt: projectBudgets.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported ProjectBudget query: ${message}`);
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
  for (const field of WRITABLE_BUDGET_FIELDS) {
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
  if (normalized.totalPlannedAmount !== undefined) {
    normalized.totalPlannedAmount = Number(normalized.totalPlannedAmount || 0);
  }
  if (normalized.totalApprovedAmount !== undefined) {
    normalized.totalApprovedAmount = Number(normalized.totalApprovedAmount || 0);
  }
  if (normalized.version !== undefined) {
    normalized.version = Number(normalized.version || 1);
  }

  for (const field of ['budgetNumber', 'currency', 'notes']) {
    if (normalized[field] !== undefined) normalized[field] = trimString(normalized[field]);
  }

  if (normalized.approvedAt !== undefined) normalized.approvedAt = normalizeDate(normalized.approvedAt);
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
      if ('$in' in value) {
        if (!Array.isArray(value.$in)) unsupported('$in must be an array');
        const validIn = value.$in.filter((v) => v !== '__none__');
        if (validIn.length === 0) {
          conditions.push(sql`1=0`);
        } else {
          conditions.push(inArray(column, validIn));
        }
        continue;
      }
      if ('$regex' in value) {
        conditions.push(ilike(column, `%${value.$regex}%`));
        continue;
      }
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
        else if (op === '$in') {
          const validOperand = Array.isArray(operand) ? operand.filter((v) => v !== '__none__') : [];
          if (validOperand.length === 0) {
            conditions.push(sql`1=0`);
          } else {
            conditions.push(inArray(column, validOperand));
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
    version: Number(row.version || 1),
    totalPlannedAmount: Number(row.totalPlannedAmount || 0),
    totalApprovedAmount: Number(row.totalApprovedAmount || 0),
  };
};

const serializeItem = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
    plannedAmount: Number(row.plannedAmount || 0),
    approvedAmount: Number(row.approvedAmount || 0),
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

const loadProject = async (id, select) => {
  if (!id) return null;
  const Project = (await import('./Project.js')).default;
  const project = await Project.findById(typeof id === 'object' ? id.id || id._id : id).lean();
  return pickFields(project, select);
};

const loadUser = async (id, select) => {
  if (!id) return null;
  const userId = typeof id === 'object' ? id.id || id._id : id;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return pickFields(user ? { ...user, _id: user.id } : null, select);
};

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;
  if (path === 'projectId') {
    doc.projectId = await loadProject(doc.projectId, select);
    return doc;
  }
  if (path === 'createdBy') {
    doc.createdBy = await loadUser(doc.createdBy, select);
    return doc;
  }
  if (path === 'approvedBy') {
    doc.approvedBy = await loadUser(doc.approvedBy, select);
    return doc;
  }
  unsupported(`populate path "${path}"`);
};

export const generateBudgetNumber = async (projectId) => {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const code = project ? project.projectCode : 'PRJ';
  const existing = await db
    .select({ version: projectBudgets.version })
    .from(projectBudgets)
    .where(eq(projectBudgets.projectId, projectId))
    .orderBy(desc(projectBudgets.version))
    .limit(1);

  const nextVersion = existing.length > 0 ? Number(existing[0].version) + 1 : 1;
  return {
    budgetNumber: `BUD-${code}-v${nextVersion}`,
    version: nextVersion,
  };
};

class ProjectBudgetDocument {
  constructor(row = {}, options = {}) {
    Object.assign(
      this,
      {
        version: 1,
        status: 'Draft',
        totalPlannedAmount: 0,
        totalApprovedAmount: 0,
        currency: 'INR',
        items: [],
      },
      serialize(row)
    );
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

  async loadItems() {
    const rows = await db
      .select()
      .from(projectBudgetItems)
      .where(eq(projectBudgetItems.budgetId, this.id))
      .orderBy(asc(projectBudgetItems.createdAt));
    this.items = rows.map(serializeItem);
    return this.items;
  }

  async save() {
    const values = normalizeInput(this);
    if (this.__isNew) {
      values.createdAt = new Date();
      const [row] = await db.insert(projectBudgets).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }
    const [row] = await db
      .update(projectBudgets)
      .set(values)
      .where(eq(projectBudgets.id, this._id))
      .returning();
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

class ProjectBudgetQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.populates = [];
    this.isLean = false;
    this.includeItems = false;
  }

  populate(path, select) {
    this.populates.push({ path, select });
    return this;
  }

  withItems() {
    this.includeItems = true;
    return this;
  }

  lean() {
    this.isLean = true;
    return this;
  }

  async exec() {
    const raw = await this.executor();
    if (this.many) {
      const docs = raw.map((item) => new ProjectBudgetDocument(item));
      for (const doc of docs) {
        for (const { path, select } of this.populates) await doc.populate(path, select);
        if (this.includeItems) await doc.loadItems();
      }
      return this.isLean ? docs.map((doc) => ({ ...doc.toObject(), items: doc.items })) : docs;
    }

    if (!raw) return null;
    const doc = new ProjectBudgetDocument(raw);
    for (const { path, select } of this.populates) await doc.populate(path, select);
    if (this.includeItems) await doc.loadItems();
    return this.isLean ? { ...doc.toObject(), items: doc.items } : doc;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }
}

const ProjectBudget = {
  find(query = {}) {
    const whereClause = buildWhere(query);
    let orderClause = [desc(projectBudgets.createdAt)];
    let limitValue;
    let offsetValue;

    const builder = {
      sort(spec = {}) {
        orderClause = Object.entries(spec).map(([key, dir]) => {
          const col = columnByField[key];
          if (!col) unsupported(`sort field "${key}"`);
          return dir === -1 || dir === 'desc' ? desc(col) : asc(col);
        });
        return this;
      },
      skip(value) {
        offsetValue = Number(value);
        return this;
      },
      limit(value) {
        limitValue = Number(value);
        return this;
      },
      populate(path, select) {
        queryObj.populate(path, select);
        return this;
      },
      withItems() {
        queryObj.withItems();
        return this;
      },
      lean() {
        queryObj.lean();
        return this;
      },
      then(resolve, reject) {
        return queryObj.then(resolve, reject);
      },
    };

    const queryObj = new ProjectBudgetQuery(async () => {
      let q = db.select().from(projectBudgets);
      if (whereClause) q = q.where(whereClause);
      if (orderClause.length) q = q.orderBy(...orderClause);
      if (limitValue !== undefined) q = q.limit(limitValue);
      if (offsetValue !== undefined) q = q.offset(offsetValue);
      return q;
    }, { many: true });

    return builder;
  },

  findOne(query = {}) {
    return new ProjectBudgetQuery(async () => {
      const whereClause = buildWhere(query);
      let q = db.select().from(projectBudgets);
      if (whereClause) q = q.where(whereClause);
      const [row] = await q.limit(1);
      return row || null;
    });
  },

  findById(id) {
    return new ProjectBudgetQuery(async () => {
      if (!id) return null;
      const [row] = await db.select().from(projectBudgets).where(eq(projectBudgets.id, id)).limit(1);
      return row || null;
    });
  },

  async create(data = {}) {
    const items = Array.isArray(data.items) ? data.items : [];
    const normalized = normalizeInput(data);

    if (!normalized.budgetNumber) {
      const generated = await generateBudgetNumber(normalized.projectId);
      normalized.budgetNumber = generated.budgetNumber;
      if (!normalized.version) normalized.version = generated.version;
    }

    // Compute total planned amount from items if items provided
    if (items.length > 0) {
      normalized.totalPlannedAmount = items.reduce((sum, item) => sum + Number(item.plannedAmount || 0), 0);
      normalized.totalApprovedAmount = items.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
    }

    normalized.createdAt = new Date();
    normalized.updatedAt = new Date();

    const [budget] = await db.insert(projectBudgets).values(normalized).returning();

    const createdItems = [];
    if (items.length > 0) {
      for (const item of items) {
        const itemData = {
          budgetId: budget.id,
          category: trimString(item.category) || 'General',
          description: trimString(item.description) || '',
          plannedAmount: Number(item.plannedAmount || 0),
          approvedAmount: Number(item.approvedAmount || 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const [createdItem] = await db.insert(projectBudgetItems).values(itemData).returning();
        createdItems.push(serializeItem(createdItem));
      }
    }

    const doc = new ProjectBudgetDocument(budget);
    doc.items = createdItems;
    return doc;
  },

  async findByIdAndUpdate(id, updateData = {}, options = {}) {
    const budgetId = typeof id === 'object' ? id.id || id._id : id;
    if (!budgetId) return null;

    const existing = await db.select().from(projectBudgets).where(eq(projectBudgets.id, budgetId)).limit(1);
    if (!existing.length) return null;

    const items = updateData.items;
    delete updateData.items;

    const normalized = normalizeInput(updateData);

    if (Array.isArray(items)) {
      normalized.totalPlannedAmount = items.reduce((sum, item) => sum + Number(item.plannedAmount || 0), 0);
      normalized.totalApprovedAmount = items.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
    }

    const [updated] = await db
      .update(projectBudgets)
      .set(normalized)
      .where(eq(projectBudgets.id, budgetId))
      .returning();

    if (Array.isArray(items)) {
      // Refresh items
      await db.delete(projectBudgetItems).where(eq(projectBudgetItems.budgetId, budgetId));
      for (const item of items) {
        await db.insert(projectBudgetItems).values({
          budgetId,
          category: trimString(item.category) || 'General',
          description: trimString(item.description) || '',
          plannedAmount: Number(item.plannedAmount || 0),
          approvedAmount: Number(item.approvedAmount || 0),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const doc = new ProjectBudgetDocument(updated);
    await doc.loadItems();
    return options.new === false ? serialize(existing[0]) : doc;
  },

  async approveBudget(budgetId, userId) {
    const [budget] = await db.select().from(projectBudgets).where(eq(projectBudgets.id, budgetId)).limit(1);
    if (!budget) throw new Error('Budget not found');
    if (budget.status !== 'Pending Approval' && budget.status !== 'Draft') {
      throw new Error(`Cannot approve budget with status "${budget.status}"`);
    }

    // Set all budget items approvedAmount = plannedAmount if approvedAmount is 0
    const items = await db.select().from(projectBudgetItems).where(eq(projectBudgetItems.budgetId, budgetId));
    let totalApproved = 0;
    for (const item of items) {
      const approvedAmt = Number(item.approvedAmount) > 0 ? Number(item.approvedAmount) : Number(item.plannedAmount);
      totalApproved += approvedAmt;
      await db
        .update(projectBudgetItems)
        .set({ approvedAmount: approvedAmt, updatedAt: new Date() })
        .where(eq(projectBudgetItems.id, item.id));
    }

    if (items.length === 0) {
      totalApproved = Number(budget.totalPlannedAmount || 0);
    }

    // Mark any previous 'Approved' budgets for this project as 'Superseded'
    await db
      .update(projectBudgets)
      .set({ status: 'Superseded', updatedAt: new Date() })
      .where(
        and(
          eq(projectBudgets.projectId, budget.projectId),
          eq(projectBudgets.status, 'Approved')
        )
      );

    // Update current budget to Approved
    const [approvedBudget] = await db
      .update(projectBudgets)
      .set({
        status: 'Approved',
        approvedBy: userId,
        approvedAt: new Date(),
        totalApprovedAmount: totalApproved,
        updatedAt: new Date(),
      })
      .where(eq(projectBudgets.id, budgetId))
      .returning();

    // Synchronize authoritative projects.approvedBudget
    await db
      .update(projects)
      .set({
        approvedBudget: totalApproved,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, budget.projectId));

    const doc = new ProjectBudgetDocument(approvedBudget);
    await doc.loadItems();
    return doc;
  },

  async rejectBudget(budgetId, userId, notes) {
    const [budget] = await db.select().from(projectBudgets).where(eq(projectBudgets.id, budgetId)).limit(1);
    if (!budget) throw new Error('Budget not found');
    if (budget.status !== 'Pending Approval' && budget.status !== 'Draft') {
      throw new Error(`Cannot reject budget with status "${budget.status}"`);
    }

    const [rejected] = await db
      .update(projectBudgets)
      .set({
        status: 'Rejected',
        notes: notes ? `${budget.notes ? budget.notes + '\n' : ''}Rejected: ${notes}` : budget.notes,
        updatedAt: new Date(),
      })
      .where(eq(projectBudgets.id, budgetId))
      .returning();

    const doc = new ProjectBudgetDocument(rejected);
    await doc.loadItems();
    return doc;
  },

  async submitForApproval(budgetId) {
    const [budget] = await db.select().from(projectBudgets).where(eq(projectBudgets.id, budgetId)).limit(1);
    if (!budget) throw new Error('Budget not found');
    if (budget.status !== 'Draft' && budget.status !== 'Rejected') {
      throw new Error(`Cannot submit budget with status "${budget.status}"`);
    }

    const [submitted] = await db
      .update(projectBudgets)
      .set({
        status: 'Pending Approval',
        updatedAt: new Date(),
      })
      .where(eq(projectBudgets.id, budgetId))
      .returning();

    const doc = new ProjectBudgetDocument(submitted);
    await doc.loadItems();
    return doc;
  },
};

export default ProjectBudget;
