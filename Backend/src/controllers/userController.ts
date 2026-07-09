import { Request, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import Post from "../models/Post";

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const me = await User.findById(req.userId).select("following").lean();
    if (!me) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const myFollowing = new Set(
      (me.following ?? []).map((id) => id.toString()),
    );

    const users = await User.find({ _id: { $ne: req.userId } })
      .select("username createdAt bio avatar")
      .lean();

    res.json({
      users: users.map((u) => ({
        _id: u._id.toString(),
        username: u.username,
        bio: u.bio || '',
        avatar: u.avatar || '',
        createdAt: u.createdAt,
        isFollowing: myFollowing.has(u._id.toString()),
      })),
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const target = await User.findById(req.params.id)
      .select('username bio role strategy aum investingSince createdAt following avatar')
      .lean();
    if (!target) { res.status(404).json({ message: 'User not found' }); return; }

    const me = await User.findById(req.userId).select('following').lean();
    const isFollowing = me?.following.some(id => id.toString() === req.params.id) ?? false;
    const isSelf = req.userId === req.params.id;

    const followerCount  = await User.countDocuments({ following: new mongoose.Types.ObjectId(req.params.id) });
    const followingCount = target.following?.length ?? 0;

    const posts = await Post.find({ author: req.params.id })
      .populate('author', 'username')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const currentYear = new Date().getFullYear();
    res.json({
      user: {
        _id:            target._id.toString(),
        username:       target.username,
        bio:            target.bio ?? '',
        role:           target.role ?? '',
        strategy:       target.strategy ?? '',
        aum:            target.aum ?? '',
        avatar:         target.avatar ?? '',
        yearsExp:       target.investingSince ? currentYear - target.investingSince : null,
        createdAt:      target.createdAt,
        followerCount,
        followingCount,
        isFollowing,
        isSelf,
      },
      posts,
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const toggleFollow = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (req.params.id === req.userId) {
      res.status(400).json({ message: "You can't follow yourself" });
      return;
    }

    const target = await User.findById(req.params.id);
    if (!target) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const targetId = new mongoose.Types.ObjectId(req.params.id);
    const me = await User.findById(req.userId).select("following");
    if (!me) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isFollowing = me.following.some((id) => id.equals(targetId));

    await User.updateOne(
      { _id: req.userId },
      isFollowing
        ? { $pull: { following: targetId } }
        : { $addToSet: { following: targetId } },
    );

    res.json({ following: !isFollowing });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
