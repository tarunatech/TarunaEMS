import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  manager: { type: String, default: '' },
  location: { type: String, default: '' },
  budget: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive', 'Restructuring'], default: 'Active' },
  establishedDate: { type: Date, default: Date.now },
  goals: [{ type: String, trim: true }],
  parentDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  employeeCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

// FIXED: Method to update employee count using ObjectId instead of name
departmentSchema.methods.updateEmployeeCount = async function () {
  try {
    const Employee = mongoose.model('Employee');
    // Use ObjectId (_id) instead of name for matching
    const count = await Employee.countDocuments({ 
      'workInfo.department': this._id, // Changed from this.name to this._id
      status: { $ne: 'Terminated' } 
    });
    this.employeeCount = count;
    await this.save();
    return this.employeeCount;
  } catch (error) {
    console.error('Error updating employee count for department', this.name, ':', error);
    return 0;
  }
};

// Static method to get departments with employee counts
departmentSchema.statics.getWithEmployeeCounts = async function () {
  const departments = await this.find().sort({ name: 1 });
  for (const dept of departments) {
    await dept.updateEmployeeCount();
  }
  return departments;
};

// Static method for getting department statistics
departmentSchema.statics.getDepartmentStats = async function() {
  try {
    const Employee = mongoose.model('Employee');
    
    const totalDepartments = await this.countDocuments();
    const activeDepartments = await this.countDocuments({ status: 'Active' });
    const inactiveDepartments = await this.countDocuments({ status: 'Inactive' });
    
    // Get department with most employees
    const deptWithMostEmployees = await this.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'workInfo.department',
          as: 'employees'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          employeeCount: { $size: '$employees' }
        }
      },
      { $sort: { employeeCount: -1 } },
      { $limit: 1 }
    ]);

    return {
      total: totalDepartments,
      active: activeDepartments,
      inactive: inactiveDepartments,
      restructuring: totalDepartments - activeDepartments - inactiveDepartments,
      largestDepartment: deptWithMostEmployees[0] || null
    };
  } catch (error) {
    console.error('Error getting department stats:', error);
    return {
      total: 0,
      active: 0,
      inactive: 0,
      restructuring: 0,
      largestDepartment: null
    };
  }
};

const Department = mongoose.model('Department', departmentSchema);

export default Department;