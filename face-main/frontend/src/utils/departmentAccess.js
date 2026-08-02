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
};

const DEPARTMENT_RULES = {
  bde: [...COMMON_MODULE_KEYS, 'sales', 'tasks'],
  businessdevelopment: [...COMMON_MODULE_KEYS, 'sales', 'tasks'],
  businessdevelopmentexecutive: [...COMMON_MODULE_KEYS, 'sales', 'tasks'],
  developer: [...COMMON_MODULE_KEYS, 'tasks', 'problems'],
  development: [...COMMON_MODULE_KEYS, 'tasks', 'problems'],
  designing: [...COMMON_MODULE_KEYS, 'tasks'],
  design: [...COMMON_MODULE_KEYS, 'tasks'],
};

export const normalizeDepartment = (value) =>
  (value || '')
    .toString()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

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
