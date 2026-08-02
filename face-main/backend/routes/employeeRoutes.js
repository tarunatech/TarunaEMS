// routes/employeeRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  getEmployeesByDepartment,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  getEmployeeBankingDetails

} from '../controllers/employeeController.js';
import {
  saveEmployeeFace,
  getEmployeeFace,
  deleteEmployeeFace,
  verifyFaceAttendance,
  getEmployeesWithoutFace,
  upload
} from '../controllers/faceDetectionController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation middleware for employee creation
const employeeValidation = [
  body('personalInfo.firstName')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('First name must be between 2 and 30 characters'),
  body('personalInfo.lastName')
    .trim()
    .isLength({ min: 2, max: 30 })
    .withMessage('Last name must be between 2 and 30 characters'),
  body('contactInfo.personalEmail')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('contactInfo.phone')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
  body('workInfo.position')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Position must be between 2 and 50 characters'),
  body('workInfo.department')
    .isIn(['Engineering', 'Product', 'Design', 'HR', 'Marketing', 'Sales', 'Finance', 'Operations'])
    .withMessage('Please select a valid department'),
  body('salaryInfo.basicSalary')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Basic salary must be a positive number')
];

// Apply auth middleware to all routes
router.use(protect);

// Routes
router.post('/', adminOnly, employeeValidation, createEmployee);
router.get('/', getEmployees);
router.get('/stats', adminOnly, getEmployeeStats);
router.get('/:id/banking', adminOnly, getEmployeeBankingDetails);
router.get('/me', getEmployeeById); // Special route for current user
router.get('/department/:department', getEmployeesByDepartment);
router.get('/:id', getEmployeeById); // Match any ID, but validate in controller
router.put('/:id', updateEmployee);
router.delete('/:id', adminOnly, deleteEmployee);


// Face registration routes (integrated with employee management)
router.post('/:id/face', protect, adminOnly, upload.single('faceImage'), saveEmployeeFace);
router.get('/:id/face', protect, getEmployeeFace);
router.delete('/:id/face', protect, adminOnly, deleteEmployeeFace);

// Face verification for attendance (employee access)
router.post('/verify-face', protect, verifyFaceAttendance);

// Admin utilities
router.get('/admin/without-face', protect, adminOnly, getEmployeesWithoutFace);

export default router;