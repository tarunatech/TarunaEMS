import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  item: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    default: 0
  }
});

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'PendingApproval', 'Approved', 'Ordered', 'Received', 'Closed'],
    default: 'Draft'
  },
  deliveryDate: {
    type: Date,
    required: true
  },
  paymentTerms: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  lineItems: [lineItemSchema],
  totalAmount: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for performance - poNumber is unique
purchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

// Pre-save middleware to calculate totals
purchaseOrderSchema.pre('save', function(next) {
  this.totalAmount = this.lineItems.reduce((sum, item) => sum + (item.total || 0), 0);
  this.grandTotal = this.totalAmount; // Add tax logic here if needed
  next();
});

const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);

export default PurchaseOrder;
