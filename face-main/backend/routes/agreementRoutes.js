import express from 'express';
import rateLimit from 'express-rate-limit';
import { protect, adminOrHr } from '../middleware/auth.js';
import {
  getEmployeeAgreement,
  sendAgreementLink,
  getSigningAgreementByToken,
  submitSignedAgreement,
  downloadSignedPdf,
} from '../controllers/agreementController.js';

const router = express.Router();

// Rate limiter for public signing endpoints (prevents brute forcing or spam)
const signingRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 45, // max 45 requests per 15 mins per IP
  message: {
    success: false,
    message: 'Too many requests to signing portal. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// -------------------------------------------------------------
// PUBLIC SIGNING ROUTES (No login required, secured by crypto token)
// -------------------------------------------------------------
router.get('/sign/:token', signingRateLimiter, getSigningAgreementByToken);
router.post('/sign/:token', signingRateLimiter, submitSignedAgreement);

// -------------------------------------------------------------
// AUTHENTICATED HR / ADMIN ROUTES
// -------------------------------------------------------------
router.get('/employee/:employeeId', protect, adminOrHr, getEmployeeAgreement);
router.post('/send', protect, adminOrHr, sendAgreementLink);
router.get('/:id/download-pdf', downloadSignedPdf);
router.get('/:id/pdf', downloadSignedPdf);

export default router;
