import api from './api';

export const taskService = {
  getTasks: async (params = {}) => {
    try {
      console.log('Fetching tasks with params:', params);
      const response = await api.get('/tasks', { params });
      console.log('Tasks API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get tasks error:', error.response?.data || error);
      throw error.response?.data || { message: 'Failed to get tasks' };
    }
  },

  createTask: async (taskData) => {
    try {
      console.log('Creating task:', taskData);
      const response = await api.post('/tasks', taskData);
      console.log('Create task success response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create task error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // Log specific validation errors
      if (error.response?.data?.errors) {
        console.log('Specific validation errors:');
        error.response.data.errors.forEach((err, index) => {
          console.log(`${index + 1}. Field: ${err.path || err.param}, Error: ${err.msg || err.message}`);
        });
      }

      throw error.response?.data || { message: 'Failed to create task' };
    }
  },


  // Get task by ID
  getTaskById: async (taskId) => {
    try {
      const response = await api.get(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get task' };
    }
  },

  // Create new task (Admin only)
  // createTask: async (taskData) => {
  //   try {
  //     const response = await api.post('/tasks', taskData);
  //     return response.data;
  //   } catch (error) {
  //     throw error.response?.data || { message: 'Failed to create task' };
  //   }
  // },

  // Update task
  updateTask: async (taskId, taskData) => {
    try {
      const response = await api.put(`/tasks/${taskId}`, taskData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update task' };
    }
  },

  // Delete task (Admin only)
  deleteTask: async (taskId) => {
    try {
      const response = await api.delete(`/tasks/${taskId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete task' };
    }
  },

  // Add comment to task
  addComment: async (taskId, text) => {
    try {
      const response = await api.post(`/tasks/${taskId}/comments`, { text });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add comment' };
    }
  },

  // Update task progress
  updateProgress: async (taskId, progress) => {
    try {
      const response = await api.put(`/tasks/${taskId}/progress`, { progress });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update progress' };
    }
  },

  // Change task status
  changeStatus: async (taskId, status) => {
    try {
      const response = await api.put(`/tasks/${taskId}/status`, { status });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to change status' };
    }
  },

  // Toggle subtask
  toggleSubtask: async (taskId, subtaskId) => {
    try {
      const response = await api.put(`/tasks/${taskId}/subtasks/${subtaskId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to toggle subtask' };
    }
  },

  // Get task statistics
  getTaskStats: async () => {
    try {
      const response = await api.get('/tasks/stats');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get task stats' };
    }
  },

  // Get employee task history
  getTaskHistory: async (employeeId) => {
    try {
      const response = await api.get(`/tasks/employee/${employeeId}/history`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get task history' };
    }
  },

  // Get today's day book
  getTodayDayBook: async () => {
    try {
      const response = await api.get('/daybooks/today');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get today\'s day book' };
    }
  },

  // Submit day book
  submitDayBook: async (data) => {
    try {
      const response = await api.post('/daybooks/submit', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to submit day book' };
    }
  },

  // Get all day books (Admin)
  getDayBooks: async (params = {}) => {
    try {
      const response = await api.get('/daybooks', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get day books' };
    }
  },

  // Update day book status (Admin)
  updateDayBookStatus: async (id, statusData) => {
    try {
      const response = await api.put(`/daybooks/${id}/status`, statusData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update day book status' };
    }
  },

  // Delete day book (Admin)
  deleteDayBook: async (id) => {
    try {
      const response = await api.delete(`/daybooks/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete day book' };
    }
  }
};