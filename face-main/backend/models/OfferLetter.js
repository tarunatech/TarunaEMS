import { and, asc, count, desc, eq, isNull } from 'drizzle-orm';
import db from '../db/index.js';
import { offerLetters } from '../db/schema/offerLetter.js';
import { users } from '../db/schema/user.js';

const columnByField = {
  id: offerLetters.id,
  _id: offerLetters.id,
  employeeName: offerLetters.employeeName,
  role: offerLetters.role,
  joiningDate: offerLetters.joiningDate,
  companyName: offerLetters.companyName,
  location: offerLetters.location,
  duration: offerLetters.duration,
  workingHours: offerLetters.workingHours,
  signatoryName: offerLetters.signatoryName,
  signatoryRole: offerLetters.signatoryRole,
  employeeId: offerLetters.employeeId,
  candidateId: offerLetters.candidateId,
  pdfPath: offerLetters.pdfPath,
  status: offerLetters.status,
  createdBy: offerLetters.createdBy,
  createdAt: offerLetters.createdAt,
  updatedAt: offerLetters.updatedAt,
};

const mapRowToDoc = (row) => {
  if (!row) return null;
  const raw = row.offer_letters || row;
  const user = row.users || null;

  return {
    _id: raw.id,
    id: raw.id,
    employeeName: raw.employeeName,
    role: raw.role,
    joiningDate: raw.joiningDate,
    companyName: raw.companyName || 'Taruna Technology',
    location: raw.location || 'Vadodara',
    duration: raw.duration || 'three (3) months',
    workingHours: raw.workingHours || '10:00 AM to 7:00 PM, Monday to Saturday',
    signatoryName: raw.signatoryName || 'MIHIR MAKWANA',
    signatoryRole: raw.signatoryRole || 'Operational Manager',
    employeeId: raw.employeeId || null,
    candidateId: raw.candidateId || null,
    pdfPath: raw.pdfPath || null,
    status: raw.status || 'Generated',
    createdBy: user ? {
      _id: user.id,
      id: user.id,
      name: user.name,
      email: user.email,
    } : raw.createdBy,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
};

class OfferLetterQuery {
  constructor(filter = {}) {
    this.filter = filter;
    this._sort = { createdAt: -1 };
    this._limit = null;
    this._skip = null;
    this._populate = [];
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(num) {
    this._limit = num;
    return this;
  }

  skip(num) {
    this._skip = num;
    return this;
  }

  populate(field) {
    this._populate.push(field);
    return this;
  }

  async execute() {
    let query = db.select().from(offerLetters);

    if (this._populate.includes('createdBy')) {
      query = db.select().from(offerLetters).leftJoin(users, eq(offerLetters.createdBy, users.id));
    }

    const conditions = [];
    if (this.filter.createdBy) {
      conditions.push(eq(offerLetters.createdBy, this.filter.createdBy));
    }
    if (this.filter.id || this.filter._id) {
      conditions.push(eq(offerLetters.id, this.filter.id || this.filter._id));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    if (this._sort) {
      const orderClauses = Object.entries(this._sort).map(([key, dir]) => {
        const col = columnByField[key] || offerLetters.createdAt;
        return dir === 1 || dir === 'asc' ? asc(col) : desc(col);
      });
      query = query.orderBy(...orderClauses);
    }

    if (this._limit) {
      query = query.limit(this._limit);
    }
    if (this._skip) {
      query = query.offset(this._skip);
    }

    const rows = await query;
    return rows.map(mapRowToDoc);
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

class OfferLetterModel {
  static find(filter = {}) {
    return new OfferLetterQuery(filter);
  }

  static async findById(id) {
    if (!id) return null;
    const [row] = await db.select().from(offerLetters).leftJoin(users, eq(offerLetters.createdBy, users.id)).where(eq(offerLetters.id, id));
    return mapRowToDoc(row);
  }

  static async create(data) {
    const payload = {
      employeeName: data.employeeName,
      role: data.role,
      joiningDate: data.joiningDate,
      companyName: data.companyName || 'Taruna Technology',
      location: data.location || 'Vadodara',
      duration: data.duration || 'three (3) months',
      workingHours: data.workingHours || '10:00 AM to 7:00 PM, Monday to Saturday',
      signatoryName: data.signatoryName || 'MIHIR MAKWANA',
      signatoryRole: data.signatoryRole || 'Operational Manager',
      employeeId: data.employeeId || null,
      candidateId: data.candidateId || null,
      pdfPath: data.pdfPath || null,
      status: data.status || 'Generated',
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await db.insert(offerLetters).values(payload).returning();
    return mapRowToDoc(created);
  }

  static async findByIdAndUpdate(id, updateData, options = {}) {
    const updatePayload = {
      ...updateData,
      updatedAt: new Date(),
    };
    delete updatePayload.id;
    delete updatePayload._id;

    const [updated] = await db.update(offerLetters).set(updatePayload).where(eq(offerLetters.id, id)).returning();
    return mapRowToDoc(updated);
  }

  static async findByIdAndDelete(id) {
    const [deleted] = await db.delete(offerLetters).where(eq(offerLetters.id, id)).returning();
    return mapRowToDoc(deleted);
  }

  static async countDocuments(filter = {}) {
    const conditions = [];
    if (filter.createdBy) {
      conditions.push(eq(offerLetters.createdBy, filter.createdBy));
    }
    const [res] = await db.select({ count: count() }).from(offerLetters).where(and(...conditions));
    return Number(res?.count || 0);
  }
}

export default OfferLetterModel;
