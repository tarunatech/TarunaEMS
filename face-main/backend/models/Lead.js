import mongoose from 'mongoose';

const meetingSchema = new mongoose.Schema({
  meetingId: {
    type: String,
    // Removed unique: true - uniqueness is per-lead, generated when meeting is added
    // required: true
  },
  type: {
    type: String,
    enum: ['Call', 'Video Meeting', 'In-Person', 'Email Follow-up', 'Demo', 'Presentation', 'Negotiation'],
    required: true
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duration in minutes
    default: 30
  },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'],
    default: 'Scheduled'
  },
  agenda: {
    type: String,
    trim: true
  },
  attendees: [{
    name: String,
    email: String,
    role: String // 'Lead', 'Employee', 'Manager', 'External'
  }],
  outcome: {
    type: String,
    trim: true
  },
  nextAction: {
    type: String,
    trim: true
  },
  nextMeetingDate: {
    type: Date
  },
  recording: {
    url: String,
    notes: String
  },
  documents: [{
    name: String,
    url: String,
    type: String // 'Proposal', 'Contract', 'Presentation', 'Other'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const leadSchema = new mongoose.Schema({
  leadId: {
    type: String,
    unique: true,
  },

  // Lead Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },

  // Lead Details
  source: {
    type: String,
    enum: ['Website', 'Social Media', 'Email Campaign', 'Cold Call', 'Referral', 'Trade Show', 'Advertisement', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'],
    default: 'New'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Hot'],
    default: 'Medium'
  },
  
  // Product/Service Interest
  interestedProducts: [{
    type: String,
    trim: true
  }],
  estimatedValue: {
    type: Number,
    min: 0
  },
  actualValue: {
    type: Number,
    min: 0 // Filled when status becomes 'Won'
  },
  expectedCloseDate: {
    type: Date
  },
  actualCloseDate: {
    type: Date // Filled when status becomes 'Won' or 'Lost'
  },
  
  // Assignment
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Meeting Management
  meetings: [meetingSchema],
  totalMeetings: {
    type: Number,
    default: 0
  },
  completedMeetings: {
    type: Number,
    default: 0
  },
  upcomingMeetings: {
    type: Number,
    default: 0
  },
  nextMeetingDate: {
    type: Date
  },
  lastMeetingDate: {
    type: Date
  },
  averageMeetingDuration: {
    type: Number,
    default: 0
  },
  
  // Communication History
  notes: [{
    content: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    type: {
      type: String,
      enum: ['General', 'Meeting', 'Call', 'Email', 'Follow-up'],
      default: 'General'
    }
  }],
  
  // Follow-up
  lastContactDate: {
    type: Date
  },
  nextFollowUpDate: {
    type: Date
  },
  
  // Address
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    pincode: String
  },
  
  // Won Lead Tracking
  wonDetails: {
    wonDate: {
      type: Date
    },
    finalValue: {
      type: Number,
      min: 0
    },
    discount: {
      type: Number,
      default: 0
    },
    discountReason: {
      type: String,
      trim: true
    },
    paymentTerms: {
      type: String,
      trim: true
    },
    deliveryDate: {
      type: Date
    },
    contractDuration: {
      type: Number // Duration in months
    },
    recurringRevenue: {
      type: Number,
      default: 0
    },
    renewalDate: {
      type: Date
    },
    customerSuccessManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    onboardingStatus: {
      type: String,
      enum: ['Not Started', 'In Progress', 'Completed'],
      default: 'Not Started'
    },
    satisfactionScore: {
      type: Number,
      min: 1,
      max: 10
    },
    referralPotential: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    }
  },
  
  // Performance Metrics
  leadScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  engagementLevel: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  responseRate: {
    type: Number,
    default: 0 // Percentage
  },
  
  // Additional Fields
  tags: [{
    type: String,
    trim: true
  }],
  customFields: {
    type: Map,
    of: String
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  convertedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for days since last contact
leadSchema.virtual('daysSinceLastContact').get(function() {
  if (!this.lastContactDate) return null;
  const now = new Date();
  const diffTime = Math.abs(now - this.lastContactDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for overdue follow-ups
leadSchema.virtual('isOverdue').get(function() {
  if (!this.nextFollowUpDate) return false;
  return new Date() > this.nextFollowUpDate;
});

// Virtual for conversion rate
leadSchema.virtual('conversionRate').get(function() {
  if (this.totalMeetings === 0) return 0;
  return Math.round((this.completedMeetings / this.totalMeetings) * 100);
});

// Pre-save middleware to generate leadId and update meeting counters
leadSchema.pre('save', async function(next) {
  if (!this.leadId) {
    const count = await this.constructor.countDocuments();
    this.leadId = `LEAD${(count + 1).toString().padStart(6, '0')}`;
  }

  // Update meeting counters
  this.totalMeetings = this.meetings.length;
  this.completedMeetings = this.meetings.filter(m => m.status === 'Completed').length;
  this.upcomingMeetings = this.meetings.filter(m => 
    m.status === 'Scheduled' && new Date(m.scheduledDate) > new Date()
  ).length;

  // Update next meeting date
  const upcomingMeetings = this.meetings
    .filter(m => m.status === 'Scheduled' && new Date(m.scheduledDate) > new Date())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
  
  this.nextMeetingDate = upcomingMeetings.length > 0 ? upcomingMeetings[0].scheduledDate : null;

  // Update last meeting date
  const completedMeetings = this.meetings
    .filter(m => m.status === 'Completed')
    .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate));
  
  this.lastMeetingDate = completedMeetings.length > 0 ? completedMeetings[0].scheduledDate : null;

  // Calculate average meeting duration
  const completedMeetingsWithDuration = this.meetings.filter(m => 
    m.status === 'Completed' && m.duration
  );
  
  if (completedMeetingsWithDuration.length > 0) {
    const totalDuration = completedMeetingsWithDuration.reduce((sum, m) => sum + m.duration, 0);
    this.averageMeetingDuration = Math.round(totalDuration / completedMeetingsWithDuration.length);
  }

  // Auto-fill won details when status changes to Won
  if (this.status === 'Won' && !this.wonDetails.wonDate) {
    this.wonDetails.wonDate = new Date();
    this.actualCloseDate = new Date();
    this.convertedAt = new Date();
    this.actualValue = this.estimatedValue || 0;
    this.wonDetails.finalValue = this.estimatedValue || 0;
  }

  // Auto-fill lost date
  if (this.status === 'Lost' && !this.actualCloseDate) {
    this.actualCloseDate = new Date();
    this.convertedAt = new Date();
  }

  // Generate meeting IDs
  this.meetings.forEach((meeting, index) => {
    if (!meeting.meetingId) {
      meeting.meetingId = `${this.leadId}-M${(index + 1).toString().padStart(3, '0')}`;
    }
  });

  this.updatedAt = new Date();
  next();
});

// Index for better performance
leadSchema.index({ assignedTo: 1, status: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ phone: 1 });
leadSchema.index({ status: 1, priority: 1 });
leadSchema.index({ nextFollowUpDate: 1 });
leadSchema.index({ nextMeetingDate: 1 });
leadSchema.index({ 'wonDetails.wonDate': 1 });
leadSchema.index({ 'wonDetails.renewalDate': 1 });

// Static methods
leadSchema.statics.getLeadStats = function(employeeId) {
  return this.aggregate([
    { $match: { assignedTo: employeeId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$estimatedValue' },
        actualValue: { $sum: '$actualValue' },
        avgMeetings: { $avg: '$totalMeetings' }
      }
    }
  ]);
};

leadSchema.statics.getWonLeadsStats = function(employeeId) {
  const matchQuery = employeeId ? { assignedTo: employeeId } : {};
  
  return this.aggregate([
    { 
      $match: { 
        ...matchQuery,
        status: 'Won' 
      } 
    },
    {
      $group: {
        _id: null,
        totalWon: { $sum: 1 },
        totalRevenue: { $sum: '$wonDetails.finalValue' },
        avgDealSize: { $avg: '$wonDetails.finalValue' },
        totalRecurringRevenue: { $sum: '$wonDetails.recurringRevenue' },
        avgMeetingsToClose: { $avg: '$completedMeetings' },
        avgSatisfactionScore: { $avg: '$wonDetails.satisfactionScore' }
      }
    }
  ]);
};

leadSchema.statics.getMeetingStats = function(employeeId) {
  const matchQuery = employeeId ? { assignedTo: employeeId } : {};
  
  return this.aggregate([
    { $match: matchQuery },
    { $unwind: '$meetings' },
    {
      $group: {
        _id: '$meetings.type',
        count: { $sum: 1 },
        completed: { 
          $sum: { 
            $cond: [{ $eq: ['$meetings.status', 'Completed'] }, 1, 0] 
          } 
        },
        avgDuration: { $avg: '$meetings.duration' }
      }
    }
  ]);
};

leadSchema.statics.getUpcomingMeetings = function(employeeId, days = 7) {
  const matchQuery = employeeId ? { assignedTo: employeeId } : {};
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days);
  
  return this.aggregate([
    { $match: matchQuery },
    { $unwind: '$meetings' },
    {
      $match: {
        'meetings.status': 'Scheduled',
        'meetings.scheduledDate': {
          $gte: new Date(),
          $lte: endDate
        }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'assignedTo',
        foreignField: '_id',
        as: 'assignedTo'
      }
    },
    { $unwind: '$assignedTo' },
    {
      $project: {
        leadId: 1,
        fullName: { $concat: ['$firstName', ' ', '$lastName'] },
        company: 1,
        meeting: '$meetings',
        assignedTo: '$assignedTo.personalInfo'
      }
    },
    { $sort: { 'meeting.scheduledDate': 1 } }
  ]);
};

leadSchema.statics.getOverdueLeads = function(employeeId) {
  return this.find({
    assignedTo: employeeId,
    nextFollowUpDate: { $lt: new Date() },
    status: { $nin: ['Won', 'Lost'] }
  }).populate('assignedTo', 'personalInfo.firstName personalInfo.lastName');
};

export default mongoose.model('Lead', leadSchema);