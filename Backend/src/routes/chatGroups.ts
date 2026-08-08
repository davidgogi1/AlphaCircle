import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadEncryptedFile } from '../middleware/upload';
import {
  getMyGroups, createGroup, getGroup,
  respondToInvite, inviteMembers,
  getMessages, sendGroupMessage, reactToGroupMessage, markAsRead, removeMember, leaveGroup, deleteGroup,
  offerAdminTransfer, cancelAdminTransfer, respondAdminTransfer,
} from '../controllers/chatGroupController';

const router = Router();
router.use(authMiddleware);

router.get('/',                    getMyGroups);
router.post('/',                   createGroup);
router.get('/:id',                 getGroup);
router.post('/:id/respond',        respondToInvite);
router.post('/:id/invite',         inviteMembers);
router.get('/:id/messages',        getMessages);
router.post('/:id/messages',       uploadEncryptedFile.single('file'), sendGroupMessage);
router.post('/:id/messages/:messageId/react', reactToGroupMessage);
router.post('/:id/read',           markAsRead);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/leave',                   leaveGroup);
router.post('/:id/transfer-admin',          offerAdminTransfer);
router.delete('/:id/transfer-admin',        cancelAdminTransfer);
router.post('/:id/transfer-admin/respond',  respondAdminTransfer);
router.delete('/:id',                       deleteGroup);

export default router;
