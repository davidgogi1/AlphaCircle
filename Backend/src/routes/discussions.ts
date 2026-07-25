import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload, uploadFile } from '../middleware/upload';
import {
  getTrending,
  getTopics, getTagsGrouped,
  getAllThreads,
  getThreads, createThread, getThread, updateThread, deleteThread,
  reactToThread, getThreadReactions,
  getThreadComments, addThreadComment, deleteThreadComment, reactToThreadComment,
} from '../controllers/discussionController';

const router = Router();

// Trending
router.get('/trending', authMiddleware, getTrending);

// Tags grouped by type
router.get('/tags', authMiddleware, getTagsGrouped);

// Legacy flat topics list
router.get('/topics', authMiddleware, getTopics);

// All threads (optional ?tagIds=id1,id2 filter)
router.get( '/threads',          authMiddleware, getAllThreads);
router.post('/threads',          authMiddleware, upload.single('file'), createThread);

// Threads in a specific topic/tag (backward compat)
router.get( '/topics/:slug/threads', authMiddleware, getThreads);
router.post('/topics/:slug/threads', authMiddleware, upload.single('file'), createThread);

// Single thread
router.get(   '/threads/:threadId',           authMiddleware, getThread);
router.put(   '/threads/:threadId',           authMiddleware, updateThread);
router.delete('/threads/:threadId',           authMiddleware, deleteThread);
router.post(  '/threads/:threadId/react',     authMiddleware, reactToThread);
router.get(   '/threads/:threadId/reactions', authMiddleware, getThreadReactions);
router.get(   '/threads/:threadId/comments',  authMiddleware, getThreadComments);
router.post(  '/threads/:threadId/comments',  authMiddleware, uploadFile.single('file'), addThreadComment);
router.delete('/threads/:threadId/comments/:commentId',       authMiddleware, deleteThreadComment);
router.post( '/threads/:threadId/comments/:commentId/react', authMiddleware, reactToThreadComment);

export default router;
