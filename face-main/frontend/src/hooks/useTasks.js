// ===== CORRECTED useTasks.js Hook =====
import { useState, useEffect, useCallback } from 'react';
import { taskService } from '../services/taskService';
import toast from 'react-hot-toast';

export const useTasks = (initialFilters = {}) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [stats, setStats] = useState(null);

  // Fetch tasks with better error handling and logging
  const fetchTasks = useCallback(async (filterParams = filters) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('useTasks: Fetching tasks with filters:', filterParams);
      const response = await taskService.getTasks(filterParams);
      console.log('useTasks: API Response:', response);
      
      if (response && response.success) {
        const taskList = response.tasks || [];
        console.log('useTasks: Setting tasks, count:', taskList.length);
        setTasks(taskList);
      } else {
        console.error('useTasks: Invalid response format:', response);
        setError('Invalid response from server');
      }
    } catch (error) {
      console.error('useTasks: Error fetching tasks:', error);
      setError(error.message || 'Failed to fetch tasks');
      toast.error(error.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch task stats
  const fetchStats = useCallback(async () => {
    try {
      console.log('useTasks: Fetching task stats...');
      const response = await taskService.getTaskStats();
      console.log('useTasks: Stats response:', response);
      
      if (response && response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('useTasks: Failed to fetch task stats:', error);
    }
  }, []);

  // Create task with proper state update
  const createTask = async (taskData) => {
    try {
      console.log('useTasks: Creating task with data:', taskData);
      const response = await taskService.createTask(taskData);
      console.log('useTasks: Create task response:', response);
      
      if (response && response.success && response.task) {
        // Add the new task to the beginning of the list
        setTasks(prev => [response.task, ...prev]);
        toast.success('Task created successfully!');
        
        // Refresh stats after creating
        fetchStats();
        return response;
      } else {
        throw new Error(response.message || 'Failed to create task');
      }
    } catch (error) {
      console.error('useTasks: Create task error:', error);
      toast.error(error.message || 'Failed to create task');
      throw error;
    }
  };

  // Update task
  const updateTask = async (taskId, taskData) => {
    try {
      console.log('useTasks: Updating task:', taskId, taskData);
      const response = await taskService.updateTask(taskId, taskData);
      
      if (response && response.success && response.task) {
        setTasks(prev => prev.map(task => 
          task._id === taskId ? response.task : task
        ));
        toast.success('Task updated successfully!');
        fetchStats();
        return response;
      } else {
        throw new Error(response.message || 'Failed to update task');
      }
    } catch (error) {
      console.error('useTasks: Update task error:', error);
      toast.error(error.message || 'Failed to update task');
      throw error;
    }
  };

  // Delete task
  const deleteTask = async (taskId) => {
    try {
      console.log('useTasks: Deleting task:', taskId);
      const response = await taskService.deleteTask(taskId);
      
      if (response && response.success) {
        setTasks(prev => prev.filter(task => task._id !== taskId));
        toast.success('Task deleted successfully!');
        fetchStats();
      } else {
        throw new Error(response.message || 'Failed to delete task');
      }
    } catch (error) {
      console.error('useTasks: Delete task error:', error);
      toast.error(error.message || 'Failed to delete task');
      throw error;
    }
  };

  // Update task progress
  const updateProgress = async (taskId, progress) => {
    try {
      const response = await taskService.updateProgress(taskId, progress);
      if (response && response.success && response.task) {
        setTasks(prev => prev.map(task => 
          task._id === taskId ? response.task : task
        ));
        return response;
      }
    } catch (error) {
      console.error('useTasks: Update progress error:', error);
      toast.error(error.message || 'Failed to update progress');
      throw error;
    }
  };

  // Change task status
  const changeStatus = async (taskId, status) => {
    try {
      const response = await taskService.changeStatus(taskId, status);
      if (response && response.success && response.task) {
        setTasks(prev => prev.map(task => 
          task._id === taskId ? response.task : task
        ));
        toast.success(`Task status updated to ${status}!`);
        return response;
      }
    } catch (error) {
      console.error('useTasks: Change status error:', error);
      toast.error(error.message || 'Failed to change status');
      throw error;
    }
  };

  // Add comment
  const addComment = async (taskId, text) => {
    try {
      const response = await taskService.addComment(taskId, text);
      if (response && response.success && response.task) {
        setTasks(prev => prev.map(task => 
          task._id === taskId ? response.task : task
        ));
        toast.success('Comment added!');
        return response;
      }
    } catch (error) {
      console.error('useTasks: Add comment error:', error);
      toast.error(error.message || 'Failed to add comment');
      throw error;
    }
  };

  // Toggle subtask
  const toggleSubtask = async (taskId, subtaskId) => {
    try {
      const response = await taskService.toggleSubtask(taskId, subtaskId);
      if (response && response.success && response.task) {
        setTasks(prev => prev.map(task => 
          task._id === taskId ? response.task : task
        ));
        return response;
      }
    } catch (error) {
      console.error('useTasks: Toggle subtask error:', error);
      toast.error(error.message || 'Failed to toggle subtask');
      throw error;
    }
  };

  // Initial data fetch
  useEffect(() => {
    console.log('useTasks: Component mounted, fetching initial data');
    fetchTasks();
    fetchStats();
  }, [fetchTasks, fetchStats]);

  // Re-fetch when filters change
  useEffect(() => {
    console.log('useTasks: Filters changed, re-fetching tasks');
    fetchTasks();
  }, [filters, fetchTasks]);

  return {
    tasks,
    loading,
    error,
    stats,
    filters,
    setFilters,
    fetchTasks,
    fetchStats,
    createTask,
    updateTask,
    deleteTask,
    updateProgress,
    changeStatus,
    addComment,
    toggleSubtask
  };
};