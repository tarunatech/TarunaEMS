import express from 'express';
import { body } from 'express-validator';
import {
  getPurchaseOrders,
  getSuppliers,
  createSupplier,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder
} from '../controllers/purchaseController.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Validation middleware for purchase order creation
const purchaseOrderValidation = [
  body('client')
    .optional({ nullable: true, checkFalsy: true })
    .isMongoId()
    .withMessage('Invalid client ID'),
  body('clientName')
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage('Client name is required'),
  body('project')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Project is required'),
  body('serviceType')
    .trim()
    .isLength({ min: 1, max: 60 })
    .withMessage('Service type is required'),
  body('vendor')
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Vendor is required'),
  body('serviceName')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Service name is required'),
  body('billingCycle')
    .isIn(['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One Time'])
    .withMessage('Invalid billing cycle'),
  body('purchaseDate')
    .isISO8601()
    .withMessage('Invalid purchase date'),
  body('renewalDate')
    .isISO8601()
    .withMessage('Invalid renewal date'),
  body('amount')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a non-negative number'),
  body('status')
    .optional()
    .isIn(['Active', 'Pending', 'Expired', 'Cancelled'])
    .withMessage('Invalid status')
];

// Validation middleware for supplier creation
const supplierValidation = [
  body('name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Supplier name is required'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  body('address')
    .optional()
    .isString()
    .withMessage('Address must be a string')
];

// Routes
router.get('/suppliers', getSuppliers);
router.post('/suppliers', adminOnly, supplierValidation, createSupplier);
router.get('/', getPurchaseOrders);
router.post('/', adminOnly, purchaseOrderValidation, createPurchaseOrder);
router.put('/:id', adminOnly, purchaseOrderValidation, updatePurchaseOrder);
router.delete('/:id', adminOnly, deletePurchaseOrder);

export default router;
