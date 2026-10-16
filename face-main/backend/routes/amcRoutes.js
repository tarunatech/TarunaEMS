import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getAMCDashboard,
  getAMCContracts,
  getAMCContract,
  createAMCContract,
  updateAMCContract,
  updateAMCStatus,
  renewAMCContract,
  previewInstallments,
  getCustomerEquipment,
  createCustomerEquipment,
} from '../controllers/amcController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { amcContractsDir } from '../config/uploadPaths.js';

const router = express.Router();

// Multer storage for AMC contract documents
const amcStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, amcContractsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_-]/gi, '_')
      .toLowerCase();
    cb(null, `amc-${Date.now()}-${cleanBase}${ext}`);
  },
});

const uploadDocument = multer({
  storage: amcStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|pdf|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (allowedExts.test(ext) || allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and images (JPG/PNG) are permitted.'));
    }
  },
});

// Protect all AMC routes - require authentication
router.use(protect);

// AMC Dashboard
router.get('/dashboard', getAMCDashboard);

// AMC Contracts
router.get('/contracts', getAMCContracts);
router.post('/contracts', uploadDocument.single('document'), createAMCContract);
router.post('/contracts/calculate-installments', previewInstallments);
router.get('/contracts/:id', getAMCContract);
router.put('/contracts/:id', uploadDocument.single('document'), updateAMCContract);
router.patch('/contracts/:id/status', updateAMCStatus);
router.post('/contracts/:id/renew', renewAMCContract);

// Equipment coverage endpoints
router.get('/equipment', getCustomerEquipment);
router.post('/equipment', createCustomerEquipment);

export default router;
