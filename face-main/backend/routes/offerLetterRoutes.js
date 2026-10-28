import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';
import {
  generateOfferLetter,
  generateCompletionLetter,
  generateExperienceLetter,
  generateRelievingLetter,
  getAllOfferLetters,
  getOfferLetterById,
  downloadOfferLetter,
  deleteOfferLetter,
  getCandidatesAndEmployees,
} from '../controllers/offerLetterController.js';

const router = express.Router();

// Apply auth protection to all routes
router.use(protect);

// Allow HR department (and Admins)
router.use(requireDepartment(['hr', 'human resources', 'humanresources']));

// Routes
router.get('/candidates-and-employees', getCandidatesAndEmployees);
router.post('/generate', generateOfferLetter);
router.post('/generate-completion', generateCompletionLetter);
router.post('/generate-experience', generateExperienceLetter);
router.post('/generate-relieving', generateRelievingLetter);
router.get('/', getAllOfferLetters);
router.get('/:id', getOfferLetterById);
router.get('/:id/download', downloadOfferLetter);
router.delete('/:id', deleteOfferLetter);

export default router;
