import express from 'express';
import { body, param } from 'express-validator';
import {
  getProjects,
  getProjectById,
  getProjectByLead,
  createProject,
  updateProject,
} from '../controllers/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

const createProjectValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 255 })
    .withMessage('Project name cannot exceed 255 characters'),
  body('leadId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('leadId must be a valid UUID'),
  body('pipelineId')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('pipelineId must be a valid UUID'),
  body('status')
    .optional()
    .isIn(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'])
    .withMessage('Invalid status'),
  body('contractValue')
    .optional()
    .isNumeric()
    .withMessage('Contract value must be numeric'),
  body('approvedBudget')
    .optional()
    .isNumeric()
    .withMessage('Approved budget must be numeric'),
  body('projectManager')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('projectManager must be a valid UUID'),
];

const updateProjectValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid project ID'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Project name cannot be empty')
    .isLength({ max: 255 }),
  body('status')
    .optional()
    .isIn(['Planning', 'Active', 'On Hold', 'Completed', 'Cancelled'])
    .withMessage('Invalid status'),
  body('contractValue')
    .optional()
    .isNumeric()
    .withMessage('Contract value must be numeric'),
  body('approvedBudget')
    .optional()
    .isNumeric()
    .withMessage('Approved budget must be numeric'),
  body('projectManager')
    .optional({ nullable: true })
    .isUUID()
    .withMessage('projectManager must be a valid UUID'),
];

router.get('/', getProjects);
router.get('/by-lead/:leadId', getProjectByLead);
router.get('/:id', getProjectById);
router.post('/', createProjectValidation, createProject);
router.patch('/:id', updateProjectValidation, updateProject);

export default router;
