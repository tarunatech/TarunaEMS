export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    RESET_PASSWORD: '/auth/reset-password',
    PROFILE: '/auth/profile',
    CHANGE_PASSWORD: '/auth/change-password',
    LOGOUT: '/auth/logout',
    USERS: '/auth/users',
    INIT_ADMIN: '/auth/init-admin'
  },
  TASKS: {
    BASE: '/tasks',
    STATS: '/tasks/stats',
    COMMENTS: (id) => `/tasks/${id}/comments`,
    PROGRESS: (id) => `/tasks/${id}/progress`,
    STATUS: (id) => `/tasks/${id}/status`,
    SUBTASKS: (id, subtaskId) => `/tasks/${id}/subtasks/${subtaskId}`
  },
  EMPLOYEES: {
    BASE: '/employees',
    STATS: '/employees/stats'
  }
};

export const TASK_STATUSES = [
  'Not Started',
  'In Progress', 
  'Review',
  'Completed',
  'On Hold',
  'Cancelled'
];

export const TASK_PRIORITIES = [
  'Low',
  'Medium',
  'High',
  'Critical'
];

export const TASK_CATEGORIES = [
  'Development',
  'Design',
  'Testing',
  'Documentation',
  'Research',
  'Bug Fix',
  'Feature',
  'Maintenance',
  'Other'
];

// Export all services
export { authService, taskService, employeeService };
export { useAuth, useTasks };
export { handleApiError };