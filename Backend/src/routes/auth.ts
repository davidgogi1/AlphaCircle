import { Router } from 'express';
import {
  register, login, verifyLogin, getMe, completeProfile, updateAvatar, changePassword,
  forgotPassword, resetPassword, getResetRecoveryInfo, setupEncryption, getEncryptionKeys,
  saveRegeneratedRecovery,
} from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { uploadImage } from '../middleware/upload';
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);
router.post('/verify-login', verifyLogin);
router.get('/me',          authMiddleware, getMe);
router.post('/profile',    authMiddleware, uploadImage.single('avatar'), completeProfile);
router.put('/avatar',      authMiddleware, uploadImage.single('avatar'), updateAvatar);
router.put('/password',        authMiddleware, changePassword);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password',  resetPassword);
router.post('/reset-recovery-info/:token', getResetRecoveryInfo);
router.post('/encryption-setup', authMiddleware, setupEncryption);
router.get('/encryption-keys',   authMiddleware, getEncryptionKeys);
router.post('/regenerate-recovery', authMiddleware, saveRegeneratedRecovery);

export default router;
