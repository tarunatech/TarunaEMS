import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from 'drizzle-orm';
import db, { pool } from '../db/index.js';
import { amcContracts } from '../db/schema/amcContract.js';
import { projects } from '../db/schema/project.js';
import { leads } from '../db/schema/lead.js';

export const AMC_STATUSES = [
  'Draft',
  'Pending Approval',
  'Active',
  'Expired',
  'Cancelled',
  'Renewed',
];

export const COVERAGE_TYPES = [
  'Comprehensive',
  'Non-Comprehensive',
  'Labor Only',
  'Preventive Only',
  'Custom',
];

export const BILLING_FREQUENCIES = [
  'Annual',
  'Half-Yearly',
  'Quarterly',
  'Monthly',
  'One-Time',
];

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

/**
 * Concurrency-safe unique contract number generation using Postgres sequence.
 * Format: AMC-YYYY-XXXX (e.g. AMC-2026-1001)
 */
export const generateAMCContractNumber = async () => {
  const year = new Date().getFullYear();
  const res = await pool.query("SELECT nextval('amc_contract_number_seq') AS seq");
  const seq = String(res.rows[0]?.seq || 1).padStart(4, '0');
  return `AMC-${year}-${seq}`;
};

/**
 * Calculate days remaining until contract expiry.
 * Positive = active/future days remaining
 * 0 = expires today
 * Negative = expired days ago
 */
export const calculateDaysUntilExpiry = (endDateStr) => {
  if (!endDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return 0;
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Calculate planned commercial installments without creating actual invoices.
 */
export const calculatePlannedInstallments = ({
  contractValue = 0,
  billingFrequency = 'Annual',
  startDate,
  durationMonths = 12,
}) => {
  const value = Math.max(0, Number(contractValue) || 0);
  if (!value || !startDate) return [];

  const baseDate = new Date(startDate);
  if (isNaN(baseDate.getTime())) return [];

  let count = 1;
  let monthStep = 12;

  switch (billingFrequency) {
    case 'Monthly':
      count = Math.max(1, parseInt(durationMonths, 10) || 12);
      monthStep = 1;
      break;
    case 'Quarterly':
      count = Math.max(1, Math.round((parseInt(durationMonths, 10) || 12) / 3));
      monthStep = 3;
      break;
    case 'Half-Yearly':
      count = Math.max(1, Math.round((parseInt(durationMonths, 10) || 12) / 6));
      monthStep = 6;
      break;
    case 'Annual':
    case 'One-Time':
    default:
      count = 1;
      monthStep = durationMonths;
      break;
  }

  const rawAmountPerInstallment = Math.floor((value / count) * 100) / 100;
  const installments = [];
  let allocatedSoFar = 0;

  for (let i = 0; i < count; i++) {
    const instDate = new Date(baseDate);
    instDate.setMonth(instDate.getMonth() + i * monthStep);

    // Format YYYY-MM-DD
    const dueDateStr = instDate.toISOString().slice(0, 10);
    const isLast = i === count - 1;
    const amount = isLast
      ? Math.round((value - allocatedSoFar) * 100) / 100
      : rawAmountPerInstallment;
    allocatedSoFar += amount;

    const percentage = value > 0 ? Math.round((amount / value) * 10000) / 100 : 0;

    installments.push({
      installmentNumber: i + 1,
      dueDate: dueDateStr,
      amount,
      percentage,
    });
  }

  return installments;
};

/**
 * Validate that client and project are compatible.
 */
export const validateClientProjectRelationship = async (clientId, projectId) => {
  const validClientId = toUuidOrNull(clientId);
  if (!validClientId) {
    throw new Error('A valid client (Lead) ID is required');
  }

  // Verify client exists
  const clientRows = await db
    .select({
      id: leads.id,
      company: leads.company,
      firstName: leads.firstName,
      lastName: leads.lastName,
    })
    .from(leads)
    .where(eq(leads.id, validClientId))
    .limit(1);

  if (clientRows.length === 0) {
    throw new Error('Selected client record does not exist');
  }

  const client = clientRows[0];
  const clientDisplayName =
    client.company ||
    [client.firstName, client.lastName].filter(Boolean).join(' ') ||
    'Unknown Client';

  let project = null;
  const validProjectId = toUuidOrNull(projectId);
  if (validProjectId) {
    const projRows = await db
      .select({
        id: projects.id,
        projectCode: projects.projectCode,
        name: projects.name,
        leadId: projects.leadId,
        clientName: projects.clientName,
      })
      .from(projects)
      .where(eq(projects.id, validProjectId))
      .limit(1);

    if (projRows.length === 0) {
      throw new Error('Selected project record does not exist');
    }

    project = projRows[0];

    // If project has leadId assigned, ensure it matches the selected client
    if (project.leadId && project.leadId !== validClientId) {
      throw new Error(
        `Selected project '${project.projectCode} - ${project.name}' belongs to a different client. Please select a valid project for this client.`
      );
    }
  }

  return {
    client,
    clientDisplayName,
    project,
  };
};

/**
 * Enhance a contract record with dynamic expiry calculation and status checks.
 */
export const enhanceContractRecord = (contract) => {
  if (!contract) return null;
  const daysUntilExpiry = calculateDaysUntilExpiry(contract.endDate);

  // If status is Active but contract has passed end date, report effective status as Expired
  let effectiveStatus = contract.status;
  if (contract.status === 'Active' && daysUntilExpiry < 0) {
    effectiveStatus = 'Expired';
  }

  return {
    ...contract,
    daysUntilExpiry,
    effectiveStatus,
    isExpiringSoon: contract.status === 'Active' && daysUntilExpiry >= 0 && daysUntilExpiry <= 30,
    isExpired: effectiveStatus === 'Expired',
  };
};

/**
 * Get AMC Contracts list with rich filtering.
 */
export const getAMCContractsList = async ({
  clientId = null,
  projectId = null,
  status = null,
  expiryPeriod = null,
  search = '',
  limit = 100,
  offset = 0,
  clientIds,
  projectIds,
} = {}) => {
  const conditions = [];

  const validClientId = toUuidOrNull(clientId);
  if (validClientId) {
    conditions.push(eq(amcContracts.clientId, validClientId));
  }

  const validProjectId = toUuidOrNull(projectId);
  if (validProjectId) {
    conditions.push(eq(amcContracts.projectId, validProjectId));
  }

  if (Array.isArray(clientIds) && clientIds.length > 0 && Array.isArray(projectIds) && projectIds.length > 0) {
    conditions.push(or(inArray(amcContracts.clientId, clientIds), inArray(amcContracts.projectId, projectIds)));
  } else if (Array.isArray(clientIds) && clientIds.length > 0) {
    conditions.push(inArray(amcContracts.clientId, clientIds));
  } else if (Array.isArray(projectIds) && projectIds.length > 0) {
    conditions.push(inArray(amcContracts.projectId, projectIds));
  } else if (clientIds !== undefined || projectIds !== undefined) {
    conditions.push(sql`1=0`);
  }

  if (status && status !== 'ALL') {
    conditions.push(eq(amcContracts.status, status));
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(amcContracts.contractNumber, term),
        ilike(amcContracts.title, term),
        ilike(amcContracts.clientName, term),
        ilike(amcContracts.projectCode, term),
        ilike(amcContracts.projectName, term)
      )
    );
  }

  const todayStr = new Date().toISOString().slice(0, 10);

  // Expiry period filters
  if (expiryPeriod) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (expiryPeriod === 'expiring_30') {
      const in30 = new Date(today);
      in30.setDate(in30.getDate() + 30);
      const in30Str = in30.toISOString().slice(0, 10);
      conditions.push(
        and(
          eq(amcContracts.status, 'Active'),
          gte(amcContracts.endDate, todayStr),
          lte(amcContracts.endDate, in30Str)
        )
      );
    } else if (expiryPeriod === 'expiring_60') {
      const in60 = new Date(today);
      in60.setDate(in60.getDate() + 60);
      const in60Str = in60.toISOString().slice(0, 10);
      conditions.push(
        and(
          eq(amcContracts.status, 'Active'),
          gte(amcContracts.endDate, todayStr),
          lte(amcContracts.endDate, in60Str)
        )
      );
    } else if (expiryPeriod === 'expired') {
      conditions.push(
        or(
          eq(amcContracts.status, 'Expired'),
          and(eq(amcContracts.status, 'Active'), sql`${amcContracts.endDate} < ${todayStr}`)
        )
      );
    } else if (expiryPeriod === 'active') {
      conditions.push(
        and(eq(amcContracts.status, 'Active'), gte(amcContracts.endDate, todayStr))
      );
    }
  }

  const rows = await db
    .select()
    .from(amcContracts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(amcContracts.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map(enhanceContractRecord);
};

/**
 * Get AMC Contract by ID with previous/renewal linkage details.
 */
export const getAMCContractById = async (id) => {
  const validId = toUuidOrNull(id);
  if (!validId) return null;

  const rows = await db
    .select()
    .from(amcContracts)
    .where(eq(amcContracts.id, validId))
    .limit(1);

  if (rows.length === 0) return null;

  const contract = enhanceContractRecord(rows[0]);

  // If contract is a renewal, fetch previous contract summary
  let previousContract = null;
  if (contract.previousContractId) {
    const prevRows = await db
      .select({
        id: amcContracts.id,
        contractNumber: amcContracts.contractNumber,
        title: amcContracts.title,
        startDate: amcContracts.startDate,
        endDate: amcContracts.endDate,
        contractValue: amcContracts.contractValue,
        status: amcContracts.status,
      })
      .from(amcContracts)
      .where(eq(amcContracts.id, contract.previousContractId))
      .limit(1);
    if (prevRows.length > 0) {
      previousContract = enhanceContractRecord(prevRows[0]);
    }
  }

  // Check if any renewal contract points back to this contract
  const renewedByRows = await db
    .select({
      id: amcContracts.id,
      contractNumber: amcContracts.contractNumber,
      title: amcContracts.title,
      startDate: amcContracts.startDate,
      endDate: amcContracts.endDate,
      status: amcContracts.status,
    })
    .from(amcContracts)
    .where(eq(amcContracts.previousContractId, contract.id))
    .limit(1);

  const renewedBy = renewedByRows.length > 0 ? renewedByRows[0] : null;

  return {
    ...contract,
    previousContract,
    renewedBy,
  };
};

/**
 * Create a new AMC Contract record.
 */
export const createAMCContract = async (data, creatorId = null) => {
  const { client, clientDisplayName, project } = await validateClientProjectRelationship(
    data.clientId,
    data.projectId
  );

  if (!data.title || !data.title.trim()) {
    throw new Error('Contract title is required');
  }

  if (!data.startDate || !data.endDate) {
    throw new Error('Contract start date and end date are required');
  }

  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Start date and end date must be valid dates');
  }
  if (end <= start) {
    throw new Error('Contract end date must be strictly after the start date');
  }

  // Prevent duplicate contract creation on repeated submissions:
  // Check if another contract for the same client with exact same title and dates was created in the last 60 seconds
  const duplicateCheck = await db
    .select({ id: amcContracts.id })
    .from(amcContracts)
    .where(
      and(
        eq(amcContracts.clientId, client.id),
        eq(amcContracts.title, data.title.trim()),
        eq(amcContracts.startDate, data.startDate),
        eq(amcContracts.endDate, data.endDate),
        sql`${amcContracts.createdAt} > NOW() - INTERVAL '1 minute'`
      )
    )
    .limit(1);

  if (duplicateCheck.length > 0) {
    throw new Error('A contract with the same title and date range was just created. Preventing duplicate submission.');
  }

  // Generate safe contract number
  const contractNumber = data.contractNumber && data.contractNumber.trim()
    ? data.contractNumber.trim()
    : await generateAMCContractNumber();

  const contractValue = Math.max(0, Number(data.contractValue) || 0);
  const durationMonths = Math.max(1, parseInt(data.durationMonths, 10) || 12);
  const billingFrequency = data.billingFrequency || 'Annual';

  // Planned installments calculation
  const plannedInstallments = Array.isArray(data.plannedInstallments) && data.plannedInstallments.length > 0
    ? data.plannedInstallments
    : calculatePlannedInstallments({
        contractValue,
        billingFrequency,
        startDate: data.startDate,
        durationMonths,
      });

  const contractRecord = {
    contractNumber,
    title: data.title.trim(),
    clientId: client.id,
    clientName: clientDisplayName,
    projectId: project ? project.id : null,
    projectCode: project ? project.projectCode : null,
    projectName: project ? project.name : null,
    contractType: data.contractType || (data.previousContractId ? 'Renewal' : 'New'),
    previousContractId: toUuidOrNull(data.previousContractId),
    status: data.status || 'Draft',
    startDate: data.startDate,
    endDate: data.endDate,
    durationMonths,
    signingDate: data.signingDate || null,
    coverageType: data.coverageType || 'Comprehensive',
    coveredEquipment: Array.isArray(data.coveredEquipment) ? data.coveredEquipment : [],
    coveredServices: Array.isArray(data.coveredServices) ? data.coveredServices : [],
    excludedServices: Array.isArray(data.excludedServices) ? data.excludedServices : [],
    preventiveVisitCount: Math.max(0, parseInt(data.preventiveVisitCount, 10) || 0),
    coverageNotes: data.coverageNotes?.trim() || null,
    contractValue,
    currency: data.currency || 'INR',
    billingFrequency,
    billingStartDate: data.billingStartDate || data.startDate,
    paymentTerms: data.paymentTerms?.trim() || 'Net 30 Days',
    renewalTerms: data.renewalTerms?.trim() || null,
    commercialNotes: data.commercialNotes?.trim() || null,
    plannedInstallments,
    documentPath: data.documentPath || null,
    documentOriginalName: data.documentOriginalName || null,
    documentSize: data.documentSize ? parseInt(data.documentSize, 10) : null,
    documentMimeType: data.documentMimeType || null,
    internalNotes: data.internalNotes?.trim() || null,
    approvedBy: data.status === 'Active' ? toUuidOrNull(creatorId) : null,
    approvedAt: data.status === 'Active' ? new Date() : null,
    createdBy: toUuidOrNull(creatorId),
  };

  const [created] = await db.insert(amcContracts).values(contractRecord).returning();

  // If this contract is a renewal, mark the previous contract as Renewed
  if (created.previousContractId) {
    await db
      .update(amcContracts)
      .set({
        status: 'Renewed',
        updatedAt: new Date(),
      })
      .where(eq(amcContracts.id, created.previousContractId));
  }

  return enhanceContractRecord(created);
};

/**
 * Update an existing draft contract.
 * Active / Expired contracts cannot be arbitrarily edited without proper governance.
 */
export const updateAMCContract = async (id, data, modifierId = null) => {
  const validId = toUuidOrNull(id);
  if (!validId) throw new Error('Valid contract ID is required');

  const existing = await getAMCContractById(validId);
  if (!existing) throw new Error('Contract not found');

  if (existing.status !== 'Draft' && existing.status !== 'Pending Approval') {
    throw new Error(`Contracts in '${existing.status}' status cannot be edited. Only Draft or Pending Approval contracts can be updated.`);
  }

  const updateFields = {
    updatedAt: new Date(),
  };

  if (data.title && data.title.trim()) {
    updateFields.title = data.title.trim();
  }

  if (data.clientId) {
    const { client, clientDisplayName, project } = await validateClientProjectRelationship(
      data.clientId,
      data.projectId !== undefined ? data.projectId : existing.projectId
    );
    updateFields.clientId = client.id;
    updateFields.clientName = clientDisplayName;
    if (project !== undefined) {
      updateFields.projectId = project ? project.id : null;
      updateFields.projectCode = project ? project.projectCode : null;
      updateFields.projectName = project ? project.name : null;
    }
  } else if (data.projectId !== undefined) {
    const { project } = await validateClientProjectRelationship(
      existing.clientId,
      data.projectId
    );
    updateFields.projectId = project ? project.id : null;
    updateFields.projectCode = project ? project.projectCode : null;
    updateFields.projectName = project ? project.name : null;
  }

  const startDate = data.startDate || existing.startDate;
  const endDate = data.endDate || existing.endDate;

  if (data.startDate || data.endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Start date and end date must be valid dates');
    }
    if (end <= start) {
      throw new Error('Contract end date must be strictly after the start date');
    }
    updateFields.startDate = startDate;
    updateFields.endDate = endDate;
  }

  if (data.durationMonths !== undefined) {
    updateFields.durationMonths = Math.max(1, parseInt(data.durationMonths, 10) || 12);
  }

  if (data.signingDate !== undefined) updateFields.signingDate = data.signingDate || null;
  if (data.coverageType !== undefined) updateFields.coverageType = data.coverageType;
  if (Array.isArray(data.coveredEquipment)) updateFields.coveredEquipment = data.coveredEquipment;
  if (Array.isArray(data.coveredServices)) updateFields.coveredServices = data.coveredServices;
  if (Array.isArray(data.excludedServices)) updateFields.excludedServices = data.excludedServices;
  if (data.preventiveVisitCount !== undefined) {
    updateFields.preventiveVisitCount = Math.max(0, parseInt(data.preventiveVisitCount, 10) || 0);
  }
  if (data.coverageNotes !== undefined) updateFields.coverageNotes = data.coverageNotes;
  if (data.contractValue !== undefined) {
    updateFields.contractValue = Math.max(0, Number(data.contractValue) || 0);
  }
  if (data.billingFrequency !== undefined) updateFields.billingFrequency = data.billingFrequency;
  if (data.billingStartDate !== undefined) updateFields.billingStartDate = data.billingStartDate;
  if (data.paymentTerms !== undefined) updateFields.paymentTerms = data.paymentTerms;
  if (data.renewalTerms !== undefined) updateFields.renewalTerms = data.renewalTerms;
  if (data.commercialNotes !== undefined) updateFields.commercialNotes = data.commercialNotes;
  if (data.internalNotes !== undefined) updateFields.internalNotes = data.internalNotes;

  // Recalculate installments if contractValue or billingFrequency updated
  if (data.contractValue !== undefined || data.billingFrequency !== undefined || data.startDate !== undefined) {
    const val = updateFields.contractValue ?? existing.contractValue;
    const freq = updateFields.billingFrequency ?? existing.billingFrequency;
    const dur = updateFields.durationMonths ?? existing.durationMonths;
    const sDate = updateFields.startDate ?? existing.startDate;

    updateFields.plannedInstallments = calculatePlannedInstallments({
      contractValue: val,
      billingFrequency: freq,
      startDate: sDate,
      durationMonths: dur,
    });
  }

  // Document metadata
  if (data.documentPath !== undefined) {
    updateFields.documentPath = data.documentPath;
    updateFields.documentOriginalName = data.documentOriginalName;
    updateFields.documentSize = data.documentSize;
    updateFields.documentMimeType = data.documentMimeType;
  }

  const [updated] = await db
    .update(amcContracts)
    .set(updateFields)
    .where(eq(amcContracts.id, validId))
    .returning();

  return enhanceContractRecord(updated);
};

/**
 * Update AMC Contract status (e.g. Approve/Activate, Cancel).
 */
export const updateAMCContractStatus = async (id, targetStatus, user = null) => {
  const validId = toUuidOrNull(id);
  if (!validId) throw new Error('Valid contract ID is required');

  if (!AMC_STATUSES.includes(targetStatus)) {
    throw new Error(`Invalid target status: '${targetStatus}'`);
  }

  const existing = await getAMCContractById(validId);
  if (!existing) throw new Error('Contract not found');

  // Business lifecycle constraints:
  // Cannot activate a cancelled contract
  if (existing.status === 'Cancelled' && targetStatus === 'Active') {
    throw new Error('Cancelled contracts cannot be directly reactivated. Please create a new contract or renewal.');
  }

  // Cannot activate if dates are invalid
  if (targetStatus === 'Active') {
    const start = new Date(existing.startDate);
    const end = new Date(existing.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new Error('Contract must have valid start and end dates before activation');
    }
  }

  const updateFields = {
    status: targetStatus,
    updatedAt: new Date(),
  };

  if (targetStatus === 'Active') {
    updateFields.approvedBy = toUuidOrNull(user?.id || user?._id);
    updateFields.approvedAt = new Date();
  }

  const [updated] = await db
    .update(amcContracts)
    .set(updateFields)
    .where(eq(amcContracts.id, validId))
    .returning();

  return enhanceContractRecord(updated);
};

/**
 * Renew an existing contract:
 * Creates a new contract with 'Renewal' type, pointing to existing contract.
 * Updates original contract status to 'Renewed' without modifying historical terms.
 */
export const renewAMCContract = async (originalContractId, renewalData, user = null) => {
  const validId = toUuidOrNull(originalContractId);
  if (!validId) throw new Error('Valid original contract ID is required');

  const original = await getAMCContractById(validId);
  if (!original) throw new Error('Original contract not found');

  if (original.status === 'Renewed') {
    throw new Error(`Contract ${original.contractNumber} has already been renewed`);
  }

  // Calculate default new dates: start on day after original end date, duration 12 months
  const origEnd = new Date(original.endDate);
  const nextStart = new Date(origEnd);
  nextStart.setDate(nextStart.getDate() + 1);
  const nextEnd = new Date(nextStart);
  nextEnd.setFullYear(nextEnd.getFullYear() + 1);
  nextEnd.setDate(nextEnd.getDate() - 1);

  const startDate = renewalData.startDate || nextStart.toISOString().slice(0, 10);
  const endDate = renewalData.endDate || nextEnd.toISOString().slice(0, 10);

  const payload = {
    title: renewalData.title || `${original.title} (Renewal)`,
    clientId: original.clientId,
    projectId: original.projectId,
    contractType: 'Renewal',
    previousContractId: original.id,
    status: renewalData.status || 'Draft',
    startDate,
    endDate,
    durationMonths: renewalData.durationMonths || original.durationMonths || 12,
    signingDate: renewalData.signingDate || null,
    coverageType: renewalData.coverageType || original.coverageType,
    coveredEquipment: renewalData.coveredEquipment || original.coveredEquipment,
    coveredServices: renewalData.coveredServices || original.coveredServices,
    excludedServices: renewalData.excludedServices || original.excludedServices,
    preventiveVisitCount: renewalData.preventiveVisitCount ?? original.preventiveVisitCount,
    coverageNotes: renewalData.coverageNotes || original.coverageNotes,
    contractValue: renewalData.contractValue !== undefined ? renewalData.contractValue : original.contractValue,
    currency: original.currency || 'INR',
    billingFrequency: renewalData.billingFrequency || original.billingFrequency,
    billingStartDate: renewalData.billingStartDate || startDate,
    paymentTerms: renewalData.paymentTerms || original.paymentTerms,
    renewalTerms: renewalData.renewalTerms || original.renewalTerms,
    commercialNotes: renewalData.commercialNotes || original.commercialNotes,
    internalNotes: renewalData.internalNotes || `Renewed from contract ${original.contractNumber}`,
  };

  return await createAMCContract(payload, user?.id || user?._id);
};

/**
 * AMC Dashboard metrics calculation using actual backend data.
 * Does not count cancelled or expired contracts as active.
 * Avoids double-counting renewed contract values.
 */
export const getAMCDashboardMetrics = async ({ clientIds, projectIds } = {}) => {
  let allRows = await db.select().from(amcContracts);
  if (clientIds !== undefined || projectIds !== undefined) {
    const validClientIds = new Set(Array.isArray(clientIds) ? clientIds : []);
    const validProjectIds = new Set(Array.isArray(projectIds) ? projectIds : []);
    allRows = allRows.filter((r) => validClientIds.has(r.clientId) || validProjectIds.has(r.projectId));
  }
  const todayStr = new Date().toISOString().slice(0, 10);

  let totalContracts = allRows.length;
  let activeContracts = 0;
  let expiringSoonContracts = 0;
  let expiredContracts = 0;
  let totalActiveValue = 0;

  for (const row of allRows) {
    const daysUntilExpiry = calculateDaysUntilExpiry(row.endDate);

    if (row.status === 'Active') {
      if (daysUntilExpiry < 0) {
        // Contract has passed end date without formal renewal/closure
        expiredContracts++;
      } else {
        activeContracts++;
        totalActiveValue += Number(row.contractValue) || 0;

        if (daysUntilExpiry <= 30) {
          expiringSoonContracts++;
        }
      }
    } else if (row.status === 'Expired') {
      expiredContracts++;
    }
  }

  totalActiveValue = Math.round(totalActiveValue * 100) / 100;

  return {
    totalContracts,
    activeContracts,
    expiringSoonContracts,
    expiredContracts,
    totalActiveValue,
  };
};

export default {
  generateAMCContractNumber,
  calculateDaysUntilExpiry,
  calculatePlannedInstallments,
  validateClientProjectRelationship,
  enhanceContractRecord,
  getAMCContractsList,
  getAMCContractById,
  createAMCContract,
  updateAMCContract,
  updateAMCContractStatus,
  renewAMCContract,
  getAMCDashboardMetrics,
  toUuidOrNull,
};
