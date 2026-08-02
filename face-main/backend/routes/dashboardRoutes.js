// routes/dashboardRoutes.js
import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import {
  getAdminStats,
  getEmployeeStats,
  getRecentActivities,
  getUpcomingEvents,
  getDashboardSummary,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../controllers/dashboardController.js';

const router = express.Router();

// All dashboard routes require authentication
router.use(protect);

// General dashboard summary (role-based)
router.get('/summary', getDashboardSummary);

// Admin specific routes
router.get('/stats', adminOnly, getAdminStats);
router.get('/activities', adminOnly, getRecentActivities);

// Employee specific routes
router.get('/employee-stats', getEmployeeStats);

// Common routes (accessible to both)
router.get('/events', getUpcomingEvents);

// / New notification routes
router.get('/notifications', protect, getUserNotifications);
router.put('/notifications/:id/read', protect, markNotificationAsRead);
router.put('/notifications/read-all', protect, markAllNotificationsAsRead);

export default router;

