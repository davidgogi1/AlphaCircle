import { Request, Response } from 'express';
import Comment  from '../models/Comment';
import Post     from '../models/Post';
import mongoose from 'mongoose';

export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await Comment.find({ post: req.params.id })
      .populate('author', 'username')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ comments });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, parentId } = req.body;
    if (!content?.trim() && !req.file) { res.status(400).json({ message: 'Content is required' }); return; }

    const post = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }

    // Validate parent belongs to same post
    if (parentId) {
      const parent = await Comment.findOne({ _id: parentId, post: post._id });
      if (!parent) { res.status(400).json({ message: 'Invalid parent comment' }); return; }
    }

    const attachment = req.file
      ? { filename: req.file.filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size }
      : undefined;

    const comment = await Comment.create({
      post:   post._id,
      author: req.userId,
      content: content?.trim() ?? '',
      parent: parentId ? new mongoose.Types.ObjectId(parentId) : null,
      attachment,
    });
    await comment.populate('author', 'username');

    post.commentCount += 1;
    await post.save();

    res.status(201).json({ comment });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// Recursively collect all descendant IDs
async function descendantIds(commentId: string): Promise<string[]> {
  const children = await Comment.find({ parent: commentId }, '_id').lean();
  const ids = children.map(c => c._id.toString());
  for (const id of ids) {
    ids.push(...(await descendantIds(id)));
  }
  return ids;
}

export const deleteComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }

    const post = await Post.findById(req.params.id);
    if (!post)    { res.status(404).json({ message: 'Post not found' }); return; }

    const isCommentAuthor = comment.author.toString() === req.userId;
    const isPostAuthor    = post.author.toString()    === req.userId;
    if (!isCommentAuthor && !isPostAuthor) {
      res.status(403).json({ message: 'Not authorised' }); return;
    }

    const desc  = await descendantIds(req.params.commentId);
    const total = 1 + desc.length;

    await Comment.deleteMany({ _id: { $in: [comment._id, ...desc.map(id => new mongoose.Types.ObjectId(id))] } });

    post.commentCount = Math.max(0, post.commentCount - total);
    await post.save();

    res.json({ message: 'Comment deleted', deletedIds: [req.params.commentId, ...desc] });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reactToComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    const allowed  = ['like','love','haha','wow','sad','angry'];
    if (!allowed.includes(type)) { res.status(400).json({ message: 'Invalid reaction' }); return; }

    const comment = await Comment.findById(req.params.commentId);
    if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }

    const userId     = new mongoose.Types.ObjectId(req.userId);
    const existing   = comment.reactions.find(r => r.user.equals(userId));
    const isSameType = existing?.type === type;

    await Comment.updateOne({ _id: comment._id }, { $pull: { reactions: { user: userId } } });
    if (!isSameType) {
      await Comment.updateOne({ _id: comment._id }, { $push: { reactions: { user: userId, type } } });
    }

    const updated = await Comment.findById(comment._id).lean();
    res.json({ reactions: updated!.reactions, userReaction: isSameType ? null : type });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
