import express from 'express';
import { body } from 'express-validator';
import * as aiController from '../controllers/aiController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Validation middleware
const chatValidation = [
  body('message')
    .isString()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be a string between 1 and 1000 characters')
];

// Protected routes (require authentication and admin role)
router.use(protect);
router.use(adminOnly);

// AI chat endpoint
router.post('/chat', chatValidation, aiController.chat);

export default router;
