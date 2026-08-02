import mongoose from 'mongoose';

const leaveSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
leaveType: {
  type: String,
  enum: ['casual', 'sick', 'earned', 'maternity', 'paternity', 'emergency', 'personal'],
  required: [true, 'Leave type is required']
},

  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  totalDays: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Cancelled'],
    default: 'Pending'
  },
  appliedDate: {
    type: Date,
    default: Date.now
  },
  actionDate: {
    type: Date
  },
  actionBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approverComments: {
    type: String,
    trim: true,
    maxlength: [300, 'Comments cannot exceed 300 characters']
  },
  attachment: {
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  halfDaySession: {
    type: String,
    enum: ['Morning', 'Evening'],
    required: function() {
      return this.isHalfDay;
    }
  },
  contactDuringLeave: {
    phone: String,
    address: String
  },
  workHandover: {
    handoverTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    instructions: String
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Emergency'],
    default: 'Medium'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
leaveSchema.index({ employee: 1 });
leaveSchema.index({ user: 1 });
leaveSchema.index({ status: 1 });
leaveSchema.index({ leaveType: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ appliedDate: 1 });

// Virtual for leave duration in readable format
leaveSchema.virtual('duration').get(function() {
  if (this.isHalfDay) {
    return `0.5 day (${this.halfDaySession})`;
  }
  return `${this.totalDays} ${this.totalDays === 1 ? 'day' : 'days'}`;
});

// Virtual for status color coding
leaveSchema.virtual('statusColor').get(function() {
  const colors = {
    'Pending': 'yellow',
    'Approved': 'green',
    'Rejected': 'red',
    'Cancelled': 'gray'
  };
  return colors[this.status] || 'gray';
});

// Pre-save middleware to calculate total days
leaveSchema.pre('save', function(next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    if (this.isHalfDay) {
      this.totalDays = 0.5;
    } else {
      const diffTime = Math.abs(end - start);
      this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }
  next();
});

// Pre-save middleware to set action date when status changes
leaveSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status !== 'Pending') {
    this.actionDate = new Date();
  }
  next();
});

// Static method to get leave statistics
leaveSchema.statics.getLeaveStats = async function(employeeId, year = new Date().getFullYear()) {
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  
  const stats = await this.aggregate([
    {
      $match: {
        employee: new mongoose.Types.ObjectId(employeeId),
        status: 'Approved',
        startDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$leaveType',
        totalDays: { $sum: '$totalDays' },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return stats;
};

// Static method to check leave conflicts
leaveSchema.statics.checkConflicts = async function(employeeId, startDate, endDate, excludeId = null) {
  const query = {
    employee: employeeId,
    status: { $in: ['Pending', 'Approved'] },
    $or: [
      {
        startDate: { $lte: endDate },
        endDate: { $gte: startDate }
      }
    ]
  };
  
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  
  const conflicts = await this.find(query);
  return conflicts;
};

// Instance method to approve leave
leaveSchema.methods.approve = function(approver, comments = '') {
  this.status = 'Approved';
  this.actionBy = approver._id;
  this.actionDate = new Date();
  this.approverComments = comments;
  return this.save();
};

// Instance method to reject leave
leaveSchema.methods.reject = function(approver, comments = '') {
  this.status = 'Rejected';
  this.actionBy = approver._id;
  this.actionDate = new Date();
  this.approverComments = comments;
  return this.save();
};

// Instance method to cancel leave
leaveSchema.methods.cancel = function() {
  if (this.status === 'Pending') {
    this.status = 'Cancelled';
    this.actionDate = new Date();
    return this.save();
  }
  throw new Error('Only pending leaves can be cancelled');
};

export default mongoose.model('Leave', leaveSchema);