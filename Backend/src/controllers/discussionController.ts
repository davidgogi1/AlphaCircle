import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Topic   from '../models/Topic';
import Thread  from '../models/Thread';
import ThreadComment from '../models/ThreadComment';

// ── Trending ───────────────────────────────────────────────────────────────

export const getTrending = async (_req: Request, res: Response): Promise<void> => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const threads = await Thread.find({ createdAt: { $gte: since } })
      .populate('author', 'username bio avatar')
      .populate('topic', 'name slug icon type')
      .populate('tags',  'name slug icon type')
      .lean();

    const scored = threads.map(t => {
      const hoursAgo  = (Date.now() - new Date(t.createdAt).getTime()) / 3_600_000;
      const score     = (t.reactions.length + t.commentCount * 2) / Math.pow(hoursAgo + 2, 1.5);
      return { ...t, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const valid = scored
      .filter(t => t.author != null)
      .map(t => ({ ...t, tags: (t.tags ?? []).filter(Boolean) }));
    res.json({ threads: valid.slice(0, 8) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Topics / Tags ──────────────────────────────────────────────────────────

export const getTopics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const topics = await Topic.find().lean();
    res.json({ topics });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTagsGrouped = async (_req: Request, res: Response): Promise<void> => {
  try {
    const all = await Topic.find().lean();
    res.json({
      sectors:   all.filter(t => t.type === 'sector'),
      topics:    all.filter(t => t.type === 'topic'),
      companies: all.filter(t => t.type === 'company'),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── All threads (with optional tag filter) ─────────────────────────────────

export const getAllThreads = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tagIds } = req.query;
    const filter: any = {};
    if (tagIds) {
      const ids = (tagIds as string).split(',').filter(Boolean)
        .map(id => new mongoose.Types.ObjectId(id));
      if (ids.length) filter.tags = { $in: ids };
    }

    const threads = await Thread.find(filter)
      .populate('author', 'username bio avatar')
      .populate('tags',   'name slug icon type')
      .populate('topic',  'name slug icon type')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const clean = threads
      .filter(t => t.author != null)
      .map(t => ({ ...t, tags: (t.tags ?? []).filter(Boolean) }));

    res.json({ threads: clean });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Threads ────────────────────────────────────────────────────────────────

export const getThreads = async (req: Request, res: Response): Promise<void> => {
  try {
    const topic = await Topic.findOne({ slug: req.params.slug }).lean();
    if (!topic) { res.status(404).json({ message: 'Topic not found' }); return; }

    const raw = await Thread.find({
      $or: [{ topic: topic._id }, { tags: topic._id }],
    })
      .populate('author', 'username bio avatar')
      .populate('tags',   'name slug icon type')
      .sort({ createdAt: -1 })
      .lean();

    const threads = raw
      .filter(t => t.author != null)
      .map(t => ({ ...t, tags: (t.tags ?? []).filter(Boolean) }));
    res.json({ topic, threads });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, content } = req.body;
    if (!title?.trim())   { res.status(400).json({ message: 'Title is required' });   return; }
    if (!content?.trim()) { res.status(400).json({ message: 'Content is required' }); return; }

    // tagIds can come from multi-tag creation (new flow) or from slug-based route (old flow)
    let tagIds: mongoose.Types.ObjectId[] = [];
    const rawTagIds = req.body.tagIds;
    if (rawTagIds) {
      const arr = Array.isArray(rawTagIds) ? rawTagIds : rawTagIds.split(',');
      tagIds = arr.filter(Boolean).map((id: string) => new mongoose.Types.ObjectId(id));
    }

    // Slug-based creation (old flow) — derive tag from slug
    let firstTopic: any = null;
    if (req.params.slug) {
      firstTopic = await Topic.findOne({ slug: req.params.slug });
      if (!firstTopic) { res.status(404).json({ message: 'Topic not found' }); return; }
      if (!tagIds.some(id => id.equals(firstTopic._id))) {
        tagIds = [firstTopic._id, ...tagIds];
      }
    }

    if (tagIds.length > 5) {
      res.status(400).json({ message: 'Maximum 5 tags per thread' }); return;
    }

    const attachment = req.file
      ? { filename: req.file.filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size }
      : undefined;

    const thread = await Thread.create({
      topic:   tagIds[0],
      tags:    tagIds,
      title:   title.trim(),
      content: content.trim(),
      author:  req.userId,
      attachment,
    });
    await thread.populate('author', 'username bio avatar');
    await thread.populate('tags',   'name slug icon type');

    res.status(201).json({ thread });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const thread = await Thread.findById(req.params.threadId)
      .populate('author', 'username bio avatar')
      .populate('topic',  'name slug icon type')
      .populate('tags',   'name slug icon type')
      .lean();
    if (!thread) { res.status(404).json({ message: 'Thread not found' }); return; }
    res.json({ thread });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const thread = await Thread.findById(req.params.threadId);
    if (!thread) { res.status(404).json({ message: 'Thread not found' }); return; }
    if (thread.author.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorised' }); return;
    }
    const { title, content } = req.body;
    if (title?.trim())   thread.title   = title.trim();
    if (content?.trim()) thread.content = content.trim();
    await thread.save();
    await thread.populate('author', 'username bio avatar');
    res.json({ thread });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const thread = await Thread.findById(req.params.threadId);
    if (!thread) { res.status(404).json({ message: 'Thread not found' }); return; }
    if (thread.author.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorised' }); return;
    }
    await ThreadComment.deleteMany({ thread: thread._id });
    await thread.deleteOne();
    res.json({ message: 'Thread deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Reactions ──────────────────────────────────────────────────────────────

export const reactToThread = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    const allowed  = ['like','love','haha','wow','sad','angry'];
    if (!allowed.includes(type)) { res.status(400).json({ message: 'Invalid reaction' }); return; }

    const thread = await Thread.findById(req.params.threadId);
    if (!thread) { res.status(404).json({ message: 'Thread not found' }); return; }

    const userId      = new mongoose.Types.ObjectId(req.userId);
    const existing    = thread.reactions.find(r => r.user.equals(userId));
    const isSameType  = existing?.type === type;

    await Thread.updateOne({ _id: thread._id }, { $pull: { reactions: { user: userId } } });
    if (!isSameType) {
      await Thread.updateOne({ _id: thread._id }, { $push: { reactions: { user: userId, type } } });
    }

    const updated = await Thread.findById(thread._id).lean();
    const userReaction = isSameType ? null : type;
    res.json({ reactions: updated!.reactions, userReaction });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getThreadReactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const thread = await Thread.findById(req.params.threadId)
      .populate('reactions.user', 'username')
      .lean();
    if (!thread) { res.status(404).json({ message: 'Thread not found' }); return; }
    res.json({ reactions: thread.reactions });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ── Comments ───────────────────────────────────────────────────────────────

export const getThreadComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const comments = await ThreadComment.find({ thread: req.params.threadId })
      .populate('author', 'username bio avatar')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ comments });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const addThreadComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { content, parentId } = req.body;
    if (!content?.trim()) { res.status(400).json({ message: 'Content is required' }); return; }

    const thread = await Thread.findById(req.params.threadId);
    if (!thread) { res.status(404).json({ message: 'Thread not found' }); return; }

    if (parentId) {
      const parent = await ThreadComment.findOne({ _id: parentId, thread: thread._id });
      if (!parent) { res.status(400).json({ message: 'Invalid parent comment' }); return; }
    }

    const comment = await ThreadComment.create({
      thread:  thread._id,
      author:  req.userId,
      content: content.trim(),
      parent:  parentId ? new mongoose.Types.ObjectId(parentId) : null,
    });
    await comment.populate('author', 'username bio avatar');

    thread.commentCount += 1;
    await thread.save();

    res.status(201).json({ comment });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

async function threadCommentDescendants(commentId: string): Promise<string[]> {
  const children = await ThreadComment.find({ parent: commentId }, '_id').lean();
  const ids = children.map(c => c._id.toString());
  for (const id of ids) ids.push(...(await threadCommentDescendants(id)));
  return ids;
}

export const deleteThreadComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const comment = await ThreadComment.findById(req.params.commentId);
    if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }

    const thread = await Thread.findById(req.params.threadId);
    if (!thread)  { res.status(404).json({ message: 'Thread not found' }); return; }

    const isCommentAuthor = comment.author.toString() === req.userId;
    const isThreadAuthor  = thread.author.toString()  === req.userId;
    if (!isCommentAuthor && !isThreadAuthor) {
      res.status(403).json({ message: 'Not authorised' }); return;
    }

    const desc  = await threadCommentDescendants(req.params.commentId);
    const total = 1 + desc.length;

    await ThreadComment.deleteMany({
      _id: { $in: [comment._id, ...desc.map(id => new mongoose.Types.ObjectId(id))] },
    });

    thread.commentCount = Math.max(0, thread.commentCount - total);
    await thread.save();

    res.json({ message: 'Comment deleted', deletedIds: [req.params.commentId, ...desc] });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const reactToThreadComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    const allowed  = ['like','love','haha','wow','sad','angry'];
    if (!allowed.includes(type)) { res.status(400).json({ message: 'Invalid reaction' }); return; }

    const comment = await ThreadComment.findById(req.params.commentId);
    if (!comment) { res.status(404).json({ message: 'Comment not found' }); return; }

    const userId     = new mongoose.Types.ObjectId(req.userId);
    const existing   = comment.reactions.find(r => r.user.equals(userId));
    const isSameType = existing?.type === type;

    await ThreadComment.updateOne({ _id: comment._id }, { $pull: { reactions: { user: userId } } });
    if (!isSameType) {
      await ThreadComment.updateOne({ _id: comment._id }, { $push: { reactions: { user: userId, type } } });
    }

    const updated = await ThreadComment.findById(comment._id).lean();
    res.json({ reactions: updated!.reactions, userReaction: isSameType ? null : type });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
