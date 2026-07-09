import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { getSavedIds, getSaved, toggleSavePost, toggleSaveThread } from '../controllers/savedController';

const router = Router();
router.use(authMiddleware);

router.get('/ids',         getSavedIds);
router.get('/',            getSaved);
router.post('/posts/:id',  toggleSavePost);
router.post('/threads/:id', toggleSaveThread);

export default router;
