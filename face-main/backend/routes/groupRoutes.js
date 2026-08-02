import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  createGroup,
  getMyGroups,
  getGroupById,
  updateGroup,
  addMembers,
  removeMember,
  leaveGroup,
  updateMemberRole,
  deleteGroup,
  getGroupMessages,
  sendGroupMessage
} from '../controllers/groupController.js';

const router = express.Router();

router.use(protect);

router.post('/', createGroup);
router.get('/', getMyGroups);
router.get('/:groupId', getGroupById);
router.put('/:groupId', updateGroup);
router.delete('/:groupId', deleteGroup);

router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/:memberId', removeMember);
router.put('/:groupId/members/:memberId/role', updateMemberRole);
router.post('/:groupId/leave', leaveGroup);

router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendGroupMessage);

export default router;
