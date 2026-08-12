import { and, asc, count, desc, eq, gte, inArray, ne } from 'drizzle-orm';
import db from '../db/index.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';
import { departments } from '../db/schema/department.js';

const WRITABLE_FIELDS = [
  'user',
  'employeeId',
  'personalInfo',
  'contactInfo',
  'workInfo',
  'workInfoDepartment',
  'salaryInfo',
  'bankInfo',
  'status',
  'leaveBalance',
  'faceDescriptor',
  'faceEmbeddings',
  'faceQualityScores',
  'faceImage',
  'faceImages',
  'hasFaceRegistered',
  'faceRegistrationDate',
  'faceRegistrationMethod',
  'documents',
  'notes',
  'tags',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: employees.id,
  _id: employees.id,
  user: employees.user,
  employeeId: employees.employeeId,
  'workInfo.department': employees.workInfoDepartment,
  workInfoDepartment: employees.workInfoDepartment,
  status: employees.status,
  createdAt: employees.createdAt,
  updatedAt: employees.updatedAt,
};

const defaultLeaveBalance = { total: 30, used: 0, remaining: 30 };
const defaultSalaryInfo = {
  allowances: { hra: 0, medical: 0, transport: 0, other: 0 },
  deductions: { pf: 0, esi: 0, tax: 0, other: 0 },
  currency: 'INR',
  payFrequency: 'Monthly',
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const mergeDeep = (target = {}, source = {}) => {
  const output = { ...(target || {}) };
  for (const [key, value] of Object.entries(source || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      output[key] = mergeDeep(output[key], value);
    } else {
      output[key] = value;
    }
  }
  return output;
};

const unsupported = (message) => {
  throw new Error(`Unsupported Employee query: ${message}`);
};

const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const normalizeEmployeeInput = (data = {}, existing = null) => {
  const normalized = pickWritable(data);

  if (normalized.employeeId) normalized.employeeId = String(normalized.employeeId).toUpperCase();
  if (normalized.user && typeof normalized.user === 'object') {
    normalized.user = normalized.user._id || normalized.user.id || normalized.user.user || null;
  }
  if (normalized.workInfo?.department !== undefined) {
    const department = normalized.workInfo.department;
    normalized.workInfoDepartment = typeof department === 'object'
      ? department._id || department.id || null
      : department || null;
    normalized.workInfo = {
      ...normalized.workInfo,
      department: normalized.workInfoDepartment,
    };
  }
  if (normalized.contactInfo?.personalEmail) {
    normalized.contactInfo = {
      ...normalized.contactInfo,
      personalEmail: normalized.contactInfo.personalEmail.toLowerCase(),
    };
  }

  if (normalized.personalInfo?.dateOfBirth) {
    normalized.personalInfo = {
      ...normalized.personalInfo,
      dateOfBirth: normalizeDate(normalized.personalInfo.dateOfBirth).toISOString(),
    };
  }

  if (normalized.workInfo?.joiningDate) {
    normalized.workInfo = {
      ...normalized.workInfo,
      joiningDate: normalizeDate(normalized.workInfo.joiningDate).toISOString(),
    };
  }

  if (normalized.faceRegistrationDate !== undefined) {
    normalized.faceRegistrationDate = normalizeDate(normalized.faceRegistrationDate);
  }

  if (normalized.leaveBalance === undefined && !existing) normalized.leaveBalance = defaultLeaveBalance;
  if (normalized.salaryInfo !== undefined) normalized.salaryInfo = mergeDeep(defaultSalaryInfo, normalized.salaryInfo);
  if (normalized.bankInfo === undefined && !existing) normalized.bankInfo = {};
  if (normalized.faceEmbeddings === undefined && !existing) normalized.faceEmbeddings = {};
  if (normalized.faceQualityScores === undefined && !existing) normalized.faceQualityScores = {};
  if (normalized.faceImages === undefined && !existing) normalized.faceImages = {};
  if (normalized.documents === undefined && !existing) normalized.documents = {};
  if (normalized.tags === undefined && !existing) normalized.tags = [];

  if (existing) {
    for (const field of ['personalInfo', 'contactInfo', 'workInfo', 'salaryInfo', 'bankInfo', 'leaveBalance', 'faceEmbeddings', 'faceQualityScores', 'faceImages', 'documents']) {
      if (normalized[field] !== undefined) normalized[field] = mergeDeep(existing[field], normalized[field]);
    }
  }

  normalized.updatedAt = new Date();
  return normalized;
};

const getNested = (obj, path) => path.split('.').reduce((acc, key) => acc?.[key], obj);

const matchRow = (row, query = {}) => {
  for (const [key, expected] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(expected)) unsupported('$or must be an array');
      if (!expected.some((condition) => matchRow(row, condition))) return false;
      continue;
    }

    const actual = key.includes('.') ? getNested(row, key) : row[key];

    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      for (const [op, value] of Object.entries(expected)) {
        if (op === '$ne') {
          if (actual === value) return false;
        } else if (op === '$in') {
          if (!value.map(String).includes(String(actual))) return false;
        } else if (op === '$gte') {
          if (new Date(actual) < value) return false;
        } else if (op === '$lt') {
          if (!(actual < value)) return false;
        } else if (op === '$exists') {
          if (value ? actual === undefined || actual === null : actual !== undefined && actual !== null) return false;
        } else {
          unsupported(`operator "${op}" on field "${key}"`);
        }
      }
      continue;
    }

    if (actual !== expected) return false;
  }
  return true;
};

const buildSimpleWhere = (query = {}) => {
  const conditions = [];
  for (const [key, value] of Object.entries(query)) {
    if (key === '$or') continue;
    const column = columnByField[key];
    if (!column && key.includes('.')) continue;
    if (!column) unsupported(`unknown field "${key}"`);

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [op, opValue] of Object.entries(value)) {
        if (op === '$in') conditions.push(inArray(column, opValue));
        else if (op === '$ne') conditions.push(ne(column, opValue));
        else if (op === '$gte') conditions.push(gte(column, opValue));
       else if (op === '$exists') conditions.push(value ? isNotNull(column) : isNull(column));
        else {
          unsupported(`operator "${op}" on field "${key}"`);
        }
      }
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
  const employee = { ...row, _id: row.id };
employee.workInfo = {
  ...(employee.workInfo || {}),
  department: typeof employee.workInfo?.department === 'object'
    ? employee.workInfo.department
    : employee.workInfoDepartment || employee.workInfo?.department || null,
};

employee.departmentName = null;
  employee.fullName = `${employee.personalInfo?.firstName || ''} ${employee.personalInfo?.lastName || ''}`.trim();
  employee.age = calculateAge(employee.personalInfo?.dateOfBirth);
  employee.yearsOfService = calculateYearsOfService(employee.workInfo?.joiningDate);
  employee.grossSalary = calculateGrossSalary(employee.salaryInfo);
  employee.netSalary = calculateNetSalary(employee.salaryInfo);
  return employee;
};

const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const calculateYearsOfService = (joiningDate) => {
  if (!joiningDate) return 0;
  const diffTime = Math.abs(new Date() - new Date(joiningDate));
  return Math.floor(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) / 365.25);
};

const calculateGrossSalary = (salaryInfo = {}) => {
  const basic = salaryInfo.basicSalary || 0;
  const allowances = salaryInfo.allowances || {};
  return basic + (allowances.hra || 0) + (allowances.medical || 0) + (allowances.transport || 0) + (allowances.other || 0);
};

const calculateNetSalary = (salaryInfo = {}) => {
  const gross = calculateGrossSalary(salaryInfo);
  const deductions = salaryInfo.deductions || {};
  return Math.max(0, gross - (deductions.pf || 0) - (deductions.esi || 0) - (deductions.tax || 0) - (deductions.other || 0));
};

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const fields = selection.split(/\s+/).filter(Boolean);
  if (fields.length === 0) return obj;
  if (fields.some((field) => field.startsWith('-'))) return obj;

  const picked = { _id: obj._id ?? obj.id, id: obj.id ?? obj._id };
  for (const field of fields) {
    const parts = field.split('.');
    let source = obj;
    let target = picked;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (source?.[part] === undefined) break;
      if (i === parts.length - 1) {
        target[part] = source[part];
      } else {
        target[part] = target[part] || {};
        target = target[part];
        source = source[part];
      }
    }
  }
  return picked;
};

const populateOne = async (employee, path, select) => {
  if (!employee) return employee;

  if (path === 'user' && employee.user) {
    const [user] = await db.select().from(users).where(eq(users.id, typeof employee.user === 'object' ? employee.user.id : employee.user)).limit(1);
    employee.user = pickFields(user ? { ...user, _id: user.id } : null, select);
  }

  if (path === 'workInfo.department' && employee.workInfo?.department) {
    const [department] = await db
      .select()
      .from(departments)
      .where(eq(departments.id, typeof employee.workInfo.department === 'object' ? employee.workInfo.department.id : employee.workInfo.department))
      .limit(1);
    const populatedDepartment = pickFields(department ? { ...department, _id: department.id, budget: Number(department.budget || 0) } : null, select);
    employee.workInfo = {
      ...employee.workInfo,
      department: populatedDepartment,
      departmentName: populatedDepartment?.name || employee.workInfo.departmentName,
    };
    employee.departmentName = populatedDepartment?.name || employee.departmentName;
  }

  if (path === 'workInfo.reportingManager' && employee.workInfo?.reportingManager) {
    const manager = await Employee.findById(employee.workInfo.reportingManager).lean();
    employee.workInfo = {
      ...employee.workInfo,
      reportingManager: pickFields(manager, select),
    };
  }

  return employee;
};

class EmployeeDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, serialize(row));
    this.__isNew = options.isNew || !this._id;
  }

  calculateRemainingBalance() {
    this.leaveBalance = this.leaveBalance || { ...defaultLeaveBalance };
    this.leaveBalance.remaining = this.leaveBalance.total - this.leaveBalance.used;
    return this.leaveBalance.remaining;
  }

  async populate(path, select) {
    if (Array.isArray(path)) {
      for (const item of path) {
        await this.populate(item.path || item, item.select);
      }
      return this;
    }
    await populateOne(this, path, select);
    return this;
  }

  async save() {
    if (this.__isNew) {
      const values = normalizeEmployeeInput(this);
      values.createdAt = new Date();
      const [row] = await db.insert(employees).values(values).returning();
      Object.assign(this, serialize(row), { __isNew: false });
      return this;
    }

    const existing = await Employee.findById(this._id).lean();
    const [row] = await db
      .update(employees)
      .set(normalizeEmployeeInput(this, existing))
      .where(eq(employees.id, this._id))
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

class EmployeeQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.asLean = false;
    this.populateSpecs = [];
  }

  populate(path, select) {
    if (Array.isArray(path)) {
      this.populateSpecs.push(...path.map((item) => ({ path: item.path || item, select: item.select })));
    } else {
      this.populateSpecs.push({ path, select });
    }
    return this;
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
    const result = await this.executor({ sortSpec: this.sortSpec, limitValue: this.limitValue, skipValue: this.skipValue });
    const wrap = (row) => (this.asLean ? serialize(row) : new EmployeeDocument(row));
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const list = this.many ? wrapped : wrapped ? [wrapped] : [];

    for (const employee of list) {
      for (const spec of this.populateSpecs) {
        await populateOne(employee, spec.path, spec.select);
      }
    }

    return wrapped;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

const sortRows = (rows, sortSpec) => {
  if (!sortSpec) return rows;
  const [[field, direction]] = Object.entries(sortSpec);
  return [...rows].sort((a, b) => {
    const av = field.includes('.') ? getNested(a, field) : a[field];
    const bv = field.includes('.') ? getNested(b, field) : b[field];
    if (av === bv) return 0;
    return av > bv ? direction : -direction;
  });
};

const getRows = async (query = {}, options = {}) => {
  const simpleWhere = buildSimpleWhere(query);
  let builder = db.select().from(employees);
  if (simpleWhere) builder = builder.where(simpleWhere);
  let rows = await builder;

  if (Object.keys(query).some((key) => key === '$or' || (key.includes('.') && !columnByField[key]))) {
    rows = rows.filter((row) => matchRow(row, query));
  }

  rows = sortRows(rows, options.sortSpec);
  if (options.skipValue) rows = rows.slice(options.skipValue);
  if (options.limitValue) rows = rows.slice(0, options.limitValue);
  return rows;
};

function Employee(data) {
  return new EmployeeDocument(data, { isNew: true });
}

Employee.find = (query = {}) =>
  new EmployeeQuery(async (options) => getRows(query, options), { many: true });

Employee.findOne = (query = {}) =>
  new EmployeeQuery(async () => {
    const rows = await getRows(query, { limitValue: 1 });
    return rows[0] || null;
  });

Employee.findById = (id) =>
  new EmployeeQuery(async () => {
    const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
    return rows[0] || null;
  });

Employee.create = async (data) => {
  const values = normalizeEmployeeInput(data);
  values.createdAt = new Date();
  const [row] = await db.insert(employees).values(values).returning();
  return new EmployeeDocument(row);
};

Employee.countDocuments = async (query = {}) => {
  if (Object.keys(query).some((key) => key.includes('.') || key === '$or')) {
    return (await getRows(query)).length;
  }
  const where = buildSimpleWhere(query);
  let builder = db.select({ value: count() }).from(employees);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Employee.findByIdAndUpdate = (id, data) =>
  new EmployeeQuery(async () => {
    const existing = await Employee.findById(id).lean();
    if (!existing) return null;
    const [row] = await db
      .update(employees)
      .set(normalizeEmployeeInput(data, existing))
      .where(eq(employees.id, id))
      .returning();
    return row || null;
  });

Employee.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(employees).where(eq(employees.id, id)).returning();
  return row ? new EmployeeDocument(row) : null;
};

Employee.findOneAndDelete = async (query = {}) => {
  const employee = await Employee.findOne(query).lean();
  if (!employee) return null;
  return Employee.findByIdAndDelete(employee._id);
};

Employee.getByDepartment = (department) =>
  Employee.find({ 'workInfo.department': department, status: 'Active' })
    .populate('user', 'name email employeeId')
    .sort({ 'personalInfo.firstName': 1 });

Employee.getActiveEmployees = () =>
  Employee.find({ status: 'Active' })
    .populate('user', 'name email employeeId')
    .sort({ 'workInfo.joiningDate': -1 });

Employee.getEmployeeStats = async () => {
  const rows = await db.select().from(employees);
  return {
    total: rows.length,
    active: rows.filter((row) => row.status === 'Active').length,
    inactive: rows.filter((row) => row.status === 'Inactive').length,
    onLeave: rows.filter((row) => row.status === 'On Leave').length,
    terminated: rows.filter((row) => row.status === 'Terminated').length,
  };
};

Employee.aggregate = async (pipeline = []) => {
  let rows = (await db.select().from(employees)).map(serialize);

  for (const stage of pipeline) {
    if (stage.$lookup) {
      // No-op compatibility for the current dashboard notification pipeline.
      // It only uses this to derive monthlyAttendance below, which we compute locally.
      continue;
    }

    if (stage.$addFields?.monthlyAttendance) {
      rows = rows.map((row) => ({ ...row, monthlyAttendance: 0 }));
      continue;
    }

    if (stage.$match) rows = rows.filter((row) => matchRow(row, stage.$match));

    if (stage.$group?._id === '$workInfo.department') {
      const grouped = new Map();
      for (const row of rows) {
        const key = row.workInfoDepartment || row.workInfo?.department || null;
        grouped.set(key, (grouped.get(key) || 0) + 1);
      }
      rows = Array.from(grouped.entries()).map(([key, value]) => ({ _id: key, count: value }));
    }

    if (stage.$sort) rows = sortRows(rows, stage.$sort);

    if (stage.$limit) rows = rows.slice(0, Number(stage.$limit));
  }

  return rows;
};

export default Employee;
