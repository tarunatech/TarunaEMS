import Project, { generateProjectCode } from '../models/Project.js';
import Lead from '../models/Lead.js';
import Employee from '../models/Employee.js';
import Task from '../models/Task.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { getAMCContractsList } from '../models/AMCContract.js';
import { getEquipmentList } from '../models/CustomerEquipment.js';
import CustomerInvoiceModel from '../models/CustomerInvoice.js';
import ExpenseTransaction from '../models/ExpenseTransaction.js';
import ProjectBudget from '../models/ProjectBudget.js';
import SalesPipeline from '../models/SalesPipeline.js';
import { getSalesEmployeeScope } from '../utils/salesScope.js';

const ALLOWED_STATUSES = ['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'];

export { generateProjectCode };

// @desc    Get all projects with filters and pagination
// @route   GET /api/projects
// @access  Private
export const getProjects = async (req, res) => {
  try {
    const {
      status,
      leadId,
      search,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = -1,
    } = req.query;

    const query = {};
    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      if (scope.projectIds.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          total: 0,
          page: Number(page),
          pages: 0,
          data: [],
        });
      }
      query.id = { $in: scope.projectIds };
    }
    if (status && status !== 'all') {
      if (ALLOWED_STATUSES.includes(status)) {
        query.status = status;
      }
    }

    if (leadId) {
      query.leadId = leadId;
    }

    if (search) {
      const regex = search.trim();
      query.$or = [
        { projectCode: { $regex: regex, $options: 'i' } },
        { name: { $regex: regex, $options: 'i' } },
        { clientName: { $regex: regex, $options: 'i' } },
      ];
    }

    const sort = { [sortBy]: Number(sortOrder) || -1 };
    const skip = (Number(page) - 1) * Number(limit);

    const projectsList = await Project.find(query)
      .populate('leadId', 'leadId firstName lastName company email phone')
      .populate('projectManager', 'employeeId personalInfo workInfo')
      .populate('createdBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Project.countDocuments(query);

    res.json({
      success: true,
      data: projectsList,
      projects: projectsList,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalProjects: total,
        hasNext: Number(page) < Math.ceil(total / Number(limit)),
        hasPrev: Number(page) > 1,
      },
    });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single project by ID with associated tasks
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('leadId', 'leadId firstName lastName company email phone interestedProducts status')
      .populate('projectManager', 'employeeId personalInfo workInfo')
      .populate('createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const scope = await getSalesEmployeeScope(req.user);
    const pId = String(project._id || project.id);
    if (scope.isScoped && !scope.projectIds.includes(pId)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view your own projects.' });
    }
    const leadId = project.leadId?._id
      ? String(project.leadId._id)
      : project.leadId?.id
      ? String(project.leadId.id)
      : project.leadId
      ? String(project.leadId)
      : null;

    let pipelinePromise;
    if (project.pipelineId) {
      pipelinePromise = SalesPipeline.findById(project.pipelineId).lean();
    } else if (leadId) {
      pipelinePromise = SalesPipeline.findOne({ lead: leadId }).lean();
    } else {
      pipelinePromise = Promise.resolve(null);
    }

    // Parallel query of all project-linked modules
    const [
      tasks,
      purchaseOrders,
      amcContractsDirect,
      equipmentDirect,
      invoices,
      expenses,
      payments,
      budgets,
      pipelineDirect,
    ] = await Promise.all([
      Task.find({ projectId: pId })
        .populate([
          { path: 'assignedTo', select: 'employeeId personalInfo workInfo' },
          { path: 'assignedBy', select: 'name email' },
        ])
        .sort({ createdAt: -1 }),

      PurchaseOrder.find({ projectId: pId })
        .populate('client', 'firstName lastName company')
        .sort({ purchaseDate: -1 })
        .lean(),

      getAMCContractsList({ projectId: pId, limit: 100 }),

      getEquipmentList({ projectId: pId }),

      CustomerInvoiceModel.find({ projectId: pId }),

      ExpenseTransaction.find({ projectId: pId, type: 'expense' })
        .populate('employee', 'employeeId personalInfo')
        .sort({ date: -1 })
        .lean(),

      ExpenseTransaction.find({ projectId: pId, type: 'payment' })
        .sort({ date: -1 })
        .lean(),

      ProjectBudget.find({ projectId: pId })
        .withItems()
        .populate('approvedBy', 'name email')
        .populate('createdBy', 'name email')
        .sort({ version: -1 })
        .lean(),

      pipelinePromise.catch((err) => {
        console.warn('Error fetching project pipeline:', err.message);
        return null;
      }),
    ]);

    let pipeline = pipelineDirect || null;
    if (!pipeline && leadId && project.pipelineId) {
      try {
        pipeline = await SalesPipeline.findOne({ lead: leadId }).lean();
      } catch (err) {
        console.warn('Error fallback fetching pipeline by leadId:', err.message);
      }
    }

    // Also include client-level AMC contracts or equipment if unassigned to another project
    let amcContracts = amcContractsDirect || [];
    if (leadId) {
      try {
        const clientAmcs = await getAMCContractsList({ clientId: leadId, limit: 100 });
        const additionalAmcs = clientAmcs.filter(
          (c) => !c.projectId || String(c.projectId) === pId
        );
        const seenAmcIds = new Set(amcContracts.map((a) => String(a.id)));
        for (const c of additionalAmcs) {
          if (!seenAmcIds.has(String(c.id))) {
            amcContracts.push(c);
            seenAmcIds.add(String(c.id));
          }
        }
      } catch (err) {
        console.warn('Error fetching client AMCs:', err.message);
      }
    }

    let equipment = equipmentDirect || [];
    if (leadId) {
      try {
        const clientEquip = await getEquipmentList({ clientId: leadId });
        const additionalEquip = clientEquip.filter(
          (e) => !e.projectId || String(e.projectId) === pId
        );
        const seenEquipIds = new Set(equipment.map((e) => String(e.id)));
        for (const e of additionalEquip) {
          if (!seenEquipIds.has(String(e.id))) {
            equipment.push(e);
            seenEquipIds.add(String(e.id));
          }
        }
      } catch (err) {
        console.warn('Error fetching client equipment:', err.message);
      }
    }

    // Commercial & Financial calculations
    const actualCosts = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const openCommitments = (purchaseOrders || [])
      .filter((p) => p.status === 'Active' || p.status === 'Pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const committedCosts = openCommitments;
    const incomingPayments = (payments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const approvedBudget = Number(project.approvedBudget || 0);
    const contractValue = Number(project.contractValue || 0);
    const incurredProjectCosts = actualCosts;
    const availableBudget = approvedBudget - actualCosts - committedCosts;
    const budgetUtilization = approvedBudget > 0
      ? Math.round(((actualCosts + committedCosts) / approvedBudget) * 1000) / 10
      : 0;

    const invoicedAmount = (invoices || []).reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
    const invoicePaidAmount = (invoices || []).reduce((sum, inv) => sum + Number(inv.paidAmount || 0), 0);
    const outstandingReceivables = (invoices || [])
      .filter((inv) => inv.status !== 'cancelled')
      .reduce(
        (sum, inv) =>
          sum +
          Number(
            inv.outstandingAmount ??
              inv.balanceDue ??
              (Number(inv.totalAmount || 0) - Number(inv.paidAmount || 0))
          ),
        0
      );

    const latestApprovedBudget = (budgets || []).find((b) => b.status === 'Approved') || null;

    const projectObj = project.toObject ? project.toObject() : { ...project };
    if (pipeline) {
      projectObj.pipeline = pipeline;
    }

    res.json({
      success: true,
      data: {
        project: projectObj,
        pipeline: pipeline || null,
        tasks: tasks || [],
        purchaseOrders: purchaseOrders || [],
        amcContracts: amcContracts || [],
        equipment: equipment || [],
        invoices: invoices || [],
        expenses: expenses || [],
        payments: payments || [],
        budgets: budgets || [],
        latestApprovedBudget,
        financialSummary: {
          contractValue,
          approvedBudget,
          actualCosts,
          openCommitments,
          committedCosts,
          incurredProjectCosts,
          availableBudget,
          budgetUtilization,
          incomingPayments,
          invoicedAmount,
          invoicePaidAmount,
          outstandingReceivables,
        },
      },
    });
  } catch (error) {
    console.error('Get project by ID error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get project associated with a specific lead
// @route   GET /api/projects/by-lead/:leadId
// @access  Private
export const getProjectByLead = async (req, res) => {
  try {
    const { leadId } = req.params;
    const project = await Project.findOne({ leadId })
      .populate('leadId', 'leadId firstName lastName company email phone')
      .populate('projectManager', 'employeeId personalInfo workInfo')
      .populate('createdBy', 'name email');

    res.json({
      success: true,
      data: project || null,
    });
  } catch (error) {
    console.error('Get project by lead error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new project manually
// @route   POST /api/projects
// @access  Private (Admin / Authorized)
export const createProject = async (req, res) => {
  try {
    const {
      name,
      description,
      leadId,
      status = 'Planning',
      contractValue = 0,
      approvedBudget = 0,
      billingSchedule = [],
      currency = 'INR',
      startDate,
      endDate,
      projectManager,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }

    if (status && !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: must be one of ${ALLOWED_STATUSES.join(', ')}` });
    }

    let clientName = req.body.clientName || '';
    if (leadId) {
      const lead = await Lead.findById(leadId);
      if (!lead) {
        return res.status(400).json({ success: false, message: 'Invalid leadId: Lead not found' });
      }
      clientName = lead.company || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || clientName;
    }

    if (projectManager) {
      const pm = await Employee.findById(projectManager);
      if (!pm) {
        return res.status(400).json({ success: false, message: 'Invalid projectManager: Employee not found' });
      }
    }

    const projectCode = req.body.projectCode?.trim() || (await generateProjectCode());

    const project = await Project.create({
      projectCode,
      name: name.trim(),
      description: description?.trim() || null,
      leadId: leadId || null,
      pipelineId: req.body.pipelineId || null,
      status,
      contractValue: Number(contractValue) || 0,
      approvedBudget: Number(approvedBudget) || 0,
      billingSchedule: Array.isArray(billingSchedule) ? billingSchedule : [],
      currency: currency || 'INR',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      projectManager: projectManager || null,
      clientName,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project,
    });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update project
// @route   PATCH /api/projects/:id
// @access  Private
export const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Role verification: admin or project manager can update
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || project.projectManager?.toString() !== employee._id?.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied: only Admin or designated Project Manager can update this project' });
      }
    }

    const updates = {};
    const {
      name,
      description,
      status,
      contractValue,
      approvedBudget,
      billingSchedule,
      startDate,
      endDate,
      projectManager,
      clientName,
    } = req.body;

    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description ? description.trim() : null;
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ success: false, message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}` });
      }
      updates.status = status;
    }
    if (contractValue !== undefined) updates.contractValue = Number(contractValue) || 0;
    if (approvedBudget !== undefined) updates.approvedBudget = Number(approvedBudget) || 0;
    if (billingSchedule !== undefined && Array.isArray(billingSchedule)) updates.billingSchedule = billingSchedule;
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
    if (clientName !== undefined) updates.clientName = clientName ? clientName.trim() : null;

    if (projectManager !== undefined) {
      if (projectManager) {
        const pm = await Employee.findById(projectManager);
        if (!pm) {
          return res.status(400).json({ success: false, message: 'Invalid projectManager: Employee not found' });
        }
        updates.projectManager = projectManager;
      } else {
        updates.projectManager = null;
      }
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, updates);
    await updated.populate('leadId', 'leadId firstName lastName company email phone');
    await updated.populate('projectManager', 'employeeId personalInfo workInfo');
    await updated.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: updated,
    });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
