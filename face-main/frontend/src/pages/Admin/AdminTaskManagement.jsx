import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/Admin/layout/AdminLayout';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  User,
  Calendar,
  Flag,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  X,
  Save,
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import AdminDayBookReview from './AdminDayBookReview';
import AdminPerformanceReview from './AdminPerformanceReview';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

// Import API services
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { employeeAPI } from '../../utils/api'; // Use the same API as employee management
import { taskService } from '../../services/taskService';

const AdminTaskManagement = () => {


  const { user } = useAuth();
  const {
    tasks,
    loading,
    error,
    stats,
    createTask,
    updateTask,
    deleteTask,
    fetchTasks
  } = useTasks();

  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'Medium',
    dueDate: '',
    estimatedHours: 0
  });
  const [taskHistory, setTaskHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 'tasks', 'daybooks', or 'performance'

  // State for employees
  const [employees, setEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState({});
  const [reviewFeedback, setReviewFeedback] = useState('');
  const [reviewLoading, setReviewLoading] = useState('');

  const toggleEmployeeExpand = (employeeId) => {
    setExpandedEmployees(prev => ({
      ...prev,
      [employeeId]: !prev[employeeId]
    }));
  };

  const groupTasksByEmployee = (tasksToGroup) => {
    const grouped = {};
    tasksToGroup.forEach(task => {
      const employeeId = task.assignedTo?._id || 'unassigned';
      if (!grouped[employeeId]) {
        grouped[employeeId] = {
          employee: task.assignedTo,
          tasks: []
        };
      }
      grouped[employeeId].tasks.push(task);
    });
    return grouped;
  };

  const getAssignableEmployees = () => {
    return employees;
  };

  // Fetch employees when component mounts using the same API as employee management
  const fetchEmployees = async () => {
    try {
      setEmployeesLoading(true);
      console.log('Fetching employees for task assignment...');

      const response = await employeeAPI.getEmployees();
      console.log('Employee API Response for tasks:', response.data);

      if (response.data.success) {
        const employeeData = response.data.data?.employees || [];
        console.log('Setting employees for task assignment:', employeeData.length, 'employees');
        setEmployees(employeeData);
      } else {
        console.error('API returned success: false');
        toast.error('Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees for task assignment:', error);

      // Better error handling
      if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. You don\'t have permission to view employees.');
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to fetch employees. Please try again.');
      }
    } finally {
      setEmployeesLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchTaskHistory = async (employeeId) => {
    if (!employeeId) {
      setTaskHistory([]);
      return;
    }
    try {
      setHistoryLoading(true);
      const response = await taskService.getTaskHistory(employeeId);
      if (response.success) {
        setTaskHistory(response.history);
      }
    } catch (error) {
      console.error('Error fetching task history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (showAddModal && newTask.assignedTo) {
      fetchTaskHistory(newTask.assignedTo);
    }
  }, [showAddModal, newTask.assignedTo]);

  // Filter tasks
  useEffect(() => {
    let filtered = tasks.filter(task => {
      const matchesSearch = (task.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.assignedTo?.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, priorityFilter]);
  const handleAddTask = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    try {
      if (!newTask.title?.trim()) {
        toast.error("Task title is required");
        return;
      }

      if (!newTask.description?.trim()) {
        toast.error("Task description is required");
        return;
      }

      if (!newTask.assignedTo) {
        toast.error("Please assign the task to an employee");
        return;
      }

      if (!newTask.dueDate) {
        toast.error("Due date is required");
        return;
      }

      const selectedEmployee = employees.find(emp => emp._id === newTask.assignedTo);
      if (!selectedEmployee) {
        toast.error("Selected employee not found. Please refresh and try again.");
        return;
      }

      const taskPayload = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignedTo: newTask.assignedTo,
        priority: newTask.priority || 'Medium',
        dueDate: newTask.dueDate,
        estimatedHours: parseInt(newTask.estimatedHours) || 0
      };

      await createTask(taskPayload);

      setNewTask({
        title: '',
        description: '',
        assignedTo: '',
        priority: 'Medium',
        dueDate: '',
        estimatedHours: 0
      });
      setShowAddModal(false);

      await fetchTasks();

    } catch (error) {
      console.error('AdminTask: Create task error:', error);

      if (error.response?.data?.errors) {
        const validationErrors = error.response.data.errors;
        validationErrors.forEach(err => {
          toast.error(err.msg || err.message);
        });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error(error.message || 'Failed to create task');
      }
    }
  };


  const handleEditTask = async (e) => {
    e.preventDefault();
    try {
      await updateTask(selectedTask._id, {
        title: selectedTask.title,
        description: selectedTask.description,
        assignedTo: selectedTask.assignedTo._id || selectedTask.assignedTo,
        priority: selectedTask.priority,
        dueDate: selectedTask.dueDate,
        estimatedHours: parseInt(selectedTask.estimatedHours) || 0
      });

      setShowEditModal(false);
      setSelectedTask(null);
    } catch (error) {
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
      } catch (error) {
      }
    }
  };

  const handleViewTask = async (task) => {
    try {
      setModalLoading(true);
      setSelectedTask(task);
      setShowViewModal(true);
      setReviewFeedback('');

      // Optionally fetch fresh task data
      // const response = await taskService.getTaskById(task._id);
      // setSelectedTask(response.task);
    } catch (error) {
      toast.error('Failed to load task details');
    } finally {
      setModalLoading(false);
    }
  };

  const handleReviewTask = async (action) => {
    if (!selectedTask?._id) return;
    if ((action === 'reject' || action === 'changes') && !reviewFeedback.trim()) {
      toast.error('Please add feedback for the employee');
      return;
    }

    try {
      setReviewLoading(action);
      const response = await taskService.reviewTask(selectedTask._id, action, reviewFeedback.trim());
      if (response.success) {
        setSelectedTask(response.task);
        setReviewFeedback('');
        toast.success(response.message || 'Task reviewed');
        await fetchTasks();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to review task');
    } finally {
      setReviewLoading('');
    }
  };

  const isInteractiveClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openTaskDetails = (event, task) => {
    if (isInteractiveClick(event)) return;
    handleViewTask(task);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'not started': return 'text-slate-700 bg-slate-100';
      case 'in progress': return 'text-blue-700 bg-blue-50';
      case 'completed': return 'text-emerald-700 bg-emerald-50';
      case 'review': return 'text-purple-700 bg-purple-50';
      case 'on hold': return 'text-amber-700 bg-amber-50';
      case 'cancelled': return 'text-red-700 bg-red-50';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'text-emerald-700 bg-emerald-50';
      case 'medium': return 'text-amber-700 bg-amber-50';
      case 'high': return 'text-orange-700 bg-orange-50';
      case 'critical': return 'text-red-700 bg-red-50';
      default: return 'text-slate-700 bg-slate-100';
    }
  };

  const isOverdue = (dueDate, status) => {
    return status !== 'Completed' && new Date(dueDate) < new Date();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-500">Loading tasks...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminLayout>
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Tasks</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => fetchTasks()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200"
            >
              Try Again
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-4 bg-slate-0 text-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Task Management</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Assign and track tasks for your team</p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 space-x-0 sm:space-x-3">
            <button
              onClick={() => {
                fetchTasks();
                fetchEmployees();
              }}
              className="px-3 sm:px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 flex items-center text-sm"
            >
              <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 sm:px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200 flex items-center text-sm"
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
              Add Task
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="premium-stat-card rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold leading-tight text-slate-900">{stats?.total || 0}</h3>
                <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Total Tasks</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/20">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold leading-tight text-blue-700">{stats?.inProgress || 0}</h3>
                <p className="text-slate-500 text-[11px] sm:text-xs font-medium">In Progress</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/20">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold leading-tight text-emerald-700">{stats?.completed || 0}</h3>
                <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Completed</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-600/20">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>

          <div className="premium-stat-card rounded-xl border border-red-100 bg-gradient-to-br from-white to-red-50/60 p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-bold leading-tight text-red-700">{stats?.overdue || 0}</h3>
                <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Overdue</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-600 rounded-lg flex items-center justify-center shadow-sm shadow-red-600/20">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex space-x-1 p-1 bg-white border border-slate-200 rounded-xl w-fit shadow-sm">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('daybooks')}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === 'daybooks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Day Books (EOD)
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${activeTab === 'performance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Performance
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchTasks}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 flex items-center text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {activeTab === 'tasks' ? (
          <div className="space-y-4">
            {/* Filters */}
            <div className="premium-panel rounded-xl p-3 sm:p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <SearchWithSuggestions
                value={searchTerm}
                onChange={setSearchTerm}
                items={tasks}
                getSuggestionValue={(task) => task.title || task.description || task.assignedTo?.user?.name || ''}
                getSuggestionTitle={(task) => task.title || 'Untitled Task'}
                getSuggestionSubtitle={(task) => `${task.description || 'No description'}${task.assignedTo?.user?.name ? ` • ${task.assignedTo.user.name}` : ''}`}
                placeholder="Search tasks..."
                inputClassName="premium-input !py-2 !text-sm border-slate-200 focus:border-blue-500 focus:ring-blue-100"
              />
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Status</option>
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="relative">
                <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                className="px-4 py-2 border border-blue-200 text-blue-700 rounded-lg bg-white hover:bg-blue-50 transition-all duration-200 text-sm font-medium"
              >
                Clear Filters
              </button>
            </div>

            {/* Tasks Table - Desktop */}
            <div className="hidden md:block bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Description</th>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Assigned To</th>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Priority</th>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Status</th>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Progress</th>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Due Date</th>
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupTasksByEmployee(filteredTasks)).map(([empId, group]) => (
                      <React.Fragment key={empId}>
                        {/* Employee Header Row */}
                        <tr
                          className="bg-blue-50 cursor-pointer hover:bg-blue-100 transition-all duration-200 border-b border-slate-200"
                          onClick={() => toggleEmployeeExpand(empId)}
                        >
                          <td colSpan="7" className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-00 rounded-full flex items-center justify-center">
                                  {expandedEmployees[empId] ? <ChevronDown className="w-4 h-4 text-blue-600" /> : <ChevronRight className="w-4 h-4 text-blue-600" />}
                                </div>
                                <div className="flex items-center space-x-3">
                                  <div className="w-7 h-7 bg-blue-00 rounded-full flex items-center justify-center">
                                    <User className="w-3.5 h-3.5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-slate-900 font-bold text-sm">
                                      {group.employee?.user?.name || 'Unknown Employee'}
                                    </p>
                                    <p className="text-slate-500 text-xs">
                                      {group.employee?.user?.employeeId || 'N/A'} • {group.tasks.length} {group.tasks.length === 1 ? 'Task' : 'Tasks'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <span className="text-slate-500 text-xs">
                                  {expandedEmployees[empId] ? 'Click to collapse' : 'Click to expand'}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>

                        {/* Task Rows (only if expanded) */}
                        {expandedEmployees[empId] && group.tasks.map((task) => (
                          <tr key={task._id} onClick={(event) => openTaskDetails(event, task)} className="border-b border-slate-200 hover:bg-blue-50 transition-all duration-200 cursor-pointer">
                            <td className="p-3 pl-10 max-w-xs">
                              <p className="text-slate-900 text-sm font-semibold line-clamp-1">{task.title || 'Untitled Task'}</p>
                              <p className="mt-0.5 text-slate-500 text-xs line-clamp-2">{task.description || 'No description'}</p>
                            </td>
                            <td className="p-3 italic text-xs text-slate-500">
                              (Assigned above)
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 text-[11px] rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 text-[11px] rounded-full ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-2 min-w-[60px]">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${task.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-blue-700 text-xs">{task.progress}%</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className={`text-xs ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatDate(task.dueDate)}
                                {isOverdue(task.dueDate, task.status) && (
                                  <div className="flex items-center text-red-600 text-xs mt-1">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Overdue
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleViewTask(task)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-blue-200"
                                  title="View Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedTask(task);
                                    setShowEditModal(true);
                                  }}
                                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-amber-200"
                                  title="Edit"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task._id)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-red-200"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table >
              </div >

              {
                filteredTasks.length === 0 && (
                  <div className="p-6 sm:p-12 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
                    <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No records found</h3>
                    <p className="text-slate-500">
                      {searchTerm || statusFilter || priorityFilter
                        ? 'Try adjusting your search filters'
                        : 'Create your first record to get started.'}
                    </p>
                  </div>
                )
              }
            </div >

            {/* Tasks Cards - Mobile */}
            < div className="md:hidden space-y-4" >
              {
                filteredTasks.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-12 text-center shadow-sm">
                    <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No records found</h3>
                    <p className="text-slate-500">
                      {searchTerm || statusFilter || priorityFilter
                        ? 'Try adjusting your search filters'
                        : 'Create your first record to get started.'}
                    </p>
                  </div>
                ) : (
                  Object.entries(groupTasksByEmployee(filteredTasks)).map(([empId, group]) => (
                    <div key={empId} className="space-y-3">
                      <div
                        className="bg-blue-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-all duration-200 hover:shadow-sm"
                        onClick={() => toggleEmployeeExpand(empId)}
                      >
                        <div className="flex items-center space-x-3">
                          <User className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-slate-900 text-sm font-bold">{group.employee?.user?.name || 'Unknown Employee'}</p>
                            <p className="text-slate-500 text-xs">{group.tasks.length} tasks</p>
                          </div>
                        </div>
                        {expandedEmployees[empId] ? <ChevronDown className="w-5 h-5 text-blue-600" /> : <ChevronRight className="w-5 h-5 text-blue-600" />}
                      </div>

                      {expandedEmployees[empId] && group.tasks.map((task) => (
                        <div key={task._id} onClick={(event) => openTaskDetails(event, task)} className="bg-white border border-slate-200 rounded-xl p-3 space-y-3 ml-3 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-slate-900 font-semibold text-sm line-clamp-1">{task.title || 'Untitled Task'}</p>
                              <p className="mt-1 text-slate-500 text-xs line-clamp-2">{task.description || 'No description'}</p>
                            </div>
                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-slate-500">Priority</p>
                              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                            </div>
                            <div>
                              <p className="text-slate-500">Due Date</p>
                              <p className={`font-medium ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatDate(task.dueDate)}
                                {isOverdue(task.dueDate, task.status) && (
                                  <span className="text-red-600 text-xs block">Overdue</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-slate-500 text-xs mb-2">Progress</p>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${task.progress}%` }}
                                ></div>
                              </div>
                              <span className="text-blue-700 text-xs">{task.progress}%</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                            <button
                              onClick={() => handleViewTask(task)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-blue-200"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTask(task);
                                setShowEditModal(true);
                              }}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-amber-200"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:shadow-sm border border-transparent hover:border-red-200"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )
              }
            </div >

            {/* Quick Stats */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-4" >
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Task Distribution by Priority</h2>
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                </div>
                <div className="space-y-3">
                  {stats?.priorityDistribution?.map((priority) => {
                    const percentage = stats.total > 0 ? (priority.count / stats.total) * 100 : 0;
                    return (
                      <div key={priority._id} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-900 text-sm font-medium">{priority._id || 'Unknown'}</span>
                          <span className="text-blue-700 text-xs">{priority.count} tasks</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  }) || (
                      <div className="text-center py-4">
                        <p className="text-slate-500">No priority data available</p>
                      </div>
                    )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-900">Recent Tasks</h2>
                  <Clock className="w-4 h-4 text-blue-600" />
                </div>
                <div className="space-y-3">
                  {tasks.slice(0, 4).map((task) => (
                    <div key={task._id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-slate-900 text-sm font-medium line-clamp-1">{task.title || 'Untitled Task'}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">{task.description || 'No description'}</p>
                        <p className="text-xs text-slate-500">
                          {task.assignedTo?.user?.name || 'Unknown Employee'}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                          {task.status}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(task.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-slate-500">No tasks created yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Add Task Modal */}
            {
              showAddModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-2 md:p-4">
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-1 sm:p-3 md:p-4 lg:p-6 w-full sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl max-h-[88vh] overflow-auto shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Create New Task</h2>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <form onSubmit={handleAddTask} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Title *</label>
                        <input
                          type="text"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="Short task title..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          required
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-sm font-medium text-slate-600">Description *</label>
                          {taskHistory.length > 0 && (
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  setNewTask({ ...newTask, description: e.target.value });
                                }
                              }}
                              className="text-xs bg-white border border-slate-200 rounded text-blue-700 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                            >
                              <option value="">Reuse from history...</option>
                              {taskHistory.map((h, i) => (
                                <option key={i} value={h}>{h}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <textarea
                          value={newTask.description}
                          onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                          rows="3"
                          placeholder="Enter task description..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          required
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Assign To *</label>
                          {employeesLoading ? (
                            <div className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-200 rounded-lg">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-slate-500">Loading employees...</span>
                            </div>
                          ) : (
                            <select
                              value={newTask.assignedTo}
                              onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            >
                              <option value="">Select Employee</option>
                              {getAssignableEmployees().map(emp => (
                                <option key={emp._id} value={emp._id}>
                                  {emp.fullName || `${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}` || emp.user?.name || 'Unknown'}
                                  ({emp.employeeId || emp.user?.employeeId || 'N/A'})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Priority *</label>
                          <select
                            value={newTask.priority}
                            onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Due Date *</label>
                          <input
                            type="date"
                            value={newTask.dueDate}
                            onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Estimated Hours *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={newTask.estimatedHours}
                            onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-4">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={employeesLoading}
                          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4 mr-2 inline" />
                          Create Task
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )
            }

            {/* Edit Task Modal */}
            {
              showEditModal && selectedTask && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-2 md:p-4">
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-1 sm:p-3 md:p-4 lg:p-6 w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl max-h-[85vh] overflow-auto shadow-xl">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Edit Task</h2>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-900">
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                    <form onSubmit={handleEditTask} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Title *</label>
                        <input
                          type="text"
                          value={selectedTask?.title || ''}
                          onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                          placeholder="Short task title..."
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-2">Description *</label>
                        <textarea
                          value={selectedTask?.description || ''}
                          onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                          rows="3"
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          required
                        ></textarea>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Assign To *</label>
                          {employeesLoading ? (
                            <div className="flex items-center space-x-2 px-4 py-3 bg-white border border-slate-200 rounded-lg">
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                              <span className="text-slate-500">Loading employees...</span>
                            </div>
                          ) : (
                            <select
                              value={selectedTask?.assignedTo?._id || ''}
                              onChange={(e) => {
                                const employee = employees.find(emp => emp._id === e.target.value);
                                setSelectedTask({ ...selectedTask, assignedTo: employee });
                              }}
                              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            >
                              <option value="">Select Employee</option>
                              {getAssignableEmployees().map(emp => (
                                <option key={emp._id} value={emp._id}>
                                  {emp.fullName || `${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}` || emp.user?.name || 'Unknown'}
                                  ({emp.employeeId || emp.user?.employeeId || 'N/A'})
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Priority *</label>
                          <select
                            value={selectedTask?.priority || ''}
                            onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Due Date *</label>
                          <input
                            type="date"
                            value={selectedTask?.dueDate?.split('T')[0] || ''}
                            onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-600 mb-2">Estimated Hours *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={selectedTask?.estimatedHours || ''}
                            onChange={(e) => setSelectedTask({ ...selectedTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-4">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          className="px-6 py-3 border border-slate-200 text-slate-700 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={employeesLoading}
                          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-4 h-4 mr-2 inline" />
                          Update Task
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )
            }

            {/* View Task Modal */}
            {
              showViewModal && selectedTask && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-2 md:p-4">
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
                  <div className="relative bg-white border border-slate-200 rounded-2xl p-1 sm:p-3 md:p-4 lg:p-6 w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl max-h-[85vh] overflow-auto shadow-xl">
                    <div className="flex items-center justify-between mb-4 sm:mb-6">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">Task Details</h2>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => {
                            setShowViewModal(false);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-all duration-200 hover:border-blue-200 hover:bg-blue-100 hover:text-blue-800 sm:px-3 sm:text-sm"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button onClick={() => setShowViewModal(false)} className="text-slate-400 hover:text-slate-900">
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                    {modalLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="flex-1 min-w-0 mr-3">
                            <p className="text-slate-900 font-semibold line-clamp-1">{selectedTask.title || 'Untitled Task'}</p>
                            <p className="mt-1 text-sm text-slate-500 line-clamp-2">{selectedTask.description || 'No description'}</p>
                          </div>
                          <span className={`px-3 py-1 text-sm rounded-full flex-shrink-0 ${getStatusColor(selectedTask.status)}`}>
                            {selectedTask.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm text-slate-500">Assigned To</label>
                              <p className="text-slate-900 font-medium">
                                {selectedTask.assignedTo?.user?.name || selectedTask.assignedTo?.fullName || 'Unknown Employee'}
                              </p>
                              <p className="text-slate-500 text-sm">
                                {selectedTask.assignedTo?.user?.employeeId || selectedTask.assignedTo?.employeeId || 'N/A'}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm text-slate-500">Priority</label>
                              <span className={`inline-block px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                                {selectedTask.priority}
                              </span>
                            </div>
                            <div>
                              <label className="text-sm text-slate-500">Created</label>
                              <p className="text-slate-900 font-medium">{formatDate(selectedTask.createdAt)}</p>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm text-slate-500">Due Date</label>
                              <p className={`font-medium ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600' : 'text-slate-900'}`}>
                                {formatDate(selectedTask.dueDate)}
                              </p>
                            </div>
                            <div>
                              <label className="text-sm text-slate-500">Progress</label>
                              <div className="flex items-center space-x-2">
                                <div className="flex-1 bg-slate-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full"
                                    style={{ width: `${selectedTask.progress}%` }}
                                  ></div>
                                </div>
                                <span className="text-blue-700 text-sm">{selectedTask.progress}%</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm text-slate-500">Hours</label>
                              <p className="text-slate-900 font-medium">
                                {Math.round(selectedTask.actualHours || 0)} / {selectedTask.estimatedHours || 0} hrs
                              </p>
                            </div>
                            <div>
                              <label className="text-sm text-slate-500">Last Updated</label>
                              <p className="text-slate-900 font-medium">{formatDate(selectedTask.updatedAt)}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm text-slate-500">Title</label>
                          <p className="text-slate-900 bg-white p-3 rounded-lg mt-1 border border-slate-200 font-semibold">{selectedTask.title || 'Untitled Task'}</p>
                        </div>
                        <div>
                          <label className="text-sm text-slate-500">Description</label>
                          <p className="text-slate-900 bg-slate-50 p-3 rounded-lg mt-1 border border-slate-200">{selectedTask.description}</p>
                        </div>
                        {selectedTask.status === 'Review' && (
                          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-4 shadow-[0_10px_30px_rgba(79,70,229,0.08)]">
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">Review Decision</p>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                  Employee has submitted this task for admin review. Approve it, reject it, or request specific changes.
                                </p>
                              </div>
                              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                                Pending Review
                              </span>
                            </div>

                            <textarea
                              value={reviewFeedback}
                              onChange={(e) => setReviewFeedback(e.target.value)}
                              rows={3}
                              placeholder="Add feedback for rejection or requested changes..."
                              className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />

                            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                              <button
                                type="button"
                                onClick={() => handleReviewTask('approve')}
                                disabled={!!reviewLoading}
                                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewLoading === 'approve' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                                Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewTask('changes')}
                                disabled={!!reviewLoading}
                                className="inline-flex items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewLoading === 'changes' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Changes
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviewTask('reject')}
                                disabled={!!reviewLoading}
                                className="inline-flex items-center justify-center rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {reviewLoading === 'reject' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <AlertTriangle className="mr-2 h-4 w-4" />}
                                Reject
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedTask.comments && selectedTask.comments.length > 0 && (
                          <div>
                            <label className="text-sm text-slate-500">Recent Comments ({selectedTask.comments.length})</label>
                            <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                              {selectedTask.comments.slice(-3).map((comment) => (
                                <div key={comment._id} className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="text-slate-900 text-sm font-medium">
                                      {comment.user?.name || 'Unknown'}
                                    </span>
                                    <span className="text-slate-500 text-xs">
                                      {formatDate(comment.createdAt)}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 text-sm">{comment.text}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        ) : activeTab === 'daybooks' ? (
          <AdminDayBookReview />
        ) : (
          <AdminPerformanceReview />
        )}
      </div>
    </AdminLayout >
  );
};

export default AdminTaskManagement;
