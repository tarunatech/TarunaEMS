import { validationResult } from 'express-validator';
import ExpenseTransaction from '../models/ExpenseTransaction.js';
import Employee from '../models/Employee.js';

const sendTrackerUpdate = (req) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('expense-tracker:updated');
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

  return filters;
};

export const getExpenseTrackerSummary = async (req, res, next) => {
  try {
    const match = {};
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user._id }).select('_id');
      match.employee = employee?._id || null;
      match.type = 'expense';
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
    const filters = buildFilters(req.query);
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user._id }).select('_id');
      filters.employee = employee?._id || null;
      filters.type = 'expense';
    }
    const transactions = await ExpenseTransaction.find(filters)
      .populate('createdBy', 'name email')
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

    const payload = { ...req.body, createdBy: req.user._id };

    if (req.user.role === 'admin') {
      payload.source = 'admin';
    } else {
      if (!req.body.paidTo?.trim() || !req.body.category?.trim()) {
        return res.status(400).json({ success: false, message: 'Paid to and category are required' });
      }
      const employee = await Employee.findOne({ user: req.user._id }).select('_id');
      if (!employee) {
        return res.status(404).json({ success: false, message: 'Employee profile not found' });
      }
      payload.type = 'expense';
      payload.employee = employee._id;
      payload.source = 'employee';
      delete payload.clientName;
      delete payload.invoiceNumber;
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

    const filters = { _id: req.params.id };
    const payload = { ...req.body };
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user._id }).select('_id');
      filters.employee = employee?._id || null;
      filters.type = 'expense';
      payload.type = 'expense';
      delete payload.clientName;
      delete payload.invoiceNumber;
    }

    const transaction = await ExpenseTransaction.findOneAndUpdate(filters, payload, { new: true, runValidators: true });

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    sendTrackerUpdate(req);
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
};

export const deleteExpenseTransaction = async (req, res, next) => {
  try {
    const filters = { _id: req.params.id };
    if (req.user.role !== 'admin') {
      const employee = await Employee.findOne({ user: req.user._id }).select('_id');
      filters.employee = employee?._id || null;
      filters.type = 'expense';
    }
    const transaction = await ExpenseTransaction.findOneAndDelete(filters);

    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    sendTrackerUpdate(req);
    res.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error) {
    next(error);
  }
};
