// constants/dashboard.js
export const DASHBOARD_CONSTANTS = {
  REFRESH_INTERVALS: {
    FAST: 60000,      // 1 minute
    NORMAL: 300000,   // 5 minutes
    SLOW: 600000      // 10 minutes
  },
  
  STATS_CONFIG: {
    DEFAULT_COLORS: [
      "from-pink-500 to-purple-500",
      "from-green-500 to-emerald-500", 
      "from-blue-500 to-indigo-500",
      "from-yellow-500 to-orange-500",
      "from-purple-500 to-pink-500",
      "from-emerald-500 to-teal-500"
    ],
    
    CHANGE_TYPES: {
      POSITIVE: 'positive',
      NEGATIVE: 'negative',
      NEUTRAL: 'neutral'
    }
  },

  ACTIVITY_TYPES: {
    SUCCESS: 'success',
    WARNING: 'warning',
    INFO: 'info',
    ERROR: 'error'
  },

  EVENT_CATEGORIES: {
    MEETING: 'meeting',
    TRAINING: 'training',
    HOLIDAY: 'holiday',
    DEADLINE: 'deadline',
    BIRTHDAY: 'birthday',
    ANNOUNCEMENT: 'announcement'
  },

  DEPARTMENT_COLORS: {
    'HR': 'bg-pink-500/20 text-pink-400',
    'IT': 'bg-blue-500/20 text-blue-400',
    'Finance': 'bg-green-500/20 text-green-400',
    'Marketing': 'bg-purple-500/20 text-purple-400',
    'Operations': 'bg-orange-500/20 text-orange-400',
    'Sales': 'bg-yellow-500/20 text-yellow-400',
    'Support': 'bg-teal-500/20 text-teal-400',
    'Legal': 'bg-red-500/20 text-red-400'
  },

  MAX_ITEMS: {
    RECENT_ACTIVITIES: 10,
    UPCOMING_EVENTS: 8,
    NOTIFICATIONS: 50
  },

  DATE_FORMATS: {
    DISPLAY: {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    TIME: {
      hour: '2-digit',
      minute: '2-digit'
    },
    SHORT: {
      month: 'short',
      day: 'numeric'
    }
  }
};

// constants/api.js
export const API_CONSTANTS = {
  ENDPOINTS: {
    AUTH: '/auth',
    DASHBOARD: '/dashboard',
    EMPLOYEES: '/employees',
    ATTENDANCE: '/attendance',
    LEAVES: '/leaves',
    TASKS: '/tasks',
    NOTIFICATIONS: '/notifications'
  },

  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
  },

  TIMEOUTS: {
    DEFAULT: 10000,
    UPLOAD: 30000,
    DOWNLOAD: 60000
  }
};

// constants/roles.js
export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  INTERN: 'intern'
};

export const PERMISSIONS = {
  [ROLES.ADMIN]: [
    'view_dashboard',
    'manage_employees',
    'manage_departments',
    'view_reports',
    'manage_system',
    'manage_roles',
    'manage_attendance',
    'manage_leaves'
  ],
  [ROLES.HR]: [
    'view_dashboard',
    'manage_employees',
    'view_reports',
    'manage_attendance',
    'manage_leaves'
  ],
  [ROLES.MANAGER]: [
    'view_dashboard',
    'view_team',
    'approve_leaves',
    'assign_tasks',
    'view_team_reports'
  ],
  [ROLES.EMPLOYEE]: [
    'view_profile',
    'update_profile',
    'mark_attendance',
    'apply_leave',
    'view_tasks'
  ],
  [ROLES.INTERN]: [
    'view_profile',
    'update_profile',
    'mark_attendance',
    'view_tasks'
  ]
};