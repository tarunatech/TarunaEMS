import { validationResult } from 'express-validator';
import crypto from 'crypto';
import User from '../models/User.js';
import Employee from '../models/Employee.js';
import { sendEmail } from '../utils/email.js';
import { uploadPublicPath } from '../config/uploadPaths.js';

// Helper function to determine if input is employee ID
const isEmployeeId = (value) => {
  return !value.includes('@') && /^[A-Z0-9_-]+$/i.test(value);
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// Add this updated login function to your existing authController.js

const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;
    const identifier = email.trim();
    let user;

    // Check if identifier is an email or employee ID
    const isEmail = identifier.includes('@');

    if (isEmail) {
      // Email-based login
      console.log('Email login attempt:', identifier);
      user = await User.findOne({
        email: identifier.toLowerCase(),
        isActive: true
      }).select('+password');
    } else {
      // Employee ID-based login
      console.log('Employee ID login attempt:', identifier);
      user = await User.findOne({
        employeeId: identifier.toUpperCase(),
        isActive: true
      }).select('+password');
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: isEmail ? 'Invalid email or password' : 'Invalid Employee ID or password'
      });
    }

    // Check user role and handle accordingly
    if (user.role === 'admin') {
      // Admin login - verify password normally
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        await user.handleFailedLogin();
        return res.status(401).json({
          success: false,
          message: 'Invalid admin email or password'
        });
      }
    } else if (user.role === 'employee') {
      // Employees can keep using Employee ID as the default password, or use a reset password.
      const isStoredPasswordMatch = await user.matchPassword(password);
      const isEmployeeIdPassword = user.employeeId && password.toUpperCase() === user.employeeId;

      if (!isStoredPasswordMatch && !isEmployeeIdPassword) {
        await user.handleFailedLogin();
        return res.status(401).json({
          success: false,
          message: 'Invalid email, Employee ID, or password.'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid user role'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(401).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Reset login attempts on successful login
    if (user.loginAttempts > 0) {
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Generate JWT token
    const token = user.getSignedJwtToken();

    // Update last login
    await user.updateLastLogin();

    // Get employee details if user is an employee
    let employeeDetails = null;
    let departmentInfo = null;

    if (user.role === 'employee') {
      employeeDetails = await Employee.findOne({ user: user._id })
        .select('employeeId workInfo')
        .populate('workInfo.department', 'name code');

      if (employeeDetails && employeeDetails.workInfo?.department) {
        departmentInfo = {
          id: employeeDetails.workInfo.department._id,
          name: employeeDetails.workInfo.department.name,
          code: employeeDetails.workInfo.department.code
        };
      }
    }

    console.log('Login successful for user:', user.email, 'Role:', user.role, 'Department:', departmentInfo?.name);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId || employeeDetails?.employeeId,
        profileImage: user.profileImage,
        isActive: user.isActive,
        department: departmentInfo // Include department information
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// @desc    Get current user profile with enhanced data (UPDATED FOR NOTIFICATIONS)
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    // Get user data
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let userData = {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      employeeId: user.employeeId,
      profileImage: user.profileImage,
      isActive: user.isActive,
      lastLogin: user.lastLogin
    };

    // If user is an employee, get additional employee data
    if (user.role === 'employee') {
      const employee = await Employee.findOne({ user: user._id })
        .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName')
        .populate('workInfo.department', 'name code description');

      if (employee) {
        // Calculate years of service
        let yearsOfService = 0;
        if (employee.workInfo?.joiningDate) {
          const joiningDate = new Date(employee.workInfo.joiningDate);
          const currentDate = new Date();
          yearsOfService = Math.floor((currentDate - joiningDate) / (365.25 * 24 * 60 * 60 * 1000));
        }

        userData = {
          ...userData,
          // Personal Information
          personalInfo: employee.personalInfo,

          // Contact Information
          contactInfo: employee.contactInfo,

          // Work Information
          workInfo: employee.workInfo,

          // Salary Information
          salaryInfo: employee.salaryInfo,

          // Leave Balance
          leaveBalance: employee.leaveBalance,

          // Additional employee fields
          employeeId: employee.employeeId || user.employeeId,
          fullName: employee.fullName,
          status: employee.status,
          hasFaceRegistered: employee.hasFaceRegistered,
          joiningDate: employee.workInfo?.joiningDate,
          yearsOfService: yearsOfService,

          // Profile completion percentage
          profileCompletion: calculateProfileCompletion(employee),

          // Quick stats (for dashboard and notifications)
          quickStats: await getEmployeeQuickStats(employee._id)
        };
      }
    } else if (user.role === 'admin') {
      // For admin users, add admin-specific data
      userData.adminStats = await getAdminQuickStats();
    }

    res.json({
      success: true,
      data: userData
    });

  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
};

// @desc    Get current user's employee profile (for employees) - KEEP YOUR EXISTING FUNCTION
// @route   GET /api/auth/profile  
// @access  Private (Employee)
const getMyProfile = async (req, res) => {
  try {
    // Find the employee record for the current user
    const employee = await Employee.findOne({ user: req.user.id })
      .populate('user', 'name email role employeeId isActive profileImage')
      .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName')
      .populate('workInfo.department', 'name code description');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found'
      });
    }

    // Calculate years of service
    let yearsOfService = 0;
    if (employee.workInfo?.joiningDate) {
      const joiningDate = new Date(employee.workInfo.joiningDate);
      const currentDate = new Date();
      yearsOfService = Math.floor((currentDate - joiningDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Ensure leave balance exists
    if (!employee.leaveBalance) {
      employee.leaveBalance = {
        total: 30,
        used: 0,
        remaining: 30
      };
      await employee.save();
    }

    // Calculate gross salary (basic + allowances, simple calculation)
    let grossSalary = employee.salaryInfo?.basicSalary || 60000;
    if (employee.salaryInfo?.allowances) {
      Object.values(employee.salaryInfo.allowances).forEach(allowance => {
        if (typeof allowance === 'number') {
          grossSalary += allowance;
        }
      });
    }

    // Prepare response data in the format expected by the dashboard
    const responseData = {
      _id: employee._id,
      employeeId: employee.employeeId,
      fullName: employee.fullName,
      personalInfo: employee.personalInfo,
      contactInfo: employee.contactInfo,
      workInfo: employee.workInfo,
      salaryInfo: employee.salaryInfo,
      leaveBalance: employee.leaveBalance,
      user: employee.user,
      yearsOfService: yearsOfService,
      grossSalary: grossSalary,
      status: employee.status,
      hasFaceRegistered: employee.hasFaceRegistered,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt
    };

    res.status(200).json({
      success: true,
      data: responseData,
      message: 'Employee profile retrieved successfully'
    });

  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee profile'
    });
  }
};

// Helper function to calculate profile completion percentage
const calculateProfileCompletion = (employee) => {
  const requiredFields = [
    employee.personalInfo?.firstName,
    employee.personalInfo?.lastName,
    employee.personalInfo?.dateOfBirth,
    employee.personalInfo?.gender,
    employee.contactInfo?.phone,
    employee.contactInfo?.personalEmail,
    employee.contactInfo?.address?.street,
    employee.contactInfo?.address?.city,
    employee.contactInfo?.address?.state,
    employee.contactInfo?.address?.pincode,
    employee.contactInfo?.emergencyContact?.name,
    employee.contactInfo?.emergencyContact?.phone,
    employee.workInfo?.position,
    employee.workInfo?.department,
    employee.bankInfo?.accountNumber,
    employee.bankInfo?.bankName,
    employee.bankInfo?.ifscCode
  ];

  const completedFields = requiredFields.filter(field =>
    field && field.toString().trim() !== ''
  ).length;

  return Math.round((completedFields / requiredFields.length) * 100);
};

// Helper function to get employee quick stats
const getEmployeeQuickStats = async (employeeId) => {
  try {
    // Import Task and Leave models (adjust paths as needed)
    let Task, Leave;
    try {
      Task = (await import('../models/Task.js')).default;
      Leave = (await import('../models/Leave.js')).default;
    } catch (importError) {
      console.log('Task/Leave models not available:', importError.message);
      return {
        tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
        leaves: {
          casual: { used: 0, remaining: 12 },
          sick: { used: 0, remaining: 7 },
          earned: { used: 0, remaining: 15 }
        }
      };
    }

    const [taskStats, leaveStats] = await Promise.all([
      // Task statistics
      Task.aggregate([
        { $match: { assignedTo: employeeId } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Leave statistics for current year
      Leave.aggregate([
        {
          $match: {
            employee: employeeId,
            status: 'Approved',
            startDate: {
              $gte: new Date(new Date().getFullYear(), 0, 1),
              $lte: new Date(new Date().getFullYear(), 11, 31)
            }
          }
        },
        {
          $group: {
            _id: '$leaveType',
            totalDays: { $sum: '$totalDays' }
          }
        }
      ])
    ]);

    // Process task stats
    const tasks = {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0
    };

    taskStats.forEach(stat => {
      tasks.total += stat.count;
      if (stat._id === 'Completed') tasks.completed = stat.count;
      if (['Not Started', 'In Progress'].includes(stat._id)) tasks.pending += stat.count;
    });

    // Get overdue tasks count
    const overdueTasks = await Task.countDocuments({
      assignedTo: employeeId,
      status: { $nin: ['Completed', 'Cancelled'] },
      dueDate: { $lt: new Date() }
    });
    tasks.overdue = overdueTasks;

    // Process leave stats
    const leaves = {
      casual: { used: 0, remaining: 12 },
      sick: { used: 0, remaining: 7 },
      earned: { used: 0, remaining: 15 }
    };

    leaveStats.forEach(stat => {
      const leaveType = stat._id.toLowerCase();
      if (leaves[leaveType]) {
        leaves[leaveType].used = stat.totalDays;
        leaves[leaveType].remaining = Math.max(0, leaves[leaveType].remaining - stat.totalDays);
      }
    });

    return {
      tasks,
      leaves
    };

  } catch (error) {
    console.error('Error getting employee quick stats:', error);
    return {
      tasks: { total: 0, completed: 0, pending: 0, overdue: 0 },
      leaves: {
        casual: { used: 0, remaining: 12 },
        sick: { used: 0, remaining: 7 },
        earned: { used: 0, remaining: 15 }
      }
    };
  }
};

// Helper function to get admin quick stats
const getAdminQuickStats = async () => {
  try {
    let Leave;
    try {
      Leave = (await import('../models/Leave.js')).default;
    } catch (importError) {
      console.log('Leave model not available:', importError.message);
      Leave = null;
    }

    const [employeeCount, pendingLeaves, recentEmployees] = await Promise.all([
      Employee.countDocuments({ status: { $ne: 'Terminated' } }),
      Leave ? Leave.countDocuments({ status: 'Pending' }) : 0,
      Employee.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      })
    ]);

    return {
      totalEmployees: employeeCount,
      pendingLeaves,
      recentEmployees
    };
  } catch (error) {
    console.error('Error getting admin quick stats:', error);
    return {
      totalEmployees: 0,
      pendingLeaves: 0,
      recentEmployees: 0
    };
  }
};

// Keep all your existing functions unchanged
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, email, password, role = 'employee', employeeId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        ...(employeeId ? [{ employeeId: employeeId.toUpperCase() }] : [])
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email.toLowerCase()
          ? 'User already exists with this email'
          : 'Employee ID already exists'
      });
    }

    // For employees, generate employeeId if not provided
    let finalEmployeeId = employeeId;
    if (role === 'employee' && !finalEmployeeId) {
      // Generate a simple employee ID (you can customize this logic)
      const empCount = await User.countDocuments({ role: 'employee' });
      finalEmployeeId = `EMP${(empCount + 1).toString().padStart(4, '0')}`;
    }

    // Create user
    const userData = {
      name,
      email: email.toLowerCase(),
      password,
      role
    };

    if (role === 'employee' && finalEmployeeId) {
      userData.employeeId = finalEmployeeId.toUpperCase();
    }

    const user = await User.create(userData);

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    let user;

    // Check if identifier is email or employee ID
    if (isEmployeeId(email)) {
      // Employee ID provided
      user = await User.findOne({
        employeeId: email.toUpperCase(),
        role: 'employee',
        isActive: true
      });
    } else if (email.includes('@')) {
      // Email provided
      user = await User.findOne({
        email: email.toLowerCase(),
        isActive: true
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address or Employee ID'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email address or Employee ID'
      });
    }

    // Generate reset token for any active user.
    const resetToken = user.getResetPasswordToken();
    await user.save();

    // Create reset URL
    const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5000').replace(/\/$/, '');
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    // Email message for admin
    const message = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You have requested to reset your password. Click the link below to reset your password:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 25px; background: linear-gradient(45deg, #ff0080, #8b5cf6); color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 10px; border-radius: 5px; border: 1px solid #ffeaa7;">
            <p style="margin: 0; color: #856404;"><strong>Important:</strong> This link will expire in 10 minutes. If you did not request this, please ignore this email.</p>
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">Best regards,<br>Employee Management System</p>
      </div>
    `;

    try {
      const emailResult = await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - Employee Management System',
        html: message
      });

      if (!emailResult?.success) {
        throw new Error(emailResult?.error || emailResult?.message || 'Email could not be sent');
      }

      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully'
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);

      // Reset the token fields
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
      isActive: true
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // Generate JWT token
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
};

// Keep all your other existing functions (getProfile, updateProfile, changePassword, logout, deleteAccount, getAllUsers, updateUserStatus, initializeAdmin)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get employee details if user is an employee
    let employeeDetails = null;
    if (user.role === 'employee') {
      employeeDetails = await Employee.findOne({ user: user._id })
        .populate('workInfo.department', 'name code')
        .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName');
    }

    res.status(200).json({
      success: true,
      data: {
        user,
        employee: employeeDetails
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, phone, profileImage, personalInfo, contactInfo, bankInfo } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(profileImage && { profileImage })
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let employee = null;
    if (user.role === 'employee') {
      employee = await Employee.findOne({ user: req.user.id }).lean();

      if (employee) {
        const employeeUpdate = {};

        if (personalInfo && typeof personalInfo === 'object') {
          const allowedPersonalInfo = [
            'firstName',
            'lastName',
            'dateOfBirth',
            'gender',
            'bloodGroup',
            'nationality'
          ];
          employeeUpdate.personalInfo = Object.fromEntries(
            allowedPersonalInfo
              .filter((key) => personalInfo[key] !== undefined)
              .map((key) => [key, personalInfo[key]])
          );
        }

        if (contactInfo && typeof contactInfo === 'object') {
          const nextContactInfo = {};
          ['phone', 'personalEmail', 'alternatePhone'].forEach((key) => {
            if (contactInfo[key] !== undefined) nextContactInfo[key] = contactInfo[key];
          });

          if (contactInfo.address && typeof contactInfo.address === 'object') {
            nextContactInfo.address = {};
            ['street', 'city', 'state', 'pincode', 'country'].forEach((key) => {
              if (contactInfo.address[key] !== undefined) nextContactInfo.address[key] = contactInfo.address[key];
            });
          }

          if (contactInfo.emergencyContact && typeof contactInfo.emergencyContact === 'object') {
            nextContactInfo.emergencyContact = {};
            ['name', 'relationship', 'phone'].forEach((key) => {
              if (contactInfo.emergencyContact[key] !== undefined) {
                nextContactInfo.emergencyContact[key] = contactInfo.emergencyContact[key];
              }
            });
          }

          employeeUpdate.contactInfo = nextContactInfo;
        }

        if (bankInfo && typeof bankInfo === 'object') {
          const allowedBankInfo = [
            'accountHolderName',
            'bankName',
            'accountNumber',
            'ifscCode',
            'branchName',
            'accountType'
          ];
          employeeUpdate.bankInfo = Object.fromEntries(
            allowedBankInfo
              .filter((key) => bankInfo[key] !== undefined)
              .map((key) => [key, bankInfo[key]])
          );
        }

        if (Object.keys(employeeUpdate).length > 0) {
          employee = await Employee.findByIdAndUpdate(employee._id, employeeUpdate)
            .populate('workInfo.department', 'name code')
            .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName');
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user,
        employee
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const changePassword = async (req, res) => {
  try {
    // Only allow admins to change password
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can change passwords. Employees use Employee ID as password.'
      });
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If employee, also delete employee record
    if (user.role === 'employee') {
      await Employee.findOneAndDelete({ user: user._id });
    }

    // Delete user
    await User.findByIdAndDelete(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { page = 1, limit = 10, role, status } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { isActive } = req.body;
    const userId = req.params.id;

    // Prevent admin from deactivating themselves
    if (userId === req.user.id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own status'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: user
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

const initializeAdmin = async (req, res) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });

    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Create default admin
    const admin = await User.create({
      name: 'Administrator',
      email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
      password: process.env.ADMIN_PASSWORD || 'admin',
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Default admin user created successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Initialize admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating admin user'
    });
  }
};

// @desc    Unlock a locked user account (Admin only)
// @route   PUT /api/auth/users/:id/unlock
// @access  Private (Admin)
const unlockAccount = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const userId = req.params.id;

    // Find the user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if account is actually locked
    if (!user.isLocked) {
      return res.status(400).json({
        success: false,
        message: 'Account is not locked'
      });
    }

    // Unlock the account
    await user.unlockAccount();

    res.status(200).json({
      success: true,
      message: 'Account unlocked successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isLocked: user.isLocked
      }
    });

  } catch (error) {
    console.error('Unlock account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unlocking account'
    });
  }
};

const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image'
      });
    }

    const imagePath = uploadPublicPath('profile-pics', req.file.filename);

    // Update user model
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: imagePath },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: {
        profileImage: imagePath
      }
    });

  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile image'
    });
  }
};

export {
  login,
  register,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  changePassword,
  logout,
  deleteAccount,
  getAllUsers,
  updateUserStatus,
  initializeAdmin,
  unlockAccount,
  updateProfileImage,
  getMyProfile, // Keep your existing function
  getMe        // Add the new enhanced function
};
