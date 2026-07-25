import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getEvents, getEventDetail, submitForecast, createEvent, deleteEvent } from '../controllers/consensusController';

const router = Router();

router.get('/',         authMiddleware, getEvents);
router.post('/',        authMiddleware, createEvent);
router.get('/:id',      authMiddleware, getEventDetail);
router.post('/:id',     authMiddleware, submitForecast);
router.delete('/:id',   authMiddleware, deleteEvent);

export default router;
