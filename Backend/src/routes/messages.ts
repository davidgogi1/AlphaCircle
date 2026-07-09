import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadFile } from '../middleware/upload';
import { getConversations, getMessages, sendMessage } from '../controllers/messageController';

const router = Router();

router.get('/conversations',  authMiddleware, getConversations);
router.get('/:userId',        authMiddleware, getMessages);
router.post('/:userId',       authMiddleware, uploadFile.single('file'), sendMessage);

export default router;
