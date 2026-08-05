import mongoose from 'mongoose';

export const SERVICE_TYPES = [
  'Domain',
  'Hosting',
  'VPS Server',
  'Cloud Server',
  'SSL Certificate',
  'Business Email',
  'API Subscription',
  'Software License',
  'Other'
];

export const SERVICE_VENDORS = [
  'GoDaddy',
  'Namecheap',
  'Hostinger',
  'AWS',
  'Azure',
  'Google Cloud',
  'Cloudflare',
  'DigitalOcean',
  'OpenAI',
  'Twilio',
  'Razorpay',
  'Other'
];

const purchaseOrderSchema = new mongoose.Schema({
  poNumber: {
    type: String,
    required: true,
    trim: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead'
  },
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  project: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Project name cannot exceed 100 characters']
  },
  serviceType: {
    type: String,
    required: true,
    trim: true,
    maxlength: [60, 'Service type cannot exceed 60 characters']
  },
  vendor: {
    type: String,
    required: true,
    trim: true,
    maxlength: [80, 'Vendor cannot exceed 80 characters']
  },
  serviceName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [120, 'Service name cannot exceed 120 characters']
  },
  billingCycle: {
    type: String,
    enum: ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One Time'],
    required: true
  },
  purchaseDate: {
    type: Date,
    required: true
  },
  renewalDate: {
    type: Date,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Expired', 'Cancelled'],
    default: 'Active'
  },
  notes: {
    type: String,
    trim: true
  },

  // Legacy fields kept optional so older records do not break existing reads.
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  deliveryDate: Date,
  paymentTerms: String,
  lineItems: [{
    item: String,
    description: String,
    quantity: Number,
    unitPrice: Number,
    total: Number
  }],
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

purchaseOrderSchema.index({ poNumber: 1 }, { unique: true });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ vendor: 1 });
purchaseOrderSchema.index({ serviceType: 1 });
purchaseOrderSchema.index({ purchaseDate: -1 });
purchaseOrderSchema.index({ renewalDate: 1 });
purchaseOrderSchema.index({ createdAt: -1 });

purchaseOrderSchema.pre('save', function(next) {
  this.totalAmount = this.amount || 0;
  this.grandTotal = this.amount || 0;
  this.deliveryDate = this.renewalDate;
  next();
});

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
