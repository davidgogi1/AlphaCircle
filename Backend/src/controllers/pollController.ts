import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Poll from '../models/Poll';

export const getPolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const polls = await Poll.find()
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('creator', 'username')
      .lean();
    res.json({ polls });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const createPoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { question, options } = req.body as { question: string; options: string[] };
    if (!question?.trim()) { res.status(400).json({ message: 'Question is required' }); return; }
    if (!Array.isArray(options) || options.length < 2) {
      res.status(400).json({ message: 'At least 2 options required' }); return;
    }
    const cleaned = options.map(o => o.trim()).filter(Boolean);
    if (cleaned.length < 2) {
      res.status(400).json({ message: 'At least 2 non-empty options required' }); return;
    }
    const poll = await Poll.create({
      question: question.trim(),
      options:  cleaned.map(text => ({ text, voters: [] })),
      creator:  req.userId,
    });
    await poll.populate('creator', 'username');
    res.status(201).json({ poll });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const vote = async (req: Request, res: Response): Promise<void> => {
  try {
    const { optionId } = req.body as { optionId: string };
    const userId = new mongoose.Types.ObjectId(req.userId);

    const poll = await Poll.findById(req.params.id);
    if (!poll) { res.status(404).json({ message: 'Poll not found' }); return; }

    const targetIdx = poll.options.findIndex(o => o._id.toString() === optionId);
    if (targetIdx === -1) { res.status(400).json({ message: 'Invalid option' }); return; }

    // Find which option user currently voted for
    let currentIdx = -1;
    for (let i = 0; i < poll.options.length; i++) {
      if (poll.options[i].voters.some(v => v.equals(userId))) { currentIdx = i; break; }
    }

    if (currentIdx === targetIdx) {
      // Toggle off — remove vote
      poll.options[targetIdx].voters = poll.options[targetIdx].voters.filter(v => !v.equals(userId)) as any;
    } else {
      // Remove from previous option if any
      if (currentIdx >= 0) {
        poll.options[currentIdx].voters = poll.options[currentIdx].voters.filter(v => !v.equals(userId)) as any;
      }
      poll.options[targetIdx].voters.push(userId);
    }

    await poll.save();
    const updated = await Poll.findById(poll._id).populate('creator', 'username').lean();
    res.json({ poll: updated });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const poll = await Poll.findById(req.params.id);
    if (!poll) { res.status(404).json({ message: 'Poll not found' }); return; }
    if (poll.creator.toString() !== req.userId) {
      res.status(403).json({ message: 'Not authorized' }); return;
    }
    await Poll.deleteOne({ _id: poll._id });
    res.json({ message: 'Deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
