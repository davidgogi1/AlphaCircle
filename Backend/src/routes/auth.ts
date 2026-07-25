import { Router } from 'express';
import { register, login, verifyLogin, getMe, completeProfile, updateAvatar, changePassword, forgotPassword, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadImage } from '../middleware/upload';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-login', verifyLogin);
router.get('/me',          authMiddleware, getMe);
router.post('/profile',    authMiddleware, uploadImage.single('avatar'), completeProfile);
router.put('/avatar',      authMiddleware, uploadImage.single('avatar'), updateAvatar);
router.put('/password',        authMiddleware, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

export default router;
