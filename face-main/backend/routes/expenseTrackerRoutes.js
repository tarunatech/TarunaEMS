import express from 'express';
import { body } from 'express-validator';
import {
  createExpenseTransaction,
  deleteExpenseTransaction,
  getExpenseTrackerSummary,
  getExpenseTransactions,
  updateExpenseTransaction
} from '../controllers/expenseTrackerController.js';
import { protect, employeeOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(employeeOrAdmin);

const transactionValidation = [
  body('type').isIn(['expense', 'payment']).withMessage('Type must be expense or payment'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('paymentMethod').isIn(['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other']).withMessage('Valid payment method is required'),
  body('paidTo').if(body('type').equals('expense')).trim().notEmpty().withMessage('Paid to is required for expenses'),
  body('clientName').if(body('type').equals('payment')).trim().notEmpty().withMessage('Client name is required for payments'),
  body('category').if(body('type').equals('expense')).trim().notEmpty().withMessage('Category is required for expenses')
];

router.get('/summary', getExpenseTrackerSummary);
router.get('/transactions', getExpenseTransactions);
router.post('/transactions', transactionValidation, createExpenseTransaction);
router.put('/transactions/:id', transactionValidation, updateExpenseTransaction);
router.delete('/transactions/:id', deleteExpenseTransaction);

export default router;
