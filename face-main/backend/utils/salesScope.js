import Employee from '../models/Employee.js';
import Lead from '../models/Lead.js';
import Project from '../models/Project.js';

/**
 * Returns the scoping IDs for an authenticated employee/user.
 * If user is an admin, isScoped is false (meaning full access).
 * For employees, resolves all leads and projects created by or assigned to that employee.
 */
export const getSalesEmployeeScope = async (user) => {
  if (!user || user.role === 'admin') {
    return {
      isScoped: false,
      userId: user?._id || user?.id || null,
      employeeId: null,
      leadIds: [],
      projectIds: [],
    };
  }

  const userId = String(user._id || user.id);

  // 1. Find employee record for this user
  let employeeId = null;
  const employee = await Employee.findOne({ user: userId }).select('_id employeeId');
  if (employee && employee._id) {
    employeeId = String(employee._id);
  }

  // 2. Find leads assigned to or created/assigned by this user/employee
  const leadOrConditions = [
    { assignedBy: userId },
  ];
  if (employeeId) {
    leadOrConditions.push({ assignedTo: employeeId });
  }

  let leadIds = [];
  try {
    const leadsList = await Lead.find({ $or: leadOrConditions });
    leadIds = (leadsList || []).map((l) => String(l._id || l.id));
  } catch (err) {
    console.error('Error finding leads for sales scope:', err);
  }

  // 3. Find projects created by this user, managed by this employee, or linked to their leads
  const projectOrConditions = [
    { createdBy: userId },
  ];
  if (employeeId) {
    projectOrConditions.push({ projectManager: employeeId });
  }
  if (leadIds.length > 0) {
    projectOrConditions.push({ leadId: { $in: leadIds } });
  }

  let projectIds = [];
  try {
    const projectsList = await Project.find({ $or: projectOrConditions }).lean();
    projectIds = (projectsList || []).map((p) => String(p._id || p.id));
  } catch (err) {
    console.error('Error finding projects for sales scope:', err);
  }

  return {
    isScoped: true,
    userId,
    employeeId,
    leadIds,
    projectIds,
  };
};

export default getSalesEmployeeScope;
