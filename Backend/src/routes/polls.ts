import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getPolls, createPoll, vote, deletePoll } from '../controllers/pollController';

const router = Router();
router.use(authMiddleware);

router.get('/',          getPolls);
router.post('/',         createPoll);
router.post('/:id/vote', vote);
router.delete('/:id',    deletePoll);

export default router;
