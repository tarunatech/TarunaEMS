// controllers/leaveController.js
import { validationResult } from 'express-validator';
import Leave from '../models/Leave.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/email.js';

// @desc    Apply for leave
// @route   POST /api/leaves
// @access  Private (Employee)
export const applyLeave = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee record not found' });
    }

    // Initialize leave balance if not exists
    if (!employee.leaveBalance) {
      employee.leaveBalance = {
        total: 30,
        used: 0,
        remaining: 30
      };
      await employee.save();
    }

    const { leaveType, startDate, endDate, reason, isHalfDay, halfDaySession } = req.body;

    // Validate dates
    if (!startDate || (!isHalfDay && !endDate)) {
      return res.status(400).json({ success: false, message: 'Start and end dates are required' });
    }

    const start = new Date(startDate);
    const end = isHalfDay ? start : new Date(endDate);
    if (start > end) {
      return res.status(400).json({ success: false, message: 'End date cannot be before start date' });
    }

    // Check for leave conflicts
    const conflicts = await Leave.checkConflicts(employee._id, start, end);
    if (conflicts.length > 0) {
      return res.status(400).json({ success: false, message: 'Leave request conflicts with existing leave' });
    }

    // Calculate total days
    let totalDays = isHalfDay ? 0.5 : Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // Check available balance (simple total balance)
    const availableBalance = employee.leaveBalance.remaining || 0;

    if (totalDays > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${availableBalance} days`
      });
    }

    // Deduct from total leave balance
    employee.leaveBalance.used += totalDays;
    employee.leaveBalance.remaining -= totalDays;
    await employee.save();

    // Create leave
    const leave = await Leave.create({
      employee: employee._id,
      user: req.user.id,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      isHalfDay,
      halfDaySession: isHalfDay ? halfDaySession : undefined
    });

    // Send notification email to admins
    try {
      const adminUsers = await User.find({ role: 'admin', isActive: true });

      console.log(`Found ${adminUsers.length} active admin users for leave notification`);

      if (adminUsers.length === 0) {
        console.warn('⚠️ No active admin users found for leave notification');
        console.log('Leave application saved successfully but no admin notifications sent');
      } else {
        for (const admin of adminUsers) {
          console.log(`📧 Sending leave notification to admin: ${admin.email}`);

          const emailMessage = `
            <h2>New Leave Application</h2>
            <p>A new leave application has been submitted:</p>
            <ul>
              <li><strong>Employee:</strong> ${employee.personalInfo?.firstName} ${employee.personalInfo?.lastName}</li>
              <li><strong>Employee ID:</strong> ${employee.employeeId}</li>
              <li><strong>Leave Type:</strong> ${leaveType}</li>
              <li><strong>Duration:</strong> ${totalDays} days</li>
              <li><strong>Start Date:</strong> ${start.toLocaleDateString()}</li>
              <li><strong>End Date:</strong> ${end.toLocaleDateString()}</li>
              <li><strong>Reason:</strong> ${reason}</li>
            </ul>
            <p>Please review and take appropriate action.</p>
          `;

          const emailResult = await sendEmail({
            to: admin.email,
            subject: 'New Leave Application - Action Required',
            html: emailMessage
          });

          if (emailResult.success) {
            console.log(`✅ Leave notification sent to ${admin.email}: ${emailResult.messageId}`);
          } else {
            console.error(`❌ Failed to send leave notification to ${admin.email}: ${emailResult.error}`);
          }
        }
      }
    } catch (emailError) {
      console.error('❌ Error sending leave notification email:', emailError);
      console.log('⚠️ Leave application saved successfully but email notification failed');
      // Don't fail the entire request if email fails
    }

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully',
      leave
    });

  } catch (error) {
    console.error('Apply leave error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get leave statistics (for admin dashboard)
// @route   GET /api/leaves/stats
// @access  Private (Admin)
export const getLeaveStats = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (employee) query.employee = employee._id;
    }

    const total = await Leave.countDocuments(query);
    const approved = await Leave.countDocuments({ ...query, status: 'Approved' });
    const pending = await Leave.countDocuments({ ...query, status: 'Pending' });
    const rejected = await Leave.countDocuments({ ...query, status: 'Rejected' });
    const cancelled = await Leave.countDocuments({ ...query, status: 'Cancelled' });

    res.json({ success: true, stats: { total, approved, pending, rejected, cancelled } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get leave balance
// @route   GET /api/leaves/balance
// @access  Private (Employee)
export const getLeaveBalance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    // Initialize leave balance if not exists
    if (!employee.leaveBalance) {
      employee.leaveBalance = {
        total: 30,
        used: 0,
        remaining: 30
      };
      await employee.save();
    }

    // Return simple balance structure
    res.json({ 
      success: true, 
      balance: {
        total: employee.leaveBalance.total,
        used: employee.leaveBalance.used,
        remaining: employee.leaveBalance.remaining
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Get leave applications
// @route   GET /api/leaves
// @access  Private
export const getLeaves = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      status, 
      leaveType, 
      employeeId,
      startDate,
      endDate
    } = req.query;

    let query = {};

    // Build query based on user role
    if (req.user.role === 'employee') {
      // Employees can only see their own leaves
      const employee = await Employee.findOne({ user: req.user.id });
      if (employee) {
        query.employee = employee._id;
      }
    } else if (employeeId) {
      // Admin can filter by specific employee
      query.employee = employeeId;
    }

    // Apply filters
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    
    if (startDate && endDate) {
      query.startDate = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const leaves = await Leave.find(query)
      .populate([
        {
          path: 'employee',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'user',
          select: 'name email'
        },
        {
          path: 'actionBy',
          select: 'name email'
        }
      ])
      .sort({ appliedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Leave.countDocuments(query);

    res.json({
      success: true,
      leaves,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalLeaves: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get leave by ID
// @route   GET /api/leaves/:id
// @access  Private
export const getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate([
        {
          path: 'employee',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'user',
          select: 'name email'
        },
        {
          path: 'actionBy',
          select: 'name email'
        }
      ]);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    // Check permissions - employees can only view their own leaves
    if (req.user.role === 'employee') {
      if (leave.user._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      leave
    });

  } catch (error) {
    console.error('Get leave by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel leave
// @route   PUT /api/leaves/:id/cancel
// @access  Private (Employee)
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave not found' });
    }

    if (leave.user.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Only pending leaves can be cancelled' });
    }

    leave.status = 'Cancelled';
    leave.actionBy = req.user.id;
    leave.actionDate = new Date();
    await leave.save();

    res.json({ success: true, message: 'Leave cancelled successfully', leave });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Approve leave
// @route   PUT /api/leaves/:id/approve
// @access  Private (Admin)
// @desc    Approve leave
// @route   PUT /api/leaves/:id/approve
// @access  Private (Admin)
export const approveLeave = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { comments = '' } = req.body;

    const leave = await Leave.findById(req.params.id).populate([
      {
        path: 'employee',
        populate: { path: 'user', select: 'name email employeeId' }
      },
      { path: 'user', select: 'name email' }
    ]);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    if (leave.status.toLowerCase() !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve a leave that is already ${leave.status}`
      });
    }

    // Update leave status
    leave.status = 'Approved';
    leave.actionBy = req.user.id;
    leave.approverComments = comments; // Use approverComments as per model
    leave.actionDate = new Date();

    await leave.save();

    // Send notification email to employee
    try {
      const emailMessage = `
        <h2>Leave Approved</h2>
        <p>Your leave application has been approved:</p>
        <ul>
          <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
          <li><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</li>
          <li><strong>Total Days:</strong> ${leave.totalDays}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
        </ul>
      `;
      
      await sendEmail({
        to: leave.user.email,
        subject: 'Leave Approved',
        html: emailMessage
      });
    } catch (err) {
      console.error('Error sending approval email:', err);
      // Don't fail the approval if email fails
    }

    res.json({
      success: true,
      message: 'Leave approved successfully',
      leave
    });

  } catch (error) {
    console.error('Approve leave error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Reject leave (updated to restore simple balance)
// @route   PUT /api/leaves/:id/reject
// @access  Private (Admin)
export const rejectLeave = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { comments = '' } = req.body;

    const leave = await Leave.findById(req.params.id).populate([
      {
        path: 'employee',
        populate: { path: 'user', select: 'name email employeeId' }
      },
      { path: 'user', select: 'name email' }
    ]);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave application not found'
      });
    }

    if (leave.status.toLowerCase() !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject a leave that is already ${leave.status}`
      });
    }

    // Restore simple leave balance when rejecting
    const employee = await Employee.findById(leave.employee._id);
    if (employee) {
      employee.leaveBalance.used -= leave.totalDays;
      employee.leaveBalance.remaining += leave.totalDays;
      await employee.save();
    }

    // Update leave status
    leave.status = 'Rejected';
    leave.actionBy = req.user.id;
    leave.approverComments = comments;
    leave.actionDate = new Date();

    await leave.save();

    // Send notification email
    try {
      const emailMessage = `
        <h2>Leave Rejected</h2>
        <p>Your leave application has been rejected:</p>
        <ul>
          <li><strong>Leave Type:</strong> ${leave.leaveType}</li>
          <li><strong>Start Date:</strong> ${new Date(leave.startDate).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(leave.endDate).toLocaleDateString()}</li>
          <li><strong>Total Days:</strong> ${leave.totalDays}</li>
          ${comments ? `<li><strong>Comments:</strong> ${comments}</li>` : ''}
        </ul>
      `;
      
      await sendEmail({
        to: leave.user.email,
        subject: 'Leave Rejected',
        html: emailMessage
      });
    } catch (err) {
      console.error('Error sending rejection email:', err);
    }

    res.json({
      success: true,
      message: 'Leave rejected successfully',
      leave
    });

  } catch (error) {
    console.error('Reject leave error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};