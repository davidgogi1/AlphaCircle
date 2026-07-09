import { Request, Response } from 'express';
import Post from '../models/Post';
import mongoose from 'mongoose';

const VALID = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];

export const react = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    if (!VALID.includes(type)) { res.status(400).json({ message: 'Invalid reaction type' }); return; }

    const userId  = new mongoose.Types.ObjectId(req.userId);
    const post    = await Post.findById(req.params.id);
    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }

    const existing   = post.reactions.find(r => r.user.equals(userId));
    const isSameType = existing?.type === type;

    // Always pull existing reaction first
    await Post.updateOne({ _id: req.params.id }, { $pull: { reactions: { user: userId } } });

    // Then push new one unless toggling off
    if (!isSameType) {
      await Post.updateOne({ _id: req.params.id }, { $push: { reactions: { user: userId, type } } });
    }

    const updated = await Post.findById(req.params.id);
    if (!updated) { res.status(404).json({ message: 'Post not found' }); return; }

    const userReaction = updated.reactions.find(r => r.user.equals(userId))?.type ?? null;

    res.json({
      reactions:    updated.reactions.map(r => ({ user: r.user.toString(), type: r.type })),
      userReaction,
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getReactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post
      .findById(req.params.id)
      .populate<{ reactions: { user: { _id: string; username: string }; type: string }[] }>('reactions.user', 'username')
      .lean();

    if (!post) { res.status(404).json({ message: 'Post not found' }); return; }
    res.json({ reactions: post.reactions });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
