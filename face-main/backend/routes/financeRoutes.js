import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getFinanceOverview,
  getProjectFinanceList,
  getProjectFinanceDetails,
  getBudgets,
  createBudget,
  getBudgetById,
  updateBudget,
  submitBudgetForApproval,
  approveBudget,
  rejectBudget,
  reviseBudget,
  getConsolidatedTransactions,
  linkTransactionToProject,
  getSpendingAnalysis,
} from '../controllers/financeController.js';
import {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  issueInvoice,
  cancelInvoice,
  downloadInvoicePdf,
  allocatePayment,
  deallocatePayment,
  getUnallocatedPayments,
  getAccountsReceivableSummary,
} from '../controllers/customerInvoiceController.js';

const router = express.Router();

router.use(protect);

// 1. Finance Overview
router.get('/overview', getFinanceOverview);

// 2. Project Finance
router.get('/projects', getProjectFinanceList);
router.get('/projects/:projectId', getProjectFinanceDetails);

// 3. Budgets
router.get('/budgets', getBudgets);
router.post('/budgets', createBudget);
router.get('/budgets/:id', getBudgetById);
router.patch('/budgets/:id', updateBudget);
router.post('/budgets/:id/submit', submitBudgetForApproval);
router.post('/budgets/:id/approve', approveBudget);
router.post('/budgets/:id/reject', rejectBudget);
router.post('/budgets/:id/revise', reviseBudget);

// 4. Consolidated Transactions & Allocation
router.get('/transactions', getConsolidatedTransactions);
router.post('/transactions/link-project', linkTransactionToProject);

// 5. Spending Analysis
router.get('/spending-analysis', getSpendingAnalysis);

// 6. Phase 3: Customer Invoices
router.get('/invoices', getInvoices);
router.get('/invoices/:id', getInvoiceById);
router.post('/invoices', createInvoice);
router.put('/invoices/:id', updateInvoice);
router.post('/invoices/:id/issue', issueInvoice);
router.post('/invoices/:id/cancel', cancelInvoice);
router.get('/invoices/:id/pdf', downloadInvoicePdf);

// 7. Phase 3: Payment Allocations
router.post('/invoices/allocations', allocatePayment);
router.delete('/invoices/allocations/:id', deallocatePayment);
router.get('/payments/unallocated', getUnallocatedPayments);

// 8. Phase 3: Accounts Receivable
router.get('/receivables/summary', getAccountsReceivableSummary);

export default router;

