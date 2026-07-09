import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ChatGroup from '../models/ChatGroup';
import ChatGroupMessage from '../models/ChatGroupMessage';
import GroupRead from '../models/GroupRead';
import { getIO } from '../utils/socketService';

// GET /api/groups
export const getMyGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.userId);
    const groups = await ChatGroup.find({ 'members.user': userId })
      .populate('creator', 'username')
      .populate('members.user', 'username')
      .lean();

    const uid = (m: any) => {
      if (!m.user) return '';
      return (m.user._id ?? m.user).toString();
    };

    const accepted = groups.filter(g =>
      g.members.some(m => uid(m) === req.userId && m.status === 'accepted'),
    );
    const pending = groups.filter(g =>
      g.members.some(m => uid(m) === req.userId && m.status === 'pending'),
    );

    // Compute unread counts per accepted group
    const reads = await GroupRead.find({
      user:  userId,
      group: { $in: accepted.map(g => g._id) },
    }).lean();
    const readMap = new Map(reads.map(r => [r.group.toString(), r.lastReadAt]));

    const unreadCounts = await Promise.all(
      accepted.map(async g => {
        const lastReadAt = readMap.get(g._id.toString()) ?? new Date(0);
        const count = await ChatGroupMessage.countDocuments({
          group:    g._id,
          sender:   { $ne: userId },
          createdAt: { $gt: lastReadAt },
        });
        return { id: g._id.toString(), count };
      }),
    );
    const unreadMap = new Map(unreadCounts.map(u => [u.id, u.count]));

    const acceptedWithUnread = accepted.map(g => ({
      ...g,
      unreadCount: unreadMap.get(g._id.toString()) ?? 0,
    }));

    // Groups where this user has a pending admin transfer offer
    const pendingTransfers = await ChatGroup.find({ pendingAdminTransfer: userId })
      .populate('creator', 'username')
      .populate('members.user', 'username')
      .lean();

    res.json({ accepted: acceptedWithUnread, pending, pendingTransfers });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, memberIds } = req.body;
    if (!name?.trim()) { res.status(400).json({ message: 'Name is required' }); return; }

    const invitees: string[] = Array.isArray(memberIds) ? memberIds : [];
    const members = [
      { user: new mongoose.Types.ObjectId(req.userId), status: 'accepted' as const },
      ...invitees.map(id => ({ user: new mongoose.Types.ObjectId(id), status: 'pending' as const })),
    ];

    const group = await ChatGroup.create({ name: name.trim(), creator: req.userId, members });
    await group.populate('creator', 'username');
    await group.populate('members.user', 'username');

    const io = getIO();
    for (const id of invitees) {
      io?.to(`user:${id}`).emit('group_invite', { groupId: group._id, groupName: group.name });
    }

    res.status(201).json({ group });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/groups/:id
export const getGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id)
      .populate('creator', 'username')
      .populate('members.user', 'username')
      .lean();
    if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

    const isMember = group.members.some(m => m.user.toString() === req.userId);
    if (!isMember) { res.status(403).json({ message: 'Not a member' }); return; }

    res.json({ group });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/respond  body: { action: 'accept' | 'ignore' }
export const respondToInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { action } = req.body;
    if (!['accept', 'ignore'].includes(action)) {
      res.status(400).json({ message: 'Invalid action' }); return;
    }

    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Group not found' }); return; }

    const member = group.members.find(m => m.user.toString() === req.userId);
    if (!member || member.status !== 'pending') {
      res.status(400).json({ message: 'No pending invitation' }); return;
    }

    if (action === 'accept') {
      member.status = 'accepted';
      await group.save();
      res.json({ message: 'Accepted', group });
    } else {
      await ChatGroup.updateOne(
        { _id: group._id },
        { $pull: { members: { user: new mongoose.Types.ObjectId(req.userId) } } },
      );
      res.json({ message: 'Ignored' });
    }
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/invite
export const inviteMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberIds } = req.body;
    if (!Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({ message: 'No members specified' }); return;
    }

    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Group not found' }); return; }
    if (group.creator.toString() !== req.userId) {
      res.status(403).json({ message: 'Only creator can invite' }); return;
    }

    const io = getIO();
    for (const id of memberIds) {
      const exists = group.members.some(m => m.user.toString() === id);
      if (!exists) {
        group.members.push({ user: new mongoose.Types.ObjectId(id), status: 'pending' } as any);
        io?.to(`user:${id}`).emit('group_invite', { groupId: group._id, groupName: group.name });
      }
    }
    await group.save();

    res.json({ message: 'Invited' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/groups/:id/messages
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id).lean();
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }

    const isMember = group.members.some(
      m => m.user.toString() === req.userId && m.status === 'accepted',
    );
    if (!isMember) { res.status(403).json({ message: 'Not a member' }); return; }

    const messages = await ChatGroupMessage.find({ group: req.params.id })
      .populate('sender', 'username')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ messages });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/messages
export const sendGroupMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const content = (req.body.content ?? '').trim();
    const file    = req.file;
    if (!content && !file) { res.status(400).json({ message: 'Content or file required' }); return; }

    const group = await ChatGroup.findById(req.params.id).lean();
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }

    const isMember = group.members.some(
      m => m.user.toString() === req.userId && m.status === 'accepted',
    );
    if (!isMember) { res.status(403).json({ message: 'Not a member' }); return; }

    const attachment = file ? {
      filename:     file.filename,
      originalname: file.originalname,
      mimetype:     file.mimetype,
      size:         file.size,
    } : undefined;

    const msg = await ChatGroupMessage.create({
      group:   req.params.id,
      sender:  req.userId,
      content,
      ...(attachment ? { attachment } : {}),
    });
    await msg.populate('sender', 'username');

    // Sender has "read" up to now
    await GroupRead.findOneAndUpdate(
      { group: req.params.id, user: req.userId },
      { lastReadAt: new Date() },
      { upsert: true },
    );

    getIO()?.to(`group:${req.params.id}`).emit('group_message', { ...msg.toObject(), group: req.params.id });

    res.status(201).json({ message: msg });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    await GroupRead.findOneAndUpdate(
      { group: req.params.id, user: req.userId },
      { lastReadAt: new Date() },
      { upsert: true },
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/groups/:id/members/:userId
export const removeMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }
    if (group.creator.toString() !== req.userId) {
      res.status(403).json({ message: 'Only the creator can remove members' }); return;
    }
    if (req.params.userId === req.userId) {
      res.status(400).json({ message: 'Cannot remove yourself — delete the group instead' }); return;
    }
    await ChatGroup.updateOne(
      { _id: group._id },
      { $pull: { members: { user: new mongoose.Types.ObjectId(req.params.userId) } } },
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/leave
export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }

    await ChatGroup.updateOne(
      { _id: group._id },
      { $pull: { members: { user: new mongoose.Types.ObjectId(req.userId) } } },
    );

    res.json({ message: 'Left group' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/transfer-admin  body: { userId }
export const offerAdminTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }
    if (group.creator.toString() !== req.userId) {
      res.status(403).json({ message: 'Only the creator can transfer admin' }); return;
    }
    const { userId } = req.body;
    if (!userId || userId === req.userId) {
      res.status(400).json({ message: 'Invalid target user' }); return;
    }
    const isMember = group.members.some(
      m => m.user.toString() === userId && m.status === 'accepted',
    );
    if (!isMember) { res.status(400).json({ message: 'Target must be an accepted member' }); return; }

    group.pendingAdminTransfer = new mongoose.Types.ObjectId(userId);
    await group.save();

    getIO()?.to(`user:${userId}`).emit('admin_transfer_offer', {
      groupId:   group._id,
      groupName: group.name,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/groups/:id/transfer-admin  (creator cancels pending offer)
export const cancelAdminTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }
    if (group.creator.toString() !== req.userId) {
      res.status(403).json({ message: 'Only the creator can cancel this' }); return;
    }
    group.pendingAdminTransfer = undefined;
    await group.save();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/groups/:id/transfer-admin/respond  body: { action: 'accept' | 'decline' }
export const respondAdminTransfer = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }
    if (group.pendingAdminTransfer?.toString() !== req.userId) {
      res.status(403).json({ message: 'No pending admin offer for you' }); return;
    }
    const { action } = req.body;
    if (!['accept', 'decline'].includes(action)) {
      res.status(400).json({ message: 'Invalid action' }); return;
    }
    const previousCreator = group.creator.toString();
    if (action === 'accept') {
      group.creator = new mongoose.Types.ObjectId(req.userId);
    }
    group.pendingAdminTransfer = undefined;
    await group.save();

    // Notify the original creator of the outcome
    getIO()?.to(`user:${previousCreator}`).emit('admin_transfer_response', {
      groupId:   group._id,
      groupName: group.name,
      accepted:  action === 'accept',
    });
    res.json({ ok: true, accepted: action === 'accept' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/groups/:id
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await ChatGroup.findById(req.params.id);
    if (!group) { res.status(404).json({ message: 'Not found' }); return; }
    if (group.creator.toString() !== req.userId) {
      res.status(403).json({ message: 'Only the creator can delete this group' }); return;
    }

    await ChatGroupMessage.deleteMany({ group: group._id });
    await group.deleteOne();

    res.json({ message: 'Group deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
