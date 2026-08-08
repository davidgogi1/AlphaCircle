import { Router } from 'express';
import { getUsers, getUser, toggleFollow, getPublicKeys } from '../controllers/userController';
import { authMiddleware }         from '../middleware/authMiddleware';

const router = Router();
router.use(authMiddleware);

router.post('/public-keys', getPublicKeys);
router.get('/',            getUsers);
router.get('/:id',         getUser);
router.post('/:id/follow', toggleFollow);

export default router;
