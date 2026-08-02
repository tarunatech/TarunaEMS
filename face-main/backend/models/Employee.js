import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  // Reference to User model
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Employee ID (auto-generated) - Removed unique constraint as User model handles this
  employeeId: {
    type: String,
    uppercase: true
  },

  // Personal Information
  personalInfo: {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [30, 'First name cannot exceed 30 characters']
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: [30, 'Last name cannot exceed 30 characters']
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required']
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: [true, 'Gender is required']
    },
    nationality: {
      type: String,
      default: 'Indian'
    },
    maritalStatus: {
      type: String,
      enum: ['Single', 'Married', 'Divorced', 'Widowed'],
      default: 'Single'
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
    }
  },

  // Contact Information
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Phone number is required']
    },
    alternatePhone: String,
    personalEmail: {
      type: String,
      required: [true, 'Personal email is required'],
      lowercase: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      country: {
        type: String,
        default: 'India'
      }
    },
    emergencyContact: {
      name: {
        type: String,
        required: [true, 'Emergency contact name is required']
      },
      relationship: {
        type: String,
        required: [true, 'Emergency contact relationship is required']
      },
      phone: {
        type: String,
        required: [true, 'Emergency contact phone is required']
      }
    }
  },

  // Work Information
  workInfo: {
    position: {
      type: String,
      required: [true, 'Position is required']
    },
 department: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Department',
  required: true
},

    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
      default: Date.now
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Intern'],
      default: 'Full-time'
    },
    workLocation: {
      type: String,
      enum: ['Office', 'Remote', 'Hybrid'],
      default: 'Office'
    },
    team: String,
    skills: [String],
    workShift: {
      type: String,
      enum: ['Morning', 'Afternoon', 'Evening', 'Night', 'Flexible'],
      default: 'Morning'
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  },

  // Salary Information
  salaryInfo: {
    basicSalary: {
      type: Number,
      required: [true, 'Basic salary is required'],
      min: 0
    },
    allowances: {
      hra: { type: Number, default: 0 },
      medical: { type: Number, default: 0 },
      transport: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    deductions: {
      pf: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      tax: { type: Number, default: 0 },
      other: { type: Number, default: 0 }
    },
    currency: {
      type: String,
      default: 'INR'
    },
    payFrequency: {
      type: String,
      enum: ['Monthly', 'Weekly', 'Bi-weekly'],
      default: 'Monthly'
    }
  },

  // Bank Information
  bankInfo: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    branchName: String,
    ifscCode: String,
    accountType: {
      type: String,
      enum: ['Savings', 'Current'],
      default: 'Savings'
    }
  },

  // Status
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'On Leave', 'Terminated'],
    default: 'Active'
  },


   leaveBalance: {
    total: { type: Number, default: 30 }, // Total annual leave days
    used: { type: Number, default: 0 },
    remaining: { type: Number, default: 30 }
  
},
faceDescriptor: {
  type: [Number], 
  default: null
},
faceEmbeddings: {
  front: { type: [Number], default: null },
  left: { type: [Number], default: null },
  right: { type: [Number], default: null },
  average: { type: [Number], default: null }
},
faceQualityScores: {
  front: { type: Number, default: 0 },
  left: { type: Number, default: 0 },
  right: { type: Number, default: 0 }
},
faceImage: {
  type: String, 
  default: null
},
faceImages: {
  front: { type: String, default: null },
  left: { type: String, default: null },
  right: { type: String, default: null }
},
hasFaceRegistered: {
  type: Boolean,
  default: false
},
faceRegistrationDate: {
  type: Date,
  default: null
},
faceRegistrationMethod: {
  type: String,
  enum: ['single', 'multi-angle', 'video'],
  default: null
},


  // Documents (file paths/URLs)
  documents: {
    resume: String,
    idProof: String,
    addressProof: String,
    educationCertificates: [String],
    experienceCertificates: [String],
    others: [String]
  },

  // Additional fields
  notes: String,
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
employeeSchema.index({ 'workInfo.department': 1 });
employeeSchema.index({ 'workInfo.position': 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ 'personalInfo.firstName': 1 });
employeeSchema.index({ 'personalInfo.lastName': 1 });

// Note: employeeId is now managed by the User model to avoid conflicts
// The Employee model receives employeeId from the User model during creation


// Pre-save middleware to ensure leave balance is initialized
employeeSchema.pre('save', function(next) {
  if (this.isNew && !this.leaveBalance) {
    this.leaveBalance = {
      total: 30,
      used: 0,
      remaining: 30
    };
  }
  next();
});

// Method to calculate remaining balance
employeeSchema.methods.calculateRemainingBalance = function() {
  this.leaveBalance.remaining = this.leaveBalance.total - this.leaveBalance.used;
  return this.leaveBalance.remaining;
};

// Virtual for full name
employeeSchema.virtual('fullName').get(function() {
  return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

// Virtual for age
employeeSchema.virtual('age').get(function() {
  if (!this.personalInfo.dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(this.personalInfo.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for years of service
employeeSchema.virtual('yearsOfService').get(function() {
  if (!this.workInfo.joiningDate) return 0;
  
  const today = new Date();
  const joinDate = new Date(this.workInfo.joiningDate);
  const diffTime = Math.abs(today - joinDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.floor(diffDays / 365.25);
});

// Virtual for gross salary
employeeSchema.virtual('grossSalary').get(function() {
  const basic = this.salaryInfo.basicSalary || 0;
  const allowances = this.salaryInfo.allowances;
  const totalAllowances = (allowances.hra || 0) + (allowances.medical || 0) + 
                         (allowances.transport || 0) + (allowances.other || 0);
  
  return basic + totalAllowances;
});

// Virtual for net salary
employeeSchema.virtual('netSalary').get(function() {
  const gross = this.grossSalary;
  const deductions = this.salaryInfo.deductions;
  const totalDeductions = (deductions.pf || 0) + (deductions.esi || 0) + 
                         (deductions.tax || 0) + (deductions.other || 0);
  
  return Math.max(0, gross - totalDeductions);
});

// Static methods
employeeSchema.statics.getByDepartment = function(department) {
  return this.find({ 'workInfo.department': department, status: 'Active' })
    .populate('user', 'name email employeeId')
    .sort({ 'personalInfo.firstName': 1 });
};

employeeSchema.statics.getActiveEmployees = function() {
  return this.find({ status: 'Active' })
    .populate('user', 'name email employeeId')
    .sort({ 'workInfo.joiningDate': -1 });
};

employeeSchema.statics.getEmployeeStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } },
        inactive: { $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] } },
        onLeave: { $sum: { $cond: [{ $eq: ['$status', 'On Leave'] }, 1, 0] } },
        terminated: { $sum: { $cond: [{ $eq: ['$status', 'Terminated'] }, 1, 0] } }
      }
    }
  ]);

  return stats[0] || { total: 0, active: 0, inactive: 0, onLeave: 0, terminated: 0 };
};

export default mongoose.model('Employee', employeeSchema);