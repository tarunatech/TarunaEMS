// controllers/taskController.js
import { validationResult } from 'express-validator';
import Task from '../models/Task.js';
import Employee from '../models/Employee.js';
import User from '../models/User.js';
import { sendTaskAssignmentEmail } from '../utils/email.js';

const guardEmployeeTaskAccess = async (req, res) => {
  if (req.user.role !== 'employee') return { ok: true };

  const employee = await Employee.findOne({ user: req.user.id });

  if (!employee) {
    res.status(404).json({ success: false, message: 'Employee record not found' });
    return { ok: false };
  }

  return { ok: true, employee };
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private (Admin)
export const createTask = async (req, res) => {
  try {
    // Check if user is admin or employee self-assigning
    if (req.user.role !== 'admin' && req.user.role !== 'employee') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // Determine creator employee record
    let creatorEmployee = null;
    if (req.user.role === 'employee') {
      creatorEmployee = await Employee.findOne({ user: req.user.id });
      if (!creatorEmployee) {
        return res.status(403).json({
          success: false,
          message: 'Employee record not found.'
        });
      }
      // Default assignedTo to creator if not specified
      if (!req.body.assignedTo) {
        req.body.assignedTo = creatorEmployee._id;
      }
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors details:', errors.array());
      console.log('Request body:', req.body);
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Validate target employee exists
    const targetEmployee = await Employee.findById(req.body.assignedTo);
    if (!targetEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Assigned employee not found',
      });
    }

    const isSelfAssigned = creatorEmployee
      ? String(req.body.assignedTo) === String(creatorEmployee._id)
      : false;

    // Create the task
    const taskData = {
      title: req.body.title || 'Task',
      description: req.body.description,
      assignedTo: req.body.assignedTo,
      assignedBy: req.user.id,
      project: req.body.project || '',
      priority: req.body.priority || 'Medium',
      dueDate: req.body.dueDate,
      category: req.body.category || 'Other',
      estimatedHours: req.body.estimatedHours || 0,
      status: 'Not Started',
      progress: 0,
      isSelfAssigned
    };

    console.log('Creating task with data:', taskData);

    const task = await Task.create(taskData);

    // Populate the created task
    const populatedTask = await Task.findById(task._id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        }
      ]);

    // Send email notification to vrundafadadu@gmail.com
    try {
      const assignedByUser = await User.findById(req.user.id);
      await sendTaskAssignmentEmail(task, targetEmployee, assignedByUser);
    } catch (emailError) {
      console.error('Error sending task assignment email:', emailError);
    }

    console.log('Task created successfully:', populatedTask._id);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      task: populatedTask
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private

export const getTasks = async (req, res) => {
  console.log('[TaskController] getTasks called');

  try {
    const {
      page = 1,
      limit = 50,
      status,
      priority,
      assignedTo,
      search,
      overdue
    } = req.query;

    let query = {};

    // Build query based on user role
    const guard = await guardEmployeeTaskAccess(req, res);
    if (!guard.ok) return;

    if (req.user.role === 'employee') {
      query.assignedTo = guard.employee._id;
      console.log('Employee query filter:', query);
    }

    // Apply filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo && req.user.role === 'admin') query.assignedTo = assignedTo;

    // Handle overdue filter
    if (overdue === 'true') {
      query.dueDate = { $lt: new Date() };
      query.status = { $nin: ['Completed', 'Cancelled'] };
    }

    // Handle search - search by description only (simplified form)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.description = searchRegex;
    }

    console.log('Final MongoDB query:', query);

    // Execute the query
    const tasks = await Task.find(query)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    console.log('Found tasks count:', tasks.length);

    const total = await Task.countDocuments(query);
    console.log('Total tasks matching query:', total);

    res.json({
      success: true,
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get task history for an employee (unique descriptions)
// @route   GET /api/tasks/employee/:employeeId/history
// @access  Private
export const getTaskHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;

    // Check permissions
    if (req.user.role === 'employee') {
      const employee = await Employee.findOne({ user: req.user.id });
      if (!employee || employee._id.toString() !== employeeId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const history = await Task.aggregate([
      { $match: { assignedTo: employeeId } },
      { $group: { _id: "$description" } },
      { $project: { description: "$_id", _id: 0 } },
      { $sort: { description: 1 } }
    ]);

    res.json({
      success: true,
      history: history.map(item => item.description)
    });

  } catch (error) {
    console.error('Get task history error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};


// @desc    Get task by ID
// @route   GET /api/tasks/:id
// @access  Private
export const getTaskById = async (req, res) => {
  try {
    const { ok, employee } = await guardEmployeeTaskAccess(req, res);
    if (!ok) return;

    const task = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        },
        {
          path: 'comments.user',
          select: 'name email'
        }
      ]);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions - employees can only view their own tasks
    if (req.user.role === 'employee') {
      if (task.assignedTo._id.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('Get task by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
export const updateTask = async (req, res) => {
  try {
    const guard = await guardEmployeeTaskAccess(req, res);
    if (!guard.ok) return;

    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      if (task.assignedTo.toString() !== guard.employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      if (task.status === 'Completed') {
        return res.status(400).json({
          success: false,
          message: 'Completed tasks cannot be edited'
        });
      }

      // Employees can edit their task details until admin approval completes the task.
      const allowedUpdates = [
        'title',
        'description',
        'priority',
        'dueDate',
        'estimatedHours',
        'status',
        'progress',
        'actualHours',
        'comments',
        'subtasks'
      ];
      const updates = {};

      Object.keys(req.body).forEach(key => {
        if (allowedUpdates.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      if (['Review', 'On Hold'].includes(task.status) && !updates.status) {
        updates.status = 'In Progress';
      }

      req.body = updates;
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate([
      {
        path: 'assignedTo',
        populate: {
          path: 'user',
          select: 'name email employeeId'
        }
      },
      {
        path: 'assignedBy',
        select: 'name email'
      }
    ]);

    res.json({
      success: true,
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin)
export const deleteTask = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
export const addComment = async (req, res) => {
  try {
    const { ok, employee } = await guardEmployeeTaskAccess(req, res);
    if (!ok) return;

    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      if (task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.addComment(req.user.id, text.trim());

    // Populate and return updated task
    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'comments.user',
          select: 'name email'
        }
      ]);

    res.json({
      success: true,
      message: 'Comment added successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Add comment error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update task progress
// @route   PUT /api/tasks/:id/progress
// @access  Private
export const updateProgress = async (req, res) => {
  try {
    const { ok, employee } = await guardEmployeeTaskAccess(req, res);
    if (!ok) return;

    const { progress } = req.body;

    if (progress < 0 || progress > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be between 0 and 100'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      if (task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.updateProgress(progress);

    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        }
      ]);

    res.json({
      success: true,
      message: 'Progress updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update progress error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change task status
// @route   PUT /api/tasks/:id/status
// @access  Private
export const changeStatus = async (req, res) => {
  try {
    const { ok, employee } = await guardEmployeeTaskAccess(req, res);
    if (!ok) return;

    const { status } = req.body;

    const validStatuses = ['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      if (task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.changeStatus(status);

    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        }
      ]);

    res.json({
      success: true,
      message: 'Status updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Change status error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Review submitted task
// @route   PUT /api/tasks/:id/review
// @access  Private (Admin)
export const reviewTask = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { action, feedback = '' } = req.body;
    const actionConfig = {
      approve: {
        status: 'Completed',
        progress: 100,
        message: 'Task approved successfully',
        commentPrefix: 'Approved'
      },
      reject: {
        status: 'In Progress',
        progress: 75,
        message: 'Task rejected and returned to employee',
        commentPrefix: 'Rejected'
      },
      changes: {
        status: 'On Hold',
        progress: 90,
        message: 'Changes requested successfully',
        commentPrefix: 'Changes requested'
      }
    };

    const config = actionConfig[action];
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Review action must be approve, reject, or changes'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.status !== 'Review' && action === 'approve') {
      return res.status(400).json({
        success: false,
        message: 'Only tasks submitted for review can be approved'
      });
    }

    const reviewText = `${config.commentPrefix}${feedback.trim() ? `: ${feedback.trim()}` : ''}`;
    task.status = config.status;
    task.progress = config.progress;
    task.comments = [
      ...(task.comments || []),
      {
        user: req.user.id,
        text: reviewText,
        createdAt: new Date()
      }
    ];

    if (config.status === 'Completed') {
      task.completedDate = new Date();
    } else {
      task.completedDate = null;
    }

    await task.save();

    const updatedTask = await Task.findById(req.params.id)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        },
        {
          path: 'assignedBy',
          select: 'name email'
        },
        {
          path: 'comments.user',
          select: 'name email'
        }
      ]);

    res.json({
      success: true,
      message: config.message,
      task: updatedTask
    });
  } catch (error) {
    console.error('Review task error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
export const getTaskStats = async (req, res) => {
  try {
    let query = {};

    // If employee, only show their stats (and only if department is allowed)
    const guard = await guardEmployeeTaskAccess(req, res);
    if (!guard.ok) return;
    if (req.user.role === 'employee') {
      query.assignedTo = guard.employee._id;
    }

    const totalTasks = await Task.countDocuments(query);
    const inProgressTasks = await Task.countDocuments({ ...query, status: 'In Progress' });
    const completedTasks = await Task.countDocuments({ ...query, status: 'Completed' });
    const overdueTasks = await Task.countDocuments({
      ...query,
      status: { $nin: ['Completed', 'Cancelled'] },
      dueDate: { $lt: new Date() }
    });

    // Priority-wise distribution
    const priorityStats = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Status-wise distribution
    const statusStats = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      stats: {
        total: totalTasks,
        inProgress: inProgressTasks,
        completed: completedTasks,
        overdue: overdueTasks,
        priorityDistribution: priorityStats,
        statusDistribution: statusStats
      }
    });

  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Toggle subtask completion
// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @access  Private
export const toggleSubtask = async (req, res) => {
  try {
    const { ok, employee } = await guardEmployeeTaskAccess(req, res);
    if (!ok) return;

    const { id: taskId, subtaskId } = req.params;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    if (req.user.role === 'employee') {
      if (task.assignedTo.toString() !== employee._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    await task.toggleSubtask(subtaskId);

    const updatedTask = await Task.findById(taskId)
      .populate([
        {
          path: 'assignedTo',
          populate: {
            path: 'user',
            select: 'name email employeeId'
          }
        }
      ]);

    res.json({
      success: true,
      message: 'Subtask updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Toggle subtask error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};
