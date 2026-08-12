import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/authMiddleware.js';
import {
  getEmployeeMonthlyDetail,
  getMyPerformance,
  getTeamPerformance,
  rateEmployee,
} from '../controllers/performanceController.js';

const router = express.Router();

router.get('/', protect, getTeamPerformance);
router.get('/me', protect, getMyPerformance);
router.get('/:employeeId', protect, getEmployeeMonthlyDetail);
router.put(
  '/:employeeId/rate',
  protect,
  [
    body('month').matches(/^\d{4}-\d{2}$/).withMessage('Month must be in YYYY-MM format'),
    body('adminRating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  ],
  rateEmployee,
);

export default router;
