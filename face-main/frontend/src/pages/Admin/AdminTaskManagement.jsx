import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  RefreshCw,
  FileCheck,
  PlusCircle,
  Minus
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
  const location = useLocation();
  const initialSearch = location.state?.employeeFilter || location.state?.search || '';

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
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(location.state?.statusFilter || '');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    const navSearch = location.state?.employeeFilter || location.state?.search || '';
    if (navSearch) {
      setSearchTerm(navSearch);
    }
  }, [location.state]);

  useEffect(() => {
    const navStatus = location.state?.statusFilter || '';
    if (navStatus) {
      setStatusFilter(navStatus);
    }
  }, [location.state]);

  const isNavigatedFromStatCard = Boolean(location.state?.employeeFilter || location.state?.search);

  const activeEmployeeTasks = useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return tasks;
    return tasks.filter(task => {
      const matchesSearch = (task.title || '').toLowerCase().includes(term) ||
        (task.description || '').toLowerCase().includes(term) ||
        (task.assignedTo?.user?.name || '').toLowerCase().includes(term) ||
        (task.assignedTo?.personalInfo?.firstName || '').toLowerCase().includes(term) ||
        (task.assignedTo?.personalInfo?.lastName || '').toLowerCase().includes(term) ||
        (task.assignedTo?.employeeId || '').toLowerCase().includes(term);

      return matchesSearch;
    });
  }, [tasks, searchTerm]);

  const activeStats = useMemo(() => {
    const total = activeEmployeeTasks.length;
    const inProgress = activeEmployeeTasks.filter(t => t.status === 'In Progress' || t.status === 'Pending').length;
    const review = activeEmployeeTasks.filter(t => (t.status || '').toLowerCase().includes('review')).length;
    const completed = activeEmployeeTasks.filter(t => t.status === 'Completed' || t.status === 'Closed').length;
    const now = new Date();
    const overdue = activeEmployeeTasks.filter(t => t.status === 'Overdue' || (t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed' && t.status !== 'Closed')).length;

    const priorityCounts = {};
    activeEmployeeTasks.forEach(t => {
      const p = t.priority || 'Medium';
      priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    const priorityDistribution = Object.entries(priorityCounts).map(([_id, count]) => ({ _id, count }));

    const fallbackReview = tasks.filter(t => (t.status || '').toLowerCase().includes('review')).length;

    if (!isNavigatedFromStatCard && !searchTerm.trim()) {
      return {
        total: stats?.total ?? total,
        inProgress: stats?.inProgress ?? inProgress,
        review: stats?.review ?? stats?.inReview ?? fallbackReview,
        completed: stats?.completed ?? completed,
        overdue: stats?.overdue ?? overdue,
        priorityDistribution: stats?.priorityDistribution || priorityDistribution
      };
    }

    return {
      total,
      inProgress,
      review,
      completed,
      overdue,
      priorityDistribution
    };
  }, [isNavigatedFromStatCard, searchTerm, activeEmployeeTasks, stats, tasks]);

  const activeRecentTasks = useMemo(() => {
    if (!isNavigatedFromStatCard && !searchTerm.trim()) {
      return tasks.slice(0, 4);
    }
    return activeEmployeeTasks.slice(0, 4);
  }, [isNavigatedFromStatCard, searchTerm, tasks, activeEmployeeTasks]);

  // Task preview lists for stat card hover tooltips
  const now = new Date();
  const previewTotal = useMemo(() => tasks.slice(0, 20), [tasks]);
  const previewInProgress = useMemo(() =>
    tasks.filter(t => t.status === 'In Progress' || t.status === 'Pending').slice(0, 20),
    [tasks]);
  const previewCompleted = useMemo(() => {
    const completedTasks = tasks.filter(t => t.status === 'Completed' || t.status === 'Closed');

    // Sort newest completed/updated first
    const sorted = [...completedTasks].sort((a, b) => {
      const dateA = new Date(a.completedDate || a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.completedDate || b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

    const now = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Filter to only include tasks completed within the last 7 days
    const recentCompleted = sorted.filter(t => {
      const taskTime = new Date(t.completedDate || t.updatedAt || t.createdAt || 0).getTime();
      if (!taskTime) return true;
      return (now - taskTime) <= SEVEN_DAYS_MS;
    });

    return recentCompleted.slice(0, 20);
  }, [tasks]);
  const previewOverdue = useMemo(() =>
    tasks.filter(t =>
      t.status === 'Overdue' ||
      (t.dueDate && new Date(t.dueDate) < now && t.status !== 'Completed' && t.status !== 'Closed')
    ).slice(0, 20),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks]);
  const previewReview = useMemo(() =>
    tasks.filter(t => (t.status || '').toLowerCase().includes('review')).slice(0, 20),
    [tasks]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    descriptions: [''],
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
      const matchesStatus = !statusFilter || (statusFilter === 'Overdue'
        ? (task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Completed' && task.status !== 'Closed')
        : task.status === statusFilter);
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

      const filledDescriptions = (newTask.descriptions || []).filter(d => d.trim());
      if (filledDescriptions.length === 0) {
        toast.error("At least one task description is required");
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
        description: filledDescriptions.join('\n\n'),
        assignedTo: newTask.assignedTo,
        priority: newTask.priority || 'Medium',
        dueDate: newTask.dueDate,
        estimatedHours: parseInt(newTask.estimatedHours) || 0
      };

      await createTask(taskPayload);

      setNewTask({
        title: '',
        descriptions: [''],
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
      const editDescriptions = (selectedTask.descriptions || []).filter(d => d.trim());
      if (editDescriptions.length === 0) {
        toast.error("At least one task description is required");
        return;
      }
      await updateTask(selectedTask._id, {
        title: selectedTask.title,
        description: editDescriptions.join('\n\n'),
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
      <style>{`
        .task-details-modal-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .task-details-modal-scroll::-webkit-scrollbar {
          display: none;
        }
        .admin-modal-inner {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .admin-modal-inner::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 639px) {
          .premium-stat-card::before {
            display: none !important;
          }
        }
      `}</style>
      <div className="space-y-4 bg-slate-0 text-sm">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Task Management</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Assign and track tasks for your team</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                fetchTasks();
                fetchEmployees();
              }}
              className="px-2.5 py-1.5 border border-slate-200 bg-white text-slate-700 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 flex items-center gap-1.5 text-xs font-medium"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Refresh
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200 flex items-center gap-1.5 text-xs sm:text-sm"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Add Task
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">

          {/* ── Total Tasks ── */}
          <div className="group relative">
            <div className="premium-stat-card before:hidden sm:before:block rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3 sm:p-4 cursor-default transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight text-slate-900">{activeStats.total}</h3>
                  <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Total Tasks</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/20">
                  <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
            {/* Hover tooltip */}
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
              <div className="rounded-xl border border-blue-100 bg-white shadow-xl shadow-blue-900/10 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-blue-50 bg-blue-50/70 px-3 py-2">
                  <Target className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">All Tasks</span>
                  <span className="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{activeStats.total}</span>
                </div>
                {previewTotal.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-slate-400 text-center">No tasks yet</p>
                ) : (
                  <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    {previewTotal.map(t => (
                      <li key={t._id} className="flex items-start gap-2 px-3 py-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-800">{t.title || 'Untitled'}</p>
                          <p className="truncate text-[10px] text-slate-400">{t.assignedTo?.user?.name || t.assignedTo?.fullName || 'Unassigned'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── In Progress ── */}
          <div className="group relative">
            <div className="premium-stat-card before:hidden sm:before:block rounded-xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-3 sm:p-4 cursor-default transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight text-blue-700">{activeStats.inProgress}</h3>
                  <p className="text-slate-500 text-[11px] sm:text-xs font-medium">In Progress</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm shadow-blue-600/20">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute right-0 sm:left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
              <div className="rounded-xl border border-blue-100 bg-white shadow-xl shadow-blue-900/10 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-blue-50 bg-blue-50/70 px-3 py-2">
                  <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">In Progress</span>
                  <span className="ml-auto rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">{activeStats.inProgress}</span>
                </div>
                {previewInProgress.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-slate-400 text-center">No active tasks</p>
                ) : (
                  <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    {previewInProgress.map(t => (
                      <li key={t._id} className="flex items-start gap-2 px-3 py-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-800">{t.title || 'Untitled'}</p>
                          <p className="truncate text-[10px] text-slate-400">{t.assignedTo?.user?.name || t.assignedTo?.fullName || 'Unassigned'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── Pending Review ── */}
          <div className="group relative">
            <div className="premium-stat-card before:hidden sm:before:block rounded-xl border border-amber-100 bg-gradient-to-br from-white to-amber-50/60 p-3 sm:p-4 cursor-default transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight text-amber-700">{activeStats.review}</h3>
                  <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Pending Review</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-600 rounded-lg flex items-center justify-center shadow-sm shadow-amber-600/20">
                  <FileCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 w-64 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
              <div className="rounded-xl border border-amber-100 bg-white shadow-xl shadow-amber-900/10 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-amber-50 bg-amber-50/70 px-3 py-2">
                  <FileCheck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">Pending Review</span>
                  <span className="ml-auto rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">{activeStats.review}</span>
                </div>
                {previewReview.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-slate-400 text-center">No tasks pending review</p>
                ) : (
                  <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    {previewReview.map(t => (
                      <li key={t._id} className="flex items-start gap-2 px-3 py-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-800">{t.title || 'Untitled'}</p>
                          <p className="truncate text-[10px] text-slate-400">{t.assignedTo?.user?.name || t.assignedTo?.fullName || 'Unassigned'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── Completed ── */}
          <div className="group relative">
            <div className="premium-stat-card before:hidden sm:before:block rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-3 sm:p-4 cursor-default transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight text-emerald-700">{activeStats.completed}</h3>
                  <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Completed</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm shadow-emerald-600/20">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute right-0 sm:right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
              <div className="rounded-xl border border-emerald-100 bg-white shadow-xl shadow-emerald-900/10 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-emerald-50 bg-emerald-50/70 px-3 py-2">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">Recently Completed</span>
                  <span className="ml-auto rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{previewCompleted.length}</span>
                </div>
                {previewCompleted.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-slate-400 text-center">No tasks completed in last 7 days</p>
                ) : (
                  <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    {previewCompleted.map(t => {
                      const dateVal = t.completedDate || t.updatedAt || t.createdAt;
                      const dateStr = dateVal ? new Date(dateVal).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
                      return (
                        <li key={t._id} className="flex items-start gap-2 px-3 py-2">
                          <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <p className="truncate text-[11px] font-semibold text-slate-800">{t.title || 'Untitled'}</p>
                              {dateStr && <span className="text-[9px] font-medium text-emerald-600 shrink-0">{dateStr}</span>}
                            </div>
                            <p className="truncate text-[10px] text-slate-400">{t.assignedTo?.user?.name || t.assignedTo?.fullName || 'Unassigned'}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* ── Overdue ── */}
          <div className="group relative">
            <div className="premium-stat-card before:hidden sm:before:block rounded-xl border border-red-100 bg-gradient-to-br from-white to-red-50/60 p-3 sm:p-4 cursor-default transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-xl font-bold leading-tight text-red-700">{activeStats.overdue}</h3>
                  <p className="text-slate-500 text-[11px] sm:text-xs font-medium">Overdue</p>
                </div>
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-red-600 rounded-lg flex items-center justify-center shadow-sm shadow-red-600/20">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute left-0 sm:right-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto">
              <div className="rounded-xl border border-red-100 bg-white shadow-xl shadow-red-900/10 overflow-hidden">
                <div className="flex items-center gap-2 border-b border-red-50 bg-red-50/70 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-red-700">Overdue</span>
                  <span className="ml-auto rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">{activeStats.overdue}</span>
                </div>
                {previewOverdue.length === 0 ? (
                  <p className="px-3 py-3 text-[11px] text-slate-400 text-center">No overdue tasks 🎉</p>
                ) : (
                  <ul className="divide-y divide-slate-50 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 transparent' }}>
                    {previewOverdue.map(t => (
                      <li key={t._id} className="flex items-start gap-2 px-3 py-2">
                        <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-slate-800">{t.title || 'Untitled'}</p>
                          <p className="truncate text-[10px] text-slate-400">{t.assignedTo?.user?.name || t.assignedTo?.fullName || 'Unassigned'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex space-x-0.5 p-1 bg-white border border-slate-200 rounded-xl shadow-sm flex-shrink-0">
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'tasks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setActiveTab('daybooks')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'daybooks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Day Books (EOD)
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'performance'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Performance
            </button>
          </div>

          <button
            onClick={fetchTasks}
            className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg shadow-sm hover:shadow-md hover:bg-slate-50 transition-all duration-200 flex items-center gap-1.5 text-xs font-medium flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
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
                      <th className="text-left p-3 text-xs text-slate-600 font-semibold">Assigned From</th>
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
                              <p className="mt-0.5 text-slate-500 text-xs line-clamp-1">
                                {(() => { const parts = (task.description || '').split('\n\n').map(s => s.trim()).filter(Boolean); return parts.length > 0 ? parts[parts.length - 1] : 'No description'; })()}
                              </p>
                            </td>
                            <td className="p-3 text-xs text-slate-700 font-semibold">
                              {task.isSelfAssigned
                                ? 'Self'
                                : task.assignedBy?.name || (task.assignedBy?.role === 'admin' ? 'Admin' : 'Admin')}
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
                                    const existingDescs = task.description
                                      ? task.description.split('\n\n').filter(d => d.trim()).map(d => d.trim())
                                      : [''];
                                    setSelectedTask({ ...task, descriptions: existingDescs.length > 0 ? existingDescs : [''] });
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
                              <p className="mt-1 text-slate-500 text-xs line-clamp-1">
                                {(() => { const parts = (task.description || '').split('\n\n').map(s => s.trim()).filter(Boolean); return parts.length > 0 ? parts[parts.length - 1] : 'No description'; })()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-slate-500">Assigned From</p>
                              <p className="font-semibold text-slate-900">
                                {task.isSelfAssigned
                                  ? 'Self'
                                  : task.assignedBy?.name || 'Admin'}
                              </p>
                            </div>
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
                                const existingDescs = task.description
                                  ? task.description.split('\n\n').filter(d => d.trim()).map(d => d.trim())
                                  : [''];
                                setSelectedTask({ ...task, descriptions: existingDescs.length > 0 ? existingDescs : [''] });
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
                  {activeStats?.priorityDistribution?.map((priority) => {
                    const percentage = activeStats.total > 0 ? (priority.count / activeStats.total) * 100 : 0;
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
                  {activeRecentTasks.map((task) => (
                    <div key={task._id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-slate-900 text-sm font-medium line-clamp-1">{task.title || 'Untitled Task'}</p>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {(() => { const parts = (task.description || '').split('\n\n').map(s => s.trim()).filter(Boolean); return parts.length > 0 ? parts[parts.length - 1] : 'No description'; })()}
                        </p>
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
                  {activeRecentTasks.length === 0 && (
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4">
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                  <div className="admin-modal-inner relative flex max-h-[48dvh] sm:max-h-[85vh] w-full sm:max-w-sm md:max-w-md lg:max-w-2xl xl:max-w-4xl flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 p-3 sm:p-5 md:p-6 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
                    <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 pb-2 backdrop-blur sm:border-b-0 sm:pb-4">
                      <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-900">Create New Task</h2>
                      <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900">
                        <X className="w-4 h-4 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                    <form onSubmit={handleAddTask} className="flex flex-1 flex-col min-h-0">
                      <div className="task-details-modal-scroll flex-1 overflow-y-auto overscroll-contain py-2 space-y-2.5 sm:space-y-6 sm:py-0">
                        <div>
                          <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Title *</label>
                          <input
                            type="text"
                            value={newTask.title}
                            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                            placeholder="Short task title..."
                            className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </div>
                        <div>
                          <div className="flex justify-between items-center mb-1 sm:mb-2">
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600">Descriptions *</label>
                            {taskHistory.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    setNewTask(prev => ({ ...prev, descriptions: [...prev.descriptions, e.target.value] }));
                                  }
                                }}
                                className="text-[10px] sm:text-xs bg-white border border-slate-200 rounded text-blue-700 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                              >
                                <option value="">Reuse from history...</option>
                                {taskHistory.map((h, i) => (
                                  <option key={i} value={h}>{h}</option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div className="space-y-2 sm:space-y-3">
                            {(newTask.descriptions || ['']).map((desc, idx) => (
                              <div key={idx} className="relative group">
                                <div className="flex items-start gap-1.5 sm:gap-2">
                                  <div className="flex-shrink-0 w-4 h-4 sm:w-6 sm:h-6 mt-1.5 sm:mt-3 flex items-center justify-center rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[10px] sm:text-xs font-bold">{idx + 1}</div>
                                  <textarea
                                    value={desc}
                                    onChange={(e) => {
                                      const updated = [...(newTask.descriptions || [''])];
                                      updated[idx] = e.target.value;
                                      setNewTask(prev => ({ ...prev, descriptions: updated }));
                                    }}
                                    rows="2"
                                    placeholder={`Description ${idx + 1}...`}
                                    className="flex-1 px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                                  />
                                  {(newTask.descriptions || ['']).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (newTask.descriptions || ['']).filter((_, i) => i !== idx);
                                        setNewTask(prev => ({ ...prev, descriptions: updated.length ? updated : [''] }));
                                      }}
                                      className="flex-shrink-0 mt-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
                                      title="Remove this description"
                                    >
                                      <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setNewTask(prev => ({ ...prev, descriptions: [...(prev.descriptions || ['']), ''] }))}
                              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 hover:border-blue-300 rounded-lg transition-all duration-200 w-full justify-center"
                            >
                              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              Add Description
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Assign To *</label>
                            {employeesLoading ? (
                              <div className="flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                <span className="text-slate-500 text-[11px] sm:text-sm">Loading...</span>
                              </div>
                            ) : (
                              <select
                                value={newTask.assignedTo}
                                onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                                className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                required
                              >
                                <option value="">Select Employee</option>
                                {getAssignableEmployees().map(emp => (
                                  <option key={emp._id} value={emp._id}>
                                    {emp.fullName || `${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}` || emp.user?.name || 'Unknown'}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Priority *</label>
                            <select
                              value={newTask.priority}
                              onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                              className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Due Date *</label>
                            <input
                              type="date"
                              value={newTask.dueDate}
                              onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                              className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Est. Hours *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={newTask.estimatedHours}
                              onChange={(e) => setNewTask({ ...newTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="sticky bottom-0 z-10 flex shrink-0 justify-end space-x-2 sm:space-x-4 border-t border-slate-100 bg-white/95 pt-2 backdrop-blur sm:pt-4">
                        <button
                          type="button"
                          onClick={() => setShowAddModal(false)}
                          className="px-3 sm:px-6 py-1.5 sm:py-3 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={employeesLoading}
                          className="px-3 sm:px-6 py-1.5 sm:py-3 bg-blue-600 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
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
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2.5 sm:p-4">
                  <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
                  <div className="admin-modal-inner relative flex max-h-[48dvh] sm:max-h-[85vh] w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl flex-col overflow-hidden rounded-2xl bg-white border border-slate-200 p-3 sm:p-5 md:p-6 shadow-xl">
                    <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 pb-2 backdrop-blur sm:border-b-0 sm:pb-4">
                      <h2 className="text-sm sm:text-xl md:text-2xl font-bold text-slate-900">Edit Task</h2>
                      <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-900">
                        <X className="w-4 h-4 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                    <form onSubmit={handleEditTask} className="flex flex-1 flex-col min-h-0">
                      <div className="task-details-modal-scroll flex-1 overflow-y-auto overscroll-contain py-2 space-y-2.5 sm:space-y-6 sm:py-0">
                        <div>
                          <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Title *</label>
                          <input
                            type="text"
                            value={selectedTask?.title || ''}
                            onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                            placeholder="Short task title..."
                            className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Descriptions *</label>
                          <div className="space-y-2 sm:space-y-3">
                            {(selectedTask?.descriptions || [selectedTask?.description || '']).map((desc, idx) => (
                              <div key={idx} className="relative group">
                                <div className="flex items-start gap-1.5 sm:gap-2">
                                  <div className="flex-shrink-0 w-4 h-4 sm:w-6 sm:h-6 mt-1.5 sm:mt-3 flex items-center justify-center rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[10px] sm:text-xs font-bold">{idx + 1}</div>
                                  <textarea
                                    value={desc}
                                    onChange={(e) => {
                                      const updated = [...(selectedTask.descriptions || [selectedTask.description || ''])];
                                      updated[idx] = e.target.value;
                                      setSelectedTask(prev => ({ ...prev, descriptions: updated }));
                                    }}
                                    rows="2"
                                    placeholder={`Description ${idx + 1}...`}
                                    className="flex-1 px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                                  />
                                  {(selectedTask?.descriptions || ['']).length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = (selectedTask.descriptions || ['']).filter((_, i) => i !== idx);
                                        setSelectedTask(prev => ({ ...prev, descriptions: updated.length ? updated : [''] }));
                                      }}
                                      className="flex-shrink-0 mt-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 border border-transparent hover:border-red-200"
                                      title="Remove this description"
                                    >
                                      <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => setSelectedTask(prev => ({ ...prev, descriptions: [...(prev.descriptions || [prev.description || '']), ''] }))}
                              className="flex items-center gap-1.5 px-2.5 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 hover:border-amber-300 rounded-lg transition-all duration-200 w-full justify-center"
                            >
                              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              Add Description
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Assign To *</label>
                            {employeesLoading ? (
                              <div className="flex items-center space-x-1.5 px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                <span className="text-slate-500 text-[11px] sm:text-sm">Loading...</span>
                              </div>
                            ) : (
                              <select
                                value={selectedTask?.assignedTo?._id || ''}
                                onChange={(e) => {
                                  const employee = employees.find(emp => emp._id === e.target.value);
                                  setSelectedTask({ ...selectedTask, assignedTo: employee });
                                }}
                                className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                required
                              >
                                <option value="">Select Employee</option>
                                {getAssignableEmployees().map(emp => (
                                  <option key={emp._id} value={emp._id}>
                                    {emp.fullName || `${emp.personalInfo?.firstName} ${emp.personalInfo?.lastName}` || emp.user?.name || 'Unknown'}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Priority *</label>
                            <select
                              value={selectedTask?.priority || ''}
                              onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value })}
                              className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                              <option value="Critical">Critical</option>
                            </select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:gap-4">
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Due Date *</label>
                            <input
                              type="date"
                              value={selectedTask?.dueDate?.split('T')[0] || ''}
                              onChange={(e) => setSelectedTask({ ...selectedTask, dueDate: e.target.value })}
                              className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] sm:text-sm font-semibold text-slate-600 mb-0.5 sm:mb-2">Est. Hours *</label>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={selectedTask?.estimatedHours || ''}
                              onChange={(e) => setSelectedTask({ ...selectedTask, estimatedHours: parseFloat(e.target.value) || 0 })}
                              className="w-full px-2.5 sm:px-4 py-1.5 sm:py-3 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              required
                            />
                          </div>
                        </div>
                      </div>
                      <div className="sticky bottom-0 z-10 flex shrink-0 justify-end space-x-2 sm:space-x-4 border-t border-slate-100 bg-white/95 pt-2 backdrop-blur sm:pt-4">
                        <button
                          type="button"
                          onClick={() => setShowEditModal(false)}
                          className="px-3 sm:px-6 py-1.5 sm:py-3 border border-slate-200 text-xs sm:text-sm text-slate-700 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={employeesLoading}
                          className="px-3 sm:px-6 py-1.5 sm:py-3 bg-blue-600 text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-2 inline" />
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
                <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-2 md:p-4">
                  <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowViewModal(false)} />
                  <div className="task-details-modal-scroll relative w-full rounded-t-3xl border border-slate-200 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.20)] max-h-[94dvh] overflow-y-auto sm:rounded-2xl sm:max-w-2xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl sm:max-h-[88vh]">

                    {/* Modal Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3.5 py-3 sm:px-6 sm:py-5">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-blue-500 mb-0.5 truncate">Task Details</p>
                        <h2 className="text-xs sm:text-lg font-bold tracking-tight text-slate-900 truncate">{selectedTask.title || 'Untitled Task'}</h2>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-semibold ${getStatusColor(selectedTask.status)}`}>
                          {selectedTask.status}
                        </span>
                        <button
                          onClick={() => {
                            const existingDescs = selectedTask?.description
                              ? selectedTask.description.split('\n\n').filter(d => d.trim()).map(d => d.trim())
                              : [''];
                            setSelectedTask(prev => ({ ...prev, descriptions: existingDescs.length > 0 ? existingDescs : [''] }));
                            setShowViewModal(false);
                            setShowEditModal(true);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 sm:px-3 sm:py-1.5 text-[11px] sm:text-xs font-semibold text-blue-700 transition-all duration-200 hover:border-blue-200 hover:bg-blue-100"
                        >
                          <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          Edit
                        </button>
                        <button onClick={() => setShowViewModal(false)} className="p-1 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all">
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                      </div>
                    </div>

                    {modalLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">

                        {/* ── LEFT COLUMN: Descriptions + Comments ── */}
                        <div className="space-y-5 border-b border-slate-100 p-5 sm:p-6 lg:border-b-0 lg:border-r">

                          {/* Descriptions */}
                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Descriptions</p>
                            <div className="space-y-2">
                              {((selectedTask.description || '').split('\n\n').map(s => s.trim()).filter(Boolean).length > 0
                                ? (selectedTask.description || '').split('\n\n').map(s => s.trim()).filter(Boolean)
                                : ['No description']
                              ).map((desc, idx) => (
                                <div key={idx} className="flex gap-3 items-start rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 hover:bg-slate-100/60 transition-colors">
                                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">{idx + 1}</span>
                                  <p className="text-[12.5px] leading-relaxed text-slate-800 flex-1 min-w-0 sm:text-sm">{desc}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Comments */}
                          {selectedTask.comments && selectedTask.comments.length > 0 && (
                            <div>
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                                Comments
                                <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">{selectedTask.comments.length}</span>
                              </p>
                              <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {selectedTask.comments.slice(-5).map((comment) => (
                                  <div key={comment._id} className="rounded-xl border border-slate-200 bg-white p-3">
                                    <div className="mb-1 flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                                        <User className="w-2.5 h-2.5 text-white" />
                                      </div>
                                      <span className="text-[11.5px] font-semibold text-slate-900">{comment.user?.name || 'Unknown'}</span>
                                      <span className="text-[9.5px] text-slate-400">{formatDate(comment.createdAt)}</span>
                                    </div>
                                    <p className="text-[11px] leading-snug text-slate-600 pl-7">{comment.text}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* ── RIGHT COLUMN: Meta + Progress + Review ── */}
                        <div className="space-y-5 bg-slate-50/50 p-5 sm:p-6">

                          {/* Meta info */}
                          <div>
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">Info</p>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                {
                                  label: 'Assigned To',
                                  primary: selectedTask.assignedTo?.user?.name || selectedTask.assignedTo?.fullName || 'Unknown',
                                  secondary: selectedTask.assignedTo?.user?.employeeId || selectedTask.assignedTo?.employeeId
                                },
                                {
                                  label: 'Assigned From',
                                  primary: selectedTask.isSelfAssigned ? 'Self (Employee)' : selectedTask.assignedBy?.name || 'Admin'
                                },
                                { label: 'Due Date', primary: formatDate(selectedTask.dueDate), red: isOverdue(selectedTask.dueDate, selectedTask.status) },
                                { label: 'Created', primary: formatDate(selectedTask.createdAt) },
                                { label: 'Last Updated', primary: formatDate(selectedTask.updatedAt) },
                                { label: 'Hours', primary: `${Math.round(selectedTask.actualHours || 0)} / ${selectedTask.estimatedHours || 0} hrs` },
                              ].map(({ label, primary, secondary, red }) => (
                                <div key={label} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                  <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
                                  <p className={`text-[12px] font-semibold leading-snug ${red ? 'text-red-600' : 'text-slate-900'}`}>{primary}</p>
                                  {secondary && <p className="text-[9.5px] text-slate-400 mt-0.5">{secondary}</p>}
                                </div>
                              ))}
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                <p className="text-[9.5px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Priority</p>
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold ${getPriorityColor(selectedTask.priority)}`}>
                                  {selectedTask.priority}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Progress */}
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Progress</p>
                              <span className="text-sm font-bold text-blue-600">{selectedTask.progress}%</span>
                            </div>
                            <div className="w-full rounded-full bg-slate-200 h-2.5">
                              <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: selectedTask.progress + '%' }} />
                            </div>
                          </div>

                          {/* Review Panel */}
                          {selectedTask.status === 'Review' && (
                            <div className="rounded-xl border border-purple-100 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-2.5 sm:p-4 shadow-[0_4px_20px_rgba(79,70,229,0.08)]">
                              <div className="mb-2 sm:mb-3 flex items-center justify-between gap-1.5">
                                <div>
                                  <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider sm:tracking-widest text-purple-700">Review Decision</p>
                                  <p className="mt-0.5 text-[9px] sm:text-[10px] text-slate-500 leading-snug">Approve, request changes, or reject.</p>
                                </div>
                                <span className="rounded-full bg-purple-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-[9px] font-bold text-purple-700 whitespace-nowrap">Pending</span>
                              </div>
                              <textarea
                                value={reviewFeedback}
                                onChange={(e) => setReviewFeedback(e.target.value)}
                                rows={2}
                                placeholder="Feedback for rejection or changes..."
                                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10.5px] sm:text-[11.5px] text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                              />
                              <div className="mt-2 sm:mt-2.5 grid grid-cols-3 gap-1 sm:gap-2">
                                <button type="button" onClick={() => handleReviewTask('approve')} disabled={!!reviewLoading}
                                  className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-1 py-1 sm:px-2.5 sm:py-2 text-[9px] sm:text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-500 disabled:opacity-60">
                                  {reviewLoading === 'approve' ? <Loader2 className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3 animate-spin" /> : <CheckCircle className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />}
                                  Approve
                                </button>
                                <button type="button" onClick={() => handleReviewTask('changes')} disabled={!!reviewLoading}
                                  className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-1 py-1 sm:px-2.5 sm:py-2 text-[9px] sm:text-[11px] font-bold text-white shadow-xs transition hover:bg-amber-400 disabled:opacity-60">
                                  {reviewLoading === 'changes' ? <Loader2 className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3 animate-spin" /> : <RefreshCw className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />}
                                  Changes
                                </button>
                                <button type="button" onClick={() => handleReviewTask('reject')} disabled={!!reviewLoading}
                                  className="inline-flex items-center justify-center rounded-lg bg-red-600 px-1 py-1 sm:px-2.5 sm:py-2 text-[9px] sm:text-[11px] font-bold text-white shadow-xs transition hover:bg-red-500 disabled:opacity-60">
                                  {reviewLoading === 'reject' ? <Loader2 className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3 animate-spin" /> : <AlertTriangle className="mr-0.5 h-2.5 w-2.5 sm:mr-1 sm:h-3 sm:w-3" />}
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            }
          </div>
        ) : activeTab === 'daybooks' ? (
          <AdminDayBookReview search={searchTerm} />
        ) : (
          <AdminPerformanceReview search={searchTerm} />
        )}
      </div>
    </AdminLayout >
  );
};

export default AdminTaskManagement;
