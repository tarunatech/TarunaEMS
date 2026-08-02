import mongoose from 'mongoose';

const payslipSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  period: {
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: true
    }
  },
  earnings: {
    basicSalary: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    medical: { type: Number, default: 0 },
    transport: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    overtime: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 }
  },
  deductions: {
    pf: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    professionalTax: { type: Number, default: 0 },
    loanDeduction: { type: Number, default: 0 },
    otherDeductions: { type: Number, default: 0 }
  },
  attendance: {
    workingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 }
  },
  grossEarnings: {
    type: Number,
    default: 0
  },
  totalDeductions: {
    type: Number,
    default: 0
  },
  netSalary: {
    type: Number,
    default: 0
  },
  bankInfo: {
    accountNumber: String,
    bankName: String,
    ifscCode: String
  },
  status: {
    type: String,
    enum: ['draft', 'generated', 'paid', 'cancelled'],
    default: 'generated'
  },
  paymentDate: {
    type: Date,
    default: null
  },
  paymentMethod: {
    type: String,
    enum: ['bank_transfer', 'cheque', 'cash'],
    default: 'bank_transfer'
  },
  pdfPath: {
    type: String,
    default: null
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  remarks: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

payslipSchema.index({ employee: 1, 'period.year': 1, 'period.month': 1 }, { unique: true });
payslipSchema.index({ 'period.year': 1, 'period.month': 1 });
payslipSchema.index({ status: 1 });

payslipSchema.pre('save', function(next) {
  const earnings = this.earnings;
  this.grossEarnings = (earnings.basicSalary || 0) + 
                       (earnings.hra || 0) + 
                       (earnings.medical || 0) + 
                       (earnings.transport || 0) + 
                       (earnings.bonus || 0) + 
                       (earnings.overtime || 0) + 
                       (earnings.otherAllowances || 0);

  const deductions = this.deductions;
  this.totalDeductions = (deductions.pf || 0) + 
                         (deductions.esi || 0) + 
                         (deductions.tax || 0) + 
                         (deductions.professionalTax || 0) + 
                         (deductions.loanDeduction || 0) + 
                         (deductions.otherDeductions || 0);

  this.netSalary = this.grossEarnings - this.totalDeductions;
  
  next();
});

payslipSchema.statics.getByEmployeeAndPeriod = function(employeeId, month, year) {
  return this.findOne({
    employee: employeeId,
    'period.month': month,
    'period.year': year
  });
};

payslipSchema.statics.getPayslipsByPeriod = function(month, year) {
  return this.find({
    'period.month': month,
    'period.year': year
  }).populate('employee', 'personalInfo.firstName personalInfo.lastName employeeId workInfo.department')
    .populate('generatedBy', 'name email');
};

export default mongoose.model('Payslip', payslipSchema);
