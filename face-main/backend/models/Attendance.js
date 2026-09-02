// models/Attendance.js
import { and, asc, count, desc, eq, gte, isNotNull, isNull, lt, lte, or } from 'drizzle-orm';
import db from '../db/index.js';
import { attendance } from '../db/schema/attendance.js';
import { users } from '../db/schema/user.js';
import { employees } from '../db/schema/employee.js';
import { departments } from '../db/schema/department.js';

const ATTENDANCE_STATUSES = new Set(['Present', 'Late', 'Half Day', 'Absent', 'Work from Home']);
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

const WRITABLE_FIELDS = [
  'employee',
  'user',
  'date',
  'checkInTime',
  'checkOutTime',
  'checkInLocation',
  'checkOutLocation',
  'workingHours',
  'status',
  'isLate',
  'lateMinutes',
  'notes',
  'approvedBy',
  'ipAddress',
  'deviceInfo',
  'isManualEntry',
  'manualEntryReason',
  'createdAt',
  'updatedAt',
];

const columnByField = {
  id: attendance.id,
  _id: attendance.id,
  employee: attendance.employee,
  user: attendance.user,
  date: attendance.date,
  checkInTime: attendance.checkInTime,
  checkOutTime: attendance.checkOutTime,
  workingHours: attendance.workingHours,
  status: attendance.status,
  isLate: attendance.isLate,
  lateMinutes: attendance.lateMinutes,
  approvedBy: attendance.approvedBy,
  isManualEntry: attendance.isManualEntry,
  createdAt: attendance.createdAt,
  updatedAt: attendance.updatedAt,
};

const normalizeDate = (value) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value;
  return new Date(value);
};

const pickWritable = (data = {}) => {
  const picked = {};
  for (const field of WRITABLE_FIELDS) {
    if (data[field] !== undefined) picked[field] = data[field];
  }
  return picked;
};

const startOfAttendanceDayFromCheckIn = (checkInTime) => {
  const checkIn = normalizeDate(checkInTime);
  const checkInIST = new Date(checkIn.getTime() + IST_OFFSET);
  return new Date(Date.UTC(checkInIST.getUTCFullYear(), checkInIST.getUTCMonth(), checkInIST.getUTCDate()));
};

const applyDerivedFields = (values, { isNew = false, checkInChanged = false, checkOutChanged = false } = {}) => {
  if (values.checkInTime !== undefined) values.checkInTime = normalizeDate(values.checkInTime);
  if (values.checkOutTime !== undefined) values.checkOutTime = normalizeDate(values.checkOutTime);
  if (values.date !== undefined) values.date = normalizeDate(values.date);
  if (values.createdAt !== undefined) values.createdAt = normalizeDate(values.createdAt);
  if (values.updatedAt !== undefined) values.updatedAt = normalizeDate(values.updatedAt);

  if (values.status !== undefined && !ATTENDANCE_STATUSES.has(values.status)) {
    throw new Error(`Attendance status must be one of: ${Array.from(ATTENDANCE_STATUSES).join(', ')}`);
  }

  if (values.checkInTime && isNew) {
    values.date = startOfAttendanceDayFromCheckIn(values.checkInTime);
  }

  if (values.checkInTime && values.checkOutTime) {
    values.workingHours = Math.round((values.checkOutTime - values.checkInTime) / (1000 * 60));
  }

  if (values.checkInTime && (isNew || checkInChanged)) {
    const checkInIST = new Date(values.checkInTime.getTime() + IST_OFFSET);
    const standardTimeIST = new Date(values.checkInTime.getTime() + IST_OFFSET);
    standardTimeIST.setUTCHours(10, 15, 0, 0);

    if (checkInIST > standardTimeIST) {
      values.isLate = true;
      values.lateMinutes = Math.round((checkInIST - standardTimeIST) / (1000 * 60));
      if (values.status !== 'Half Day') {
        values.status = 'Late';
      }
    } else {
      values.isLate = false;
      values.lateMinutes = 0;
      if (values.status !== 'Half Day') {
        values.status = 'Present';
      }
    }
  }

  if (values.checkOutTime && checkOutChanged) {
    const checkOutIST = new Date(values.checkOutTime.getTime() + IST_OFFSET);
    const standardExitTimeIST = new Date(values.checkOutTime.getTime() + IST_OFFSET);
    standardExitTimeIST.setUTCHours(19, 0, 0, 0);

    if (checkOutIST < standardExitTimeIST) {
      values.notes = (values.notes || '') + (values.notes ? '. ' : '') + 'Early departure before 7:00 PM IST.';
    }
  }

  values.updatedAt = new Date();
  return values;
};

const postgresUniqueToMongoError = (error) => {
  if (error?.code !== '23505') return error;
  const duplicate = new Error('Attendance already marked for today');
  duplicate.code = 11000;
  duplicate.keyPattern = { employee: 1, date: 1 };
  return duplicate;
};

const unsupported = (message) => {
  throw new Error(`Unsupported Attendance query: ${message}`);
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

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      const ops = Object.keys(value);
      for (const op of ops) {
        if (op === '$gte') conditions.push(gte(column, normalizeDate(value[op])));
        else if (op === '$lte') conditions.push(lte(column, normalizeDate(value[op])));
        else if (op === '$lt') conditions.push(lt(column, normalizeDate(value[op])));
        else if (op === '$exists') conditions.push(value[op] ? isNotNull(column) : isNull(column));
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

const getNested = (obj, path) => path.split('.').reduce((acc, key) => {
  if (Array.isArray(acc)) return acc.map((item) => item?.[key]);
  return acc?.[key];
}, obj);

const setNested = (obj, path, value) => {
  const parts = path.split('.');
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    cursor[parts[i]] = cursor[parts[i]] || {};
    cursor = cursor[parts[i]];
  }
  cursor[parts[parts.length - 1]] = value;
};

const matchRow = (row, query = {}) => {
  for (const [field, expected] of Object.entries(query)) {
    if (field === '$or') {
      if (!expected.some((condition) => matchRow(row, condition))) return false;
      continue;
    }

    const actual = field.includes('.') ? getNested(row, field) : row[field];
    if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
      if ('$or' in expected) unsupported(`nested $or on field "${field}"`);
      for (const [op, value] of Object.entries(expected)) {
        if (op === '$gte') {
          if (!(new Date(actual) >= value)) return false;
        } else if (op === '$lte') {
          if (!(new Date(actual) <= value)) return false;
        } else if (op === '$lt') {
          if (!(new Date(actual) < value)) return false;
        } else if (op === '$exists') {
          if (value ? actual === undefined || actual === null : actual !== undefined && actual !== null) return false;
        } else if (op === '$regex') {
          const flags = expected.$options || '';
          if (!new RegExp(value, flags).test(String(actual || ''))) return false;
        } else if (op !== '$options') unsupported(`aggregate match operator "${op}" on field "${field}"`);
      }
      continue;
    }
    if (actual !== expected) return false;
  }
  return true;
};

const evaluateExpression = (row, expression) => {
  if (typeof expression === 'string' && expression.startsWith('$')) return getNested(row, expression.slice(1));
  if (!expression || typeof expression !== 'object') return expression;

  if ('$arrayElemAt' in expression) {
    const [arrayExpression, index] = expression.$arrayElemAt;
    const value = evaluateExpression(row, arrayExpression);
    return Array.isArray(value) ? value[index] : undefined;
  }

  if ('$ifNull' in expression) {
    const [first, fallback] = expression.$ifNull;
    const value = evaluateExpression(row, first);
    return value ?? evaluateExpression(row, fallback);
  }

  if ('$cond' in expression) {
    const [condition, whenTrue, whenFalse] = expression.$cond;
    return evaluateCondition(row, condition) ? evaluateExpression(row, whenTrue) : evaluateExpression(row, whenFalse);
  }

  if ('$concat' in expression) {
    return expression.$concat.map((part) => evaluateExpression(row, part) ?? '').join('');
  }

  unsupported(`aggregate expression "${Object.keys(expression)[0]}"`);
};

const evaluateCondition = (row, condition) => {
  if (!condition || typeof condition !== 'object') return Boolean(condition);
  if ('$eq' in condition) {
    const [left, right] = condition.$eq;
    return evaluateExpression(row, left) === evaluateExpression(row, right);
  }
  unsupported(`aggregate condition "${Object.keys(condition)[0]}"`);
};

const lookupRows = async (rows, lookup) => {
  const localField = lookup.localField;
  const foreignField = lookup.foreignField;
  const as = lookup.as;

  if (lookup.from === 'employees' && foreignField === '_id') {
    const employeeRows = (await db.select().from(employees)).map((row) => ({
      ...row,
      _id: row.id,
      workInfo: {
        ...(row.workInfo || {}),
        department: row.workInfoDepartment || row.workInfo?.department || null,
      },
    }));
    return rows.map((row) => ({
      ...row,
      [as]: employeeRows.filter((employee) => employee.id === getNested(row, localField)),
    }));
  }

  if (lookup.from === 'users' && foreignField === '_id') {
    const userRows = (await db.select().from(users)).map((row) => ({ ...row, _id: row.id }));
    return rows.map((row) => ({
      ...row,
      [as]: userRows.filter((user) => user.id === getNested(row, localField)),
    }));
  }

  if (lookup.from === 'departments' && foreignField === '_id') {
    const departmentRows = (await db.select().from(departments)).map((row) => ({ ...row, _id: row.id }));
    return rows.map((row) => ({
      ...row,
      [as]: departmentRows.filter((department) => department.id === getNested(row, localField)),
    }));
  }

  unsupported(`lookup from "${lookup.from}" with localField "${localField}"`);
};

const serialize = (row) => {
  if (!row) return null;
  return {
    ...row,
    _id: row.id,
  };
};

const pickFields = (obj, selection = '') => {
  if (!obj || !selection) return obj;
  const fields = selection.split(/\s+/).filter(Boolean);
  if (fields.length === 0) return obj;
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

const populateOne = async (doc, path, select) => {
  if (!doc) return doc;

  if (path === 'employee' && doc.employee) {
    const [employee] = await db.select().from(employees).where(eq(employees.id, typeof doc.employee === 'object' ? doc.employee.id : doc.employee)).limit(1);
    doc.employee = pickFields(employee ? { ...employee, _id: employee.id } : null, select);
    return doc;
  }

  if ((path === 'user' || path === 'approvedBy') && doc[path]) {
    const [user] = await db.select().from(users).where(eq(users.id, typeof doc[path] === 'object' ? doc[path].id : doc[path])).limit(1);
    doc[path] = pickFields(user ? { ...user, _id: user.id } : null, select);
    return doc;
  }

  unsupported(`populate path "${path}"`);
};

class AttendanceDocument {
  constructor(row = {}, options = {}) {
    Object.assign(this, serialize(row));
    this.__isNew = options.isNew || !this._id;
    this.__original = serialize(row);
  }

  async populate(path, select) {
    if (Array.isArray(path)) {
      for (const item of path) await this.populate(item.path || item, item.select);
      return this;
    }
    await populateOne(this, path, select);
    return this;
  }

  getWorkingTime() {
    if (!this.checkOutTime || !this.workingHours) {
      return { hours: 0, minutes: 0, total: '00:00', totalMinutes: 0 };
    }

    const hours = Math.floor(this.workingHours / 60);
    const minutes = this.workingHours % 60;
    return {
      hours,
      minutes,
      total: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
      totalMinutes: this.workingHours,
    };
  }

  async save() {
    try {
      const rawValues = pickWritable(this);
      const values = applyDerivedFields(rawValues, {
        isNew: this.__isNew,
        checkInChanged: this.__original?.checkInTime?.getTime?.() !== normalizeDate(this.checkInTime)?.getTime?.(),
        checkOutChanged: this.__original?.checkOutTime?.getTime?.() !== normalizeDate(this.checkOutTime)?.getTime?.(),
      });

      if (this.__isNew) {
        values.createdAt = new Date();
        const [row] = await db.insert(attendance).values(values).returning();
        Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
        return this;
      }

      const [row] = await db.update(attendance).set(values).where(eq(attendance.id, this._id)).returning();
      Object.assign(this, serialize(row), { __isNew: false, __original: serialize(row) });
      return this;
    } catch (error) {
      throw postgresUniqueToMongoError(error);
    }
  }

  async deleteOne() {
    if (!this._id) return null;
    const [row] = await db.delete(attendance).where(eq(attendance.id, this._id)).returning();
    return row ? new AttendanceDocument(row) : null;
  }

  toObject() {
    return serialize(this);
  }

  toJSON() {
    return this.toObject();
  }
}

class AttendanceQuery {
  constructor(executor, options = {}) {
    this.executor = executor;
    this.many = options.many || false;
    this.sortSpec = null;
    this.limitValue = null;
    this.skipValue = null;
    this.populateSpecs = [];
    this.asLean = false;
  }

  populate(path, select) {
    if (Array.isArray(path)) this.populateSpecs.push(...path.map((item) => ({ path: item.path || item, select: item.select })));
    else this.populateSpecs.push({ path, select });
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
    const wrap = (row) => (this.asLean ? serialize(row) : new AttendanceDocument(row));
    const wrapped = this.many ? result.map(wrap) : result ? wrap(result) : null;
    const list = this.many ? wrapped : wrapped ? [wrapped] : [];

    for (const doc of list) {
      for (const spec of this.populateSpecs) await populateOne(doc, spec.path, spec.select);
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
  const entries = Object.entries(sortSpec);
  return [...rows].sort((a, b) => {
    for (const [field, direction] of entries) {
      const av = field.includes('.') ? getNested(a, field) : a[field];
      const bv = field.includes('.') ? getNested(b, field) : b[field];
      if (av === bv) continue;
      return av > bv ? direction : -direction;
    }
    return 0;
  });
};

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

function Attendance(data) {
  return new AttendanceDocument(data, { isNew: true });
}

Attendance.find = (query = {}) =>
  new AttendanceQuery(
    async (options) => {
      const where = buildWhere(query);
      let builder = db.select().from(attendance);
      if (where) builder = builder.where(where);
      builder = applyQueryOptions(builder, options);
      return builder;
    },
    { many: true },
  );

Attendance.findOne = (query = {}) =>
  new AttendanceQuery(async (options) => {
    const where = buildWhere(query);
    let builder = db.select().from(attendance);
    if (where) builder = builder.where(where);
    builder = applyQueryOptions(builder, { ...options, limitValue: 1 });
    const rows = await builder;
    return rows[0] || null;
  });

Attendance.findById = (id) =>
  new AttendanceQuery(async () => {
    const rows = await db.select().from(attendance).where(eq(attendance.id, id)).limit(1);
    return rows[0] || null;
  });

Attendance.create = async (data) => {
  const doc = new AttendanceDocument(data, { isNew: true });
  return doc.save();
};

Attendance.countDocuments = async (query = {}) => {
  const where = buildWhere(query);
  let builder = db.select({ value: count() }).from(attendance);
  if (where) builder = builder.where(where);
  const [row] = await builder;
  return Number(row?.value || 0);
};

Attendance.getAttendanceSummary = async (employeeId, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const rows = await Attendance.find({ employee: employeeId, date: { $gte: start, $lte: end } }).lean();
  const totalWorkingMinutes = rows.reduce((sum, row) => sum + (row.workingHours || 0), 0);

  return [{
    _id: null,
    totalDays: rows.length,
    presentDays: rows.filter((row) => ['Present', 'Late'].includes(row.status)).length,
    lateDays: rows.filter((row) => row.status === 'Late').length,
    halfDays: rows.filter((row) => row.status === 'Half Day').length,
    totalWorkingMinutes,
    avgCheckInTime: null,
  }];
};

Attendance.getTodayAttendance = async (employeeId) => {
  const now = new Date();
  const nowIST = new Date(now.getTime() + IST_OFFSET);
  const startOfDayIST = new Date(Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()));
  const startOfDayUTC = new Date(startOfDayIST.getTime() - IST_OFFSET);
  const endOfDayUTC = new Date(startOfDayUTC.getTime() + 24 * 60 * 60 * 1000);

  return Attendance.findOne({
    employee: employeeId,
    date: { $gte: startOfDayUTC, $lt: endOfDayUTC },
  }).populate([
    { path: 'employee', select: 'personalInfo workInfo' },
    { path: 'user', select: 'name email employeeId' },
  ]);
};

Attendance.getMonthlyStats = async (year, month, employeeId = null) => {
  const startOfMonthIST = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonthIST = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const startOfMonthUTC = new Date(startOfMonthIST.getTime() - IST_OFFSET);
  const endOfMonthUTC = new Date(endOfMonthIST.getTime() - IST_OFFSET);
  const query = { date: { $gte: startOfMonthUTC, $lte: endOfMonthUTC } };
  if (employeeId) query.employee = employeeId;

  const rows = await Attendance.find(query).lean();
  if (rows.length === 0) return [];

  const totalWorkingHours = rows.reduce((sum, row) => sum + (row.workingHours || 0), 0);
  return [{
    _id: employeeId || null,
    totalDays: rows.length,
    presentDays: rows.filter((row) => ['Present', 'Late'].includes(row.status)).length,
    lateDays: rows.filter((row) => row.status === 'Late').length,
    halfDays: rows.filter((row) => row.status === 'Half Day').length,
    totalWorkingHours,
    avgWorkingHours: totalWorkingHours / rows.length,
  }];
};

Attendance.aggregate = async (pipeline = []) => {
  let rows = (await db.select().from(attendance)).map(serialize);

  for (const stage of pipeline) {
    if (stage.$match) rows = rows.filter((row) => matchRow(row, stage.$match));
    else if (stage.$sort) rows = sortRows(rows, stage.$sort);
    else if (stage.$skip !== undefined) rows = rows.slice(stage.$skip);
    else if (stage.$limit !== undefined) rows = rows.slice(0, stage.$limit);
    else if (stage.$count) rows = [{ [stage.$count]: rows.length }];
    else if (stage.$group) {
      const groupId = stage.$group._id;
      if (groupId === '$status') {
        const grouped = new Map();
        for (const row of rows) grouped.set(row.status, (grouped.get(row.status) || 0) + 1);
        rows = Array.from(grouped.entries()).map(([key, value]) => ({ _id: key, count: value }));
      } else if (groupId === null || groupId === '$employee') {
        const keyFn = groupId === '$employee' ? (row) => row.employee : () => null;
        const grouped = new Map();
        for (const row of rows) {
          const key = keyFn(row);
          const acc = grouped.get(key) || [];
          acc.push(row);
          grouped.set(key, acc);
        }
        rows = Array.from(grouped.entries()).map(([key, groupRows]) => ({
          _id: key,
          totalDays: groupRows.length,
          totalRecords: groupRows.length,
          presentDays: groupRows.filter((row) => ['Present', 'Late'].includes(row.status)).length,
          presentCount: groupRows.filter((row) => row.status === 'Present').length,
          lateDays: groupRows.filter((row) => row.status === 'Late').length,
          lateCount: groupRows.filter((row) => row.status === 'Late').length,
          halfDays: groupRows.filter((row) => row.status === 'Half Day').length,
          halfDayCount: groupRows.filter((row) => row.status === 'Half Day').length,
          totalWorkingMinutes: groupRows.reduce((sum, row) => sum + (row.workingHours || 0), 0),
          totalWorkingHours: groupRows.reduce((sum, row) => sum + (row.workingHours || 0), 0),
          avgWorkingHours: groupRows.length ? groupRows.reduce((sum, row) => sum + (row.workingHours || 0), 0) / groupRows.length : 0,
        }));
      } else if (groupId === '$departmentName') {
        const grouped = new Map();
        for (const row of rows) {
          const key = row.departmentName || 'Unknown Department';
          const acc = grouped.get(key) || [];
          acc.push(row);
          grouped.set(key, acc);
        }
        rows = Array.from(grouped.entries()).map(([key, groupRows]) => ({
          _id: key,
          departmentName: key,
          present: groupRows.filter((row) => row.status === 'Present').length,
          late: groupRows.filter((row) => row.status === 'Late').length,
          total: groupRows.length,
        }));
      } else unsupported(`aggregate group _id "${groupId}"`);
    } else if (stage.$lookup) {
      rows = await lookupRows(rows, stage.$lookup);
    } else if (stage.$unwind) {
      const isObj = typeof stage.$unwind === 'object';
      const path = isObj ? stage.$unwind.path.replace(/^\$/, '') : stage.$unwind.replace(/^\$/, '');
      const preserve = isObj && stage.$unwind.preserveNullAndEmptyArrays;
      rows = rows.flatMap((row) => {
        const value = getNested(row, path);
        if (!Array.isArray(value)) {
          if (value || preserve) return [row];
          return [];
        }
        if (value.length === 0) return preserve ? [row] : [];
        return value.map((item) => {
          const clone = { ...row };
          setNested(clone, path, item);
          return clone;
        });
      });
    } else if (stage.$addFields) {
      rows = rows.map((row) => {
        const clone = { ...row };
        for (const [field, expression] of Object.entries(stage.$addFields)) {
          setNested(clone, field, evaluateExpression(clone, expression));
        }
        return clone;
      });
    } else {
      unsupported(`aggregate stage "${Object.keys(stage)[0]}"`);
    }
  }

  return rows;
};

export default Attendance;
