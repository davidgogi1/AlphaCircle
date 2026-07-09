import { Router } from 'express';
import { getUsers, getUser, toggleFollow } from '../controllers/userController';
import { authMiddleware }         from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.get('/',            getUsers);
router.get('/:id',         getUser);
router.post('/:id/follow', toggleFollow);

export default router;
