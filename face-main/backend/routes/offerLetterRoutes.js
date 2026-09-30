import express from 'express';
import { protect } from '../middleware/auth.js';
import { requireDepartment } from '../middleware/departmentAccess.js';
import {
  generateOfferLetter,
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
router.get('/', getAllOfferLetters);
router.get('/:id', getOfferLetterById);
router.get('/:id/download', downloadOfferLetter);
router.delete('/:id', deleteOfferLetter);

export default router;
