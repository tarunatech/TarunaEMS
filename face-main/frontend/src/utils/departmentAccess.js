// Centralized department-based access rules for employee modules

export const COMMON_MODULE_KEYS = ['dashboard', 'attendance', 'leaves', 'holidays', 'expenses'];

const MODULE_PATH_MAP = {
  dashboard: ['/employee/dashboard'],
  attendance: ['/employee/attendance'],
  leaves: ['/employee/leaves'],
  holidays: ['/employee/holidays'],
  expenses: ['/employee/expenses'],
  tasks: ['/employee/tasks'],
  problems: ['/employee/problems'],
  sales: ['/employee/sales', '/employee/leads'],
  salesPipeline: ['/employee/sales-pipeline'],
  salesMeetings: ['/employee/sales-meetings'],
  hrInterviews: ['/employee/hr-interviews'],
};

const DEPARTMENT_RULES = {
  bde: ['dashboard', 'attendance', 'sales', 'salesPipeline', 'salesMeetings', 'tasks', 'expenses', 'leaves', 'holidays'],
  businessdevelopment: ['dashboard', 'attendance', 'sales', 'salesPipeline', 'salesMeetings', 'tasks', 'expenses', 'leaves', 'holidays'],
  businessdevelopmentexecutive: ['dashboard', 'attendance', 'sales', 'salesPipeline', 'salesMeetings', 'tasks', 'expenses', 'leaves', 'holidays'],
  developer: [...COMMON_MODULE_KEYS, 'tasks', 'problems'],
  development: [...COMMON_MODULE_KEYS, 'tasks', 'problems'],
  hr: [...COMMON_MODULE_KEYS, 'hrInterviews'],
  humanresources: [...COMMON_MODULE_KEYS, 'hrInterviews'],
  designing: [...COMMON_MODULE_KEYS, 'tasks'],
  design: [...COMMON_MODULE_KEYS, 'tasks'],
};

export const normalizeDepartment = (value) =>
  (value || '')
    .toString()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

export const isPersistedId = (value) => {
  const text = (value || '').toString().trim();
  return /^[a-f0-9]{24}$/i.test(text) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text);
};

export const getDepartmentName = (...candidates) => {
  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === 'object') {
      const nested = getDepartmentName(
        candidate.name,
        candidate.departmentName,
        candidate.workInfo?.departmentName,
        candidate.workInfo?.department
      );
      if (nested && nested !== 'N/A') return nested;
      continue;
    }

    const text = String(candidate).trim();
    if (text && text !== 'N/A' && !isPersistedId(text)) return text;
  }

  return null;
};

export const allowedKeysForDepartment = (department) => {
  const key = normalizeDepartment(department);
  return DEPARTMENT_RULES[key] || [...COMMON_MODULE_KEYS];
};

export const moduleKeyFromPath = (path) => {
  if (!path) return null;
  const match = Object.entries(MODULE_PATH_MAP).find(([, paths]) =>
    paths.some((p) => path.startsWith(p))
  );
  return match ? match[0] : null;
};

export const isModulePathAllowed = (path, department) => {
  const key = moduleKeyFromPath(path);
  if (!key) return true; // Non-module paths (profile/settings) stay accessible
  return allowedKeysForDepartment(department).includes(key);
};

export const modulePaths = MODULE_PATH_MAP;
