import express from 'express';
import {
  saveEmployeeFace,
  getEmployeeFace,
  deleteEmployeeFace,
  verifyFaceAttendance,
  getEmployeesWithoutFace,
  detectFaces,
  analyzeFrame,
  analyzeFrameBase64,
  registerMultiAngleFace,
  registerContinuousVideo,
  verifyVideoFace,
  verifyLiveVideo,
  checkLiveness,
  upload
} from '../controllers/faceDetectionController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

// Continuous video registration (new primary method)
router.post('/register-continuous-video', adminOnly, registerContinuousVideo);

// Multi-angle video registration (legacy)
router.post('/register-multi-angle', adminOnly, registerMultiAngleFace);

// Frame analysis for real-time feedback
router.post('/analyze-frame', adminOnly, upload.single('file'), analyzeFrame);
router.post('/analyze-frame-base64', adminOnly, analyzeFrameBase64);

// Live video verification with enhanced liveness detection (new primary method)
router.post('/verify-live-video', verifyLiveVideo);

// Video-based verification with liveness detection (legacy)
router.post('/verify-video', verifyVideoFace);

// Liveness check
router.post('/check-liveness', checkLiveness);

// Legacy single-image registration
router.post('/save-face', adminOnly, upload.single('file'), saveEmployeeFace);

router.get('/employee/:employeeId', getEmployeeFace);

router.delete('/employee/:employeeId', adminOnly, deleteEmployeeFace);

// Legacy single-image verification
router.post('/verify-attendance', upload.single('file'), verifyFaceAttendance);

router.get('/employees-without-face', adminOnly, getEmployeesWithoutFace);

router.post('/detect', upload.single('file'), detectFaces);

export default router;
