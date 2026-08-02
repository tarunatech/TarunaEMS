import mongoose from 'mongoose';
import User from '../models/User.js';
import FaceData from '../models/FaceData.js';
import Employee from '../models/Employee.js';
import { sendEmail } from '../utils/email.js';
import Department from '../models/Department.js';

// Create new employee
// Updated createEmployee controller to handle face registration
// Updated createEmployee function in employeeController.js
export const createEmployee = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const employeeData = req.body;

    // Validate required fields
    if (!employeeData.personalInfo?.firstName || !employeeData.personalInfo?.lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    if (!employeeData.contactInfo?.personalEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const email = employeeData.contactInfo.personalEmail.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Extract face data - FACE REGISTRATION IS NOW OPTIONAL
    const { faceDescriptor, faceImage, hasFaceRegistered, ...cleanEmployeeData } = employeeData;

    // Optional: Validate face descriptor if provided
    let validFaceDescriptor = null;
    let validFaceImage = null;
    let faceRegistered = false;

    if (faceDescriptor && Array.isArray(faceDescriptor)) {
      // face-api.js uses 128-dimensional descriptors (not 512 like InsightFace)
      if (faceDescriptor.length === 128 && faceDescriptor.every(val => typeof val === 'number' && !isNaN(val))) {
        validFaceDescriptor = faceDescriptor;
        validFaceImage = faceImage || null;
        faceRegistered = true;
        console.log('✅ Valid face descriptor received:', faceDescriptor.length, 'dimensions');
      } else if (faceDescriptor.length > 0) {
        console.warn('⚠️ Invalid face data provided, but continuing without face registration:', {
          length: faceDescriptor.length,
          isArray: Array.isArray(faceDescriptor)
        });
      }
    } else {
      console.log('ℹ️ No face data provided - face registration is optional');
    }

    // Create user account - this auto-generates employeeId
    const user = await User.create({
      name: `${employeeData.personalInfo.firstName} ${employeeData.personalInfo.lastName}`,
      email: email,
      password: 'temp123', // Temporary password
      role: 'employee'
    });

    // Create employee record with the employeeId from user
    const employee = await Employee.create({
      ...cleanEmployeeData,
      user: user._id,
      employeeId: user.employeeId, // Use the user's generated employeeId
      // Store face data directly in employee model
      faceDescriptor: validFaceDescriptor,
      faceImage: validFaceImage,
      hasFaceRegistered: faceRegistered
    });

    // Update user password to be the employee ID
    user.password = user.employeeId; // Employee ID is the password
    await user.save();

    // If valid face data was provided, create FaceData record
    if (validFaceDescriptor) {
      try {
        const faceData = new FaceData({
          employee: employee._id,
          user: user._id,
          faceDescriptor: validFaceDescriptor,
          landmarks: [],
          faceImageUrl: validFaceImage || null,
          confidence: 95,
          metadata: {
            captureDevice: req.headers['user-agent'] || 'Web Registration',
            captureEnvironment: 'Employee Creation',
            processingVersion: '1.0'
          }
        });

        await faceData.save();
        console.log('✅ Face data saved for employee:', employee.employeeId);
      } catch (faceError) {
        console.error('❌ Error saving face data:', faceError);
        // Don't fail employee creation if face data save fails
      }
    }

    // Populate user data
    await employee.populate('user', 'name email role employeeId isActive');

    // Send welcome email (existing code)
    try {
      const emailMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <div style="background: linear-gradient(135deg, #ff0080, #8b5cf6); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to CompanyName!</h1>
          </div>
          
          <div style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Hello <strong>${user.name}</strong>,
            </p>
            
            <p style="color: #555; line-height: 1.6; margin-bottom: 25px;">
              Your employee account has been created successfully${faceRegistered ? ' with biometric registration' : ''}. Welcome to the team!
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ff0080; margin: 25px 0;">
              <h3 style="margin-top: 0; color: #333; font-size: 18px;">Your Login Credentials:</h3>
              <div style="background-color: white; padding: 15px; border-radius: 6px; margin-top: 15px;">
                <p style="margin: 8px 0; color: #555;"><strong>Email:</strong> ${user.email}</p>
                <p style="margin: 8px 0; color: #555;"><strong>Employee ID:</strong> <span style="font-family: monospace; background-color: #e9ecef; padding: 3px 6px; border-radius: 3px;">${employee.employeeId}</span></p>
                <p style="margin: 8px 0; color: #555;"><strong>Password:</strong> <span style="font-family: monospace; background-color: #fff3cd; padding: 3px 6px; border-radius: 3px; border: 1px solid #ffeaa7;">${employee.employeeId}</span></p>
              </div>
            </div>
            
            ${faceRegistered ? `
            <div style="background-color: #d4edda; padding: 15px; border-radius: 6px; border: 1px solid #c3e6cb; margin: 25px 0;">
              <h4 style="margin: 0 0 10px 0; color: #155724;">🎉 Biometric Registration Complete!</h4>
              <p style="margin: 0; color: #155724;">Your face has been registered for secure attendance marking. You can now use face recognition for quick check-in/check-out.</p>
            </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/login" 
                 style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #ff0080, #8b5cf6); color: white; text-decoration: none; border-radius: 25px; font-weight: bold;">
                Login to Your Account
              </a>
            </div>
          </div>
        </div>
      `;

      await sendEmail({
        to: user.email,
        subject: `Welcome to CompanyName - Account Created${faceRegistered ? ' with Biometric Registration' : ''}`,
        html: emailMessage
      });

      console.log('✅ Welcome email sent to:', user.email);
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
    }

    res.status(201).json({
      success: true,
      message: `Employee created successfully${faceRegistered ? ' with face registration' : ''}! Welcome email sent.`,
      data: {
        employee,
        faceRegistered,
        loginCredentials: {
          email: user.email,
          employeeId: employee.employeeId,
          password: employee.employeeId
        }
      }
    });

  } catch (error) {
    console.error('❌ Create employee error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
// / Update the getEmployees function to populate department information
export const getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 50, department, status, search } = req.query;

    const query = {};
    if (department && department !== 'all') {
      // If department is provided, it could be either name or ObjectId
      // First try to find department by name to get ObjectId
      try {
        const deptDoc = await Department.findOne({ name: department });
        if (deptDoc) {
          query['workInfo.department'] = deptDoc._id;
        } else {
          // If not found by name, try as ObjectId
          if (mongoose.Types.ObjectId.isValid(department)) {
            query['workInfo.department'] = department;
          }
        }
      } catch (err) {
        console.error('Department filter error:', err);
      }
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    let employees = await Employee.find(query)
      .populate('user', 'name email role employeeId isActive profileImage')
      .populate('workInfo.department', 'name code') // Populate department with name and code
      .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Apply search filter after population
    if (search) {
      employees = employees.filter(emp => {
        const searchTerm = search.toLowerCase();
        const fullName = emp.fullName?.toLowerCase() || '';
        const email = emp.user?.email?.toLowerCase() || '';
        const position = emp.workInfo?.position?.toLowerCase() || '';
        const employeeId = emp.employeeId?.toLowerCase() || '';
        const departmentName = emp.workInfo?.department?.name?.toLowerCase() || '';

        return fullName.includes(searchTerm) ||
          email.includes(searchTerm) ||
          position.includes(searchTerm) ||
          employeeId.includes(searchTerm) ||
          departmentName.includes(searchTerm);
      });
    }

    const total = await Employee.countDocuments(query);

    res.json({
      success: true,
      data: {
        employees,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalEmployees: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    console.log('getEmployeeById called with params:', req.params);
    console.log('Request path:', req.path);
    console.log('Request originalUrl:', req.originalUrl);

    let employee;

    if (req.params.id === 'me') {
      employee = await Employee.findOne({ user: req.user.id })
        .populate('user', 'name email role employeeId isActive')
        .populate('workInfo.department', 'name code description') // Populate department
        .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found for current user'
        });
      }
    } else {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid employee ID format. Must be a valid ObjectId or "me".'
        });
      }

      employee = await Employee.findById(req.params.id)
        .populate('user', 'name email role employeeId isActive')
        .populate('workInfo.department', 'name code description') // Populate department
        .populate('workInfo.reportingManager', 'personalInfo.firstName personalInfo.lastName');

      if (!employee) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      if (req.user.role !== 'admin' && employee.user._id.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own employee record.'
        });
      }
    }

    res.json({
      success: true,
      data: employee
    });

  } catch (error) {
    console.error('Get employee by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching employee'
    });
  }
};


// Get employees by department
export const getEmployeesByDepartment = async (req, res) => {
  try {
    const employees = await Employee.getByDepartment(req.params.department);
    res.json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('Get employees by department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// Update the updateEmployee function to handle department updates
export const updateEmployee = async (req, res) => {
  try {
    const employeeId = req.params.id;
    let targetEmployeeId = employeeId;

    if (employeeId === 'me') {
      const currentEmployee = await Employee.findOne({ user: req.user.id });
      if (!currentEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found for current user'
        });
      }
      targetEmployeeId = currentEmployee._id;
    }

    if (req.user.role !== 'admin') {
      const employee = await Employee.findById(targetEmployeeId);
      if (!employee || employee.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own profile.'
        });
      }
    }

    // Validate department ObjectId if department is being updated
    if (req.body.workInfo?.department) {
      const departmentId = req.body.workInfo.department;
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid department ID format'
        });
      }

      // Verify department exists
      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(400).json({
          success: false,
          message: 'Department not found'
        });
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      targetEmployeeId,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'name email role employeeId isActive')
      .populate('workInfo.department', 'name code description');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Update department employee counts
    if (req.body.workInfo?.department) {
      try {
        // Update the new department's employee count
        const newDepartment = await Department.findById(req.body.workInfo.department);
        if (newDepartment) {
          await newDepartment.updateEmployeeCount();
        }

        // If the employee was moved from another department, update that count too
        // This would require knowing the previous department, which we could track
      } catch (countError) {
        console.error('Error updating department counts:', countError);
      }
    }

    // Sync with User collection
    if (employee.user) {
      const updateUserData = {};

      if (req.body.personalInfo?.firstName || req.body.personalInfo?.lastName) {
        updateUserData.name = `${req.body.personalInfo?.firstName || employee.personalInfo.firstName} ${req.body.personalInfo?.lastName || employee.personalInfo.lastName}`;
      }

      if (req.body.contactInfo?.personalEmail) {
        updateUserData.email = req.body.contactInfo.personalEmail.toLowerCase();
      }

      if (Object.keys(updateUserData).length > 0) {
        await User.findByIdAndUpdate(employee.user._id, updateUserData, { new: true });
      }
    }

    res.json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete employee
export const deleteEmployee = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Delete employee record
    await Employee.findByIdAndDelete(req.params.id);

    // Delete associated user account
    if (employee.user) {
      await User.findByIdAndDelete(employee.user);
    }

    res.json({
      success: true,
      message: 'Employee and associated user account deleted successfully'
    });

  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get employee statistics
export const getEmployeeStats = async (req, res) => {
  try {
    const totalEmployees = await Employee.countDocuments({ status: { $ne: 'Terminated' } });
    const activeEmployees = await Employee.countDocuments({ status: 'Active' });
    const inactiveEmployees = await Employee.countDocuments({ status: 'Inactive' });
    const onLeaveEmployees = await Employee.countDocuments({ status: 'On Leave' });

    // Department wise count
    const departmentStats = await Employee.aggregate([
      { $match: { status: { $ne: 'Terminated' } } },
      { $group: { _id: '$workInfo.department', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent joinings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJoinings = await Employee.countDocuments({
      'workInfo.joiningDate': { $gte: thirtyDaysAgo },
      status: { $ne: 'Terminated' }
    });

    res.json({
      success: true,
      data: {
        total: totalEmployees,
        active: activeEmployees,
        inactive: inactiveEmployees,
        onLeave: onLeaveEmployees,
        recentJoinings,
        departmentStats: departmentStats.map(stat => ({
          department: stat._id,
          count: stat.count
        }))
      }
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
// Add this method to your existing employee controller
export const updateEmployeeWithFace = async (req, res) => {
  try {
    const employeeId = req.params.id;
    let targetEmployeeId = employeeId;

    // Handle 'me' case
    if (employeeId === 'me') {
      const currentEmployee = await Employee.findOne({ user: req.user.id });
      if (!currentEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Employee record not found for current user'
        });
      }
      targetEmployeeId = currentEmployee._id;
    }

    // Check permissions
    if (req.user.role !== 'admin') {
      const employee = await Employee.findById(targetEmployeeId);
      if (!employee || employee.user.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only update your own profile.'
        });
      }
    }

    // Extract face data from request body
    const { faceDescriptor, faceImage, hasFaceRegistered, ...employeeData } = req.body;

    // Update employee record
    const updateData = {
      ...employeeData,
      ...(faceDescriptor && { faceDescriptor }),
      ...(faceImage && { faceImage }),
      ...(hasFaceRegistered !== undefined && { hasFaceRegistered })
    };

    const employee = await Employee.findByIdAndUpdate(
      targetEmployeeId,
      updateData,
      { new: true, runValidators: true }
    ).populate('user', 'name email role employeeId isActive');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // If face data was provided, create or update FaceData record
    if (faceDescriptor && faceDescriptor.length === 512) {
      try {
        const existingFaceData = await FaceData.findOne({ employee: targetEmployeeId });

        if (existingFaceData) {
          // Update existing face data
          existingFaceData.faceDescriptor = faceDescriptor;
          existingFaceData.faceImageUrl = faceImage || existingFaceData.faceImageUrl;
          existingFaceData.lastUpdated = new Date();
          await existingFaceData.save();
        } else {
          // Create new face data record
          const faceData = new FaceData({
            employee: targetEmployeeId,
            user: employee.user._id,
            faceDescriptor,
            faceImageUrl: faceImage,
            metadata: {
              captureDevice: req.headers['user-agent'] || 'Employee Update',
              captureEnvironment: 'Profile Update',
              processingVersion: '1.0'
            }
          });
          await faceData.save();
        }
      } catch (faceError) {
        console.error('Error updating face data:', faceError);
        // Don't fail the employee update if face data fails
      }
    }

    // Sync with User collection if needed
    if (employee.user) {
      const updateUserData = {};

      if (req.body.personalInfo?.firstName || req.body.personalInfo?.lastName) {
        updateUserData.name = `${req.body.personalInfo?.firstName || employee.personalInfo.firstName} ${req.body.personalInfo?.lastName || employee.personalInfo.lastName}`;
      }

      if (req.body.contactInfo?.personalEmail) {
        updateUserData.email = req.body.contactInfo.personalEmail.toLowerCase();
      }

      if (Object.keys(updateUserData).length > 0) {
        await User.findByIdAndUpdate(employee.user._id, updateUserData, { new: true });
      }
    }

    res.json({
      success: true,
      message: `Employee updated successfully${hasFaceRegistered ? ' with face registration' : ''}`,
      data: employee
    });

  } catch (error) {
    console.error('Update employee error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

export const getEmployeeBankingDetails = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid employee ID format'
      });
    }

    const employee = await Employee.findById(id)
      .select('employeeId personalInfo.firstName personalInfo.lastName bankInfo salaryInfo contactInfo.personalEmail workInfo.position workInfo.department')
      .populate('user', 'name email')
      .populate('workInfo.department', 'name');

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: {
        employeeId: employee.employeeId,
        name: `${employee.personalInfo.firstName} ${employee.personalInfo.lastName}`,
        email: employee.user?.email || employee.contactInfo?.personalEmail,
        position: employee.workInfo?.position,
        department: employee.workInfo?.department?.name,
        bankInfo: employee.bankInfo,
        salaryInfo: employee.salaryInfo
      }
    });

  } catch (error) {
    console.error('Get employee banking details error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};