import express from 'express';
import multer from 'multer';
import { protect } from '../middleware/auth.js';
import {
  getAllPipelines,
  getPendingApprovals,
  getPipelineByLead,
  generatePipelineProposal,
  generatePipelineProposalPdf,
  generatePipelineProposalSection,
  savePipelineProposal,
  transitionPipelineStage,
  updatePipelineApproval,
  updatePipelineSection,
  extractProposalFromPdf
} from '../controllers/salesPipelineController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.use(protect);

router.get('/pending-approvals', getPendingApprovals);
router.get('/', getAllPipelines);
router.get('/lead/:leadId', getPipelineByLead);
router.patch('/lead/:leadId/stage', transitionPipelineStage);
router.patch('/lead/:leadId/approval', updatePipelineApproval);
router.patch('/lead/:leadId/proposal', savePipelineProposal);
router.post('/lead/:leadId/proposal/generate', generatePipelineProposal);
router.post('/lead/:leadId/proposal/generate-section', generatePipelineProposalSection);
router.post('/lead/:leadId/proposal/pdf', generatePipelineProposalPdf);
router.post('/lead/:leadId/proposal/extract-pdf', upload.single('pdf'), extractProposalFromPdf);
router.patch('/lead/:leadId/:section', updatePipelineSection);

export default router;

