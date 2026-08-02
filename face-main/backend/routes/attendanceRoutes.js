// routes/attendanceRoutes.js
import express from 'express';
import { protect, adminOnly, employeeOnly } from '../middleware/authMiddleware.js';
import {
  checkIn,
  checkOut,
  checkInWithFace,
  getTodayAttendance,
  getAttendanceHistory,
  getAllAttendance,
  getAttendanceSummary,
  updateAttendance,
  deleteAttendance,
  verifyFace,
  getEmployeeAttendanceStats
} from '../controllers/attendanceController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Employee routes
router.post('/verify-face', employeeOnly, verifyFace);
router.post('/checkin', employeeOnly, checkIn);                    // Mark attendance (check-in)
router.post('/checkin-with-face', employeeOnly, checkInWithFace);  // Combined face and location validation
router.put('/checkout', employeeOnly, checkOut);                  // Mark checkout
router.get('/today', employeeOnly, getTodayAttendance);            // Get today's attendance status
router.get('/history', employeeOnly, getAttendanceHistory);        // Get employee attendance history
router.get('/employee-stats', employeeOnly, getEmployeeAttendanceStats); // Get real stats

// Admin routes
router.get('/all', adminOnly, getAllAttendance);     // Get all attendance records
router.get('/summary', adminOnly, getAttendanceSummary); // Get attendance summary for dashboard
router.put('/:id', adminOnly, updateAttendance);     // Update attendance record
router.delete('/:id', adminOnly, deleteAttendance);
// router.post('/verify-face', auth, verifyFace); // Delete attendance record

export default router;