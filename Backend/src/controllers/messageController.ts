import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message';
import User    from '../models/User';
import { getIO } from '../utils/socketService';

function makeConversationId(a: string, b: string) {
  return [a, b].sort().join(':');
}

// GET /api/messages/conversations
export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);

    const conversations = await Message.aggregate([
      { $match: { $or: [{ sender: userId }, { recipient: userId }] } },
      { $sort:  { createdAt: -1 } },
      { $group: {
          _id:          '$conversationId',
          lastMessage:  { $first: '$$ROOT' },
          unreadCount:  { $sum: {
            $cond: [{ $and: [{ $eq: ['$recipient', userId] }, { $eq: ['$read', false] }] }, 1, 0]
          }},
      }},
      { $replaceRoot: { newRoot: { $mergeObjects: ['$lastMessage', { unreadCount: '$unreadCount' }] } } },
      { $addFields: {
          otherId: { $cond: [{ $eq: ['$sender', userId] }, '$recipient', '$sender'] },
      }},
      { $lookup: { from: 'users', localField: 'otherId', foreignField: '_id', as: 'otherUser' } },
      { $unwind: '$otherUser' },
      { $project: {
          conversationId: 1, content: 1, attachment: 1, sender: 1, read: 1, createdAt: 1, unreadCount: 1,
          'otherUser._id': 1, 'otherUser.username': 1,
      }},
      { $sort: { createdAt: -1 } },
    ]);

    res.json({ conversations });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/:userId
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const other = await User.findById(req.params.userId).select('username').lean();
    if (!other) { res.status(404).json({ message: 'User not found' }); return; }

    const conversationId = makeConversationId(req.userId!, req.params.userId);

    const messages = await Message.find({ conversationId })
      .populate('sender',    'username')
      .populate('recipient', 'username')
      .populate({ path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username' } })
      .sort({ createdAt: 1 })
      .lean();

    // Mark incoming messages as read
    await Message.updateMany(
      { conversationId, recipient: req.userId, read: false },
      { $set: { read: true } }
    );

    res.json({ messages, otherUser: other });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages/:userId
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const content  = (req.body.content ?? '').trim();
    const file     = req.file;
    const replyTo  = req.body.replyTo;
    if (!content && !file) { res.status(400).json({ message: 'Content or file required' }); return; }

    const other = await User.findById(req.params.userId).lean();
    if (!other) { res.status(404).json({ message: 'User not found' }); return; }
    if (req.params.userId === req.userId) {
      res.status(400).json({ message: 'Cannot message yourself' }); return;
    }

    const conversationId = makeConversationId(req.userId!, req.params.userId);

    if (replyTo) {
      const parent = await Message.findOne({ _id: replyTo, conversationId });
      if (!parent) { res.status(400).json({ message: 'Invalid reply target' }); return; }
    }

    const attachment = file ? {
      filename:     file.filename,
      originalname: file.originalname,
      mimetype:     file.mimetype,
      size:         file.size,
    } : undefined;

    const message = await Message.create({
      conversationId,
      sender:    req.userId,
      recipient: req.params.userId,
      content,
      replyTo: replyTo || null,
      ...(attachment ? { attachment } : {}),
    });

    await message.populate('sender',    'username');
    await message.populate('recipient', 'username');
    await message.populate({ path: 'replyTo', select: 'content sender', populate: { path: 'sender', select: 'username' } });

    // Deliver in real-time to recipient
    getIO()?.to(`user:${req.params.userId}`).emit('new_message', message);

    res.status(201).json({ message });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/messages/msg/:messageId/react
export const reactToMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type } = req.body;
    const allowed  = ['like','love','haha','wow','sad','angry'];
    if (!allowed.includes(type)) { res.status(400).json({ message: 'Invalid reaction' }); return; }

    const message = await Message.findById(req.params.messageId);
    if (!message) { res.status(404).json({ message: 'Message not found' }); return; }

    const isParticipant = message.sender.toString() === req.userId || message.recipient.toString() === req.userId;
    if (!isParticipant) { res.status(403).json({ message: 'Not authorised' }); return; }

    const userId     = new mongoose.Types.ObjectId(req.userId);
    const existing   = message.reactions.find(r => r.user.equals(userId));
    const isSameType = existing?.type === type;

    await Message.updateOne({ _id: message._id }, { $pull: { reactions: { user: userId } } });
    if (!isSameType) {
      await Message.updateOne({ _id: message._id }, { $push: { reactions: { user: userId, type } } });
    }

    const updated = await Message.findById(message._id).lean();

    const otherUserId = message.sender.toString() === req.userId ? message.recipient.toString() : message.sender.toString();
    getIO()?.to(`user:${otherUserId}`).emit('message_reaction', {
      messageId: message._id, reactions: updated!.reactions,
    });

    res.json({ reactions: updated!.reactions, userReaction: isSameType ? null : type });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
