import { and, asc, count, desc, eq, inArray, ne } from 'drizzle-orm';
import db from '../db/index.js';
import { departments } from '../db/schema/department.js';

const ALLOWED_STATUSES = new Set(['Active', 'Inactive', 'Restructuring']);

const columnByField = {
  id: departments.id,
  _id: departments.id,
  name: departments.name,
  code: departments.code,
  description: departments.description,
  manager: departments.manager,
  location: departments.location,
  budget: departments.budget,
  status: departments.status,
  establishedDate: departments.establishedDate,
  goals: departments.goals,
  parentDepartment: departments.parentDepartment,
  employeeCount: departments.employeeCount,
  createdAt: departments.createdAt,
  updatedAt: departments.updatedAt,
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const normalizeDepartmentInput = (data = {}) => {
  const normalized = { ...data };

  delete normalized.id;
  delete normalized._id;
  delete normalized.__isNew;

  if (normalized.name !== undefined) normalized.name = String(normalized.name).trim();
  if (normalized.code !== undefined) normalized.code = String(normalized.code).trim().toUpperCase();
  if (normalized.name === '') throw new Error('Department name is required');
  if (normalized.code === '') throw new Error('Department code is required');
  if (normalized.status !== undefined && !ALLOWED_STATUSES.has(normalized.status)) {
    throw new Error(`Department status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`);
  }
  if (normalized.description === undefined) delete normalized.description;
  if (normalized.manager === undefined) delete normalized.manager;
  if (normalized.location === undefined) delete normalized.location;
  if (normalized.budget !== undefined) normalized.budget = String(normalized.budget || 0);
  if (normalized.establishedDate !== undefined) normalized.establishedDate = normalizeDate(normalized.establishedDate);
  if (normalized.parentDepartment === undefined) delete normalized.parentDepartment;
  if (normalized.parentDepartment === '') normalized.parentDepartment = null;
  if (normalized.goals !== undefined) {
    normalized.goals = Array.isArray(normalized.goals)
      ? normalized.goals.map((goal) => String(goal).trim()).filter(Boolean)
      : [];
  }

  normalized.updatedAt = new Date();
  return normalized;
};

const postgresUniqueToMongoError = (error, data = {}) => {
  if (error?.code !== '23505') return error;

  const field = error.constraint?.includes('code') ? 'code' : 'name';
  const duplicate = new Error(`Department ${field} already exists`);
  duplicate.code = 11000;
  duplicate.keyPattern = { [field]: 1 };
  duplicate.keyValue = { [field]: data[field] };
  return duplicate;
};

const buildWhere = (query = {}) => {
  const conditions = [];

  for (const [key, value] of Object.entries(query)) {
    const column = columnByField[key];
    if (!column) continue;

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('$in' in value) conditions.push(inArray(column, value.$in));
      if ('$ne' in value) conditions.push(ne(column, value.$ne));
      continue;
    }

    conditions.push(eq(column, value));
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
    budget: Number(row.budget || 0),
  };
};

class DepartmentDocument {
  constructor(row = {}, options = {}) {
    const defaults = {
      description: '',
      manager: '',
      location: '',
      budget: 0,
      status: 'Active',
      establishedDate: new Date(),
      goals: [],
      parentDepartment: null,
      employeeCount: 0,
    };
    Object.assign(this, defaults, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
  }

  async save() {
    try {
      if (this.__isNew) {
        const values = normalizeDepartmentInput(this);
        values.createdAt = new Date();
        const [row] = await db.insert(departments).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false });
        return this;
      }

      const [row] = await db
        .update(departments)
        .set(normalizeDepartmentInput(this))
        .where(eq(departments.id, this._id))
        .returning();

      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    } catch (error) {
      throw postgresUniqueToMongoError(error, this);
    }
  }

  async updateEmployeeCount() {
    try {
      const Employee = (await import('./Employee.js')).default;
      const employeeCount = await Employee.countDocuments({
        'workInfo.department': this._id,
        status: { $ne: 'Terminated' },
      });
      this.employeeCount = employeeCount;
      await this.save();
      return this.employeeCount;
    } catch (error) {
      console.error('Error updating employee count for department', this.name, ':', error);
      return 0;
    }
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class DepartmentQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.asLean = false;
  }

  select() {
    return this;
  }

  sort(sortSpec) {
    this.sortSpec = sortSpec;
    return this;
  }

  limit(value) {
    this.limitValue = Number(value);
    return this;
  }

  skip(value) {
    this.skipValue = Number(value);
    return this;
  }

  lean() {
    this.asLean = true;
    return this;
  }

  async exec() {
    const result = await this.executor({
      sortSpec: this.sortSpec,
      limitValue: this.limitValue,
      skipValue: this.skipValue,
    });

    const wrap = (row) => {
      if (!row) return null;
      return this.asLean ? serialize(row) : new DepartmentDocument(row);
    };

    return this.many ? result.map(wrap) : wrap(result);
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const applyQueryOptions = (builder, { sortSpec, limitValue, skipValue }) => {
  let query = builder;

  if (sortSpec) {
    const [[field, direction]] = Object.entries(sortSpec);
    const column = columnByField[field];
    if (column) query = query.orderBy(direction === -1 ? desc(column) : asc(column));
  }

  if (limitValue) query = query.limit(limitValue);
  if (skipValue) query = query.offset(skipValue);

  return query;
};

function Department(data) {
  return new DepartmentDocument(data, { isNew: true });
}

Department.find = (query = {}) =>
  new DepartmentQuery(
    async (options) => {
      const where = buildWhere(query);
      let builder = db.select().from(departments);
      if (where) builder = builder.where(where);
      builder = applyQueryOptions(builder, options);
      return builder;
    },
    { many: true },
  );

Department.findOne = (query = {}) =>
  new DepartmentQuery(async () => {
    const where = buildWhere(query);
    let builder = db.select().from(departments);
    if (where) builder = builder.where(where);
    const rows = await builder.limit(1);
    return rows[0] || null;
  });

Department.findById = (id) =>
  new DepartmentQuery(async () => {
    const rows = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return rows[0] || null;
  });

Department.create = async (data) => {
  try {
    const values = normalizeDepartmentInput(data);
    values.createdAt = new Date();
    const [row] = await db.insert(departments).values(values).returning();
    return new DepartmentDocument(row);
  } catch (error) {
    throw postgresUniqueToMongoError(error, data);
  }
};

Department.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(departments);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Department.findByIdAndUpdate = (id, data) =>
  new DepartmentQuery(async () => {
    try {
      const [row] = await db
        .update(departments)
        .set(normalizeDepartmentInput(data))
        .where(eq(departments.id, id))
        .returning();
      return row || null;
    } catch (error) {
      throw postgresUniqueToMongoError(error, data);
    }
  });

Department.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(departments).where(eq(departments.id, id)).returning();
  return row ? new DepartmentDocument(row) : null;
};

Department.getWithEmployeeCounts = async () => {
  const departmentDocs = await Department.find().sort({ name: 1 });
  for (const dept of departmentDocs) {
    await dept.updateEmployeeCount();
  }
  return departmentDocs;
};

Department.getDepartmentStats = async () => {
  try {
    const allDepartments = await Department.find().lean();
    const active = allDepartments.filter((dept) => dept.status === 'Active').length;
    const inactive = allDepartments.filter((dept) => dept.status === 'Inactive').length;

    let largestDepartment = null;
    for (const dept of allDepartments) {
      const doc = new DepartmentDocument(dept);
      const employeeCount = await doc.updateEmployeeCount();
      if (!largestDepartment || employeeCount > largestDepartment.employeeCount) {
        largestDepartment = {
          name: dept.name,
          code: dept.code,
          employeeCount,
        };
      }
    }

    return {
      total: allDepartments.length,
      active,
      inactive,
      restructuring: allDepartments.length - active - inactive,
      largestDepartment,
    };
  } catch (error) {
    console.error('Error getting department stats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      restructuring: 0,
      largestDepartment: null,
    };
  }
};

export default Department;
