import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Saved from '../models/Saved';
import Post from '../models/Post';
import Thread from '../models/Thread';

// GET /api/saved/ids  — lightweight: just the IDs the user has saved
export const getSavedIds = async (req: Request, res: Response): Promise<void> => {
  try {
    const docs = await Saved.find({ user: req.userId }).select('type ref').lean();
    const savedPostIds   = docs.filter(d => d.type === 'post').map(d => d.ref.toString());
    const savedThreadIds = docs.filter(d => d.type === 'thread').map(d => d.ref.toString());
    res.json({ savedPostIds, savedThreadIds });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/saved  — full saved items with populated data
export const getSaved = async (req: Request, res: Response): Promise<void> => {
  try {
    const docs = await Saved.find({ user: req.userId }).sort({ createdAt: -1 }).lean();

    const postIds   = docs.filter(d => d.type === 'post').map(d => d.ref);
    const threadIds = docs.filter(d => d.type === 'thread').map(d => d.ref);

    const [posts, threads] = await Promise.all([
      Post.find({ _id: { $in: postIds } }).populate('author', 'username').lean(),
      Thread.find({ _id: { $in: threadIds } }).populate('author', 'username').populate('topic', 'name slug icon').lean(),
    ]);

    // Preserve save order
    const postOrder   = new Map(postIds.map((id, i) => [id.toString(), i]));
    const threadOrder = new Map(threadIds.map((id, i) => [id.toString(), i]));
    posts.sort((a, b)   => (postOrder.get(a._id.toString()) ?? 0) - (postOrder.get(b._id.toString()) ?? 0));
    threads.sort((a, b) => (threadOrder.get(a._id.toString()) ?? 0) - (threadOrder.get(b._id.toString()) ?? 0));

    res.json({ posts, threads });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/saved/posts/:id  — toggle
export const toggleSavePost = async (req: Request, res: Response): Promise<void> => {
  try {
    const ref    = new mongoose.Types.ObjectId(req.params.id);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const query  = { user: userId, type: 'post' as const, ref };
    const exists = await Saved.findOne(query);

    if (exists) {
      await Saved.deleteOne({ _id: exists._id });
      res.json({ saved: false });
    } else {
      await Saved.create(query);
      res.json({ saved: true });
    }
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/saved/threads/:id  — toggle
export const toggleSaveThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const ref    = new mongoose.Types.ObjectId(req.params.id);
    const userId = new mongoose.Types.ObjectId(req.userId);
    const query  = { user: userId, type: 'thread' as const, ref };
    const exists = await Saved.findOne(query);

    if (exists) {
      await Saved.deleteOne({ _id: exists._id });
      res.json({ saved: false });
    } else {
      await Saved.create(query);
      res.json({ saved: true });
    }
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
