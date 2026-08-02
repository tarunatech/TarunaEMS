// Fixed department controller with proper employee count handling and data consistency

import Department from '../models/Department.js';
import Employee from '../models/Employee.js';

// Get all departments with employee counts
export const getDepartments = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, search } = req.query;

    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    // Get departments first
    let departments = await Department.find(query)
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean(); // Use lean for better performance

    // FIXED: Update employee counts efficiently with proper ObjectId matching
    const departmentIds = departments.map(dept => dept._id);
    const employeeCounts = await Employee.aggregate([
      {
        $match: {
          'workInfo.department': { $in: departmentIds },
          status: { $ne: 'Terminated' }
        }
      },
      {
        $group: {
          _id: '$workInfo.department',
          count: { $sum: 1 }
        }
      }
    ]);

    // Create a map for quick lookup
    const countMap = {};
    employeeCounts.forEach(count => {
      countMap[count._id.toString()] = count.count;
    });

    // Add employee counts to departments
    departments = departments.map(dept => ({
      ...dept,
      employeeCount: countMap[dept._id.toString()] || 0
    }));

    // Apply search filter if provided
    if (search) {
      const searchTerm = search.toLowerCase();
      departments = departments.filter(dept => 
        dept.name.toLowerCase().includes(searchTerm) ||
        dept.code.toLowerCase().includes(searchTerm) ||
        (dept.manager && dept.manager.toLowerCase().includes(searchTerm)) ||
        (dept.description && dept.description.toLowerCase().includes(searchTerm))
      );
    }

    const total = await Department.countDocuments(query);

    res.json({
      success: true,
      data: departments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalDepartments: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get department by ID with employee count
export const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).lean();
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get employee count for this department
    const employeeCount = await Employee.countDocuments({
      'workInfo.department': department._id,
      status: { $ne: 'Terminated' }
    });

    res.json({
      success: true,
      data: {
        ...department,
        employeeCount
      }
    });

  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create new department
export const createDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const department = await Department.create(req.body);
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: { ...department.toObject(), employeeCount: 0 }
    });

  } catch (error) {
    console.error('Create department error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const value = error.keyValue[field];
      return res.status(400).json({
        success: false,
        message: `Department ${field} '${value}' already exists`
      });
    }
    
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update department
export const updateDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Get current employee count
    const employeeCount = await Employee.countDocuments({
      'workInfo.department': department._id,
      status: { $ne: 'Terminated' }
    });

    res.json({
      success: true,
      message: 'Department updated successfully',
      data: {
        ...department,
        employeeCount
      }
    });

  } catch (error) {
    console.error('Update department error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete department
export const deleteDepartment = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const department = await Department.findById(req.params.id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    // Check if department has employees
    const employeeCount = await Employee.countDocuments({ 
      'workInfo.department': department._id,
      status: { $ne: 'Terminated' }
    });

    if (employeeCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department. It has ${employeeCount} active employee(s). Please reassign employees first.`
      });
    }

    await Department.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });

  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get department statistics
export const getDepartmentStats = async (req, res) => {
  try {
    const stats = await Department.getDepartmentStats();
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get department stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get department list (lightweight - for dropdowns)
export const getDepartmentList = async (req, res) => {
  try {
    const departments = await Department.find({ status: 'Active' })
      .select('_id name code')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: departments
    });

  } catch (error) {
    console.error('Get department list error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get employees by department
export const getDepartmentEmployees = async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await Department.findById(id).lean();
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    const employees = await Employee.find({ 
      'workInfo.department': id,
      status: { $ne: 'Terminated' }
    })
    .populate('user', 'name email role employeeId isActive')
    .select('personalInfo workInfo user employeeId status')
    .sort({ 'personalInfo.firstName': 1 })
    .lean();

    res.json({
      success: true,
      data: {
        department: {
          _id: department._id,
          name: department.name,
          code: department.code
        },
        employees,
        count: employees.length
      }
    });

  } catch (error) {
    console.error('Get department employees error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};