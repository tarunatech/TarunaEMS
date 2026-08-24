// utils/api.js - Updated version with attendance endpoints
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 120000 // 120 second timeout for all requests (account for server cold starts and slow CPU face detection)
});

export const getApiFileUrl = (path) => {
  if (!path) return '';
  const apiOrigin = API_BASE_URL.startsWith('http')
    ? API_BASE_URL.replace(/\/api\/?$/, '')
    : window.location.origin;

  if (/^https?:\/\//i.test(path)) {
    try {
      const url = new URL(path);
      const isLocalhostUrl = ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname);
      if (isLocalhostUrl && !['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)) {
        return `${apiOrigin}${url.pathname}${url.search}`;
      }
      return path;
    } catch {
      return path;
    }
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiOrigin}${normalizedPath}`;
};

// Get token from storage (check both localStorage and sessionStorage)
const getToken = () => {
  return localStorage.getItem('token') ||
    sessionStorage.getItem('token') ||
    localStorage.getItem('authToken') ||
    sessionStorage.getItem('authToken');
};

// Add auth token to requests
API.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      hasToken: !!token,
      token: token?.substring(0, 20) + '...'
    });
    return config;
  },

  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Handle auth errors and responses
API.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      url: response.config.url,
      status: response.status,
      success: response.data?.success
    });
    return response;
  },
  (error) => {
    console.error('API Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message
    });

    if (error.response?.status === 401) {
      console.log('Authentication failed, clearing storage and redirecting...');

      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      localStorage.removeItem('userId');
      localStorage.removeItem('employeeId');

      sessionStorage.removeItem('token');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('userRole');
      sessionStorage.removeItem('userEmail');
      sessionStorage.removeItem('userName');
      sessionStorage.removeItem('userId');
      sessionStorage.removeItem('employeeId');

      // Redirect to login
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    }

    return Promise.reject(error);
  }
);

// Dashboard API calls
export const dashboardAPI = {
  getAdminStats: () => API.get('/dashboard/stats'),
  getEmployeeStats: () => API.get('/dashboard/employee-stats'),
  getRecentActivities: () => API.get('/dashboard/activities'),
  getUpcomingEvents: () => API.get('/dashboard/events'),
  getDashboardSummary: () => API.get('/dashboard/summary'),

  // / New notification endpoints
  getUserNotifications: () => API.get('/dashboard/notifications'),

  getNotifications: () => API.get('/dashboard/notifications'),
  markNotificationAsRead: (notificationId) => API.put(`/dashboard/notifications/${notificationId}/read`),
  markAllNotificationsAsRead: () => API.put('/dashboard/notifications/read-all')
};

// Employee API calls
export const employeeAPI = {
  createEmployee: (employeeData) => API.post('/employees', employeeData),
  getEmployees: (params = {}) => API.get('/employees', { params }),
  getEmployeeById: (id) => {
    console.log('employeeAPI.getEmployeeById called with id:', id);
    console.log('Making request to:', `/employees/${id}`);
    return API.get(`/employees/${id}`);
  },
  getMyProfile: () => API.get('/auth/me'),
  updateEmployee: (id, employeeData) => API.put(`/employees/${id}`, employeeData),
  deleteEmployee: (id) => API.delete(`/employees/${id}`),
  getEmployeeStats: () => API.get('/employees/stats'),
  getEmployeesByDepartment: (department) => API.get(`/employees/department/${department}`),

  // Message/Chat endpoints
  get: (endpoint) => API.get(endpoint),
  post: (endpoint, data) => API.post(endpoint, data)
};

// Department API calls
export const departmentAPI = {
  // Get all departments with optional filtering
  getDepartments: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/departments${queryString ? `?${queryString}` : ''}`;
    console.log('Fetching departments from:', url);
    return API.get(url);
  },

  // Get department by ID
  getDepartmentById: (id) => {
    console.log('Fetching department by ID:', id);
    return API.get(`/departments/${id}`);
  },

  // Create new department
  createDepartment: (departmentData) => {
    console.log('Creating department:', departmentData);
    return API.post('/departments', departmentData);
  },

  // Update department
  updateDepartment: (id, departmentData) => {
    console.log('Updating department:', id, departmentData);
    return API.put(`/departments/${id}`, departmentData);
  },

  // Delete department
  deleteDepartment: (id) => {
    console.log('Deleting department:', id);
    return API.delete(`/departments/${id}`);
  },

  // Get department statistics
  getDepartmentStats: () => {
    console.log('Fetching department stats');
    return API.get('/departments/stats');
  },

  // Get department list (lightweight - for dropdowns in employee forms)
  getDepartmentList: () => {
    console.log('Fetching department list for dropdowns');
    return API.get('/departments/list');
  },

  // Get employees by department
  getDepartmentEmployees: (departmentId) => {
    console.log('Fetching employees for department:', departmentId);
    return API.get(`/departments/${departmentId}/employees`);
  }
};

// Lead API calls
export const leadAPI = {
  // Get all leads with filters and pagination
  getLeads: (params = {}) => {
    console.log('Fetching leads with params:', params);
    return API.get('/leads', { params });
  },

  // Get lead by ID
  getLeadById: (id) => {
    console.log('Fetching lead by ID:', id);
    return API.get(`/leads/${id}`);
  },

  // Create new lead
  createLead: (leadData) => {
    console.log('Creating lead:', leadData);
    return API.post('/leads', leadData);
  },

  // Update lead
  updateLead: (id, leadData) => {
    console.log('Updating lead:', id, leadData);
    return API.put(`/leads/${id}`, leadData);
  },

  // Delete lead (Admin only)
  deleteLead: (id) => {
    console.log('Deleting lead:', id);
    return API.delete(`/leads/${id}`);
  },

  // Get lead statistics
  getLeadStats: (params = {}) => {
    console.log('Fetching lead stats', params);
    return API.get('/leads/stats', { params });
  },

  // Get upcoming follow-ups
  getUpcomingFollowUps: () => {
    console.log('Fetching upcoming follow-ups');
    return API.get('/leads/upcoming-followups');
  },

  // Get overdue follow-ups
  getOverdueFollowUps: () => {
    console.log('Fetching overdue follow-ups');
    return API.get('/leads/overdue-followups');
  },

  // Get upcoming meetings
  getUpcomingMeetings: (params = {}) => {
    console.log('Fetching upcoming meetings', params);
    return API.get('/leads/upcoming-meetings', { params });
  },

  // Add note to lead
  addLeadNote: (leadId, content) => {
    console.log('Adding note to lead:', leadId, content);
    return API.post(`/leads/${leadId}/notes`, { content });
  },

  // Lead conversion and pipeline management
  convertLead: (leadId, conversionData) => {
    console.log('Converting lead:', leadId, conversionData);
    return API.put(`/leads/${leadId}/convert`, conversionData);
  },

  // Bulk operations
  bulkUpdateLeads: (leadIds, updateData) => {
    console.log('Bulk updating leads:', leadIds, updateData);
    return API.put('/leads/bulk-update', { leadIds, updateData });
  },

  // Update won lead details
  updateWonLead: (id, wonData) => {
    console.log('Updating won lead details:', id, wonData);
    return API.put(`/leads/${id}/won-details`, wonData);
  },

  // Add meeting to lead
  addMeeting: (leadId, meetingData) => {
    console.log('Adding meeting to lead:', leadId, meetingData);
    return API.post(`/leads/${leadId}/meetings`, meetingData);
  },

  // Update meeting
  updateMeeting: (leadId, meetingId, meetingData) => {
    console.log('Updating meeting:', leadId, meetingId, meetingData);
    return API.put(`/leads/${leadId}/meetings/${meetingId}`, meetingData);
  },

  // Export leads
  exportLeads: (params = {}) => {
    console.log('Exporting leads with params:', params);
    return API.get('/leads/export', {
      params,
      responseType: 'blob' // For file download
    });
  },

  // Reassign lead to different employee (Admin only)
  reassignLead: (leadId, data) => {
    console.log('Reassigning lead:', leadId, data);
    return API.put(`/leads/${leadId}/reassign`, data);
  },

  // Get BDE employees for reassign dropdown
  getBDEEmployees: () => {
    console.log('Fetching BDE employees');
    return API.get('/leads/bde-employees');
  }
}

export const salesPipelineAPI = {
  getAll: () => API.get('/sales-pipelines'),
  getByLead: (leadId) => API.get(`/sales-pipelines/lead/${leadId}`),
  updateSection: (leadId, section, data) => API.patch(`/sales-pipelines/lead/${leadId}/${section}`, data),
  saveProposal: (leadId, data) => API.patch(`/sales-pipelines/lead/${leadId}/proposal`, data),
  generateProposal: (leadId, data) => API.post(`/sales-pipelines/lead/${leadId}/proposal/generate`, data),
  generateProposalSection: (leadId, data) => API.post(`/sales-pipelines/lead/${leadId}/proposal/generate-section`, data),
  generateProposalPdf: (leadId, data) => API.post(`/sales-pipelines/lead/${leadId}/proposal/pdf`, data),
  extractProposalFromPdf: (leadId, formData) => API.post(`/sales-pipelines/lead/${leadId}/proposal/extract-pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000
  }),
  transitionStage: (leadId, data) => API.patch(`/sales-pipelines/lead/${leadId}/stage`, data),
  updateApproval: (leadId, data) => API.patch(`/sales-pipelines/lead/${leadId}/approval`, data),
  getPendingApprovals: () => API.get('/sales-pipelines/pending-approvals')
}

// Auth API calls
export const authAPI = {
  login: (loginData) => API.post('/auth/login', loginData),
  logout: () => API.post('/auth/logout'),
  getProfile: () => API.get('/auth/profile'),
  getMyProfile: () => API.get('/auth/me'),
  updateProfile: (profileData) => API.put('/auth/profile', profileData),
  changePassword: (passwordData) => API.put('/auth/change-password', passwordData),
  updateProfileImage: (formData) => API.post('/auth/upload-profile-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => API.put(`/auth/reset-password/${token}`, { password }),

  // Alternative endpoint that checks both user and employee data
  getCurrentUser: async () => {
    try {
      // First try to get auth profile
      const authResponse = await API.get('/auth/me');
      if (authResponse.data.success) {
        return authResponse;
      }
    } catch {
      console.log('Auth endpoint failed, trying employee endpoint');
    }

    // Fallback to employee endpoint
    try {
      console.log('Calling employeeAPI.getEmployeeById with "me"');
      const employeeResponse = await employeeAPI.getEmployeeById('me');
      if (employeeResponse.data.success) {
        // Transform employee data to match auth format
        const employee = employeeResponse.data.data;
        return {
          data: {
            success: true,
            data: {
              id: employee.user?._id,
              name: employee.fullName,
              email: employee.user?.email || employee.contactInfo?.personalEmail,
              role: employee.user?.role || 'employee',
              employeeId: employee.user?.employeeId || employee.employeeId,
              personalInfo: employee.personalInfo,
              contactInfo: employee.contactInfo,
              workInfo: employee.workInfo,
              hasFaceRegistered: employee.hasFaceRegistered
            }
          }
        };
      }
    } catch (employeeError) {
      console.error('Both auth and employee endpoints failed:', employeeError);
      throw employeeError;
    }
  }
};

// Notification utility functions
export const notificationUtils = {
  // Format notification time for display
  formatNotificationTime: (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;

    return time.toLocaleDateString();
  },

  // Get notification priority based on type and category
  getNotificationPriority: (notification) => {
    const { type, category } = notification;

    if (type === 'error') return 3; // High priority
    if (type === 'warning') return 2; // Medium priority
    if (category === 'leave' && type === 'info') return 2; // Medium priority
    return 1; // Low priority
  },

  // Group notifications by category
  groupNotificationsByCategory: (notifications) => {
    const grouped = {
      tasks: [],
      leaves: [],
      employee: [],
      attendance: [],
      profile: [],
      other: []
    };

    notifications.forEach(notification => {
      const category = notification.category || 'other';
      if (grouped[category]) {
        grouped[category].push(notification);
      } else {
        grouped.other.push(notification);
      }
    });

    return grouped;
  },

  // Get notification sound/vibration settings (for future use)
  getNotificationSettings: () => {
    const settings = localStorage.getItem('notificationSettings');
    return settings ? JSON.parse(settings) : {
      sound: true,
      vibration: true,
      desktop: true,
      email: false
    };
  },

  // Save notification settings
  saveNotificationSettings: (settings) => {
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
  }

};


// Attendance API calls
export const attendanceAPI = {
  // Employee attendance functions
  checkIn: (attendanceData) => API.post('/attendance/checkin', attendanceData),
  checkOut: (attendanceData) => API.put('/attendance/checkout', attendanceData),
  getTodayAttendance: () => API.get('/attendance/today'),
  getAttendanceHistory: (params = {}) => API.get('/attendance/history', { params }),
  getEmployeeAttendanceStats: () => API.get('/attendance/employee-stats'),

  // Admin attendance functions
  getAllAttendance: (params = {}) => API.get('/attendance/all', { params }),
  getAttendanceSummary: (params = {}) => API.get('/attendance/summary', { params }),
  updateAttendance: (id, attendanceData) => API.put(`/attendance/${id}`, attendanceData),
  deleteAttendance: (id) => API.delete(`/attendance/${id}`)
};

// Geolocation utility functions
export const geolocationUtils = {
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // 1 minute cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          });
        },
        (error) => {
          let errorMessage = 'Unable to retrieve your location';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
            default:
              errorMessage = 'An unknown error occurred while retrieving location';
              break;
          }

          reject(new Error(errorMessage));
        },
        options
      );
    });
  },

  // Get address from coordinates (reverse geocoding)
  getAddressFromCoords: async (latitude, longitude) => {
    try {
      // Using a free geocoding service
      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const data = await response.json();
      return data.display_name || data.locality || 'Unknown location';
    } catch (error) {
      console.warn('Geocoding failed:', error);
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  },

  // Get device information
  getDeviceInfo: () => {
    const userAgent = navigator.userAgent;
    let browser = 'Unknown';
    let platform = navigator.platform || 'Unknown';

    // Simple browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    else if (userAgent.includes('Opera')) browser = 'Opera';

    return {
      userAgent,
      platform,
      browser,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  },

  // Calculate distance between two coordinates (in meters)
  calculateDistance: (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }
};

// AI API calls
export const aiAPI = {
  chat: (message) => API.post('/ai/chat', { message })
};

// Bot API calls
export const botAPI = {
  sendMessage: (text, userId) => API.post('/bot/message', { text, userId }),
  sendAdminMessage: (text) => API.post('/bot/admin-message', { text }),
  getHistory: (userId) => API.get(`/bot/history/${userId}`)
};

// Purchase API calls
export const purchaseAPI = {
  getPurchaseOrders: (filters) => API.get('/purchase', { params: filters }),
  getSuppliers: () => API.get('/purchase/suppliers'),
  createSupplier: (data) => API.post('/purchase/suppliers', data),
  createPurchaseOrder: (data) => API.post('/purchase', data),
  updatePurchaseOrder: (id, data) => API.put(`/purchase/${id}`, data),
  deletePurchaseOrder: (id) => API.delete(`/purchase/${id}`)
};

// Expense Tracker API calls
export const expenseTrackerAPI = {
  getSummary: () => API.get('/expense-tracker/summary'),
  getTransactions: (params = {}) => API.get('/expense-tracker/transactions', { params }),
  createTransaction: (data) => API.post('/expense-tracker/transactions', data),
  updateTransaction: (id, data) => API.put(`/expense-tracker/transactions/${id}`, data),
  deleteTransaction: (id) => API.delete(`/expense-tracker/transactions/${id}`)
};

export const interviewAPI = {
  getMine: () => API.get('/interviews'),
  create: (data) => API.post('/interviews', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: () => API.get('/interviews/admin'),
  getCandidate: (id) => API.get(`/interviews/candidates/${id}`),
  updateCandidate: (id, data) => API.put(`/interviews/candidates/${id}`, data),
  getAdminCandidate: (id) => API.get(`/interviews/admin/candidates/${id}`),
  addProfileRecord: (candidateId, type, data) => API.post(`/interviews/candidates/${candidateId}/${type}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateProfileRecord: (candidateId, type, recordId, data) => API.put(`/interviews/candidates/${candidateId}/${type}/${recordId}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteProfileRecord: (candidateId, type, recordId) => API.delete(`/interviews/candidates/${candidateId}/${type}/${recordId}`),
  updateStatus: (id, status) => API.patch(`/interviews/admin/${id}/status`, { status }),
  delete: (id) => API.delete(`/interviews/admin/${id}`)
};

// Payslip API calls
export const payslipAPI = {
  getPayslips: (params = {}) => API.get('/payslips', { params }),
  getPayslipById: (id) => API.get(`/payslips/${id}`),
  getEmployeePayslips: (employeeId) => API.get(`/payslips/employee/${employeeId}`),
  generatePayslip: (data) => API.post('/payslips/generate', data),
  bulkGenerate: (data) => API.post('/payslips/bulk-generate', data),
  downloadPayslip: (id) => API.get(`/payslips/${id}/download`, { responseType: 'blob' }),
  updatePayslipStatus: (id, data) => API.patch(`/payslips/${id}/status`, data),
  deletePayslip: (id) => API.delete(`/payslips/${id}`)
};

// Banking Details API (Admin only)
export const bankingAPI = {
  getEmployeeBankingDetails: (employeeId) => API.get(`/employees/${employeeId}/banking`)
};

// Export the configured axios instance
export default API;
