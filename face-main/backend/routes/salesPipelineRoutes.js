import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getAllPipelines,
  getPendingApprovals,
  getPipelineByLead,
  transitionPipelineStage,
  updatePipelineApproval,
  updatePipelineSection
} from '../controllers/salesPipelineController.js';

const router = express.Router();

router.use(protect);

router.get('/pending-approvals', getPendingApprovals);
router.get('/', getAllPipelines);
router.get('/lead/:leadId', getPipelineByLead);
router.patch('/lead/:leadId/stage', transitionPipelineStage);
router.patch('/lead/:leadId/approval', updatePipelineApproval);
router.patch('/lead/:leadId/:section', updatePipelineSection);

export default router;
