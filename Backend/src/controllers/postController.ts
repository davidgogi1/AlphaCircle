import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import Post from "../models/Post";
import User from "../models/User";

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: "7d" });

export const createPost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { title, content } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ message: "Content is required" });
      return;
    }
    const attachment = req.file
      ? { filename: req.file.filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size }
      : undefined;
    const post = await Post.create({ title, content, author: req.userId, attachment });
    await post.populate("author", "username avatar");
    res.status(201).json({ post });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllPosts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const me = await User.findById(req.userId).select("following").lean();

    if (!me || me.following.length === 0) {
      res.json({ posts: [] });
      return;
    }

    const posts = await Post.find({ author: { $in: me.following } })
      .populate("author", "username avatar")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ posts });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getMyPosts = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const posts = await Post.find({ author: req.userId })
      .populate("author", "username avatar")
      .sort({ createdAt: -1 })
      .lean();
    res.json({ posts });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const updatePost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    if (post.author.toString() !== req.userId) {
      res.status(403).json({ message: "Not authorised" });
      return;
    }
    const { title, content, removeAttachment } = req.body;
    if (!content?.trim()) {
      res.status(400).json({ message: "Content is required" });
      return;
    }
    post.title   = title?.trim() || "";
    post.content = content.trim();

    if (req.file) {
      post.attachment = { filename: req.file.filename, originalName: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size };
    } else if (removeAttachment === 'true') {
      post.attachment = undefined;
    }

    await post.save();
    await post.populate("author", "username avatar");
    res.json({ post });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const getTrendingPosts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await Post.find({ createdAt: { $gte: since } })
      .populate('author', 'username bio')
      .lean();

    const scored = posts.map(p => {
      const hoursAgo = (Date.now() - new Date(p.createdAt).getTime()) / 3_600_000;
      const score    = ((p.reactions?.length ?? 0) + (p.commentCount ?? 0) * 2) / Math.pow(hoursAgo + 2, 1.5);
      return { ...p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    res.json({ posts: scored.slice(0, 8) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const deletePost = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    if (post.author.toString() !== req.userId) {
      res.status(403).json({ message: "Not authorised" });
      return;
    }
    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
