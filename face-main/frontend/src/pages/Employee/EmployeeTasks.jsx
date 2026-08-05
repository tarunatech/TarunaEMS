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
  RefreshCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

// Import your API services
import { useTasks } from '../../hooks/useTasks';
import { useAuth } from '../../hooks/useAuth';
import { taskService } from '../../services/taskService';
import DayBookEntry from './DayBookEntry';

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
    changeStatus,
    addComment,
    toggleSubtask,
    fetchTasks
  } = useTasks();

  const [filteredTasks, setFilteredTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [timeTracking, setTimeTracking] = useState({});
  const [modalLoading, setModalLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDayBookModal, setShowDayBookModal] = useState(false);
  const [newTask, setNewTask] = useState({
    description: '',
    priority: 'Medium',
    dueDate: '',
    estimatedHours: 0
  });

  // Filter tasks based on frontend filters
  useEffect(() => {
    let filtered = tasks.filter(task => {
      const matchesStatus = !statusFilter || task.status === statusFilter;
      const matchesPriority = !priorityFilter || task.priority === priorityFilter;
      return matchesStatus && matchesPriority;
    });

    setFilteredTasks(filtered);
  }, [tasks, statusFilter, priorityFilter]);

  // Handle task status update
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      await changeStatus(taskId, newStatus);
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
    setTimeTracking({
      ...timeTracking,
      [taskId]: {
        isRunning: true,
        startTime: Date.now(),
        elapsed: timeTracking[taskId]?.elapsed || 0
      }
    });
    toast.success('Timer started');
  };

  const stopTimer = (taskId) => {
    const tracking = timeTracking[taskId];
    if (tracking && tracking.isRunning) {
      const newElapsed = tracking.elapsed + (Date.now() - tracking.startTime);
      setTimeTracking({
        ...timeTracking,
        [taskId]: {
          ...tracking,
          isRunning: false,
          elapsed: newElapsed
        }
      });

      // Here you could also update actual hours in the backend
      const hoursToAdd = newElapsed / (1000 * 60 * 60);
      toast.success(`Timer stopped. Session: ${formatTime(newElapsed)}`);
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

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      if (!newTask.description?.trim()) {
        toast.error("Task description is required");
        return;
      }

      if (!newTask.dueDate) {
        toast.error("Due date is required");
        return;
      }

      const taskPayload = {
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
    return `${hours}h ${minutes}m`;
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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Enhanced backdrop with blur */}
      <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowTaskModal(false)} />

      {/* Modal content */}
      <div className="employee-tasks-modal relative bg-white border border-slate-200/80 rounded-2xl shadow-[0_18px_44px_rgba(15,23,42,0.18)] p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">Task Details</h2>
          <button
            onClick={() => setShowTaskModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors duration-150"
          >
            <X strokeWidth={1.75} className="w-[18px] h-[18px]" />
          </button>
        </div>

        {modalLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 strokeWidth={1.75} className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : selectedTask && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Task Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="employee-tasks-row p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-semibold text-slate-900">{selectedTask.title}</h3>
                  <span className={`px-3 py-1 text-[12px] rounded-full ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                </div>
                <p className="text-slate-500 text-[13px] mb-4">{selectedTask.description}</p>

                <div className="grid grid-cols-2 gap-4 text-[13px]">
                  <div>
                    <span className="text-slate-500">Project:</span>
                    <p className="text-slate-900 font-medium">{selectedTask.project}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Category:</span>
                    <p className="text-slate-900 font-medium">{selectedTask.category}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Priority:</span>
                    <span className={`px-2 py-1 text-[12px] rounded-full ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Due Date:</span>
                    <p className={`font-medium ${isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600' : 'text-slate-900'}`}>
                      {formatDate(selectedTask.dueDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Assigned By:</span>
                    <p className="text-slate-900 font-medium">
                      {selectedTask.assignedBy?.name || 'Admin'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-500">Created:</span>
                    <p className="text-slate-900 font-medium">
                      {formatDate(selectedTask.createdAt)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress Section */}
              <div className="employee-tasks-row p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-[15px] font-semibold text-slate-900">Progress</h4>
                  <span className="text-indigo-600 font-semibold text-[13px]">{selectedTask.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${selectedTask.progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={selectedTask.progress}
                    onChange={(e) => updateTaskProgress(selectedTask._id, parseInt(e.target.value))}
                    className="flex-1 accent-indigo-600"
                    disabled={selectedTask.status === 'Completed'}
                  />
                  <div className="flex space-x-2">
                    {selectedTask.status !== 'Completed' && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(selectedTask._id, selectedTask.status === 'In Progress' ? 'Not Started' : 'In Progress')}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[13px] hover:bg-indigo-100 transition-colors duration-150"
                        >
                          {selectedTask.status === 'In Progress' ? 'Pause' : 'Start'}
                        </button>
                        <button
                          onClick={() => updateTaskProgress(selectedTask._id, 100)}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-[13px] hover:bg-emerald-100 transition-colors duration-150"
                        >
                          Complete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Subtasks */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div className="employee-tasks-row p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                  <h4 className="text-[15px] font-semibold text-slate-900 mb-4">
                    Subtasks ({selectedTask.subtasks.filter(st => st.completed).length}/{selectedTask.subtasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask) => (
                      <div key={subtask._id} className="employee-tasks-inner-row flex items-center space-x-3 p-3 bg-white border border-slate-200/80 rounded-lg">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => handleToggleSubtask(selectedTask._id, subtask._id)}
                          className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500/30"
                        />
                        <span className={`flex-1 ${subtask.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {subtask.title}
                        </span>
                        {subtask.completedAt && (
                          <span className="text-xs text-slate-400">
                            {formatDate(subtask.completedAt)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments Section */}
              <div className="employee-tasks-row p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <h4 className="text-[15px] font-semibold text-slate-900 mb-4">
                  Comments ({selectedTask.comments?.length || 0})
                </h4>

                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((comment) => (
                      <div key={comment._id} className="p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                            <User strokeWidth={1.75} className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-slate-900 font-medium text-sm">
                            {comment.user?.name || 'Unknown User'}
                          </span>
                          <span className="text-slate-400 text-xs">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-600 text-sm">{comment.text}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-sm">No comments yet</p>
                  )}
                </div>

                {/* Add Comment */}
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 bg-white border border-slate-200/80 rounded-lg text-slate-900 text-[13px] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-colors duration-150"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(selectedTask._id)}
                  />
                  <button
                    onClick={() => handleAddComment(selectedTask._id)}
                    disabled={!newComment.trim()}
                    className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send strokeWidth={1.75} className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              {/* Time Tracking */}
              <div className="employee-tasks-row p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <h4 className="text-[15px] font-semibold text-slate-900 mb-4">Time Tracking</h4>
                <div className="space-y-3">
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
                    <span className="text-indigo-600">
                      {timeTracking[selectedTask._id] ? formatTime(timeTracking[selectedTask._id].elapsed) : '0h 0m'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {timeTracking[selectedTask._id]?.isRunning ? (
                    <button
                      onClick={() => stopTimer(selectedTask._id)}
                      className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-150 flex items-center justify-center text-[13px] font-semibold"
                    >
                      <Pause strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                      Stop Timer
                    </button>
                  ) : (
                    <button
                      onClick={() => startTimer(selectedTask._id)}
                      className="w-full px-4 py-2 bg-white border border-slate-200/80 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center justify-center disabled:opacity-50 text-[13px] font-semibold"
                      disabled={selectedTask.status === 'Completed'}
                    >
                      <Play strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                      Start Timer
                    </button>
                  )}
                </div>
              </div>

              {/* Task Actions */}
              <div className="employee-tasks-row p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
                <h4 className="text-[15px] font-semibold text-slate-900 mb-4">Actions</h4>
                <div className="space-y-3">
                  {selectedTask.status !== 'Completed' && (
                    <>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'In Progress')}
                        disabled={selectedTask.status === 'In Progress'}
                        className="w-full px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed text-[13px] font-semibold"
                      >
                        {selectedTask.status === 'In Progress' ? 'Already In Progress' : 'Start Task'}
                      </button>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'On Hold')}
                        disabled={selectedTask.status === 'On Hold'}
                        className="w-full px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedTask.status === 'On Hold' ? 'Already On Hold' : 'Put On Hold'}
                      </button>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'Review')}
                        disabled={selectedTask.status === 'Review'}
                        className="w-full px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedTask.status === 'Review' ? 'In Review' : 'Submit for Review'}
                      </button>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'Completed')}
                        className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors duration-150 text-[13px] font-semibold"
                      >
                        Mark Complete
                      </button>
                    </>
                  )}
                  {selectedTask.status === 'Completed' && (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center">
                        <CheckCircle strokeWidth={1.75} className="w-6 h-6 text-emerald-600" />
                      </div>
                      <p className="text-emerald-700 font-medium">Task Completed!</p>
                      <p className="text-slate-500 text-sm mt-1">
                        Completed on {formatDate(selectedTask.completedDate || selectedTask.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-semibold tracking-tight text-slate-900">{stats?.total || 0}</h3>
                <p className="text-[12px] text-slate-500">Total Tasks</p>
              </div>
              <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center ring-1 ring-indigo-100">
                <Target strokeWidth={1.75} className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </div>

          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-semibold tracking-tight text-indigo-600">{stats?.inProgress || 0}</h3>
                <p className="text-[12px] text-slate-500">In Progress</p>
              </div>
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center ring-1 ring-amber-100">
                <Clock strokeWidth={1.75} className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-semibold tracking-tight text-emerald-600">{stats?.completed || 0}</h3>
                <p className="text-[12px] text-slate-500">Completed</p>
              </div>
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center ring-1 ring-emerald-100">
                <CheckCircle strokeWidth={1.75} className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="employee-tasks-panel animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[22px] font-semibold tracking-tight text-red-600">{stats?.overdue || 0}</h3>
                <p className="text-[12px] text-slate-500">Overdue</p>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center ring-1 ring-red-100">
                <AlertTriangle strokeWidth={1.75} className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="employee-tasks-panel bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5">
          <div className="flex flex-col md:flex-row gap-4">
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

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task, index) => (
            <div
              key={task._id}
              className="employee-task-card animate-enter bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] rounded-xl p-5 transition-shadow duration-150 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-semibold text-slate-900 mb-2 truncate">{task.title}</h3>
                  <p className="text-slate-500 text-[13px] mb-3 line-clamp-2">{task.description}</p>
                </div>
                <span className={`inline-flex h-7 min-w-[64px] flex-shrink-0 items-center justify-center rounded-full px-3 text-[11.5px] font-medium leading-none ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-[13px]">
                  <span className="text-slate-500">Project</span>
                  <span className="truncate text-right font-medium text-slate-900">{task.project || 'N/A'}</span>
                </div>

                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-[13px]">
                  <span className="text-slate-500">Due Date</span>
                  <span className={`text-right font-medium tabular-nums ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>

                <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 text-[13px]">
                  <span className="text-slate-500">Status</span>
                  <span className={`ml-auto inline-flex h-7 min-w-[78px] items-center justify-center rounded-full px-3 text-[11.5px] font-medium leading-none ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[13px] text-slate-500">Progress</span>
                    <span className="text-[13px] text-indigo-600 font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>

                {isOverdue(task.dueDate, task.status) && (
                  <div className="flex items-center text-red-600 text-[13px]">
                    <AlertTriangle strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                    Overdue
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => handleViewTask(task)}
                    className="px-4 py-2 bg-white border border-slate-200/80 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors duration-150 flex items-center text-[13px] font-medium"
                  >
                    <Eye strokeWidth={1.75} className="w-[18px] h-[18px] mr-2" />
                    View Details
                  </button>

                  {task.status !== 'Completed' && (
                    <div className="flex space-x-2">
                      {timeTracking[task._id]?.isRunning ? (
                        <button
                          onClick={() => stopTimer(task._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-150"
                          title="Stop Timer"
                        >
                          <Pause strokeWidth={1.75} className="w-[18px] h-[18px]" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startTimer(task._id)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors duration-150"
                          title="Start Timer"
                        >
                          <Play strokeWidth={1.75} className="w-[18px] h-[18px]" />
                        </button>
                      )}

                      <button
                        onClick={() => updateTaskProgress(task._id, 100)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors duration-150"
                        title="Mark Complete"
                      >
                        <CheckCircle strokeWidth={1.75} className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
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

      {/* Day Book Modal */}
      {showDayBookModal && (
        <div className="fixed inset-y-0 left-0 right-0 lg:left-64 z-[9999] flex items-center justify-center p-3">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setShowDayBookModal(false)} />
          <div className="employee-tasks-modal relative w-full max-w-5xl max-h-[84vh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50 shadow-[0_18px_44px_rgba(15,23,42,0.18)] animate-enter">
            <button
              onClick={() => setShowDayBookModal(false)}
              className="absolute right-4 top-4 z-20 p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors duration-150"
              title="Close"
            >
              <X strokeWidth={1.75} className="w-[18px] h-[18px]" />
            </button>
            <DayBookEntry embedded onClose={() => setShowDayBookModal(false)} />
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
