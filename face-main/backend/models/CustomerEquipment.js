import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import db from '../db/index.js';
import { customerEquipment } from '../db/schema/customerEquipment.js';

export const toUuidOrNull = (val) => {
  if (!val) return null;
  let str = val;
  if (typeof val === 'object') {
    str = val.id || val._id || val.value || null;
  }
  if (typeof str !== 'string') return null;
  str = str.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str) ? str : null;
};

export const getEquipmentList = async ({ clientId = null, projectId = null, search = '', clientIds, projectIds } = {}) => {
  const conditions = [];

  const validClientId = toUuidOrNull(clientId);
  if (validClientId) {
    conditions.push(eq(customerEquipment.clientId, validClientId));
  }

  const validProjectId = toUuidOrNull(projectId);
  if (validProjectId) {
    conditions.push(eq(customerEquipment.projectId, validProjectId));
  }

  if (Array.isArray(clientIds) && clientIds.length > 0 && Array.isArray(projectIds) && projectIds.length > 0) {
    conditions.push(or(inArray(customerEquipment.clientId, clientIds), inArray(customerEquipment.projectId, projectIds)));
  } else if (Array.isArray(clientIds) && clientIds.length > 0) {
    conditions.push(inArray(customerEquipment.clientId, clientIds));
  } else if (Array.isArray(projectIds) && projectIds.length > 0) {
    conditions.push(inArray(customerEquipment.projectId, projectIds));
  } else if (clientIds !== undefined || projectIds !== undefined) {
    conditions.push(sql`1=0`);
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(customerEquipment.equipmentName, term),
        ilike(customerEquipment.modelNumber, term),
        ilike(customerEquipment.serialNumber, term),
        ilike(customerEquipment.category, term),
        ilike(customerEquipment.location, term)
      )
    );
  }

  const query = db
    .select()
    .from(customerEquipment)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(customerEquipment.createdAt));

  return await query;
};

export const getEquipmentById = async (id) => {
  const validId = toUuidOrNull(id);
  if (!validId) return null;

  const rows = await db
    .select()
    .from(customerEquipment)
    .where(eq(customerEquipment.id, validId))
    .limit(1);

  return rows[0] || null;
};

export const createEquipment = async (data) => {
  const clientId = toUuidOrNull(data.clientId);
  if (!clientId) {
    throw new Error('Valid clientId is required for customer equipment');
  }
  if (!data.equipmentName || !data.equipmentName.trim()) {
    throw new Error('Equipment name is required');
  }

  const newRecord = {
    clientId,
    clientName: data.clientName || null,
    projectId: toUuidOrNull(data.projectId),
    equipmentName: data.equipmentName.trim(),
    modelNumber: data.modelNumber?.trim() || null,
    serialNumber: data.serialNumber?.trim() || null,
    category: data.category?.trim() || null,
    location: data.location?.trim() || null,
    installationDate: data.installationDate || null,
    warrantyStartDate: data.warrantyStartDate || null,
    warrantyEndDate: data.warrantyEndDate || null,
    status: data.status || 'Operational',
    notes: data.notes?.trim() || null,
  };

  const [created] = await db
    .insert(customerEquipment)
    .values(newRecord)
    .returning();

  return created;
};

export default {
  getEquipmentList,
  getEquipmentById,
  createEquipment,
  toUuidOrNull,
};
