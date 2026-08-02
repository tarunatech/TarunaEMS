// routes/taskRoutes.js
import express from 'express';
import { body } from 'express-validator';
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addComment,
  updateProgress,
  changeStatus,
  getTaskStats,
  toggleSubtask,
  getTaskHistory
} from '../controllers/taskController.js';
import { protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';

const router = express.Router();

// Debug log for task router
router.use((req, res, next) => {
  console.log(`[TaskRouter] Hit: ${req.method} ${req.url}`);
  next();
});


// Validation middleware for task creation (simplified - removed title, project, category)

const taskValidation = [
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description must be between 1 and 1000 characters'),
  body('assignedTo')
    .isMongoId()
    .withMessage('Please provide a valid employee ID'),
  body('priority')
    .isIn(['Low', 'Medium', 'High', 'Critical'])
    .withMessage('Priority must be Low, Medium, High, or Critical'),
  body('dueDate')
    .isISO8601()
    .withMessage('Please provide a valid due date'),
  body('estimatedHours')
    .isNumeric()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Estimated hours must be between 0 and 1000')
];

const commentValidation = [
  body('text')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Comment must be between 1 and 500 characters')
];

const progressValidation = [
  body('progress')
    .isNumeric()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress must be between 0 and 100')
];

const statusValidation = [
  body('status')
    .isIn(['Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled'])
    .withMessage('Invalid status')
];

// Apply auth middleware to all routes
// router.use(protect);
// Employees must belong to Developer, Designing, or BDE to access task module
// router.use(requireDepartment(['developer', 'development', 'design', 'designing', 'bde', 'businessdevelopment', 'businessdevelopmentexecutive']));

// Debug route
router.get('/ping', (req, res) => res.json({ msg: 'pong' }));

// Routes
router.route('/')
  .get(protect, getTasks)
  .post(protect, taskValidation, createTask);

router.get('/stats', protect, getTaskStats);
router.get('/employee/:employeeId/history', protect, getTaskHistory);

router.route('/:id')
  .get(protect, getTaskById)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

router.post('/:id/comments', protect, commentValidation, addComment);
router.put('/:id/progress', protect, progressValidation, updateProgress);
router.put('/:id/status', protect, statusValidation, changeStatus);
router.put('/:id/subtasks/:subtaskId', protect, toggleSubtask);

export default router;