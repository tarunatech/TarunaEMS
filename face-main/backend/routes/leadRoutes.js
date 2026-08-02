import express from 'express';
import { body } from 'express-validator';
import { protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';
import {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  updateWonLead,
  addLeadNote,
  addMeeting,
  updateMeeting,
  deleteLead,
  getLeadStats,
  getWonLeadsStats,
  getMeetingStats,
  getUpcomingFollowUps,
  getOverdueFollowUps,
  getUpcomingMeetings,
  reassignLead,
  getBDEEmployees
} from '../controllers/leadController.js';

const router = express.Router();

// Enhanced validation middleware for lead creation
const validateLead = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
    
  body('email')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .custom(async (email) => {
      // Add email uniqueness check if needed
      // const existingLead = await Lead.findOne({ email });
      // if (existingLead) {
      //   throw new Error('Email already exists');
      // }
      return true;
    }),
    
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
    
  body('source')
    .notEmpty()
    .withMessage('Source is required')
    .isIn(['Website', 'Social Media', 'Email Campaign', 'Cold Call', 'Referral', 'Trade Show', 'Advertisement', 'Other'])
    .withMessage('Please select a valid source'),
    
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Hot'])
    .withMessage('Please select a valid priority level'),
    
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must be less than 100 characters'),
    
  body('position')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Position must be less than 100 characters'),
    
  body('estimatedValue')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (isNaN(value) || parseFloat(value) < 0) {
        throw new Error('Estimated value must be a positive number');
      }
      return true;
    }),
    
  body('expectedCloseDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Expected close date must be a valid date');
      }
      return true;
    }),
    
  body('nextFollowUpDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Next follow-up date must be a valid date');
      }
      return true;
    }),

  body('interestedProducts')
    .optional()
    .isArray()
    .withMessage('Interested products must be an array'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must be less than 1000 characters')
];

const validateLeadUpdate = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
    
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty')
    .matches(/^[+]?[\d\s\-\(\)]+$/)
    .withMessage('Please provide a valid phone number'),
    
  body('source')
    .optional()
    .isIn(['Website', 'Social Media', 'Email Campaign', 'Cold Call', 'Referral', 'Trade Show', 'Advertisement', 'Other'])
    .withMessage('Please select a valid source'),
    
  body('status')
    .optional()
    .isIn(['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'])
    .withMessage('Please select a valid status'),
    
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High', 'Hot'])
    .withMessage('Please select a valid priority level'),
    
  body('estimatedValue')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (isNaN(value) || parseFloat(value) < 0) {
        throw new Error('Estimated value must be a positive number');
      }
      return true;
    }),
    
  body('expectedCloseDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Expected close date must be a valid date');
      }
      return true;
    }),
    
  body('nextFollowUpDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Next follow-up date must be a valid date');
      }
      return true;
    })
];

const validateWonUpdate = [
  body('finalValue')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (isNaN(value) || parseFloat(value) < 0) {
        throw new Error('Final value must be a positive number');
      }
      return true;
    }),
    
  body('recurringRevenue')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (isNaN(value) || parseFloat(value) < 0) {
        throw new Error('Recurring revenue must be a positive number');
      }
      return true;
    }),
    
  body('contractDuration')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (isNaN(value) || parseInt(value) < 1) {
        throw new Error('Contract duration must be at least 1 month');
      }
      return true;
    }),
    
  body('satisfactionScore')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const score = parseInt(value);
      if (isNaN(score) || score < 1 || score > 10) {
        throw new Error('Satisfaction score must be between 1 and 10');
      }
      return true;
    }),

  body('onboardingStatus')
    .optional()
    .isIn(['Not Started', 'In Progress', 'Completed'])
    .withMessage('Please select a valid onboarding status'),

  body('deliveryDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Delivery date must be a valid date');
      }
      return true;
    }),

  body('renewalDate')
    .optional()
    .custom((value) => {
      if (!value) return true;
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        throw new Error('Renewal date must be a valid date');
      }
      return true;
    }),

  body('paymentTerms')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Payment terms must be less than 200 characters'),

  body('discount')
    .optional()
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      if (isNaN(value) || parseFloat(value) < 0) {
        throw new Error('Discount must be a positive number');
      }
      return true;
    })
];

const validateMeeting = [
  body('type')
    .notEmpty()
    .withMessage('Meeting type is required')
    .isIn(['Call', 'Video Meeting', 'In-Person', 'Email Follow-up', 'Demo', 'Presentation', 'Negotiation'])
    .withMessage('Please select a valid meeting type'),
    
  body('scheduledDate')
    .notEmpty()
    .withMessage('Scheduled date is required')
    .isISO8601()
    .withMessage('Scheduled date must be a valid date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled date must be in the future');
      }
      return true;
    }),
    
  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number')
    .isInt({ min: 5, max: 480 })
    .withMessage('Duration must be between 5 and 480 minutes'),
    
  body('agenda')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Agenda must be less than 1000 characters'),
    
  body('attendees')
    .optional()
    .isArray()
    .withMessage('Attendees must be an array'),
    
  body('attendees.*.name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Attendee name must be between 1-100 characters'),
    
  body('attendees.*.email')
    .optional()
    .isEmail()
    .withMessage('Attendee email must be valid')
];

const validateMeetingUpdate = [
  body('type')
    .optional()
    .isIn(['Call', 'Video Meeting', 'In-Person', 'Email Follow-up', 'Demo', 'Presentation', 'Negotiation'])
    .withMessage('Please select a valid meeting type'),
    
  body('scheduledDate')
    .optional()
    .isISO8601()
    .withMessage('Scheduled date must be a valid date'),
    
  body('duration')
    .optional()
    .isNumeric()
    .withMessage('Duration must be a number')
    .isInt({ min: 5, max: 480 })
    .withMessage('Duration must be between 5 and 480 minutes'),
    
  body('status')
    .optional()
    .isIn(['Scheduled', 'Completed', 'Cancelled', 'Rescheduled', 'No Show'])
    .withMessage('Please select a valid meeting status'),
    
  body('outcome')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Outcome must be less than 2000 characters'),
    
  body('nextAction')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Next action must be less than 500 characters'),
    
  body('nextMeetingDate')
    .optional()
    .isISO8601()
    .withMessage('Next meeting date must be a valid date'),
    
  body('agenda')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Agenda must be less than 1000 characters'),
    
  body('attendees')
    .optional()
    .isArray()
    .withMessage('Attendees must be an array')
];

const validateNote = [
  body('content')
    .trim()
    .notEmpty()
    .withMessage('Note content is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Note content must be between 1 and 1000 characters'),
    
  body('type')
    .optional()
    .isIn(['General', 'Meeting', 'Call', 'Email', 'Follow-up'])
    .withMessage('Please select a valid note type')
];

// IMPORTANT: Apply protection middleware to all routes
router.use(protect);
// Employees must belong to BDE/Sales to access lead routes
router.use(requireDepartment(['bde', 'businessdevelopmentexecutive', 'sales', 'businessdevelopment']));

// Statistics routes - MUST come first before parameterized routes
router.get('/stats', getLeadStats);
router.get('/won-stats', getWonLeadsStats);
router.get('/meeting-stats', getMeetingStats);
router.get('/bde-employees', getBDEEmployees);

// Follow-up routes - MUST come before parameterized routes
router.get('/upcoming-followups', getUpcomingFollowUps);
router.get('/overdue-followups', getOverdueFollowUps);

// Meeting routes - MUST come before parameterized routes
router.get('/upcoming-meetings', getUpcomingMeetings);

// Main CRUD routes
router.get('/', getLeads);
router.post('/', validateLead, createLead);

// Lead-specific routes (parameterized routes come last)
router.get('/:id', getLeadById);
router.put('/:id', validateLeadUpdate, updateLead);
router.put('/:id/reassign', reassignLead);
router.delete('/:id', deleteLead);

// Won lead management
router.put('/:id/won-details', validateWonUpdate, updateWonLead);

// Add this route (it's missing from your current routes)
router.get('/upcoming-meetings', getUpcomingMeetings);

// Notes management
router.post('/:id/notes', validateNote, addLeadNote);

// Meeting management
router.post('/:id/meetings', validateMeeting, addMeeting);
router.put('/:leadId/meetings/:meetingId', validateMeetingUpdate, updateMeeting);

export default router;