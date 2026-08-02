import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: false,
    default: 'Task',
    trim: true,
    maxlength: [100, 'Task title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: [1000, 'Task description cannot exceed 1000 characters']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: String,
    required: false,
    default: '',
    trim: true,
    maxlength: [50, 'Project name cannot exceed 50 characters']
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'],
    default: 'Not Started'
  },
  dueDate: {
    type: Date,
    required: [true, 'Due date is required']
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    max: [1000, 'Estimated hours cannot exceed 1000']
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    default: 0
  },
  category: {
    type: String,
    required: false,
    enum: ['Development', 'Design', 'Testing', 'Documentation', 'Research', 'Bug Fix', 'Feature', 'Maintenance', 'Other'],
    default: 'Other'
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [20, 'Tag cannot exceed 20 characters']
  }],
  attachments: [{
    fileName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  subtasks: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Subtask title cannot exceed 100 characters']
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringPattern: {
    type: String,
    enum: ['Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly'],
    required: function () {
      return this.isRecurring;
    }
  },
  lastRecurringDate: Date,
  nextRecurringDate: Date,
  isSelfAssigned: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ assignedBy: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ project: 1 });
taskSchema.index({ category: 1 });
taskSchema.index({ createdAt: -1 });

// Virtual for task status color
taskSchema.virtual('statusColor').get(function () {
  const colors = {
    'Not Started': 'gray',
    'In Progress': 'blue',
    'Review': 'yellow',
    'Completed': 'green',
    'On Hold': 'orange',
    'Cancelled': 'red'
  };
  return colors[this.status] || 'gray';
});

// Virtual for priority color
taskSchema.virtual('priorityColor').get(function () {
  const colors = {
    'Low': 'green',
    'Medium': 'yellow',
    'High': 'orange',
    'Critical': 'red'
  };
  return colors[this.priority] || 'gray';
});

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function () {
  return this.status !== 'Completed' && new Date() > new Date(this.dueDate);
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function () {
  if (this.status === 'Completed') return 0;

  const now = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
});

// Virtual for completion percentage of subtasks
taskSchema.virtual('subtasksProgress').get(function () {
  if (this.subtasks.length === 0) return 0;

  const completed = this.subtasks.filter(subtask => subtask.completed).length;
  return Math.round((completed / this.subtasks.length) * 100);
});

// Pre-save middleware to update completion date
taskSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'Completed' && !this.completedDate) {
    this.completedDate = new Date();
    this.progress = 100;
  }

  if (this.isModified('status') && this.status !== 'Completed') {
    this.completedDate = undefined;
  }

  next();
});

// Pre-save middleware to calculate progress based on subtasks
taskSchema.pre('save', function (next) {
  if (this.subtasks.length > 0 && this.status !== 'Completed') {
    const completed = this.subtasks.filter(subtask => subtask.completed).length;
    this.progress = Math.round((completed / this.subtasks.length) * 100);
  }
  next();
});

// Static method to get task statistics for an employee
taskSchema.statics.getEmployeeStats = async function (employeeId) {
  const stats = await this.aggregate([
    { $match: { assignedTo: new mongoose.Types.ObjectId(employeeId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$actualHours' }
      }
    }
  ]);

  const overdue = await this.countDocuments({
    assignedTo: employeeId,
    status: { $nin: ['Completed', 'Cancelled'] },
    dueDate: { $lt: new Date() }
  });

  return { statusStats: stats, overdue };
};

// Static method to get tasks by project
taskSchema.statics.getByProject = function (projectName) {
  return this.find({ project: projectName })
    .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
    .populate('assignedBy', 'name')
    .sort({ createdAt: -1 });
};

// Static method to get overdue tasks
taskSchema.statics.getOverdueTasks = function () {
  return this.find({
    status: { $nin: ['Completed', 'Cancelled'] },
    dueDate: { $lt: new Date() }
  })
    .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName employeeId')
    .sort({ dueDate: 1 });
};

// Instance method to add comment
taskSchema.methods.addComment = function (userId, text) {
  this.comments.push({
    user: userId,
    text: text
  });
  return this.save();
};

// Instance method to add subtask
taskSchema.methods.addSubtask = function (title) {
  this.subtasks.push({ title });
  return this.save();
};

// Instance method to toggle subtask completion
taskSchema.methods.toggleSubtask = function (subtaskId) {
  const subtask = this.subtasks.id(subtaskId);
  if (subtask) {
    subtask.completed = !subtask.completed;
    subtask.completedAt = subtask.completed ? new Date() : null;
    return this.save();
  }
  throw new Error('Subtask not found');
};

// Instance method to update progress
taskSchema.methods.updateProgress = function (progress) {
  this.progress = Math.max(0, Math.min(100, progress));

  if (this.progress === 100 && this.status !== 'Completed') {
    this.status = 'Completed';
    this.completedDate = new Date();
  } else if (this.progress > 0 && this.status === 'Not Started') {
    this.status = 'In Progress';
  }

  return this.save();
};

// Instance method to change status
taskSchema.methods.changeStatus = function (newStatus) {
  this.status = newStatus;

  if (newStatus === 'Completed') {
    this.completedDate = new Date();
    this.progress = 100;
  } else if (newStatus === 'In Progress' && this.progress === 0) {
    this.progress = 10; // Set minimum progress when starting
  }

  return this.save();
};

export default mongoose.model('Task', taskSchema);