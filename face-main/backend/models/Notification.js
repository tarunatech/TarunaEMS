import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  category: {
    type: String,
    enum: ['attendance', 'leave', 'task', 'employee', 'system'],
    required: true
  },
  // Who should receive this notification
  targetUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  // Who sent this notification
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Related entity (attendance, leave, task, etc.)
  relatedEntity: {
    model: {
      type: String,
      enum: ['Attendance', 'Leave', 'Task', 'Employee']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedEntity.model'
    }
  },
  // Notification status
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Additional data for specific notification types
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for better query performance
notificationSchema.index({ targetUsers: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ category: 1, type: 1 });
notificationSchema.index({ 'relatedEntity.model': 1, 'relatedEntity.id': 1 });

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
  try {
    const notification = new this(data);
    await notification.save();

    // Populate sender info for immediate use
    await notification.populate('sender', 'name email');

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = async function(userId) {
  try {
    if (!this.isRead) {
      this.isRead = true;
      this.readBy.push({
        user: userId,
        readAt: new Date()
      });
      await this.save();
    }
    return this;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = async function(userId, options = {}) {
  try {
    const { page = 1, limit = 20, category, isRead, type } = options;

    const query = { targetUsers: userId };

    if (category) query.category = category;
    if (typeof isRead === 'boolean') query.isRead = isRead;
    if (type) query.type = type;

    const notifications = await this.find(query)
      .populate('sender', 'name email')
      .populate('relatedEntity.id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await this.countDocuments(query);

    return {
      notifications,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error('Error getting user notifications:', error);
    throw error;
  }
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  try {
    return await this.countDocuments({
      targetUsers: userId,
      isRead: false
    });
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
