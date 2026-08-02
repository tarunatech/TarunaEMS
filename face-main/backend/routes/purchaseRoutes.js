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
  body('supplier')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  body('deliveryDate')
    .isISO8601()
    .withMessage('Invalid delivery date'),
  body('lineItems')
    .isArray({ min: 1 })
    .withMessage('At least one line item is required'),
  body('lineItems.*.item')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Item name is required'),
  body('lineItems.*.quantity')
    .isNumeric()
    .isFloat({ min: 1 })
    .withMessage('Quantity must be a positive number'),
  body('lineItems.*.unitPrice')
    .isNumeric()
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a non-negative number')
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
