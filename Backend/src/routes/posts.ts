import { Router } from 'express';
import { createPost, getAllPosts, getMyPosts, updatePost, deletePost, getTrendingPosts, getPostsByHashtag } from '../controllers/postController';
import { react, getReactions }                                         from '../controllers/reactionController';
import { getComments, addComment, deleteComment, reactToComment }       from '../controllers/commentController';
import { authMiddleware }                                              from '../middleware/authMiddleware';
import { upload, uploadFile }                                          from '../middleware/upload';

const router = Router();
router.use(authMiddleware);

router.post('/', upload.single('file'), createPost);
router.get('/',                           getAllPosts);
router.get('/mine',                       getMyPosts);
router.get('/trending',                   getTrendingPosts);
router.get('/hashtag/:tag',               getPostsByHashtag);
router.put('/:id',   upload.single('file'), updatePost);
router.delete('/:id',                     deletePost);

router.post('/:id/react',                 react);
router.get('/:id/reactions',             getReactions);

router.get('/:id/comments',              getComments);
router.post('/:id/comments',             uploadFile.single('file'), addComment);
router.delete('/:id/comments/:commentId',       deleteComment);
router.post( '/:id/comments/:commentId/react', reactToComment);

export default router;
