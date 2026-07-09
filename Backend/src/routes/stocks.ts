import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getStocks } from '../controllers/stockController';

const router = Router();
router.use(authMiddleware);
router.get('/', getStocks);

export default router;
