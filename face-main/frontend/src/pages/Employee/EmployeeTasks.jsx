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
  ClipboardList
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
      case 'in progress': return 'text-blue-700 bg-blue-100';
      case 'completed': return 'text-green-700 bg-green-100';
      case 'review': return 'text-indigo-700 bg-indigo-100';
      case 'on hold': return 'text-amber-700 bg-amber-100';
      case 'cancelled': return 'text-red-700 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'low': return 'text-green-700 bg-green-100';
      case 'medium': return 'text-amber-700 bg-amber-100';
      case 'high': return 'text-orange-700 bg-orange-100';
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
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-slate-500">Loading tasks...</p>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center bg-white border border-slate-200 shadow-sm rounded-2xl p-10 max-w-md">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Error Loading Tasks</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <button
              onClick={() => fetchTasks()}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
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
      <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Task Details</h2>
          <button
            onClick={() => setShowTaskModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : selectedTask && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Task Info */}
            <div className="lg:col-span-2 space-y-6">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{selectedTask.title}</h3>
                  <span className={`px-3 py-1 text-sm rounded-full ${getStatusColor(selectedTask.status)}`}>
                    {selectedTask.status}
                  </span>
                </div>
                <p className="text-slate-500 mb-4">{selectedTask.description}</p>

                <div className="grid grid-cols-2 gap-4 text-sm">
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
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(selectedTask.priority)}`}>
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-slate-900">Progress</h4>
                  <span className="text-blue-600 font-bold">{selectedTask.progress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-300"
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
                    className="flex-1 accent-blue-600"
                    disabled={selectedTask.status === 'Completed'}
                  />
                  <div className="flex space-x-2">
                    {selectedTask.status !== 'Completed' && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(selectedTask._id, selectedTask.status === 'In Progress' ? 'Not Started' : 'In Progress')}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-all duration-200"
                        >
                          {selectedTask.status === 'In Progress' ? 'Pause' : 'Start'}
                        </button>
                        <button
                          onClick={() => updateTaskProgress(selectedTask._id, 100)}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-all duration-200"
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
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">
                    Subtasks ({selectedTask.subtasks.filter(st => st.completed).length}/{selectedTask.subtasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTask.subtasks.map((subtask) => (
                      <div key={subtask._id} className="flex items-center space-x-3 p-3 bg-white border border-slate-200 rounded-lg">
                        <input
                          type="checkbox"
                          checked={subtask.completed}
                          onChange={() => handleToggleSubtask(selectedTask._id, subtask._id)}
                          className="w-4 h-4 rounded border-slate-300 bg-white text-blue-600 focus:ring-blue-500/30"
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
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-lg font-bold text-slate-900 mb-4">
                  Comments ({selectedTask.comments?.length || 0})
                </h4>

                <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                  {selectedTask.comments && selectedTask.comments.length > 0 ? (
                    selectedTask.comments.map((comment) => (
                      <div key={comment._id} className="p-3 bg-white border border-slate-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                            <User className="w-3 h-3 text-white" />
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
                    className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(selectedTask._id)}
                  />
                  <button
                    onClick={() => handleAddComment(selectedTask._id)}
                    disabled={!newComment.trim()}
                    className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Side Info */}
            <div className="space-y-6">
              {/* Time Tracking */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-lg font-bold text-slate-900 mb-4">Time Tracking</h4>
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
                    <span className="text-blue-600">
                      {timeTracking[selectedTask._id] ? formatTime(timeTracking[selectedTask._id].elapsed) : '0h 0m'}
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  {timeTracking[selectedTask._id]?.isRunning ? (
                    <button
                      onClick={() => stopTimer(selectedTask._id)}
                      className="w-full px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-all duration-200 flex items-center justify-center"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Stop Timer
                    </button>
                  ) : (
                    <button
                      onClick={() => startTimer(selectedTask._id)}
                      className="w-full px-4 py-2 bg-white border border-green-300 text-green-700 rounded-lg hover:bg-green-50 transition-all duration-200 flex items-center justify-center disabled:opacity-50"
                      disabled={selectedTask.status === 'Completed'}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Timer
                    </button>
                  )}
                </div>
              </div>

              {/* Task Actions */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="text-lg font-bold text-slate-900 mb-4">Actions</h4>
                <div className="space-y-3">
                  {selectedTask.status !== 'Completed' && (
                    <>
                      <button
                        onClick={() => updateTaskStatus(selectedTask._id, 'In Progress')}
                        disabled={selectedTask.status === 'In Progress'}
                        className="w-full px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="w-full px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all duration-200"
                      >
                        Mark Complete
                      </button>
                    </>
                  )}
                  {selectedTask.status === 'Completed' && (
                    <div className="text-center py-4">
                      <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-7 h-7 text-green-600" />
                      </div>
                      <p className="text-green-700 font-medium">Task Completed!</p>
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
      <div className="space-y-6 bg-slate-50">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
            <p className="text-slate-500">Track and manage your assigned tasks</p>
            <div className="flex flex-wrap items-center gap-3 mt-4">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Self-Task
              </button>
              <button
                type="button"
                onClick={() => setShowDayBookModal(true)}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-all duration-200 flex items-center"
              >
                <FileText className="w-4 h-4 mr-2" />
                Day Book (EOD)
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold text-slate-900">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
            <p className="text-slate-500">Welcome back, {user?.name}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{stats?.total || 0}</h3>
                <p className="text-slate-500">Total Tasks</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '60ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-blue-600">{stats?.inProgress || 0}</h3>
                <p className="text-slate-500">In Progress</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-500 rounded-lg flex items-center justify-center shadow-sm">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-green-600">{stats?.completed || 0}</h3>
                <p className="text-slate-500">Completed</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-sm">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200" style={{ animationDelay: '180ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</h3>
                <p className="text-slate-500">Overdue</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center shadow-sm">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
              <Flag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="pl-10 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
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
              className="px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
            >
              Clear Filters
            </button>

            <button
              onClick={() => fetchTasks()}
              className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all duration-200 flex items-center"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task, index) => (
            <div
              key={task._id}
              className="animate-enter bg-white border border-slate-200 shadow-sm rounded-2xl p-6 hover:-translate-y-1 hover:shadow-md transition-all duration-200"
              style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{task.title}</h3>
                  <p className="text-slate-500 text-sm mb-3 line-clamp-2">{task.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Project</span>
                  <span className="text-slate-900 font-medium">{task.project}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Due Date</span>
                  <span className={`font-medium ${isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-slate-900'}`}>
                    {formatDate(task.dueDate)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Status</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-slate-500">Progress</span>
                    <span className="text-sm text-blue-600 font-medium">{task.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    ></div>
                  </div>
                </div>

                {isOverdue(task.dueDate, task.status) && (
                  <div className="flex items-center text-red-600 text-sm">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Overdue
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={() => handleViewTask(task)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200 flex items-center"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </button>

                  {task.status !== 'Completed' && (
                    <div className="flex space-x-2">
                      {timeTracking[task._id]?.isRunning ? (
                        <button
                          onClick={() => stopTimer(task._id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Stop Timer"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => startTimer(task._id)}
                          className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                          title="Start Timer"
                        >
                          <Play className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => updateTaskProgress(task._id, 100)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        title="Mark Complete"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No tasks found</h3>
            <p className="text-slate-500">
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
          <div className="relative w-full max-w-5xl max-h-[84vh] overflow-y-auto rounded-2xl border border-blue-100 bg-slate-50 shadow-[0_24px_60px_rgba(15,23,42,0.24)] animate-enter">
            <button
              onClick={() => setShowDayBookModal(false)}
              className="absolute right-4 top-4 z-20 p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-all duration-200 shadow-sm"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <DayBookEntry embedded onClose={() => setShowDayBookModal(false)} />
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white border border-slate-200 rounded-xl shadow-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Add Self-Task</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddTask} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description *</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  rows="3"
                  placeholder="What are you working on?"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  required
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Estimated Hours</label>
                <input
                  type="number"
                  value={newTask.estimatedHours}
                  onChange={(e) => setNewTask({ ...newTask, estimatedHours: e.target.value })}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200"
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
