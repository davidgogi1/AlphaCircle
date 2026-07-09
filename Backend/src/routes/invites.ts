import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { createInvite, validateInvite } from '../controllers/inviteController';

const router = Router();

router.post('/',                authMiddleware, createInvite);
router.get('/validate/:token',  validateInvite);

export default router;
