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
import { protect, adminOnly, adminOrHr } from '../middleware/authMiddleware.js';
import multer from 'multer';
import path from 'path';
import { employeeDocumentsDir } from '../config/uploadPaths.js';

const router = express.Router();

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, employeeDocumentsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
    cb(null, `doc-${Date.now()}-${cleanBase}${ext}`);
  }
});

const uploadDocument = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isMimeValid = file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf';
    if (allowed.test(ext) && isMimeValid) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPG, PNG, WebP) and PDFs are allowed'));
    }
  }
});

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
    .isUUID()
    .withMessage('Please select a valid department'),
  body('salaryInfo.basicSalary')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Basic salary must be a positive number')
];

// Apply auth middleware to all routes
router.use(protect);

// Document upload for employee creation and updates (Aadhar Card, PAN Card, etc.)
router.post('/upload-document', adminOrHr, (req, res) => {
  uploadDocument.single('document')(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed'
      });
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided'
      });
    }

    const fileUrl = `/uploads/employee-documents/${req.file.filename}`;
    return res.status(200).json({
      success: true,
      message: 'Document uploaded successfully',
      fileUrl,
      url: fileUrl,
      fileName: req.file.originalname,
      storedName: req.file.filename
    });
  });
});

// Routes
router.post('/', adminOrHr, employeeValidation, createEmployee);
router.get('/', getEmployees);
router.get('/stats', adminOrHr, getEmployeeStats);
router.get('/:id/banking', adminOrHr, getEmployeeBankingDetails);
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
