// middleware/departmentAccess.js
// Helpers to enforce department-based access for employee routes/modules
import Employee from '../models/Employee.js';

const normalizeDept = (dept) => {
  if (!dept) return '';
  // Normalize: lowercase, remove all non-alphanumeric characters
  return String(dept).replace(/\s+/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
};

// Check if a department matches any in the allowed list (normalized comparison)
const matchesDeptFlexible = (department, allowed = []) => {
  const dept = department?.name || department?.code || department || '';
  const normalized = normalizeDept(dept);
  
  // Direct match first
  if (allowed.some(target => normalized === normalizeDept(target))) {
    return true;
  }
  
  // Partial match - check if normalized contains any allowed value or vice versa
  return allowed.some(target => {
    const normalizedTarget = normalizeDept(target);
    return normalized.includes(normalizedTarget) || normalizedTarget.includes(normalized);
  });
};

const matchesAllowedDept = (department, allowed = []) => {
  const normalized = normalizeDept(
    department?.name || department?.code || department || ''
  );
  return allowed.some((target) => normalized === normalizeDept(target));
};

/**
 * Require an employee to belong to one of the allowed departments.
 * Admins (and other non-employee roles) always pass through.
 */
export const requireDepartment = (allowedDepartments = []) => async (req, res, next) => {
  try {
    if (req.user?.role !== 'employee') {
      return next();
    }

    const employee = await Employee.findOne({ user: req.user.id }).populate(
      'workInfo.department',
      'name code'
    );

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee record not found',
      });
    }

    const dept = employee.workInfo?.department;
    if (!matchesDeptFlexible(dept, allowedDepartments)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied for your department',
      });
    }

    // Attach for downstream handlers
    req.employee = employee;
    req.employeeDepartment = dept;
    next();
  } catch (error) {
    console.error('Department access middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying department access',
    });
  }
};

export const normalizeDepartmentValue = normalizeDept;
export const isDepartmentAllowed = matchesDeptFlexible;

