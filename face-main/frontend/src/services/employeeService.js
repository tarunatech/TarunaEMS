import api from './api';

export const employeeService = {
  // Get all employees
  getEmployees: async (params = {}) => {
    try {
      const response = await api.get('/employees', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get employees' };
    }
  },

  // Get employee by ID
  getEmployeeById: async (employeeId) => {
    try {
      const response = await api.get(`/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get employee' };
    }
  },

  // Create new employee (Admin only)
  createEmployee: async (employeeData) => {
    try {
      const response = await api.post('/employees', employeeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create employee' };
    }
  },

  // Update employee
  updateEmployee: async (employeeId, employeeData) => {
    try {
      const response = await api.put(`/employees/${employeeId}`, employeeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update employee' };
    }
  },

  // Delete employee (Admin only)
  deleteEmployee: async (employeeId) => {
    try {
      const response = await api.delete(`/employees/${employeeId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete employee' };
    }
  },

  // Get employee statistics
  getEmployeeStats: async () => {
    try {
      const response = await api.get('/employees/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get employee stats' };
    }
  }
};
