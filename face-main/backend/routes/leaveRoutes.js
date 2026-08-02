// routes/leaveRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  applyLeave,
  getLeaves,
  getLeaveById,
  approveLeave,
  rejectLeave,
  cancelLeave,
  getLeaveStats,
  getLeaveBalance
} from '../controllers/leaveController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware for leave application
const leaveValidation = [
  body('leaveType')
    .isIn(['casual', 'sick', 'earned', 'maternity', 'paternity', 'emergency', 'personal'])
    .withMessage('Please select a valid leave type'),
  body('startDate')
    .isISO8601()
    .withMessage('Please provide a valid start date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Please provide a valid end date'),
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Reason must be between 10 and 500 characters'),
  body('isHalfDay')
    .optional()
    .isBoolean()
    .withMessage('isHalfDay must be a boolean'),
  body('halfDaySession')
    .optional()
    .isIn(['Morning', 'Evening'])
    .withMessage('Half day session must be Morning or Evening'),
  // body('totalDays')
  //   .optional()
  //   .isNumeric()
  //   .withMessage('Total days must be a number')
];

const approveRejectValidation = [
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 300 })
    .withMessage('Comments cannot exceed 300 characters')
];

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.route('/')
  .get(getLeaves)
  .post(leaveValidation, applyLeave);

// Stats and balance routes (must come before /:id routes)
router.get('/stats', getLeaveStats);
router.get('/balance', getLeaveBalance);

// Individual leave routes
router.route('/:id')
  .get(getLeaveById);

// Action routes
router.put('/:id/approve', approveRejectValidation, approveLeave)
router.put('/:id/reject', approveRejectValidation, rejectLeave);
router.put('/:id/cancel', cancelLeave);

export default router;