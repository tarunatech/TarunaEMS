import mongoose from 'mongoose';

const expenseTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['expense', 'payment'],
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other'],
    required: true
  },
  paidTo: {
    type: String,
    trim: true
  },
  clientName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  referenceNumber: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  remarks: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true
  },
  source: {
    type: String,
    enum: ['admin', 'employee'],
    default: 'admin',
    index: true
  }
}, {
  timestamps: true
});

expenseTransactionSchema.index({ type: 1, date: -1 });
expenseTransactionSchema.index({ paidTo: 'text', clientName: 'text', description: 'text', referenceNumber: 'text', invoiceNumber: 'text' });

const ExpenseTransaction = mongoose.model('ExpenseTransaction', expenseTransactionSchema);

export default ExpenseTransaction;
