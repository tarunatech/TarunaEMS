import path from 'path';
import fs from 'fs';
import AMCContract, {
  getAMCDashboardMetrics,
  getAMCContractsList,
  getAMCContractById,
  createAMCContract as createContractModel,
  updateAMCContract as updateContractModel,
  updateAMCContractStatus as updateStatusModel,
  renewAMCContract as renewContractModel,
  calculatePlannedInstallments,
} from '../models/AMCContract.js';
import CustomerEquipment, {
  getEquipmentList,
  createEquipment as createEquipmentModel,
} from '../models/CustomerEquipment.js';
import { amcContractsDir, uploadPublicPath } from '../config/uploadPaths.js';
import { getSalesEmployeeScope } from '../utils/salesScope.js';

const parseJsonIfString = (val, defaultVal = []) => {
  if (val === undefined || val === null) return defaultVal;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return defaultVal;
    }
  }
  return val;
};

/**
 * GET /api/amc/dashboard
 * AMC Dashboard overview metrics
 */
export const getAMCDashboard = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const metricsOptions = scope.isScoped
      ? { clientIds: scope.leadIds, projectIds: scope.projectIds }
      : {};
    const metrics = await getAMCDashboardMetrics(metricsOptions);
    return res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('getAMCDashboard error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch AMC dashboard metrics',
    });
  }
};

/**
 * GET /api/amc/contracts
 * List AMC contracts with filters
 */
export const getAMCContracts = async (req, res) => {
  try {
    const { clientId, projectId, status, expiryPeriod, search, limit, offset } = req.query;
    const scope = await getSalesEmployeeScope(req.user);

    const contracts = await getAMCContractsList({
      clientId,
      projectId,
      status,
      expiryPeriod,
      search,
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
      clientIds: scope.isScoped ? scope.leadIds : undefined,
      projectIds: scope.isScoped ? scope.projectIds : undefined,
    });

    return res.status(200).json({
      success: true,
      count: contracts.length,
      data: contracts,
    });
  } catch (error) {
    console.error('getAMCContracts error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch AMC contracts',
    });
  }
};

/**
 * GET /api/amc/contracts/:id
 * Get single contract details
 */
export const getAMCContract = async (req, res) => {
  try {
    const { id } = req.params;
    const contract = await getAMCContractById(id);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'AMC Contract not found',
      });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const matchClient = contract.clientId && scope.leadIds.includes(String(contract.clientId));
      const matchProject = contract.projectId && scope.projectIds.includes(String(contract.projectId));
      if (!matchClient && !matchProject) {
        return res.status(403).json({ success: false, message: 'Access denied. You can only view contracts of your own clients/projects.' });
      }
    }

    return res.status(200).json({
      success: true,
      data: contract,
    });
  } catch (error) {
    console.error('getAMCContract error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch AMC contract details',
    });
  }
};

/**
 * POST /api/amc/contracts
 * Create new AMC contract (supports file upload via multipart/form-data)
 */
export const createAMCContract = async (req, res) => {
  try {
    const body = req.body;

    const payload = {
      title: body.title,
      clientId: body.clientId,
      projectId: body.projectId || null,
      contractType: body.contractType || 'New',
      previousContractId: body.previousContractId || null,
      status: body.status || 'Draft',
      startDate: body.startDate,
      endDate: body.endDate,
      durationMonths: body.durationMonths ? parseInt(body.durationMonths, 10) : 12,
      signingDate: body.signingDate || null,
      coverageType: body.coverageType || 'Comprehensive',
      coveredEquipment: parseJsonIfString(body.coveredEquipment, []),
      coveredServices: parseJsonIfString(body.coveredServices, []),
      excludedServices: parseJsonIfString(body.excludedServices, []),
      preventiveVisitCount: body.preventiveVisitCount !== undefined ? parseInt(body.preventiveVisitCount, 10) : 4,
      coverageNotes: body.coverageNotes || null,
      contractValue: body.contractValue !== undefined ? Number(body.contractValue) : 0,
      currency: body.currency || 'INR',
      billingFrequency: body.billingFrequency || 'Annual',
      billingStartDate: body.billingStartDate || body.startDate,
      paymentTerms: body.paymentTerms || 'Net 30 Days',
      renewalTerms: body.renewalTerms || null,
      commercialNotes: body.commercialNotes || null,
      plannedInstallments: parseJsonIfString(body.plannedInstallments, []),
      internalNotes: body.internalNotes || null,
    };

    if (req.file) {
      payload.documentPath = uploadPublicPath('amc-contracts', req.file.filename);
      payload.documentOriginalName = req.file.originalname;
      payload.documentSize = req.file.size;
      payload.documentMimeType = req.file.mimetype;
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      if (payload.clientId && !scope.leadIds.includes(String(payload.clientId))) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create AMC contracts for your assigned clients.' });
      }
      if (payload.projectId && !scope.projectIds.includes(String(payload.projectId))) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only create AMC contracts for your assigned projects.' });
      }
    }

    const created = await createContractModel(payload, req.user?.id || req.user?._id);

    return res.status(201).json({
      success: true,
      message: 'AMC contract created successfully',
      data: created,
    });
  } catch (error) {
    console.error('createAMCContract error:', error);
    // If a file was uploaded but creation failed, clean up the orphaned file
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error('Failed to clean up uploaded file:', cleanupErr);
      }
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to create AMC contract',
    });
  }
};

/**
 * PUT /api/amc/contracts/:id
 * Update draft contract (supports updating document)
 */
export const updateAMCContract = async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const existing = await getAMCContractById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Contract not found' });
      const clientMatch = existing.clientId && scope.leadIds.includes(String(existing.clientId));
      const projectMatch = existing.projectId && scope.projectIds.includes(String(existing.projectId));
      const creatorMatch = existing.createdBy && String(existing.createdBy) === String(scope.userId);
      if (!clientMatch && !projectMatch && !creatorMatch) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to edit this AMC contract.' });
      }
    }

    const payload = { ...body };

    if (body.coveredEquipment !== undefined) {
      payload.coveredEquipment = parseJsonIfString(body.coveredEquipment, []);
    }
    if (body.coveredServices !== undefined) {
      payload.coveredServices = parseJsonIfString(body.coveredServices, []);
    }
    if (body.excludedServices !== undefined) {
      payload.excludedServices = parseJsonIfString(body.excludedServices, []);
    }
    if (body.plannedInstallments !== undefined) {
      payload.plannedInstallments = parseJsonIfString(body.plannedInstallments, []);
    }

    if (req.file) {
      payload.documentPath = uploadPublicPath('amc-contracts', req.file.filename);
      payload.documentOriginalName = req.file.originalname;
      payload.documentSize = req.file.size;
      payload.documentMimeType = req.file.mimetype;
    }

    const updated = await updateContractModel(id, payload, req.user?.id || req.user?._id);

    return res.status(200).json({
      success: true,
      message: 'AMC contract updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('updateAMCContract error:', error);
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupErr) {
        console.error('Failed to clean up uploaded file:', cleanupErr);
      }
    }
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update AMC contract',
    });
  }
};

/**
 * PATCH /api/amc/contracts/:id/status
 * Transition contract status (e.g. Draft -> Active, Active -> Cancelled)
 */
export const updateAMCStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const existing = await getAMCContractById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Contract not found' });
      const clientMatch = existing.clientId && scope.leadIds.includes(String(existing.clientId));
      const projectMatch = existing.projectId && scope.projectIds.includes(String(existing.projectId));
      const creatorMatch = existing.createdBy && String(existing.createdBy) === String(scope.userId);
      if (!clientMatch && !projectMatch && !creatorMatch) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to modify this contract.' });
      }
    }

    const updated = await updateStatusModel(id, status, req.user);

    return res.status(200).json({
      success: true,
      message: `Contract status updated to '${status}'`,
      data: updated,
    });
  } catch (error) {
    console.error('updateAMCStatus error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to update contract status',
    });
  }
};

/**
 * POST /api/amc/contracts/:id/renew
 * Create a renewal contract linked to an existing contract
 */
export const renewAMCContract = async (req, res) => {
  try {
    const { id } = req.params;
    const renewalData = req.body || {};

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const existing = await getAMCContractById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'Contract not found' });
      const clientMatch = existing.clientId && scope.leadIds.includes(String(existing.clientId));
      const projectMatch = existing.projectId && scope.projectIds.includes(String(existing.projectId));
      const creatorMatch = existing.createdBy && String(existing.createdBy) === String(scope.userId);
      if (!clientMatch && !projectMatch && !creatorMatch) {
        return res.status(403).json({ success: false, message: 'Access denied: You do not have permission to renew this contract.' });
      }
    }

    const renewed = await renewContractModel(id, renewalData, req.user);

    return res.status(201).json({
      success: true,
      message: 'AMC Contract renewed successfully',
      data: renewed,
    });
  } catch (error) {
    console.error('renewAMCContract error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to renew AMC contract',
    });
  }
};

/**
 * POST /api/amc/contracts/calculate-installments
 * Helper endpoint to preview planned installment calculation
 */
export const previewInstallments = async (req, res) => {
  try {
    const { contractValue, billingFrequency, startDate, durationMonths } = req.body;
    const installments = calculatePlannedInstallments({
      contractValue,
      billingFrequency,
      startDate,
      durationMonths,
    });

    return res.status(200).json({
      success: true,
      data: installments,
    });
  } catch (error) {
    console.error('previewInstallments error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to calculate installments',
    });
  }
};

/**
 * GET /api/amc/equipment
 * List customer equipment
 */
export const getCustomerEquipment = async (req, res) => {
  try {
    const { clientId, projectId, search } = req.query;
    const scope = await getSalesEmployeeScope(req.user);
    const equipment = await getEquipmentList({
      clientId,
      projectId,
      search,
      clientIds: scope.isScoped ? scope.leadIds : undefined,
      projectIds: scope.isScoped ? scope.projectIds : undefined,
    });

    return res.status(200).json({
      success: true,
      count: equipment.length,
      data: equipment,
    });
  } catch (error) {
    console.error('getCustomerEquipment error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch customer equipment',
    });
  }
};

/**
 * POST /api/amc/equipment
 * Add customer equipment
 */
export const createCustomerEquipment = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      if (req.body.clientId && !scope.leadIds.includes(String(req.body.clientId))) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only add equipment for your assigned clients.' });
      }
      if (req.body.projectId && !scope.projectIds.includes(String(req.body.projectId))) {
        return res.status(403).json({ success: false, message: 'Access denied: You can only add equipment for your assigned projects.' });
      }
    }

    const equipment = await createEquipmentModel(req.body);

    return res.status(201).json({
      success: true,
      message: 'Customer equipment added successfully',
      data: equipment,
    });
  } catch (error) {
    console.error('createCustomerEquipment error:', error);
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to add customer equipment',
    });
  }
};

export default {
  getAMCDashboard,
  getAMCContracts,
  getAMCContract,
  createAMCContract,
  updateAMCContract,
  updateAMCStatus,
  renewAMCContract,
  previewInstallments,
  getCustomerEquipment,
  createCustomerEquipment,
};
