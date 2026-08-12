import React, { useState, useEffect } from 'react';
import EmployeeLayout from '../../components/Employee/EmployeeLayout/EmployeeLayout';
import {
  Target,
  Clock,
  CheckCircle,
  Eye,
  Play,
  Pause,
  Flag,
  Calendar,
  BarChart3,
  MessageCircle,
  Plus,
  X,
  Send,
  AlertTriangle,
  User,
  FileText,
  Filter,
  Loader2,   // Add loading spinner
  ClipboardList,
  RefreshCcw,
  Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import your API services
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/taskService';
import DayBookEntry from './DayBookEntry';
import MyPerformanceCard from '../../components/Employee/MyPerformanceCard';
import SearchWithSuggestions from '../../components/Common/SearchWithSuggestions';

const TASK_TIMER_STORAGE_KEY = 'employeeTaskTimers';

const EmployeeTasks = () => {
  const { user } = useAuth();
  const {
    tasks,
    loading,
    error,
    stats,
    filters,
    setFilters,
    updateProgress,
    updateTask,
    changeStatus,
    addComment,
    toggleSubtask,
    fetchTasks
  } = useTasks();

  const [filteredTasks, setFilteredTasks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [timeTracking, setTimeTracking] = useState(() => {
    try {
      const storedTimers = localStorage.getItem(TASK_TIMER_STORAGE_KEY);
      return storedTimers ? JSON.parse(storedTimers) : {};
    } catch {
      return {};
    }
  });
  const [timerTick, setTimerTick] = useState(Date.now());
  const [modalLoading, setModalLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDayBookModal, setShowDayBookModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    estimatedHours: 0
  });
  const [editTask, setEditTask] = useState({
    _id: '',
    title: '',
    description: '',
    priority: 'Medium',
    dueDate: '',
    estimatedHours: 0
  });

  // Filter tasks based on frontend filters
  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let filtered = tasks.filter(task => {
      const searchableText = `${task.title || ''} ${task.description || ''}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesPriority;
    });

    setFilteredTasks(filtered);
  }, [tasks, searchTerm, statusFilter, priorityFilter]);

  useEffect(() => {
    const hasRunningTimer = Object.values(timeTracking).some((timer) => timer?.isRunning);
    if (!hasRunningTimer) return undefined;

    const intervalId = setInterval(() => setTimerTick(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [timeTracking]);

  useEffect(() => {
    localStorage.setItem(TASK_TIMER_STORAGE_KEY, JSON.stringify(timeTracking));
  }, [timeTracking]);

  // Handle task status update
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const response = await changeStatus(taskId, newStatus);
      if (response?.task && selectedTask?._id === taskId) {
        setSelectedTask(response.task);
      }
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  // Handle task progress update
  const updateTaskProgress = async (taskId, progress) => {
    try {
      await updateProgress(taskId, Math.max(0, Math.min(100, progress)));
    } catch (error) {
      toast.error('Failed to update task progress');
    }
  };

  // Handle subtask toggle
  const handleToggleSubtask = async (taskId, subtaskId) => {
    try {
      await toggleSubtask(taskId, subtaskId);

      // Update progress based on subtasks for the selected task in modal
      if (selectedTask && selectedTask._id === taskId) {
        const updatedTask = tasks.find(t => t._id === taskId);
        if (updatedTask && updatedTask.subtasks.length > 0) {
          const completedSubtasks = updatedTask.subtasks.filter(st => st.completed).length;
          const totalSubtasks = updatedTask.subtasks.length;
          const newProgress = Math.round((completedSubtasks / totalSubtasks) * 100);
          await updateTaskProgress(taskId, newProgress);
        }
      }
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  // Handle add comment
  const handleAddComment = async (taskId) => {
    if (!newComment.trim()) return;

    try {
      await addComment(taskId, newComment.trim());
      setNewComment('');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // Time tracking functions
  const startTimer = (taskId) => {
    setTimeTracking((prev) => {
      const currentTimer = prev[taskId];
      if (currentTimer?.isRunning) return prev;

      return {
        ...prev,
        [taskId]: {
          isRunning: true,
          startTime: Date.now(),
          elapsed: currentTimer?.elapsed || 0
        }
      };
    });
    toast.success('Timer started');
  };

  const stopTimer = (taskId) => {
    let stoppedElapsed = null;

    setTimeTracking((prev) => {
      const tracking = prev[taskId];
      if (!tracking?.isRunning) return prev;

      const newElapsed = tracking.elapsed + (Date.now() - tracking.startTime);
      stoppedElapsed = newElapsed;

      return {
        ...prev,
        [taskId]: {
          ...tracking,
          isRunning: false,
          elapsed: newElapsed
        }
      };
    });

    if (stoppedElapsed !== null) {
      toast.success(`Timer stopped. Session: ${formatTime(stoppedElapsed)}`);
    }
  };

  // Get task details for modal
  const handleViewTask = async (task) => {
    try {
      setModalLoading(true);
      setSelectedTask(task);
      setShowTaskModal(true);

      // Optionally fetch fresh task data
      const response = await taskService.getTaskById(task._id);
      setSelectedTask(response.task);
    } catch (error) {
      toast.error('Failed to load task details');
    } finally {
      setModalLoading(false);
    }
  };

  const isTaskActionClick = (event) =>
    event.target.closest('button, a, input, select, textarea, label');

  const openTaskRow = (event, task) => {
    if (isTaskActionClick(event)) return;
    handleViewTask(task);
  };

  const openEditTask = (task) => {
    if (task.status === 'Completed') {
      toast.error('Completed tasks cannot be edited');
      return;
    }

    setEditTask({
      _id: task._id,
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'Medium',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
      estimatedHours: task.estimatedHours || 0
    });
    setShowEditModal(true);
  };

  const handleEditTask = async (e) => {
    e.preventDefault();

    if (!editTask.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    if (!editTask.description.trim()) {
      toast.error('Task description is required');
      return;
    }

    if (!editTask.dueDate) {
      toast.error('Due date is required');
      return;
    }

    try {
      const response = await updateTask(editTask._id, {
        title: editTask.title.trim(),
        description: editTask.description.trim(),
        priority: editTask.priority || 'Medium',
        dueDate: editTask.dueDate,
        estimatedHours: parseFloat(editTask.estimatedHours) || 0
      });

      if (response?.task && selectedTask?._id === editTask._id) {
        setSelectedTask(response.task);
      }

      setShowEditModal(false);
      toast.success('Task updated. Submit it for review when ready.');
      await fetchTasks();
    } catch (error) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      if (!newTask.title?.trim()) {
        toast.error("Task title is required");
        return;
      }

      if (!newTask.description?.trim()) {
        toast.error("Task description is required");
        return;
      }

      if (!newTask.dueDate) {
        toast.error("Due date is required");
        return;
      }

      const taskPayload = {
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        assignedTo: user.employeeId, // The hook/backend will handle this, but passing employee ref
        priority: newTask.priority || 'Medium',
        dueDate: newTask.dueDate,
        estimatedHours: parseInt(newTask.estimatedHours) || 0
      };

      // Need to find the actual employee _id from user object if available
      // Actually, the backend should handle finding the employee from req.user.id
      // But createTask requires assignedTo. Let's find it.

      const response = await taskService.createTask({
        ...taskPayload,
        assignedTo: user.id // Assuming user.id is the employee _id or the hook handles it
      });

      if (response.success) {
        toast.success("Task self-assigned successfully");
        setShowAddModal(false);
        setNewTask({
          title: '',
          description: '',
          priority: 'Medium',
          dueDate: '',
          estimatedHours: 0
        });
        fetchTasks();
      }
    } catch (error) {
      console.error('Add task error:', error);
      toast.error(error.message || "Failed to add task");
    }
  };
  // Utility functions
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'not started': return 'text-slate-600 bg-slate-100';
      case 'in progress': return 'text-indigo-700 bg-indigo-100';
      case 'completed': return 'text-emerald-700 bg-emerald-100';
      case 'review': return 'text-indigo-700 bg-indigo-100';
      case 'on hold': return 'text-amber-700 bg-amber-100';
      case 'cancelled': return 'text-red-700 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'text-emerald-700 bg-emerald-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'high': return 'text-amber-700 bg-amber-100';
      case 'critical': return 'text-red-700 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const isOverdue = (dueDate, status) => {
    return status !== 'Completed' && new Date(dueDate) < new Date();
  };

  const formatTime = (ms) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m ${seconds}s`;
  };

  const getTimerElapsed = (taskId) => {
    const tracking = timeTracking[taskId];
    if (!tracking) return 0;
    if (!tracking.isRunning) return tracking.elapsed || 0;
    return (tracking.elapsed || 0) + (timerTick - tracking.startTime);
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
      <EmployeeLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full bg-indigo-50 p-3 ring-1 ring-indigo-100">
              <Loader2 strokeWidth={1.75} className="h-6 w-6 animate-spin text-indigo-600" />
            </div>
            <p className="text-[13px] font-medium text-slate-500">Loading tasks...</p>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <EmployeeLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="employee-tasks-panel text-center bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-8 max-w-md">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle strokeWidth={1.75} className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 mb-2">Error Loading Tasks</h3>
            <p className="text-[13px] text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => fetchTasks()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition-colors duration-150"
            >
              Try Again
            </button>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

 const TaskDetailModal = () => (
  <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 lg:left-[248px] lg:p-6">
    <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowTaskModal(false)} />

    <div className="employee-tasks-modal relative flex max-h-[96dvh] w-[calc(100vw-0.75rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.18)] sm:max-h-[calc(100dvh-1rem)] sm:w-full sm:max-w-2xl sm:rounded-2xl lg:max-h-[90vh] lg:max-w-5xl">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-2 sm:px-5 sm:py-3">
        <h2 className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-slate-900 sm:text-base">Task Details</h2>
        <div className="flex items-center gap-2">
          {selectedTask?.status !== 'Completed' && (
            <button
              onClick={() => openEditTask(selectedTask)}
              className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-1.5 text-[12px] font-semibold text-indigo-700 transition-colors duration-150 hover:bg-indigo-100"
            >
              <Edit3 strokeWidth={1.75} className="mr-1.5 h-4 w-4" />
              Edit
            </button>
          )}
          <button
            onClick={() => setShowTaskModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-150"
          >
            <X strokeWidth={1.75} className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      <div className="employee-task-detail-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2.5 sm:px-5 sm:py-4">
      {modalLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 strokeWidth={1.75} className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : selectedTask && (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)] lg:items-start">
          {/* Main Task Info */}
          <div className="space-y-2.5 sm:space-y-4">

            {/* Task + Progress combined */}
            <div className="employee-tasks-row rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 sm:p-4">
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-[13.5px] font-semibold leading-tight text-slate-900 sm:text-[15px]">{selectedTask.title}</h3>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] sm:text-[12px] ${getStatusColor(selectedTask.status)}`}>
                  {selectedTask.status}
                </span>
              </div>
              <p className="mb-2.5 break-words text-[12px] leading-snug text-slate-500 sm:text-[13px]">{selectedTask.description}</p>

              <div className="grid grid-cols-3 gap-x-2 gap-y-2 text-[11.5px] sm:text-[12.5px] mb-3">
                <div className="min-w-0">
                  <span className="text-slate-500">Project</span>
                  <p className="truncate font-medium text-slate-900">{selectedTask.project || '—'}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500">Category</span>
                  <p className="truncate font-medium text-slate-900">{selectedTask.category}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500">Priority</span>
                  <p><span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] sm:text-[11.5px] ${getPriorityColor(selectedTask.priority)}`}>{selectedTask.priority}</span></p>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500">Due</span>
                  <p className={`font-medium ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatDate(selectedTask.dueDate)}
                  </p>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500">By</span>
                  <p className="truncate font-medium text-slate-900">{selectedTask.assignedBy?.name || 'Admin'}</p>
                </div>
                <div className="min-w-0">
                  <span className="text-slate-500">Created</span>
                  <p className="font-medium text-slate-900">{formatDate(selectedTask.createdAt)}</p>
                </div>
              </div>

              {/* Progress bar inline here instead of its own card */}
              <div className="border-t border-slate-200/80 pt-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-slate-600">Progress</span>
                  <span className="text-indigo-600 font-semibold text-[12.5px]">{selectedTask.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={selectedTask.progress}
                  onChange={(e) => updateTaskProgress(selectedTask._id, parseInt(e.target.value))}
                  className="h-1.5 w-full cursor-pointer accent-indigo-600"
                  disabled={selectedTask.status === 'Completed'}
                />
              </div>
            </div>

            {/* Subtasks */}
            {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
              <div className="employee-tasks-row rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 sm:p-4">
                <h4 className="mb-2 text-[12.5px] font-semibold text-slate-900 sm:text-[14px]">
                  Subtasks ({selectedTask.subtasks.filter(st => st.completed).length}/{selectedTask.subtasks.length})
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                  {selectedTask.subtasks.map((subtask) => (
                    <div key={subtask._id} className="employee-tasks-inner-row flex items-center space-x-2 rounded-lg border border-slate-200/80 bg-white p-1.5 text-[11.5px] sm:text-[12.5px]">
                      <input
                        type="checkbox"
                        checked={subtask.completed}
                        onChange={() => handleToggleSubtask(selectedTask._id, subtask._id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500/30"
                      />
                      <span className={`flex-1 truncate ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                        {subtask.title}
                      </span>
                      {subtask.completedAt && (
                        <span className="text-[10.5px] text-slate-400 shrink-0">{formatDate(subtask.completedAt)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="employee-tasks-row rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 sm:p-4">
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-900 sm:text-[14px]">
                Comments ({selectedTask.comments?.length || 0})
              </h4>

              <div className="mb-2 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {selectedTask.comments && selectedTask.comments.length > 0 ? (
                  selectedTask.comments.map((comment) => (
                    <div key={comment._id} className="rounded-lg border border-slate-200 bg-white p-1.5 sm:p-2.5">
                      <div className="mb-1 flex items-center space-x-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 shrink-0">
                          <User strokeWidth={1.75} className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-slate-900 font-medium text-[12px] truncate">{comment.user?.name || 'Unknown User'}</span>
                        <span className="text-slate-400 text-[10.5px] shrink-0">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="break-words text-[11.5px] leading-snug text-slate-600">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-slate-400">No comments yet</p>
                )}
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_40px] gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="min-w-0 rounded-lg border border-slate-200/80 bg-white px-3 py-1.5 text-[12.5px] text-slate-900 transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment(selectedTask._id)}
                />
                <button
                  onClick={() => handleAddComment(selectedTask._id)}
                  disabled={!newComment.trim()}
                  className="flex items-center justify-center rounded-lg bg-indigo-50 px-2 py-1.5 text-indigo-700 transition-colors duration-150 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send strokeWidth={1.75} className="w-[16px] h-[16px]" />
                </button>
              </div>
            </div>
          </div>

          {/* Side Info */}
          <div className="space-y-2.5 sm:space-y-4">
            {/* Time Tracking */}
            <div className="employee-tasks-row rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 sm:p-4">
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-900 sm:text-[14px]">Time Tracking</h4>
              <div className="space-y-1.5 text-[11.5px] sm:text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Estimated</span>
                  <span className="text-slate-900">{selectedTask.estimatedHours || 0}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Actual</span>
                  <span className="text-slate-900">{Math.round(selectedTask.actualHours || 0)}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Session</span>
                  <span className="text-indigo-600">{formatTime(getTimerElapsed(selectedTask._id))}</span>
                </div>
              </div>

              <div className="mt-2.5">
                {timeTracking[selectedTask._id]?.isRunning ? (
                  <button
                    onClick={() => stopTimer(selectedTask._id)}
                    className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-150 flex items-center justify-center text-[12.5px] font-semibold"
                  >
                    <Pause strokeWidth={1.75} className="w-[16px] h-[16px] mr-2" />
                    Stop Timer
                  </button>
                ) : (
                  <button
                    onClick={() => startTimer(selectedTask._id)}
                    className="w-full px-3 py-2 bg-white border border-slate-200/80 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center justify-center disabled:opacity-50 text-[12.5px] font-semibold"
                    disabled={selectedTask.status === 'Completed'}
                  >
                    <Play strokeWidth={1.75} className="w-[16px] h-[16px] mr-2" />
                    Start Timer
                  </button>
                )}
              </div>
            </div>

            {/* Task Actions — 2-col grid on all breakpoints to save height */}
            <div className="employee-tasks-row rounded-lg border border-slate-200/80 bg-slate-50 p-2.5 sm:p-4">
              <h4 className="mb-2 text-[12.5px] font-semibold text-slate-900 sm:text-[14px]">Actions</h4>
              {selectedTask.status !== 'Completed' ? (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => updateTaskStatus(selectedTask._id, 'In Progress')}
                    disabled={selectedTask.status === 'In Progress'}
                    className="w-full rounded-lg bg-indigo-50 px-2 py-2 text-[11.5px] font-semibold text-indigo-700 transition-colors duration-150 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedTask.status === 'In Progress' ? 'In Progress' : 'Start Task'}
                  </button>
                  <button
                    onClick={() => updateTaskStatus(selectedTask._id, 'On Hold')}
                    disabled={selectedTask.status === 'On Hold'}
                    className="w-full rounded-lg bg-amber-100 px-2 py-2 text-[11.5px] font-semibold text-amber-700 transition-colors duration-150 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedTask.status === 'On Hold' ? 'On Hold' : 'Put On Hold'}
                  </button>
                  <button
                    onClick={() => updateTaskStatus(selectedTask._id, 'Review')}
                    disabled={selectedTask.status === 'Review'}
                    className="w-full rounded-lg bg-indigo-100 px-2 py-2 text-[11.5px] font-semibold text-indigo-700 transition-colors duration-150 hover:bg-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {selectedTask.status === 'Review' ? 'In Review' : 'Submit Review'}
                  </button>
                  <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center text-[11.5px] font-medium text-slate-500">
                    Admin approves completion
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <div className="w-11 h-11 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle strokeWidth={1.75} className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-emerald-700 font-medium text-[13px]">Task Completed!</p>
                  <p className="text-slate-500 text-[11.5px] mt-1">
                    Completed on {formatDate(selectedTask.completedDate || selectedTask.updatedAt)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  </div>
);

  return (
    <EmployeeLayout>
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-enter {
          animation: fadeSlideUp 0.4s ease-out both;
        }
        .employee-task-detail-scroll {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .employee-task-detail-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="employee-tasks-page space-y-5 bg-slate-50">
        {/* Header */}
        <div className="employee-tasks-panel bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-slate-900">My Tasks</h1>
            <p className="text-[13px] text-slate-500">Track and manage your assigned tasks</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors duration-150 flex items-center text-[13px]"
              >
                <Plus strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                Add Self-Task
              </button>
              <button
                type="button"
                onClick={() => setShowDayBookModal(true)}
                className="px-4 py-2 bg-white border border-slate-200/80 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center text-[13px]"
              >
                <FileText strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                Day Book (EOD)
              </button>
              <button
                type="button"
                onClick={() => setShowPerformanceModal(true)}
                className="px-4 py-2 bg-white border border-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-50 transition-colors duration-150 flex items-center text-[13px]"
              >
                <BarChart3 strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                My Performance
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[13.5px] font-semibold text-slate-900">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-[12px] text-slate-500">Welcome back, {user?.name}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-4 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[19px] font-semibold tracking-tight text-slate-900">{stats?.total || 0}</h3>
                <p className="text-[12px] text-slate-500">Total Tasks</p>
              </div>
              <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center ring-1 ring-indigo-100">
                <Target strokeWidth={1.75} className="w-[18px] h-[18px] text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-4 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[19px] font-semibold tracking-tight text-indigo-600">{stats?.inProgress || 0}</h3>
                <p className="text-[12px] text-slate-500">In Progress</p>
              </div>
              <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center ring-1 ring-amber-100">
                <Clock strokeWidth={1.75} className="w-[18px] h-[18px] text-amber-600" />
              </div>
            </div>
          </div>

          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-4 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[19px] font-semibold tracking-tight text-emerald-600">{stats?.completed || 0}</h3>
                <p className="text-[12px] text-slate-500">Completed</p>
              </div>
              <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center ring-1 ring-emerald-100">
                <CheckCircle strokeWidth={1.75} className="w-[18px] h-[18px] text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-4 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[19px] font-semibold tracking-tight text-red-600">{stats?.overdue || 0}</h3>
                <p className="text-[12px] text-slate-500">Overdue</p>
              </div>
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center ring-1 ring-red-100">
                <AlertTriangle strokeWidth={1.75} className="w-[18px] h-[18px] text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="employee-tasks-panel bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start">
            <div className="relative md:min-w-[320px] md:flex-1">
              <SearchWithSuggestions
                value={searchTerm}
                onChange={setSearchTerm}
                items={tasks}
                getSuggestionValue={(task) => task.title || task.description || ''}
                getSuggestionTitle={(task) => task.title || 'Untitled Task'}
                getSuggestionSubtitle={(task) => task.description || 'No description'}
                placeholder="Search by title or description..."
                inputClassName="border-slate-200/80 text-[13px]"
              />
            </div>
            <div className="relative">
              <Filter strokeWidth={1.75} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
              >
                <option value="">All Status</option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Review">Review</option>
                <option value="Completed">Completed</option>
                <option value="On Hold">On Hold</option>
              </select>
            </div>

            <div className="relative">
              <Flag strokeWidth={1.75} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-[18px] h-[18px] text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
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
              className="px-4 py-3 bg-white border border-slate-200/80 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors duration-150 text-[13px] font-medium"
            >
              Clear Filters
            </button>

            <button
              onClick={() => fetchTasks()}
              className="px-4 py-3 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-150 flex items-center text-[13px] font-medium"
            >
              <RefreshCcw strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tasks List */}
        <div className="employee-tasks-panel overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="hidden grid-cols-[minmax(260px,1.5fr)_110px_130px_120px_minmax(150px,0.8fr)_230px] items-center gap-4 border-b border-slate-100 bg-slate-50/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 xl:grid">
            <span>Task</span>
            <span>Priority</span>
            <span>Due Date</span>
            <span>Status</span>
            <span>Progress</span>
            <span className="text-right">Actions</span>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTasks.map((task, index) => (
              <div
                key={task._id}
                onClick={(event) => openTaskRow(event, task)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openTaskRow(event, task);
                  }
                }}
                className="employee-task-row animate-enter grid cursor-pointer gap-4 px-4 py-4 transition-colors duration-150 hover:bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-100 sm:px-5 xl:grid-cols-[minmax(260px,1.5fr)_110px_130px_120px_minmax(150px,0.8fr)_230px] xl:items-center"
                style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 xl:block">
                    <h3 className="min-w-0 truncate text-[14px] font-semibold text-slate-900">{task.title || 'Untitled Task'}</h3>
                    {isOverdue(task.dueDate, task.status) && (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 xl:mt-2">
                        <AlertTriangle strokeWidth={1.75} className="mr-1 h-3.5 w-3.5" />
                        Overdue
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-slate-500">{task.description || 'No description'}</p>
                  <p className="mt-2 text-[12px] text-slate-400 xl:hidden">Project: <span className="font-medium text-slate-600">{task.project || 'N/A'}</span></p>
                </div>

                <div className="text-[13px] xl:hidden">
                  <p className="mb-1 text-[11px] font-medium uppercase text-slate-400">Priority</p>
                  <span className={`inline-flex h-7 w-fit items-center justify-center rounded-full px-3 text-[11.5px] font-medium leading-none ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>

                <div className="text-[13px] xl:hidden">
                  <p className="mb-1 text-[11px] font-medium uppercase text-slate-400">Due</p>
                  <span className={`font-medium tabular-nums ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>

                <div className="text-[13px] xl:hidden">
                  <p className="mb-1 text-[11px] font-medium uppercase text-slate-400">Status</p>
                  <span className={`inline-flex h-7 w-fit items-center justify-center rounded-full px-3 text-[11.5px] font-medium leading-none ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <div className="hidden xl:block">
                  <span className={`inline-flex h-7 w-fit items-center justify-center rounded-full px-3 text-[11.5px] font-medium leading-none ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>

                <div className={`hidden text-[13px] font-medium tabular-nums xl:block ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatDate(task.dueDate)}
                </div>

                <div className="hidden xl:block">
                  <span className={`inline-flex h-7 w-fit items-center justify-center rounded-full px-3 text-[11.5px] font-medium leading-none ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium uppercase text-slate-400 xl:hidden">Progress</span>
                    <span className="text-[12px] font-semibold text-indigo-600">{task.progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                  <button
                    onClick={() => handleViewTask(task)}
                    className="inline-flex items-center rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-[12.5px] font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                  >
                    <Eye strokeWidth={1.75} className="mr-2 h-4 w-4" />
                    
                  </button>
                  {task.status !== 'Completed' && (
                    <>
                      <button
                        onClick={() => openEditTask(task)}
                        className="inline-flex items-center rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-[12.5px] font-semibold text-indigo-700 transition-colors duration-150 hover:bg-indigo-100"
                      >
                        <Edit3 strokeWidth={1.75} className="mr-2 h-4 w-4" />
                        
                      </button>
                      {timeTracking[task._id]?.isRunning ? (
                        <button
                          onClick={() => stopTimer(task._id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-red-50 hover:text-red-600"
                          title="Stop Timer"
                        >
                          <Pause strokeWidth={1.75} className="h-[18px] w-[18px]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startTimer(task._id)}
                          className="rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-emerald-50 hover:text-emerald-600"
                          title="Start Timer"
                        >
                          <Play strokeWidth={1.75} className="h-[18px] w-[18px]" />
                        </button>
                      )}
                      <button
                        onClick={() => updateTaskStatus(task._id, 'Review')}
                        disabled={task.status === 'Review'}
                        className="rounded-lg p-2 text-slate-400 transition-colors duration-150 hover:bg-indigo-50 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-45"
                        title={task.status === 'Review' ? 'Submitted for Review' : 'Submit for Review'}
                      >
                        <CheckCircle strokeWidth={1.75} className="h-[18px] w-[18px]" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredTasks.length === 0 && (
          <div className="employee-tasks-panel bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <ClipboardList strokeWidth={1.75} className="w-6 h-6 text-slate-400" />
            </div>
            <h3 className="text-[15px] font-semibold text-slate-900 mb-2">No tasks found</h3>
            <p className="text-[13px] text-slate-500">
              {statusFilter || priorityFilter
                ? 'Try adjusting your filters to see more tasks'
                : 'You have no assigned tasks at the moment'}
            </p>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      {showTaskModal && <TaskDetailModal />}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-sm" onClick={() => setShowEditModal(false)} />
          <div className="employee-tasks-modal relative w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Edit Task</h2>
                <p className="mt-1 text-[12px] text-slate-500">You can update this task until admin approval is complete.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-600">
                <X strokeWidth={1.75} className="h-[18px] w-[18px]" />
              </button>
            </div>

            <form onSubmit={handleEditTask} className="space-y-5 p-5">
              <div>
                <label className="mb-2 block text-[13px] font-medium text-slate-700">Title *</label>
                <input
                  type="text"
                  value={editTask.title}
                  onChange={(e) => setEditTask({ ...editTask, title: e.target.value })}
                  placeholder="Task title"
                  className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[13px] text-slate-900 placeholder-slate-400 transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>
              <div>
                <label className="mb-2 block text-[13px] font-medium text-slate-700">Description *</label>
                <textarea
                  value={editTask.description}
                  onChange={(e) => setEditTask({ ...editTask, description: e.target.value })}
                  rows="4"
                  placeholder="Update task details..."
                  className="w-full resize-none rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[13px] text-slate-900 placeholder-slate-400 transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-700">Priority</label>
                  <select
                    value={editTask.priority}
                    onChange={(e) => setEditTask({ ...editTask, priority: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[13px] text-slate-900 transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-700">Due Date *</label>
                  <input
                    type="date"
                    value={editTask.dueDate}
                    onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[13px] text-slate-900 transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-slate-700">Estimated Hours</label>
                  <input
                    type="number"
                    value={editTask.estimatedHours}
                    onChange={(e) => setEditTask({ ...editTask, estimatedHours: e.target.value })}
                    min="0"
                    step="0.5"
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-[13px] text-slate-900 transition-colors duration-150 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-[12.5px] leading-relaxed text-amber-800">
                If this task was in review or waiting for changes, saving edits moves it back to In Progress. Submit it for review again when ready.
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded-xl border border-slate-200/80 bg-white px-5 py-2.5 text-[13px] font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-indigo-500"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Day Book Modal */}
     {showDayBookModal && (
  <div className="fixed bottom-0 left-0 right-0 top-14 z-[9999] flex items-start justify-center overflow-y-auto p-2 sm:items-center sm:p-3 lg:inset-y-0 lg:left-64">
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowDayBookModal(false)} />
    <div className="employee-tasks-modal relative h-full w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.18)] animate-enter sm:h-auto sm:max-h-[84vh]">
      <button
        onClick={() => setShowDayBookModal(false)}
        className="absolute right-3 top-3 z-20 p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors duration-150"
        title="Close"
      >
        <X strokeWidth={1.75} className="w-[18px] h-[18px]" />
      </button>
      <DayBookEntry embedded onClose={() => setShowDayBookModal(false)} />
    </div>
  </div>
)}

      {/* Performance Modal */}
      {showPerformanceModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 lg:left-64">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowPerformanceModal(false)} />
          <div className="employee-tasks-modal relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50 shadow-[0_24px_70px_rgba(15,23,42,0.18)] animate-enter">
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-5 py-4">
              <div>
                <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">My Performance</h2>
                <p className="mt-1 text-[12px] text-slate-500">Monthly task performance, rating, and admin feedback</p>
              </div>
              <button
                onClick={() => setShowPerformanceModal(false)}
                className="rounded-lg p-1.5 text-slate-400 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-700"
                title="Close"
              >
                <X strokeWidth={1.75} className="w-[18px] h-[18px]" />
              </button>
            </div>
            <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-5">
              <MyPerformanceCard />
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="employee-tasks-modal relative bg-white border border-slate-200/80 rounded-2xl shadow-[0_18px_44px_rgba(15,23,42,0.18)] p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Add Self-Task</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-150">
                <X strokeWidth={1.75} className="w-[18px] h-[18px]" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-6">
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Short task title"
                  className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 placeholder-slate-400 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
                  required
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Description *</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows="3"
                  placeholder="What are you working on?"
                  className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 placeholder-slate-400 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-lg text-slate-900 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200/80 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors duration-150 text-[13px] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors duration-150 text-[13px]"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
};

export default EmployeeTasks;
