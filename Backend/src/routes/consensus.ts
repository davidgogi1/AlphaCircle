import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getEvents, getEventDetail, submitForecast } from '../controllers/consensusController';

const router = Router();

router.get('/',         authMiddleware, getEvents);
router.get('/:id',      authMiddleware, getEventDetail);
router.post('/:id',     authMiddleware, submitForecast);

export default router;
