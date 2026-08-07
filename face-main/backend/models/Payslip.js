import { and, asc, count, desc, eq, gte, isNull, lt, lte } from 'drizzle-orm';
import db from '../db/index.js';
import { payslips } from '../db/schema/payslip.js';
import { employees } from '../db/schema/employee.js';
import { users } from '../db/schema/user.js';

const STATUSES = new Set(['draft', 'generated', 'paid', 'cancelled']);
const PAYMENT_METHODS = new Set(['bank_transfer', 'cheque', 'cash']);

const defaultEarnings = {
  basicSalary: 0,
  hra: 0,
  medical: 0,
  transport: 0,
  bonus: 0,
  overtime: 0,
  otherAllowances: 0,
};

const defaultDeductions = {
  pf: 0,
  esi: 0,
  tax: 0,
  professionalTax: 0,
  loanDeduction: 0,
  otherDeductions: 0,
};

const defaultAttendance = {
  workingDays: 0,
  presentDays: 0,
  leaveDays: 0,
  absentDays: 0,
};

const WRITABLE_FIELDS = [
  'employee',
  'employeeId',
  'employeeName',
  'period',
  'earnings',
  'deductions',
  'attendance',
  'grossEarnings',
  'totalDeductions',
  'netSalary',
  'bankInfo',
  'status',
  'paymentDate',
  'paymentMethod',
  'pdfPath',
  'generatedBy',
  'remarks',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: payslips.id,
  _id: payslips.id,
  employee: payslips.employee,
  employeeId: payslips.employeeId,
  employeeName: payslips.employeeName,
  'period.month': payslips.periodMonth,
  'period.year': payslips.periodYear,
  grossEarnings: payslips.grossEarnings,
  totalDeductions: payslips.totalDeductions,
  netSalary: payslips.netSalary,
  status: payslips.status,
  paymentDate: payslips.paymentDate,
  paymentMethod: payslips.paymentMethod,
  pdfPath: payslips.pdfPath,
  generatedBy: payslips.generatedBy,
  remarks: payslips.remarks,
  createdAt: payslips.createdAt,
  updatedAt: payslips.updatedAt,
};

const unsupported = (message) => {
  throw new Error(`Unsupported Payslip query: ${message}`);
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
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const toNumberObject = (defaults, value = {}) =>
  Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, Number(value?.[key] ?? fallback)]));

const calculateTotals = (values) => {
  const earnings = values.earnings || defaultEarnings;
  const deductions = values.deductions || defaultDeductions;
  values.grossEarnings =
    (earnings.basicSalary || 0) +
    (earnings.hra || 0) +
    (earnings.medical || 0) +
    (earnings.transport || 0) +
    (earnings.bonus || 0) +
    (earnings.overtime || 0) +
    (earnings.otherAllowances || 0);

  values.totalDeductions =
    (deductions.pf || 0) +
    (deductions.esi || 0) +
    (deductions.tax || 0) +
    (deductions.professionalTax || 0) +
    (deductions.loanDeduction || 0) +
    (deductions.otherDeductions || 0);

  values.netSalary = values.grossEarnings - values.totalDeductions;
};

const normalizeInput = (data = {}, existing = null) => {
  const picked = pickWritable(data);
  const merged = { ...(existing || {}), ...picked };
  const normalized = {};

  if (picked.employee !== undefined) normalized.employee = picked.employee;
  if (picked.employeeId !== undefined) normalized.employeeId = String(picked.employeeId);
  if (picked.employeeName !== undefined) normalized.employeeName = String(picked.employeeName);

  const period = picked.period ?? existing?.period;
  if (period !== undefined) {
    const month = Number(period?.month);
    const year = Number(period?.year);
    if (!month || month < 1 || month > 12) throw new Error('Payslip month must be between 1 and 12');
    if (!year) throw new Error('Payslip year is required');
    normalized.periodMonth = month;
    normalized.periodYear = year;
  }

  if (picked.earnings !== undefined || !existing) normalized.earnings = toNumberObject(defaultEarnings, merged.earnings);
  if (picked.deductions !== undefined || !existing) normalized.deductions = toNumberObject(defaultDeductions, merged.deductions);
  if (picked.attendance !== undefined || !existing) normalized.attendance = toNumberObject(defaultAttendance, merged.attendance);
  if (picked.bankInfo !== undefined || !existing) normalized.bankInfo = merged.bankInfo || {};

  if (picked.status !== undefined) {
    if (!STATUSES.has(picked.status)) unsupported(`status value "${picked.status}"`);
    normalized.status = picked.status;
  }
  if (picked.paymentDate !== undefined) normalized.paymentDate = normalizeDate(picked.paymentDate);
  if (picked.paymentMethod !== undefined) {
    if (!PAYMENT_METHODS.has(picked.paymentMethod)) unsupported(`paymentMethod value "${picked.paymentMethod}"`);
    normalized.paymentMethod = picked.paymentMethod;
  }
  if (picked.pdfPath !== undefined) normalized.pdfPath = picked.pdfPath || null;
  if (picked.generatedBy !== undefined) normalized.generatedBy = picked.generatedBy;
  if (picked.remarks !== undefined) normalized.remarks = String(picked.remarks || '');
  if (picked.createdAt !== undefined) normalized.createdAt = normalizeDate(picked.createdAt);
  if (picked.updatedAt !== undefined) normalized.updatedAt = normalizeDate(picked.updatedAt);

  const totalsSource = {
    earnings: normalized.earnings || merged.earnings || defaultEarnings,
    deductions: normalized.deductions || merged.deductions || defaultDeductions,
  };
  calculateTotals(totalsSource);
  normalized.grossEarnings = totalsSource.grossEarnings;
  normalized.totalDeductions = totalsSource.totalDeductions;
  normalized.netSalary = totalsSource.netSalary;
  normalized.updatedAt = new Date();

  return normalized;
};

const postgresUniqueToMongoError = (error) => {
  if (error?.code !== '23505') return error;
  const duplicate = new Error('Payslip already exists for this employee and period');
  duplicate.code = 11000;
  duplicate.keyPattern = { employee: 1, 'period.year': 1, 'period.month': 1 };
  return duplicate;
};

const serialize = (row) => {
  if (!row) return null;
  const periodMonth = row.periodMonth ?? row.period?.month;
  const periodYear = row.periodYear ?? row.period?.year;
  return {
    ...row,
    _id: row.id,
    period: {
      month: Number(periodMonth),
      year: Number(periodYear),
    },
    earnings: { ...defaultEarnings, ...(row.earnings || {}) },
    deductions: { ...defaultDeductions, ...(row.deductions || {}) },
    attendance: { ...defaultAttendance, ...(row.attendance || {}) },
    bankInfo: row.bankInfo || {},
    grossEarnings: Number(row.grossEarnings || 0),
    totalDeductions: Number(row.totalDeductions || 0),
    netSalary: Number(row.netSalary || 0),
  };
};

const buildWhere = (query = {}) => {
  const conditions = [];
  for (const [field, value] of Object.entries(query)) {
    const column = columnByField[field];
    if (!column) unsupported(`unknown field "${field}"`);

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [op, operand] of Object.entries(value)) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(operand)));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(operand)));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(operand)));
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
  if (path === 'employee' && doc.employee) {
    const employeeId = typeof doc.employee === 'object' ? doc.employee.id || doc.employee._id : doc.employee;
    const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
    doc.employee = pickFields(employee ? { ...employee, _id: employee.id } : null, select);
    return doc;
  }
  if (path === 'generatedBy' && doc.generatedBy) {
    const userId = typeof doc.generatedBy === 'object' ? doc.generatedBy.id || doc.generatedBy._id : doc.generatedBy;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    doc.generatedBy = pickFields(user ? { ...user, _id: user.id } : null, select);
    return doc;
  }
  unsupported(`populate path "${path}"`);
};

class PayslipDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, {
      earnings: { ...defaultEarnings },
      deductions: { ...defaultDeductions },
      attendance: { ...defaultAttendance },
      bankInfo: {},
      status: 'generated',
      paymentMethod: 'bank_transfer',
      remarks: '',
    }, serialize(row));
    if (!this.id && this._id) this.id = this._id;
    this.__isNew = options.isNew || !this._id;
    this.__original = serialize(row);
  }

  async populate(path, select) {
    if (Array.isArray(path)) {
      for (const item of path) await populateOne(this, item.path || item, item.select);
      return this;
    }
    await populateOne(this, path, select);
    return this;
  }

  async save() {
    try {
      const values = normalizeInput(this, this.__isNew ? null : this.__original);
      if (this.__isNew) {
        values.createdAt = new Date();
        const [row] = await db.insert(payslips).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
        return this;
      }
      const [row] = await db.update(payslips).set(values).where(eq(payslips.id, this._id)).returning();
      Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
      return this;
    } catch (error) {
      throw postgresUniqueToMongoError(error);
    }
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class PayslipQuery {
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
    const wrap = (row) => (this.asLean ? serialize(row) : new PayslipDocument(row));
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
    const entries = Object.entries(sortSpec);
    query = query.orderBy(...entries.map(([field, direction]) => {
      const column = columnByField[field];
      if (!column) unsupported(`sort field "${field}"`);
      return direction === -1 ? desc(column) : asc(column);
    }));
  }
  if (skipValue) query = query.offset(skipValue);
  if (limitValue) query = query.limit(limitValue);
  return query;
};

function Payslip(data) {
  return new PayslipDocument(data, { isNew: true });
}

Payslip.find = (query = {}) => new PayslipQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(payslips);
  if (where) builder = builder.where(where);
  return applyQueryOptions(builder, options);
}, { many: true });

Payslip.findOne = (query = {}) => new PayslipQuery(async (options) => {
  const where = buildWhere(query);
  let builder = db.select().from(payslips);
  if (where) builder = builder.where(where);
  const rows = await applyQueryOptions(builder, { ...options, limitValue: 1 });
  return rows[0] || null;
});

Payslip.findById = (id) => new PayslipQuery(async () => {
  const rows = await db.select().from(payslips).where(eq(payslips.id, id)).limit(1);
  return rows[0] || null;
});

Payslip.create = async (data) => new PayslipDocument(data, { isNew: true }).save();

Payslip.findByIdAndDelete = async (id) => {
  const [row] = await db.delete(payslips).where(eq(payslips.id, id)).returning();
  return row ? new PayslipDocument(row) : null;
};

Payslip.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(payslips);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Payslip.getByEmployeeAndPeriod = (employeeId, month, year) =>
  Payslip.findOne({ employee: employeeId, 'period.month': month, 'period.year': year });

Payslip.getPayslipsByPeriod = (month, year) =>
  Payslip.find({ 'period.month': month, 'period.year': year })
    .populate('employee', 'personalInfo.firstName personalInfo.lastName employeeId workInfo.department')
    .populate('generatedBy', 'name email');

export default Payslip;
