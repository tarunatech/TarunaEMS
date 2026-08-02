// controllers/dashboardController.js
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import Leave from '../models/Leave.js';
import Task from '../models/Task.js';

// @desc    Get admin dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private (Admin)
export const getAdminStats = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Get employee statistics
    const totalEmployees = await Employee.countDocuments({ status: { $ne: 'Terminated' } });
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'Inactive' });
    const onLeaveEmployees = await Employee.countDocuments({ status: 'On Leave' });

    // Get department count
    const departmentStats = await Employee.aggregate([
      { $match: { status: { $ne: 'Terminated' } } },
      { $group: { _id: '$workInfo.department', count: { $sum: 1 } } }
    ]);
    const totalDepartments = departmentStats.length;

    // Get today's leaves
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    const leavesToday = await Leave.countDocuments({
      status: 'Approved',
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay }
    });

    // Get pending leave requests
    const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });

    // Get recent joinings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJoinings = await Employee.countDocuments({
      'workInfo.joiningDate': { $gte: thirtyDaysAgo },
      status: { $ne: 'Terminated' }
    });

    // Get task statistics
    const totalTasks = await Task.countDocuments();
    const completedTasks = await Task.countDocuments({ status: 'Completed' });
    const overdueTasks = await Task.countDocuments({
      status: { $nin: ['Completed', 'Cancelled'] },
      dueDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      onLeaveEmployees,
      departments: totalDepartments,
      leavesToday,
      pendingLeaves,
      recentJoinings,
      totalTasks,
      completedTasks,
      overdueTasks,
      departmentDistribution: departmentStats.map(stat => ({
        department: stat._id,
        count: stat.count
      }))
    });

  } catch (error) {
    console.error('Admin dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Get employee dashboard statistics
// @route   GET /api/dashboard/employee-stats
// @access  Private (Employee)
export const getEmployeeStats = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    // Get leave statistics for current year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const leaveStats = await Leave.aggregate([
      {
        $match: {
          employee: employee._id,
          status: 'Approved',
          startDate: { $gte: yearStart, $lte: yearEnd }
        }
      },
      {
        $group: {
          _id: '$leaveType',
          totalDays: { $sum: '$totalDays' }
        }
      }
    ]);

    // Calculate leave balance
    const leaveBalance = {
      casual: { allocated: 12, used: 0, remaining: 12 },
      sick: { allocated: 7, used: 0, remaining: 7 },
      earned: { allocated: 15, used: 0, remaining: 15 }
    };

    leaveStats.forEach(stat => {
      const leaveType = stat._id.toLowerCase();
      if (leaveBalance[leaveType]) {
        leaveBalance[leaveType].used = stat.totalDays;
        leaveBalance[leaveType].remaining = leaveBalance[leaveType].allocated - stat.totalDays;
      }
    });

    // Get task statistics for this employee
    const myTasks = await Task.countDocuments({ assignedTo: employee._id });
    const completedTasks = await Task.countDocuments({ 
      assignedTo: employee._id, 
      status: 'Completed' 
    });
    const pendingTasks = await Task.countDocuments({ 
      assignedTo: employee._id, 
      status: { $in: ['Not Started', 'In Progress'] }
    });
    const overdueTasks = await Task.countDocuments({
      assignedTo: employee._id,
      status: { $nin: ['Completed', 'Cancelled'] },
      dueDate: { $lt: new Date() }
    });

    // Get recent tasks
    const recentTasks = await Task.find({ assignedTo: employee._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title status priority dueDate');

    // Get pending leave requests
    const pendingLeaves = await Leave.countDocuments({
      employee: employee._id,
      status: 'Pending'
    });

    // Calculate attendance (mock for now - you can implement actual attendance tracking)
    const attendanceData = {
      currentMonth: {
        present: 22,
        absent: 1,
        total: 23
      }
    };

    res.json({
      success: true,
      employee: {
        name: employee.fullName,
        employeeId: employee.user?.employeeId,
        department: employee.workInfo?.department,
        position: employee.workInfo?.position,
        joiningDate: employee.workInfo?.joiningDate
      },
      leaveBalance,
      tasks: {
        total: myTasks,
        completed: completedTasks,
        pending: pendingTasks,
        overdue: overdueTasks,
        recent: recentTasks
      },
      attendance: attendanceData,
      pendingLeaves
    });

  } catch (error) {
    console.error('Employee dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Get recent activities (admin)
// @route   GET /api/dashboard/activities
// @access  Private (Admin)
export const getRecentActivities = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Get recent employee additions
    const recentEmployees = await Employee.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent leave applications
    const recentLeaves = await Leave.find()
      .populate('employee', 'personalInfo.firstName personalInfo.lastName')
      .populate('user', 'name')
      .sort({ appliedDate: -1 })
      .limit(5);

    // Get recent task completions
    const recentTaskCompletions = await Task.find({ 
      status: 'Completed',
      completedDate: { $exists: true }
    })
      .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName')
      .sort({ completedDate: -1 })
      .limit(5);

    // Format activities
    const activities = [];

    recentEmployees.forEach(emp => {
      activities.push({
        id: emp._id,
        type: 'success',
        action: 'New employee added to the system',
        user: emp.fullName,
        time: emp.createdAt,
        category: 'employee'
      });
    });

    recentLeaves.forEach(leave => {
      activities.push({
        id: leave._id,
        type: leave.status === 'Approved' ? 'success' : leave.status === 'Pending' ? 'warning' : 'info',
        action: `Leave application ${leave.status.toLowerCase()}`,
        user: leave.employee?.fullName || leave.user?.name,
        time: leave.appliedDate || leave.createdAt,
        category: 'leave'
      });
    });

    recentTaskCompletions.forEach(task => {
      activities.push({
        id: task._id,
        type: 'success',
        action: `Completed task: ${task.title}`,
        user: task.assignedTo?.fullName,
        time: task.completedDate || task.updatedAt || task.createdAt,
        category: 'task'
      });
    });

    // Sort all activities by time and limit
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    const limitedActivities = activities.slice(0, 10);

    res.json({
      success: true,
      activities: limitedActivities.map(activity => ({
        ...activity,
        time: activity.time || activity.createdAt || new Date()
      }))
    });

  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching activities'
    });
  }
};

// @desc    Get upcoming events/deadlines
// @route   GET /api/dashboard/events
// @access  Private
export const getUpcomingEvents = async (req, res) => {
  try {
    const upcomingEvents = [];

    // Get upcoming task deadlines
    const upcomingTasks = await Task.find({
      status: { $nin: ['Completed', 'Cancelled'] },
      dueDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    })
      .populate('assignedTo', 'personalInfo.firstName personalInfo.lastName workInfo.department')
      .sort({ dueDate: 1 })
      .limit(5);

    upcomingTasks.forEach(task => {
      upcomingEvents.push({
        id: task._id,
        title: `Task Deadline: ${task.title}`,
        date: task.dueDate,
        time: new Date(task.dueDate).toLocaleTimeString(),
        department: task.assignedTo?.workInfo?.department || 'General',
        type: 'task',
        priority: task.priority
      });
    });

    // Get upcoming leave periods
    const upcomingLeaves = await Leave.find({
      status: 'Approved',
      startDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
      }
    })
      .populate('employee', 'personalInfo.firstName personalInfo.lastName workInfo.department')
      .sort({ startDate: 1 })
      .limit(5);

    upcomingLeaves.forEach(leave => {
      upcomingEvents.push({
        id: leave._id,
        title: `${leave.employee?.fullName} on ${leave.leaveType} leave`,
        date: leave.startDate,
        time: 'All Day',
        department: leave.employee?.workInfo?.department || 'General',
        type: 'leave',
        duration: leave.duration
      });
    });

    // Sort events by date
    upcomingEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      events: upcomingEvents.slice(0, 6)
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming events'
    });
  }
};

// @desc    Get dashboard summary for both admin and employee
// @route   GET /api/dashboard/summary
// @access  Private
export const getDashboardSummary = async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return getAdminStats(req, res);
    } else {
      return getEmployeeStats(req, res);
    }
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard summary'
    });
  }
};
// Add these endpoints to your existing controllers/dashboardController.js

// @desc    Get user-specific notifications
// @route   GET /api/dashboard/notifications
// @access  Private
export const getUserNotifications = async (req, res) => {
  try {
    const notifications = [];
    
    if (req.user.role === 'admin') {
      // Admin notifications - recent system activities
      
      // Recent employee additions (last 7 days)
      const recentEmployees = await Employee.find({
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5);

      recentEmployees.forEach(emp => {
        notifications.push({
          id: `employee-${emp._id}`,
          message: `New employee ${emp.fullName} has been added to the system`,
          user: emp.fullName,
          time: emp.createdAt,
          type: 'success',
          category: 'employee',
          unread: true
        });
      });

      // Recent leave applications (last 3 days)
      const recentLeaves = await Leave.find({
        appliedDate: { $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      })
        .populate('employee', 'personalInfo.firstName personalInfo.lastName')
        .populate('user', 'name')
        .sort({ appliedDate: -1 })
        .limit(10);

      recentLeaves.forEach(leave => {
        const employeeName = leave.employee?.fullName || leave.user?.name;
        notifications.push({
          id: `leave-${leave._id}`,
          message: `${employeeName} has applied for ${leave.leaveType.toLowerCase()} leave`,
          user: employeeName,
          time: leave.appliedDate,
          type: leave.status === 'Pending' ? 'warning' : 'info',
          category: 'leave',
          unread: true
        });
      });

      // Pending approvals
      const pendingLeaves = await Leave.countDocuments({ status: 'Pending' });
      if (pendingLeaves > 0) {
        notifications.push({
          id: 'pending-leave-approvals',
          message: `You have ${pendingLeaves} pending leave applications to review`,
          time: new Date().toISOString(),
          type: 'warning',
          category: 'leave',
          unread: true
        });
      }

      // Low attendance alerts
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      // This would require an Attendance model - simplified for now
      const lowAttendanceEmployees = await Employee.aggregate([
        {
          $lookup: {
            from: 'attendances',
            localField: '_id',
            foreignField: 'employee',
            as: 'attendanceRecords'
          }
        },
        {
          $addFields: {
            monthlyAttendance: {
              $size: {
                $filter: {
                  input: '$attendanceRecords',
                  cond: {
                    $and: [
                      { $gte: ['$$this.date', startOfMonth] },
                      { $eq: ['$$this.status', 'Present'] }
                    ]
                  }
                }
              }
            }
          }
        },
        { $match: { monthlyAttendance: { $lt: 15 } } }, // Less than 15 days present
        { $limit: 5 }
      ]);

      lowAttendanceEmployees.forEach(emp => {
        const empName = emp.personalInfo ? `${emp.personalInfo.firstName} ${emp.personalInfo.lastName}`.trim() : 'Employee';
        notifications.push({
          id: `low-attendance-${emp._id}`,
          message: `${empName} has low attendance this month (${emp.monthlyAttendance} days)`,
          user: empName,
          time: new Date().toISOString(),
          type: 'error',
          category: 'attendance',
          unread: true
        });
      });

    } else {
      // Employee notifications - personal activities and tasks
      const employee = await Employee.findOne({ user: req.user.id });
      
      if (employee) {
        // Task-related notifications
        const myTasks = await Task.find({ assignedTo: employee._id });
        const pendingTasks = myTasks.filter(t => ['Not Started', 'In Progress'].includes(t.status));
        const overdueTasks = myTasks.filter(t => 
          !['Completed', 'Cancelled'].includes(t.status) && 
          new Date(t.dueDate) < new Date()
        );

        if (pendingTasks.length > 0) {
          notifications.push({
            id: 'my-pending-tasks',
            message: `You have ${pendingTasks.length} pending task${pendingTasks.length > 1 ? 's' : ''} to complete`,
            time: new Date().toISOString(),
            type: 'warning',
            category: 'tasks',
            unread: true
          });
        }

        if (overdueTasks.length > 0) {
          notifications.push({
            id: 'my-overdue-tasks',
            message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
            time: new Date().toISOString(),
            type: 'error',
            category: 'tasks',
            unread: true
          });

          // Individual overdue task notifications
          overdueTasks.slice(0, 3).forEach(task => {
            notifications.push({
              id: `overdue-task-${task._id}`,
              message: `Task "${task.title}" was due on ${new Date(task.dueDate).toLocaleDateString()}`,
              time: task.dueDate,
              type: 'error',
              category: 'task',
              unread: true
            });
          });
        }

        // Leave-related notifications
        const myLeaves = await Leave.find({ employee: employee._id });
        const pendingLeaves = myLeaves.filter(l => l.status === 'Pending');
        const approvedUpcomingLeaves = myLeaves.filter(l => 
          l.status === 'Approved' && 
          new Date(l.startDate) > new Date() &&
          new Date(l.startDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        );

        if (pendingLeaves.length > 0) {
          notifications.push({
            id: 'my-pending-leaves',
            message: `You have ${pendingLeaves.length} pending leave request${pendingLeaves.length > 1 ? 's' : ''}`,
            time: new Date().toISOString(),
            type: 'info',
            category: 'leaves',
            unread: true
          });
        }

        approvedUpcomingLeaves.forEach(leave => {
          notifications.push({
            id: `upcoming-leave-${leave._id}`,
            message: `Your ${leave.leaveType.toLowerCase()} leave starts on ${new Date(leave.startDate).toLocaleDateString()}`,
            time: leave.startDate,
            type: 'success',
            category: 'leave',
            unread: true
          });
        });

        // Recently completed tasks (achievements)
        const recentCompletions = await Task.find({
          assignedTo: employee._id,
          status: 'Completed',
          completedDate: { 
            $gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
          }
        }).sort({ completedDate: -1 }).limit(5);

        recentCompletions.forEach(task => {
          notifications.push({
            id: `completed-task-${task._id}`,
            message: `You completed "${task.title}"`,
            time: task.completedDate,
            type: 'success',
            category: 'task',
            unread: true
          });
        });

        // Profile completion reminder (if incomplete)
        const profileCompletion = calculateProfileCompletion(employee);
        if (profileCompletion < 80) {
          notifications.push({
            id: 'profile-incomplete',
            message: `Your profile is ${profileCompletion}% complete. Please update your information.`,
            time: new Date().toISOString(),
            type: 'warning',
            category: 'profile',
            unread: true
          });
        }

        // Face registration reminder (if not registered)
        if (!employee.hasFaceRegistered) {
          notifications.push({
            id: 'face-registration-pending',
            message: 'Complete your face registration for biometric attendance',
            time: new Date().toISOString(),
            type: 'info',
            category: 'profile',
            unread: true
          });
        }
      }
    }

    // Sort notifications by time (most recent first)
    notifications.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      data: notifications.slice(0, 20), // Limit to 20 most recent notifications
      unreadCount: notifications.filter(n => n.unread).length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching notifications'
    });
  }
};

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (employee) => {
  const fields = [
    employee.personalInfo?.firstName,
    employee.personalInfo?.lastName,
    employee.personalInfo?.dateOfBirth,
    employee.personalInfo?.gender,
    employee.contactInfo?.phone,
    employee.contactInfo?.personalEmail,
    employee.contactInfo?.address?.city,
    employee.workInfo?.position,
    employee.workInfo?.department,
    employee.bankInfo?.accountNumber,
    employee.bankInfo?.bankName
  ];
  
  const completedFields = fields.filter(field => field && field.trim() !== '').length;
  return Math.round((completedFields / fields.length) * 100);
};

// @desc    Mark notification as read
// @route   PUT /api/dashboard/notifications/:id/read
// @access  Private
export const markNotificationAsRead = async (req, res) => {
  try {
    // In a real implementation, you'd store notification read status in database
    // For now, we'll just return success
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read'
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/dashboard/notifications/read-all
// @access  Private
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    // In a real implementation, you'd update all unread notifications for the user
    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notifications as read'
    });
  }
};