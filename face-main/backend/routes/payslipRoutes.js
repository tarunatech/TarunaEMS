import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  generatePayslip,
  getPayslips,
  getPayslipById,
  getEmployeePayslips,
  downloadPayslip,
  updatePayslipStatus,
  deletePayslip,
  generateBulkPayslips
} from '../controllers/payslipController.js';

const router = express.Router();

router.use(protect);

router.post('/generate', generatePayslip);
router.post('/bulk-generate', generateBulkPayslips);

router.get('/', getPayslips);
router.get('/employee/:employeeId', getEmployeePayslips);
router.get('/:id/download', downloadPayslip);
router.get('/:id', getPayslipById);

router.patch('/:id/status', updatePayslipStatus);
router.delete('/:id', deletePayslip);

export default router;
