import { validationResult } from 'express-validator';
import ExpenseTransaction from '../models/ExpenseTransaction.js';
import Employee from '../models/Employee.js';
import Project from '../models/Project.js';
import Lead from '../models/Lead.js';
import { getSalesEmployeeScope } from '../utils/salesScope.js';

const sendTrackerUpdate = (req) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('expense-tracker:updated');
    io.emit('finance:updated');
  }
};

const buildFilters = (query) => {
  const filters = {};

  if (query.type && ['expense', 'payment'].includes(query.type)) {
    filters.type = query.type;
  }

  if (query.startDate || query.endDate) {
    filters.date = {};
    if (query.startDate) filters.date.$gte = new Date(query.startDate);
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filters.date.$lte = end;
    }
  }

  if (query.search) {
    const search = new RegExp(query.search.trim(), 'i');
    filters.$or = [
      { paidTo: search },
      { clientName: search },
      { category: search },
      { description: search },
      { referenceNumber: search },
      { invoiceNumber: search },
      { remarks: search }
    ];
  }

  if (query.projectId) {
    filters.projectId = query.projectId;
  }

  if (query.leadId) {
    filters.leadId = query.leadId;
  }

  return filters;
};

export const getExpenseTrackerSummary = async (req, res, next) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const match = {};

    if (scope.isScoped) {
      const scopeOr = [{ createdBy: scope.userId }];
      if (scope.employeeId) scopeOr.push({ employee: scope.employeeId });
      if (scope.projectIds.length > 0) scopeOr.push({ projectId: { $in: scope.projectIds } });
      if (scope.leadIds.length > 0) scopeOr.push({ leadId: { $in: scope.leadIds } });
      match.$or = scopeOr;
    }

    const totals = await ExpenseTransaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const summary = totals.reduce((acc, item) => {
      if (item._id === 'payment') {
        acc.totalReceived = item.total;
        acc.paymentCount = item.count;
      }
      if (item._id === 'expense') {
        acc.totalSpent = item.total;
        acc.expenseCount = item.count;
      }
      return acc;
    }, {
      totalReceived: 0,
      totalSpent: 0,
      paymentCount: 0,
      expenseCount: 0
    });

    summary.remainingBalance = summary.totalReceived - summary.totalSpent;

    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

export const getExpenseTransactions = async (req, res, next) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const filters = buildFilters(req.query);

    if (scope.isScoped) {
      if (req.query.projectId && !scope.projectIds.includes(String(req.query.projectId))) {
        return res.json({ success: true, data: [] });
      }
      if (req.query.leadId && !scope.leadIds.includes(String(req.query.leadId))) {
        return res.json({ success: true, data: [] });
      }

      const scopeOr = [{ createdBy: scope.userId }];
      if (scope.employeeId) scopeOr.push({ employee: scope.employeeId });
      if (scope.projectIds.length > 0) scopeOr.push({ projectId: { $in: scope.projectIds } });
      if (scope.leadIds.length > 0) scopeOr.push({ leadId: { $in: scope.leadIds } });

      if (filters.$or) {
        const baseOr = filters.$or;
        delete filters.$or;
        filters.$and = [{ $or: baseOr }, { $or: scopeOr }];
      } else {
        filters.$or = scopeOr;
      }
    }

    const transactions = await ExpenseTransaction.find(filters)
      .populate('createdBy', 'name email')
      .populate('projectId', 'id projectCode name')
      .populate('leadId', 'id company firstName lastName email')
      .populate({
        path: 'employee',
        select: 'employeeId personalInfo workInfo',
        populate: { path: 'workInfo.department', select: 'name code' }
      })
      .sort({ date: -1, createdAt: -1 });

    res.json({ success: true, data: transactions });
  } catch (error) {
    next(error);
  }
};

export const createExpenseTransaction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const scope = await getSalesEmployeeScope(req.user);
    const payload = { ...req.body, createdBy: req.user._id };

    // Auto-resolve project from leadId or clientName if not explicitly provided
    if (!payload.projectId && (payload.leadId || payload.clientName)) {
      let matchedProject = null;
      if (payload.leadId) {
        matchedProject = await Project.findOne({ leadId: payload.leadId });
      }
      if (!matchedProject && payload.clientName) {
        const cleanClient = String(payload.clientName).trim();
        matchedProject = await Project.findOne({
          $or: [
            { clientName: cleanClient },
            { name: cleanClient },
            { name: `${cleanClient} Project` }
          ]
        });
      }
      if (matchedProject) {
        const matchedPid = String(matchedProject._id || matchedProject.id);
        const canLink = !scope.isScoped ||
          scope.projectIds.includes(matchedPid) ||
          (payload.leadId && scope.leadIds.includes(String(payload.leadId))) ||
          (matchedProject.leadId && scope.leadIds.includes(String(matchedProject.leadId))) ||
          String(matchedProject.createdBy) === String(scope.userId);

        if (canLink) {
          payload.projectId = matchedPid;
          if (!payload.leadId && matchedProject.leadId) {
            payload.leadId = typeof matchedProject.leadId === 'object'
              ? (matchedProject.leadId._id || matchedProject.leadId.id)
              : matchedProject.leadId;
          }
        }
      }
    }

    if (payload.projectId) {
      if (scope.isScoped) {
        const pidStr = String(payload.projectId);
        const isPermitted = scope.projectIds.includes(pidStr) ||
          (payload.leadId && scope.leadIds.includes(String(payload.leadId)));
        if (!isPermitted) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Target project does not belong to your assigned projects',
          });
        }
      }
      const project = await Project.findById(payload.projectId);
      if (!project) {
        return res.status(400).json({ success: false, message: 'Invalid projectId' });
      }
    }

    if (payload.leadId) {
      if (scope.isScoped && !scope.leadIds.includes(String(payload.leadId))) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: Target client does not belong to your assigned clients',
        });
      }
      const lead = await Lead.findById(payload.leadId);
      if (!lead) {
        return res.status(400).json({ success: false, message: 'Invalid leadId' });
      }
    }

    if (req.user.role === 'admin') {
      payload.source = 'admin';
    } else {
      const employee = await Employee.findOne({ user: req.user._id }).select('_id');
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee profile not found' });
      }
      payload.employee = employee._id;
      payload.source = 'employee';

      if (payload.type === 'expense') {
        if (!req.body.paidTo?.trim() || !req.body.category?.trim()) {
          return res.status(400).json({ success: false, message: 'Paid to and category are required' });
        }
        delete payload.clientName;
        delete payload.invoiceNumber;
      } else if (payload.type === 'payment') {
        if (!req.body.clientName?.trim()) {
          return res.status(400).json({ success: false, message: 'Client name is required for payments' });
        }
      }
    }

    const transaction = await ExpenseTransaction.create(payload);

    sendTrackerUpdate(req);
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

export const updateExpenseTransaction = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const scope = await getSalesEmployeeScope(req.user);
    const existing = await ExpenseTransaction.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (scope.isScoped) {
      const isOwner = String(existing.createdBy) === String(scope.userId);
      const isAssignedEmployee = scope.employeeId && String(existing.employee) === String(scope.employeeId);
      const isLinkedProject = existing.projectId && scope.projectIds.includes(String(existing.projectId));
      const isLinkedLead = existing.leadId && scope.leadIds.includes(String(existing.leadId));

      if (!isOwner && !isAssignedEmployee && !isLinkedProject && !isLinkedLead) {
        return res.status(403).json({ success: false, message: 'Access denied to this transaction' });
      }
    }

    const payload = { ...req.body };
    if (!payload.projectId && (payload.leadId || payload.clientName || existing.leadId || existing.clientName)) {
      const targetLeadId = payload.leadId || existing.leadId;
      const targetClient = payload.clientName || existing.clientName;
      let matchedProject = null;
      if (targetLeadId) {
        matchedProject = await Project.findOne({ leadId: targetLeadId });
      }
      if (!matchedProject && targetClient) {
        const cleanClient = String(targetClient).trim();
        matchedProject = await Project.findOne({
          $or: [
            { clientName: cleanClient },
            { name: cleanClient },
            { name: `${cleanClient} Project` }
          ]
        });
      }
      if (matchedProject) {
        const matchedPid = String(matchedProject._id || matchedProject.id);
        const canLink = !scope.isScoped ||
          scope.projectIds.includes(matchedPid) ||
          (targetLeadId && scope.leadIds.includes(String(targetLeadId))) ||
          String(matchedProject.createdBy) === String(scope.userId);

        if (canLink) {
          payload.projectId = matchedPid;
        }
      }
    }
    if (req.user.role !== 'admin' && existing.type === 'expense') {
      delete payload.clientName;
      delete payload.invoiceNumber;
    }

    const transaction = await ExpenseTransaction.findByIdAndUpdate(req.params.id, payload, { new: true });

    sendTrackerUpdate(req);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenseTransaction = async (req, res, next) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const existing = await ExpenseTransaction.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (scope.isScoped) {
      const isOwner = String(existing.createdBy) === String(scope.userId);
      const isAssignedEmployee = scope.employeeId && String(existing.employee) === String(scope.employeeId);
      const isLinkedProject = existing.projectId && scope.projectIds.includes(String(existing.projectId));
      const isLinkedLead = existing.leadId && scope.leadIds.includes(String(existing.leadId));

      if (!isOwner && !isAssignedEmployee && !isLinkedProject && !isLinkedLead) {
        return res.status(403).json({ success: false, message: 'Access denied to this transaction' });
      }
    }

    await ExpenseTransaction.findByIdAndDelete(req.params.id);

    sendTrackerUpdate(req);
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
};
