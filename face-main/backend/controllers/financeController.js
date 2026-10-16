import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import db from '../db/index.js';
import Project from '../models/Project.js';
import ProjectBudget from '../models/ProjectBudget.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import ExpenseTransaction from '../models/ExpenseTransaction.js';
import Payslip from '../models/Payslip.js';
import Lead from '../models/Lead.js';
import { projects } from '../db/schema/project.js';
import { purchaseOrders } from '../db/schema/purchaseOrder.js';
import { expenseTransactions } from '../db/schema/expenseTransaction.js';
import { projectBudgets, projectBudgetItems } from '../db/schema/budget.js';
import { payslips } from '../db/schema/payslip.js';
import { getSalesEmployeeScope } from '../utils/salesScope.js';

// Safe date range parser
const parseDateRange = (startDate, endDate) => {
  let start, end;
  if (startDate) {
    const d = new Date(startDate);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCHours(0, 0, 0, 0);
      start = d;
    }
  }
  if (endDate) {
    const d = new Date(endDate);
    if (!Number.isNaN(d.getTime())) {
      d.setUTCHours(23, 59, 59, 999);
      end = d;
    }
  }
  return { start, end };
};

// -------------------------------------------------------------
// 1. FINANCE OVERVIEW
// -------------------------------------------------------------
export const getFinanceOverview = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { startDate, endDate, clientId, projectId } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    // 1. Projects Query
    let projectFilter = {};
    if (scope.isScoped) {
      if (projectId) {
        if (!scope.projectIds.includes(String(projectId))) {
          projectFilter.id = '__none__';
        } else {
          projectFilter.id = projectId;
        }
      } else if (clientId) {
        if (!scope.leadIds.includes(String(clientId))) {
          projectFilter.id = '__none__';
        } else {
          projectFilter.leadId = clientId;
          projectFilter.id = { $in: scope.projectIds.length > 0 ? scope.projectIds : ['__none__'] };
        }
      } else {
        projectFilter.id = { $in: scope.projectIds.length > 0 ? scope.projectIds : ['__none__'] };
      }
    } else {
      if (projectId) projectFilter.id = projectId;
      if (clientId) projectFilter.leadId = clientId;
    }

    const allProjects = await Project.find(projectFilter).lean();
    const activeProjects = allProjects.filter((p) => p.status === 'Active');
    const projectIds = allProjects.map((p) => p.id || p._id);

    // TOTAL CONTRACT VALUE: Sum authoritative contractValue of projects
    const totalContractValue = allProjects.reduce((sum, p) => sum + Number(p.contractValue || 0), 0);

    // TOTAL APPROVED BUDGET: Sum approved budget of projects
    const totalApprovedBudget = allProjects.reduce((sum, p) => sum + Number(p.approvedBudget || 0), 0);

    // 2. Expenses & Incoming Client Payments (from expenseTransactions)
    let expenseQuery = {};
    if (scope.isScoped) {
      if (projectId) {
        if (!scope.projectIds.includes(String(projectId))) {
          expenseQuery.id = '__none__';
        } else {
          expenseQuery.projectId = projectId;
        }
      } else if (clientId) {
        if (!scope.leadIds.includes(String(clientId))) {
          expenseQuery.id = '__none__';
        } else {
          expenseQuery.leadId = clientId;
        }
      } else {
        const scopeOr = [{ createdBy: scope.userId }];
        if (scope.employeeId) scopeOr.push({ employee: scope.employeeId });
        if (scope.projectIds.length > 0) scopeOr.push({ projectId: { $in: scope.projectIds } });
        if (scope.leadIds.length > 0) scopeOr.push({ leadId: { $in: scope.leadIds } });
        expenseQuery.$or = scopeOr;
      }
    } else {
      if (projectId) {
        expenseQuery.projectId = projectId;
      } else if (clientId) {
        expenseQuery.leadId = clientId;
      }
    }

    if (start || end) {
      const dateCond = { date: {} };
      if (start) dateCond.date.$gte = start;
      if (end) dateCond.date.$lte = end;
      if (expenseQuery.$or) {
        expenseQuery = { $and: [{ $or: expenseQuery.$or }, dateCond] };
      } else {
        expenseQuery.date = dateCond.date;
      }
    }

    const allTransactions = await ExpenseTransaction.find(expenseQuery).lean();
    const expenseRecords = allTransactions.filter((t) => t.type === 'expense');
    const paymentRecords = allTransactions.filter((t) => t.type === 'payment');

    const totalRecordedExpenses = expenseRecords.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalIncomingPayments = paymentRecords.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // ACTUAL PROJECT COSTS: Only expenses linked to projects
    const projectLinkedExpenses = expenseRecords.filter((e) => e.projectId);
    const totalActualProjectCosts = projectId
      ? totalRecordedExpenses
      : projectLinkedExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // 3. Purchase Commitments (from purchaseOrders)
    let purchaseQuery = {};
    if (scope.isScoped) {
      if (projectId) {
        if (!scope.projectIds.includes(String(projectId))) {
          purchaseQuery.id = '__none__';
        } else {
          purchaseQuery.projectId = projectId;
        }
      } else if (clientId) {
        if (!scope.leadIds.includes(String(clientId))) {
          purchaseQuery.id = '__none__';
        } else {
          purchaseQuery.client = clientId;
        }
      } else {
        const poOr = [{ createdBy: scope.userId }];
        if (scope.projectIds.length > 0) poOr.push({ projectId: { $in: scope.projectIds } });
        if (scope.leadIds.length > 0) poOr.push({ client: { $in: scope.leadIds } });
        purchaseQuery.$or = poOr;
      }
    } else {
      if (projectId) {
        purchaseQuery.projectId = projectId;
      } else if (clientId) {
        purchaseQuery.client = clientId;
      }
    }

    if (start || end) {
      const dateCond = { purchaseDate: {} };
      if (start) dateCond.purchaseDate.$gte = start;
      if (end) dateCond.purchaseDate.$lte = end;
      if (purchaseQuery.$or) {
        purchaseQuery = { $and: [{ $or: purchaseQuery.$or }, dateCond] };
      } else {
        purchaseQuery.purchaseDate = dateCond.purchaseDate;
      }
    }

    const allPurchases = await PurchaseOrder.find(purchaseQuery).lean();
    // Open commitments: Active or Pending status
    const openCommitmentPurchases = allPurchases.filter(
      (po) => po.status === 'Active' || po.status === 'Pending'
    );
    const totalOpenCommitments = openCommitmentPurchases.reduce(
      (sum, po) => sum + Number(po.amount || 0),
      0
    );

    // TOTAL AVAILABLE PROJECT BUDGET: Approved Project Budget - Actual Costs - Open Commitments
    const totalAvailableProjectBudget = totalApprovedBudget - totalActualProjectCosts - totalOpenCommitments;
    const totalOutstandingProjectBudget = Math.max(0, totalApprovedBudget - totalActualProjectCosts);

    // 4. Payroll Records (Informational Operational Cost from paid payslips)
    let totalPaidPayroll = 0;
    if (!scope.isScoped) {
      try {
        const paidPayslips = await Payslip.find({ status: 'paid' }).lean();
        totalPaidPayroll = paidPayslips.reduce((sum, p) => sum + Number(p.netSalary || 0), 0);
      } catch {
        totalPaidPayroll = 0;
      }
    }

    // 5. Recent Activity Stream (last 10 items)
    const recentPurchases = allPurchases.slice(0, 5).map((p) => ({
      id: p.id || p._id,
      stream: 'purchase',
      type: 'Purchase Commitment',
      title: `${p.poNumber} - ${p.vendor}`,
      party: p.vendor,
      amount: Number(p.amount || 0),
      date: p.purchaseDate || p.createdAt,
      status: p.status,
      projectId: p.projectId,
    }));

    const recentExpenses = expenseRecords.slice(0, 5).map((e) => ({
      id: e.id || e._id,
      stream: 'expense',
      type: 'Company Expense',
      title: `${e.category || 'General'} - ${e.paidTo || 'Direct'}`,
      party: e.paidTo,
      amount: Number(e.amount || 0),
      date: e.date || e.createdAt,
      status: 'Recognized',
      projectId: e.projectId,
    }));

    const recentPayments = paymentRecords.slice(0, 5).map((p) => ({
      id: p.id || p._id,
      stream: 'payment',
      type: 'Client Payment',
      title: `Payment from ${p.clientName || 'Client'}`,
      party: p.clientName,
      amount: Number(p.amount || 0),
      date: p.date || p.createdAt,
      status: 'Received',
      projectId: p.projectId,
    }));

    const recentActivity = [...recentPurchases, ...recentExpenses, ...recentPayments]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    return res.json({
      success: true,
      data: {
        metrics: {
          totalContractValue,
          totalApprovedBudget,
          totalActualProjectCosts,
          totalOpenCommitments,
          totalAvailableProjectBudget,
          totalRecordedExpenses,
          totalIncomingPayments,
          totalOutstandingProjectBudget,
          projectCount: allProjects.length,
          activeProjectCount: activeProjects.length,
          totalPaidPayroll,
        },
        recentActivity,
      },
    });
  } catch (error) {
    console.error('getFinanceOverview error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 2. PROJECT FINANCE LIST & AGGREGATES
// -------------------------------------------------------------
export const getProjectFinanceList = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { status, search } = req.query;
    const projectQuery = {};
    if (status && status !== 'all') projectQuery.status = status;
    if (search) projectQuery.name = { $regex: search, $options: 'i' };

    if (scope.isScoped) {
      projectQuery.id = { $in: scope.projectIds.length > 0 ? scope.projectIds : ['__none__'] };
    }

    const projectDocs = await Project.find(projectQuery).sort({ createdAt: -1 }).lean();

    // Pull purchases and expenses scoped to avoid leaking company-wide finances
    let poQuery = {};
    let expQuery = { type: 'expense' };
    let payQuery = { type: 'payment' };

    if (scope.isScoped) {
      const validPids = scope.projectIds.length > 0 ? scope.projectIds : ['__none__'];
      poQuery.projectId = { $in: validPids };
      expQuery.projectId = { $in: validPids };

      const payOr = [{ projectId: { $in: validPids } }];
      if (scope.leadIds && scope.leadIds.length > 0) {
        payOr.push({ leadId: { $in: scope.leadIds } });
      }
      if (scope.userId) {
        payOr.push({ createdBy: scope.userId });
      }
      payQuery.$or = payOr;
    }

    const allPurchases = await PurchaseOrder.find(poQuery).lean();
    const allExpenses = await ExpenseTransaction.find(expQuery).lean();
    const allPayments = await ExpenseTransaction.find(payQuery).lean();

    // Map by projectId
    const purchasesByProject = {};
    let unallocatedPurchasesCount = 0;
    for (const po of allPurchases) {
      if (po.projectId) {
        purchasesByProject[po.projectId] = purchasesByProject[po.projectId] || [];
        purchasesByProject[po.projectId].push(po);
      } else {
        unallocatedPurchasesCount++;
      }
    }

    const expensesByProject = {};
    let unallocatedExpensesCount = 0;
    for (const exp of allExpenses) {
      if (exp.projectId) {
        expensesByProject[exp.projectId] = expensesByProject[exp.projectId] || [];
        expensesByProject[exp.projectId].push(exp);
      } else {
        unallocatedExpensesCount++;
      }
    }

    // Lookup maps from project docs to match payments by leadId or clientName as fallback
    const projectLeadMap = {};
    const projectClientMap = {};
    for (const prj of projectDocs) {
      const pid = String(prj.id || prj._id);
      if (prj.leadId) {
        const lid = typeof prj.leadId === 'object' ? (prj.leadId.id || prj.leadId._id) : prj.leadId;
        if (lid) projectLeadMap[String(lid)] = pid;
      }
      if (prj.clientName) {
        projectClientMap[String(prj.clientName).trim().toLowerCase()] = pid;
      }
      if (prj.name) {
        projectClientMap[String(prj.name).trim().toLowerCase()] = pid;
      }
    }

    const paymentsByProject = {};
    let unallocatedPaymentsCount = 0;
    for (const pay of allPayments) {
      let targetPid = pay.projectId ? String(pay.projectId) : null;
      if (!targetPid && pay.leadId && projectLeadMap[String(pay.leadId)]) {
        targetPid = projectLeadMap[String(pay.leadId)];
      }
      if (!targetPid && pay.clientName && projectClientMap[String(pay.clientName).trim().toLowerCase()]) {
        targetPid = projectClientMap[String(pay.clientName).trim().toLowerCase()];
      }

      if (targetPid) {
        paymentsByProject[targetPid] = paymentsByProject[targetPid] || [];
        paymentsByProject[targetPid].push(pay);
      } else {
        unallocatedPaymentsCount++;
      }
    }

    const projectSummaries = projectDocs.map((prj) => {
      const pid = prj.id || prj._id;
      const pPurchases = purchasesByProject[pid] || [];
      const pExpenses = expensesByProject[pid] || [];
      const pPayments = paymentsByProject[pid] || [];

      // Open commitments: active or pending
      const openCommitments = pPurchases
        .filter((po) => po.status === 'Active' || po.status === 'Pending')
        .reduce((sum, po) => sum + Number(po.amount || 0), 0);

      const actualCosts = pExpenses.reduce((sum, exp) => sum + Number(exp.amount || 0), 0);
      const incomingPayments = pPayments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

      const approvedBudget = Number(prj.approvedBudget || 0);
      const contractValue = Number(prj.contractValue || 0);
      const incurredProjectCosts = actualCosts;
      const committedCosts = openCommitments;
      const availableBudget = approvedBudget - actualCosts - committedCosts;
      const budgetUtilization = approvedBudget > 0 ? ((actualCosts + committedCosts) / approvedBudget) * 100 : 0;

      return {
        id: pid,
        projectCode: prj.projectCode,
        name: prj.name,
        clientName: prj.clientName,
        leadId: prj.leadId,
        status: prj.status,
        currency: prj.currency || 'INR',
        contractValue,
        approvedBudget,
        actualCosts,
        incurredProjectCosts,
        openCommitments,
        committedCosts,
        availableBudget,
        incomingPayments,
        budgetUtilization: Math.round(budgetUtilization * 100) / 100,
        purchasesCount: pPurchases.length,
        expensesCount: pExpenses.length,
        paymentsCount: pPayments.length,
      };
    });

    return res.json({
      success: true,
      data: {
        projects: projectSummaries,
        unallocated: {
          purchases: unallocatedPurchasesCount,
          expenses: unallocatedExpensesCount,
          payments: unallocatedPaymentsCount,
        },
      },
    });
  } catch (error) {
    console.error('getProjectFinanceList error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 3. PROJECT FINANCE DETAILS (Drilldown)
// -------------------------------------------------------------
export const getProjectFinanceDetails = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { projectId } = req.params;

    if (scope.isScoped && !scope.projectIds.includes(String(projectId))) {
      return res.status(403).json({ success: false, message: 'Access denied to this project' });
    }

    const project = await Project.findById(projectId).populate('leadId', 'firstName lastName company email').lean();
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Budgets for this project
    const budgets = await ProjectBudget.find({ projectId })
      .withItems()
      .populate('approvedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort({ version: -1 })
      .lean();

    const latestApprovedBudget = budgets.find((b) => b.status === 'Approved') || null;

    // Linked purchases
    const purchases = await PurchaseOrder.find({ projectId })
      .populate('client', 'firstName lastName company')
      .sort({ purchaseDate: -1 })
      .lean();

    // Linked expenses
    const expenses = await ExpenseTransaction.find({ projectId, type: 'expense' })
      .populate('employee', 'employeeId personalInfo')
      .sort({ date: -1 })
      .lean();

    // Linked incoming payments (by projectId or project leadId fallback)
    const projectLeadId = typeof project.leadId === 'object'
      ? (project.leadId?._id || project.leadId?.id)
      : project.leadId;
    const payConditions = [{ projectId, type: 'payment' }];
    if (projectLeadId) {
      payConditions.push({ leadId: String(projectLeadId), type: 'payment' });
    }
    const payments = await ExpenseTransaction.find({ $or: payConditions })
      .sort({ date: -1 })
      .lean();

    // Calculations
    const actualCosts = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const openCommitments = purchases
      .filter((p) => p.status === 'Active' || p.status === 'Pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const committedCosts = openCommitments;
    const incomingPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const approvedBudget = Number(project.approvedBudget || 0);
    const incurredProjectCosts = actualCosts;
    const remainingApprovedBudget = approvedBudget - actualCosts - committedCosts;
    const utilization = approvedBudget > 0 ? ((actualCosts + committedCosts) / approvedBudget) * 100 : 0;

    // Spending breakdown by category
    const categoryMap = {};
    for (const exp of expenses) {
      const cat = exp.category || 'Direct Expense';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(exp.amount || 0);
    }
    const spendingByCategory = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
      percentage: incurredProjectCosts > 0 ? Math.round((amount / incurredProjectCosts) * 1000) / 10 : 0,
    }));

    return res.json({
      success: true,
      data: {
        project,
        summary: {
          contractValue: Number(project.contractValue || 0),
          approvedBudget,
          actualCosts,
          openCommitments,
          committedCosts,
          incurredProjectCosts,
          remainingApprovedBudget,
          availableBudget: remainingApprovedBudget,
          incomingPayments,
          utilization: Math.round(utilization * 10) / 10,
        },
        budgets,
        latestApprovedBudget,
        purchases,
        expenses,
        payments,
        spendingByCategory,
      },
    });
  } catch (error) {
    console.error('getProjectFinanceDetails error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 4. BUDGET MANAGEMENT
// -------------------------------------------------------------
export const getBudgets = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { projectId, status } = req.query;
    const query = {};
    if (status && status !== 'all') query.status = status;

    if (scope.isScoped) {
      const scopedConditions = [];
      if (scope.projectIds && scope.projectIds.length > 0) {
        scopedConditions.push({ projectId: { $in: scope.projectIds } });
      }
      if (scope.userId) {
        scopedConditions.push({ createdBy: scope.userId });
      }

      if (projectId) {
        if (!scope.projectIds.includes(String(projectId))) {
          query.projectId = projectId;
          query.createdBy = scope.userId;
        } else {
          query.projectId = projectId;
        }
      } else {
        if (scopedConditions.length > 0) {
          query.$or = scopedConditions;
        } else {
          query.projectId = '__none__';
        }
      }
    } else {
      if (projectId) query.projectId = projectId;
    }

    const budgets = await ProjectBudget.find(query)
      .withItems()
      .populate('projectId', 'id projectCode name clientName')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('getBudgets error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createBudget = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { projectId, notes, currency, items } = req.body;
    if (!projectId) {
      return res.status(400).json({ success: false, message: 'projectId is required' });
    }

    if (scope.isScoped && !scope.projectIds.includes(String(projectId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only create budgets for your assigned projects',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const budget = await ProjectBudget.create({
      projectId,
      notes,
      currency: currency || project.currency || 'INR',
      items: items || [],
      createdBy: req.user._id,
      status: 'Draft',
    });

    return res.status(201).json({ success: true, message: 'Budget created as Draft', data: budget });
  } catch (error) {
    console.error('createBudget error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getBudgetById = async (req, res) => {
  try {
    const budget = await ProjectBudget.findById(req.params.id)
      .withItems()
      .populate('projectId', 'id projectCode name clientName')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .lean();

    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const budgetProjectId = budget.projectId?.id || budget.projectId?._id || budget.projectId;
      const budgetCreator = budget.createdBy?.id || budget.createdBy?._id || budget.createdBy;
      if (!scope.projectIds.includes(String(budgetProjectId)) && String(budgetCreator) !== String(scope.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this budget' });
      }
    }

    return res.json({ success: true, data: budget });
  } catch (error) {
    console.error('getBudgetById error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const updateBudget = async (req, res) => {
  try {
    const budget = await ProjectBudget.findById(req.params.id).lean();
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const budgetProjectId = budget.projectId?.id || budget.projectId?._id || budget.projectId;
      const budgetCreator = budget.createdBy?.id || budget.createdBy?._id || budget.createdBy;
      if (!scope.projectIds.includes(String(budgetProjectId)) && String(budgetCreator) !== String(scope.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this budget' });
      }
    }

    if (budget.status === 'Approved' || budget.status === 'Superseded') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an approved or superseded budget. Please create a revision instead.',
      });
    }

    const updated = await ProjectBudget.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, message: 'Budget updated successfully', data: updated });
  } catch (error) {
    console.error('updateBudget error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const submitBudgetForApproval = async (req, res) => {
  try {
    const budget = await ProjectBudget.findById(req.params.id).lean();
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const budgetProjectId = budget.projectId?.id || budget.projectId?._id || budget.projectId;
      const budgetCreator = budget.createdBy?.id || budget.createdBy?._id || budget.createdBy;
      if (!scope.projectIds.includes(String(budgetProjectId)) && String(budgetCreator) !== String(scope.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this budget' });
      }
    }

    const submitted = await ProjectBudget.submitForApproval(req.params.id);
    return res.json({ success: true, message: 'Budget submitted for approval', data: submitted });
  } catch (error) {
    console.error('submitBudget error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const approveBudget = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can approve budgets' });
    }

    const userId = req.user.id || req.user._id;
    const budget = await ProjectBudget.approveBudget(req.params.id, userId);
    return res.json({
      success: true,
      message: 'Budget approved successfully. Project approved budget updated.',
      data: budget,
    });
  } catch (error) {
    console.error('approveBudget error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const rejectBudget = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only administrators can reject budgets' });
    }

    const { reason } = req.body;
    const userId = req.user.id || req.user._id;
    const budget = await ProjectBudget.rejectBudget(req.params.id, userId, reason);
    return res.json({ success: true, message: 'Budget rejected', data: budget });
  } catch (error) {
    console.error('rejectBudget error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const reviseBudget = async (req, res) => {
  try {
    const existing = await ProjectBudget.findById(req.params.id).withItems().lean();
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }

    const scope = await getSalesEmployeeScope(req.user);
    if (scope.isScoped) {
      const budgetProjectId = existing.projectId?.id || existing.projectId?._id || existing.projectId;
      const budgetCreator = existing.createdBy?.id || existing.createdBy?._id || existing.createdBy;
      if (!scope.projectIds.includes(String(budgetProjectId)) && String(budgetCreator) !== String(scope.userId)) {
        return res.status(403).json({ success: false, message: 'Access denied to this budget' });
      }
    }

    const { notes, items } = req.body;
    const revisionItems = items || existing.items.map((i) => ({
      category: i.category,
      description: i.description,
      plannedAmount: i.plannedAmount,
      approvedAmount: 0,
    }));

    const revision = await ProjectBudget.create({
      projectId: existing.projectId,
      notes: notes || `Revision of ${existing.budgetNumber}`,
      currency: existing.currency,
      items: revisionItems,
      createdBy: req.user._id,
      status: 'Draft',
    });

    return res.status(201).json({
      success: true,
      message: `Revision created as Draft (v${revision.version})`,
      data: revision,
    });
  } catch (error) {
    console.error('reviseBudget error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 5. CONSOLIDATED TRANSACTIONS & ALLOCATION
// -------------------------------------------------------------
export const getConsolidatedTransactions = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { stream, projectId, clientId, category, startDate, endDate, search, page = 1, limit = 50 } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    let transactions = [];

    // Stream: 'all' | 'purchase' | 'expense' | 'payment'
    const fetchPurchases = !stream || stream === 'all' || stream === 'purchase';
    const fetchExpenses = !stream || stream === 'all' || stream === 'expense';
    const fetchPayments = !stream || stream === 'all' || stream === 'payment';

    if (fetchPurchases) {
      let q = {};
      if (scope.isScoped) {
        if (projectId) {
          if (!scope.projectIds.includes(String(projectId))) {
            q.id = '__none__';
          } else {
            q.projectId = projectId;
          }
        } else if (clientId) {
          if (!scope.leadIds.includes(String(clientId))) {
            q.id = '__none__';
          } else {
            q.client = clientId;
          }
        } else {
          const poOr = [{ createdBy: scope.userId }];
          if (scope.projectIds.length > 0) poOr.push({ projectId: { $in: scope.projectIds } });
          if (scope.leadIds.length > 0) poOr.push({ client: { $in: scope.leadIds } });
          q.$or = poOr;
        }
      } else {
        if (projectId) q.projectId = projectId;
        if (clientId) q.client = clientId;
      }

      if (start || end) {
        const dateCond = { purchaseDate: {} };
        if (start) dateCond.purchaseDate.$gte = start;
        if (end) dateCond.purchaseDate.$lte = end;
        if (q.$or) {
          q = { $and: [{ $or: q.$or }, dateCond] };
        } else {
          q.purchaseDate = dateCond.purchaseDate;
        }
      }

      if (category) q.serviceType = category;

      if (search) {
        const searchCond = {
          $or: [
            { poNumber: { $regex: search, $options: 'i' } },
            { vendor: { $regex: search, $options: 'i' } },
            { serviceName: { $regex: search, $options: 'i' } },
          ],
        };
        if (q.$or) {
          const baseOr = q.$or;
          delete q.$or;
          q.$and = [{ $or: baseOr }, searchCond];
        } else if (q.$and) {
          q.$and.push(searchCond);
        } else {
          q.$or = searchCond.$or;
        }
      }

      const pos = await PurchaseOrder.find(q)
        .populate('projectId', 'projectCode name')
        .populate('client', 'company firstName lastName')
        .lean();

      transactions.push(
        ...pos.map((p) => ({
          id: p.id || p._id,
          stream: 'purchase',
          type: 'Purchase Order',
          date: p.purchaseDate || p.createdAt,
          reference: p.poNumber,
          party: p.vendor,
          category: p.serviceType || 'IT Service',
          description: p.serviceName,
          amount: Number(p.amount || 0),
          status: p.status,
          projectId: p.projectId?._id || p.projectId?.id || p.projectId || null,
          projectName: p.projectId?.name || p.project || null,
          projectCode: p.projectId?.projectCode || null,
          isAllocated: !!p.projectId,
        }))
      );
    }

    if (fetchExpenses || fetchPayments) {
      let q = {};
      if (scope.isScoped) {
        if (projectId) {
          if (!scope.projectIds.includes(String(projectId))) {
            q.id = '__none__';
          } else {
            q.projectId = projectId;
          }
        } else if (clientId) {
          if (!scope.leadIds.includes(String(clientId))) {
            q.id = '__none__';
          } else {
            q.leadId = clientId;
          }
        } else {
          const expOr = [{ createdBy: scope.userId }];
          if (scope.employeeId) expOr.push({ employee: scope.employeeId });
          if (scope.projectIds.length > 0) expOr.push({ projectId: { $in: scope.projectIds } });
          if (scope.leadIds.length > 0) expOr.push({ leadId: { $in: scope.leadIds } });
          q.$or = expOr;
        }
      } else {
        if (projectId) q.projectId = projectId;
        if (clientId) q.leadId = clientId;
      }

      if (category) q.category = category;
      if (stream === 'expense') q.type = 'expense';
      if (stream === 'payment') q.type = 'payment';

      if (start || end) {
        const dateCond = { date: {} };
        if (start) dateCond.date.$gte = start;
        if (end) dateCond.date.$lte = end;
        if (q.$or) {
          q = { $and: [{ $or: q.$or }, dateCond] };
        } else {
          q.date = dateCond.date;
        }
      }

      if (search) {
        const searchCond = {
          $or: [
            { paidTo: { $regex: search, $options: 'i' } },
            { clientName: { $regex: search, $options: 'i' } },
            { category: { $regex: search, $options: 'i' } },
            { referenceNumber: { $regex: search, $options: 'i' } },
          ],
        };
        if (q.$or) {
          const baseOr = q.$or;
          delete q.$or;
          q.$and = [{ $or: baseOr }, searchCond];
        } else if (q.$and) {
          q.$and.push(searchCond);
        } else {
          q.$or = searchCond.$or;
        }
      }

      const txs = await ExpenseTransaction.find(q)
        .populate('projectId', 'projectCode name')
        .populate('leadId', 'company firstName lastName')
        .lean();

      transactions.push(
        ...txs.map((t) => ({
          id: t.id || t._id,
          stream: t.type,
          type: t.type === 'expense' ? 'Expense' : 'Incoming Payment',
          date: t.date || t.createdAt,
          reference: t.referenceNumber || t.invoiceNumber || '-',
          party: t.type === 'expense' ? t.paidTo || 'Direct' : t.clientName || 'Client',
          category: t.category || 'General',
          description: t.description,
          amount: Number(t.amount || 0),
          status: t.type === 'expense' ? 'Recorded' : 'Received',
          projectId: t.projectId?._id || t.projectId?.id || t.projectId || null,
          projectName: t.projectId?.name || null,
          projectCode: t.projectId?.projectCode || null,
          isAllocated: !!t.projectId,
        }))
      );
    }

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = transactions.length;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const paginated = transactions.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    return res.json({
      success: true,
      data: {
        transactions: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    console.error('getConsolidatedTransactions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Allow linking an unallocated transaction to a project
export const linkTransactionToProject = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { stream, transactionId, projectId } = req.body;
    if (!stream || !transactionId || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'stream ("purchase" | "expense" | "payment"), transactionId, and projectId are required',
      });
    }

    if (scope.isScoped && !scope.projectIds.includes(String(projectId))) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Target project does not belong to your assigned projects',
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if (stream === 'purchase') {
      const po = await PurchaseOrder.findById(transactionId);
      if (!po) return res.status(404).json({ success: false, message: 'Purchase order not found' });
      po.projectId = projectId;
      await po.save();
      req.app?.get?.('io')?.emit?.('finance:updated');
      return res.json({ success: true, message: 'Purchase order linked to project successfully' });
    }

    if (stream === 'expense' || stream === 'payment') {
      const exp = await ExpenseTransaction.findById(transactionId);
      if (!exp) return res.status(404).json({ success: false, message: 'Transaction not found' });
      exp.projectId = projectId;
      const projectLeadId = typeof project.leadId === 'object' ? (project.leadId?.id || project.leadId?._id) : project.leadId;
      if (projectLeadId && !exp.leadId) exp.leadId = projectLeadId;
      await exp.save();
      req.app?.get?.('io')?.emit?.('expense-tracker:updated');
      req.app?.get?.('io')?.emit?.('finance:updated');
      return res.json({ success: true, message: 'Transaction linked to project successfully' });
    }

    return res.status(400).json({ success: false, message: 'Invalid stream' });
  } catch (error) {
    console.error('linkTransactionToProject error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// -------------------------------------------------------------
// 6. SPENDING ANALYSIS
// -------------------------------------------------------------
export const getSpendingAnalysis = async (req, res) => {
  try {
    const scope = await getSalesEmployeeScope(req.user);
    const { startDate, endDate } = req.query;
    const { start, end } = parseDateRange(startDate, endDate);

    let expenseQuery = { type: 'expense' };
    let purchaseQuery = {};

    if (scope.isScoped) {
      const expOr = [{ createdBy: scope.userId }];
      if (scope.employeeId) expOr.push({ employee: scope.employeeId });
      if (scope.projectIds.length > 0) expOr.push({ projectId: { $in: scope.projectIds } });
      if (scope.leadIds.length > 0) expOr.push({ leadId: { $in: scope.leadIds } });
      expenseQuery.$or = expOr;

      const poOr = [{ createdBy: scope.userId }];
      if (scope.projectIds.length > 0) poOr.push({ projectId: { $in: scope.projectIds } });
      if (scope.leadIds.length > 0) poOr.push({ client: { $in: scope.leadIds } });
      purchaseQuery.$or = poOr;
    }

    if (start || end) {
      const expDate = { date: {} };
      const poDate = { purchaseDate: {} };
      if (start) {
        expDate.date.$gte = start;
        poDate.purchaseDate.$gte = start;
      }
      if (end) {
        expDate.date.$lte = end;
        poDate.purchaseDate.$lte = end;
      }
      if (expenseQuery.$or) {
        expenseQuery = { $and: [{ $or: expenseQuery.$or }, expDate] };
      } else {
        expenseQuery.date = expDate.date;
      }
      if (purchaseQuery.$or) {
        purchaseQuery = { $and: [{ $or: purchaseQuery.$or }, poDate] };
      } else {
        purchaseQuery.purchaseDate = poDate.purchaseDate;
      }
    }

    const expenses = await ExpenseTransaction.find(expenseQuery).populate('projectId', 'projectCode name').lean();
    const purchases = await PurchaseOrder.find(purchaseQuery).populate('projectId', 'projectCode name').lean();
    const projectFilter = scope.isScoped ? { id: { $in: scope.projectIds.length > 0 ? scope.projectIds : ['__none__'] } } : {};
    const allProjects = await Project.find(projectFilter).lean();

    // 1. By Expense Category
    const categoryTotals = {};
    for (const exp of expenses) {
      const cat = exp.category || 'General';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(exp.amount || 0);
    }
    const byCategory = Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // 2. By Vendor (Purchase Orders)
    const vendorTotals = {};
    for (const po of purchases) {
      const vendor = po.vendor || 'Other';
      vendorTotals[vendor] = (vendorTotals[vendor] || 0) + Number(po.amount || 0);
    }
    const byVendor = Object.entries(vendorTotals)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount);

    // 3. By Project (Actual Costs)
    const projectTotals = {};
    for (const exp of expenses) {
      if (exp.projectId) {
        const pId = exp.projectId?._id || exp.projectId?.id || exp.projectId;
        const pName = exp.projectId?.name || 'Project';
        const pCode = exp.projectId?.projectCode || '';
        const key = `${pCode} - ${pName}`;
        projectTotals[key] = (projectTotals[key] || 0) + Number(exp.amount || 0);
      }
    }
    const byProject = Object.entries(projectTotals)
      .map(([project, amount]) => ({ project, amount }))
      .sort((a, b) => b.amount - a.amount);

    // 4. Overhead vs Project Costs
    let totalOverheads = 0;
    let totalProjectCosts = 0;
    for (const exp of expenses) {
      if (exp.projectId) {
        totalProjectCosts += Number(exp.amount || 0);
      } else {
        totalOverheads += Number(exp.amount || 0);
      }
    }

    // 5. Project Budget Utilization List
    const budgetUtilization = allProjects.map((p) => {
      const pid = p.id || p._id;
      const pExpenses = expenses.filter((e) => (e.projectId?._id || e.projectId?.id || e.projectId) === pid);
      const pPurchases = purchases.filter((po) => (po.projectId?._id || po.projectId?.id || po.projectId) === pid);

      const actual = pExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      const commitments = pPurchases
        .filter((po) => po.status === 'Active' || po.status === 'Pending')
        .reduce((sum, po) => sum + Number(po.amount || 0), 0);
      const approved = Number(p.approvedBudget || 0);

      return {
        projectCode: p.projectCode,
        name: p.name,
        approvedBudget: approved,
        actualCosts: actual,
        commitments,
        totalUtilized: actual + commitments,
        utilizationRate: approved > 0 ? Math.round(((actual + commitments) / approved) * 1000) / 10 : 0,
      };
    });

    return res.json({
      success: true,
      data: {
        byCategory,
        byVendor,
        byProject,
        overheadVsProject: {
          overhead: totalOverheads,
          project: totalProjectCosts,
          total: totalOverheads + totalProjectCosts,
        },
        budgetUtilization,
      },
    });
  } catch (error) {
    console.error('getSpendingAnalysis error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
