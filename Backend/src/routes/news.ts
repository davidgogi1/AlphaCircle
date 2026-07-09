import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getNews } from '../controllers/newsController';

const router = Router();
router.get('/', authMiddleware, getNews);

export default router;
