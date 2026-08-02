import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Employee from "../models/Employee.js";

// Protect routes - verify JWT token
export const protect = async (req, res, next) => {
  let token;

  try {
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized, no token provided" 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized, user not found" 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: "Account is deactivated. Please contact administrator." 
      });
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    console.error('Auth middleware error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized, invalid token" 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized, token expired" 
      });
    } else {
      return res.status(401).json({ 
        success: false, 
        message: "Not authorized, token failed" 
      });
    }
  }
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  console.log('adminOnly middleware - User:', req.user?.email, 'Role:', req.user?.role);

  if (!req.user) {
    console.log('Access denied - no user found');
    return res.status(401).json({
      success: false,
      message: "Not authorized, user not found"
    });
  }

  if (req.user.role !== 'admin') {
    console.log('Access denied - user is not admin');
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required."
    });
  }

  console.log('Admin access granted');
  next();
};

// Employee or Admin middleware (for routes accessible to both)
export const employeeOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, user not found"
    });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'employee') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Employee or Admin privileges required."
    });
  }

  next();
};

// Employee only middleware - checks if user has associated employee record
export const employeeOnly = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, user not found"
    });
  }

  try {
    // Check if user has an associated employee record
    let employee = await Employee.findOne({ user: req.user.id });
    if (!employee) {
      // Create a basic employee record for authenticated users
      // Get default department
      const Department = (await import('../models/Department.js')).default;
      let defaultDepartment = await Department.findOne();
      if (!defaultDepartment) {
        defaultDepartment = new Department({
          name: 'General',
          code: 'GEN',
          description: 'Default department'
        });
        await defaultDepartment.save();
      }

      employee = new Employee({
        user: req.user.id,
        personalInfo: {
          firstName: req.user.name?.split(' ')[0] || 'Employee',
          lastName: req.user.name?.split(' ').slice(1).join(' ') || 'User',
          dateOfBirth: new Date('1990-01-01'),
          gender: 'Male'
        },
        contactInfo: {
          phone: '0000000000',
          personalEmail: req.user.email,
          emergencyContact: {
            name: 'Emergency Contact',
            relationship: 'Relative',
            phone: '0000000000'
          }
        },
        workInfo: {
          position: 'Employee',
          department: defaultDepartment._id,
          joiningDate: new Date()
        },
        salaryInfo: {
          basicSalary: 0
        },
        status: 'Active'
      });
      await employee.save();
      console.log(`Created new employee record for user ${req.user.id}`);
    }

    // Add employee to request object for convenience
    req.employee = employee;
    next();
  } catch (error) {
    console.error('Employee check error:', error);
    return res.status(500).json({
      success: false,
      message: "Server error during authorization check"
    });
  }
};

// Optional middleware to get user if token is provided (doesn't fail if no token)
export const optionalAuth = async (req, res, next) => {
  let token;

  try {
    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token, continue without user
    if (!token) {
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');

    if (user && user.isActive) {
      req.user = user;
    }

    next();

  } catch (error) {
    // If token is invalid, continue without user (don't throw error)
    console.log('Optional auth failed:', error.message);
    next();
  }
};