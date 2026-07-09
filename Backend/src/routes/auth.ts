import { Router } from 'express';
import { register, login, getMe, completeProfile, updateAvatar } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadImage } from '../middleware/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me',          authMiddleware, getMe);
router.post('/profile',    authMiddleware, uploadImage.single('avatar'), completeProfile);
router.put('/avatar',      authMiddleware, uploadImage.single('avatar'), updateAvatar);

export default router;
