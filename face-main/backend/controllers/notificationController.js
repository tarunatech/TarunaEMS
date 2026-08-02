import Notification from '../models/Notification.js';
import User from '../models/User.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, category, isRead, type } = req.query;

    const result = await Notification.getUserNotifications(req.user.id, {
      page: parseInt(page),
      limit: parseInt(limit),
      category,
      isRead: isRead === 'true',
      type
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.getUnreadCount(req.user.id);

    res.json({
      success: true,
      count
    });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching unread count'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user is authorized to read this notification
    if (!notification.targetUsers.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.markAsRead(req.user.id);
    await notification.populate('sender', 'name email');

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const { category } = req.query;

    const query = {
      targetUsers: req.user.id,
      isRead: false
    };

    if (category) {
      query.category = category;
    }

    const notifications = await Notification.find(query);

    for (const notification of notifications) {
      await notification.markAsRead(req.user.id);
    }

    res.json({
      success: true,
      message: 'All notifications marked as read',
      count: notifications.length
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notifications as read'
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check if user is authorized to delete this notification
    if (!notification.targetUsers.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting notification'
    });
  }
};

// @desc    Create notification (Admin/Employee)
// @route   POST /api/notifications
// @access  Private
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, category, targetUsers, priority, metadata } = req.body;

    // Validate required fields
    if (!title || !message || !category || !targetUsers || !Array.isArray(targetUsers)) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, category, and targetUsers are required'
      });
    }

    // Verify target users exist
    const users = await User.find({ _id: { $in: targetUsers } });
    if (users.length !== targetUsers.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more target users not found'
      });
    }

    const notification = await Notification.createNotification({
      title,
      message,
      type: type || 'info',
      category,
      targetUsers,
      sender: req.user.id,
      priority: priority || 'medium',
      metadata: metadata || {}
    });

    await notification.populate('sender', 'name email');

    res.status(201).json({
      success: true,
      message: 'Notification created successfully',
      data: notification
    });

  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating notification'
    });
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
export const getNotificationStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const total = await Notification.countDocuments({ targetUsers: userId });
    const unread = await Notification.countDocuments({
      targetUsers: userId,
      isRead: false
    });

    // Category-wise count
    const categoryStats = await Notification.aggregate([
      { $match: { targetUsers: userId } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Type-wise count
    const typeStats = await Notification.aggregate([
      { $match: { targetUsers: userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        total,
        unread,
        read: total - unread,
        categoryStats,
        typeStats
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notification statistics'
    });
  }
};

// @desc    Send notification to admins
// @route   POST /api/notifications/notify-admins
// @access  Private
export const notifyAdmins = async (req, res) => {
  try {
    const { title, message, type, category, priority, metadata } = req.body;

    // Get all admin users
    const adminUsers = await User.find({ role: 'admin', isActive: true });

    if (adminUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No active admin users found'
      });
    }

    const notification = await Notification.createNotification({
      title,
      message,
      type: type || 'info',
      category,
      targetUsers: adminUsers.map(admin => admin._id),
      sender: req.user.id,
      priority: priority || 'medium',
      metadata: metadata || {}
    });

    await notification.populate('sender', 'name email');

    res.status(201).json({
      success: true,
      message: `Notification sent to ${adminUsers.length} admin(s)`,
      data: notification
    });

  } catch (error) {
    console.error('Notify admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while notifying admins'
    });
  }
};

// @desc    Send notification to specific users
// @route   POST /api/notifications/notify-users
// @access  Private
export const notifyUsers = async (req, res) => {
  try {
    const { title, message, type, category, userIds, priority, metadata } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs are required'
      });
    }

    // Verify users exist
    const users = await User.find({ _id: { $in: userIds } });
    if (users.length !== userIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more users not found'
      });
    }

    const notification = await Notification.createNotification({
      title,
      message,
      type: type || 'info',
      category,
      targetUsers: userIds,
      sender: req.user.id,
      priority: priority || 'medium',
      metadata: metadata || {}
    });

    await notification.populate('sender', 'name email');

    res.status(201).json({
      success: true,
      message: `Notification sent to ${userIds.length} user(s)`,
      data: notification
    });

  } catch (error) {
    console.error('Notify users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while notifying users'
    });
  }
};
