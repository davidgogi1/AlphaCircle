import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Invite from '../models/Invite';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

const userPayload = (user: InstanceType<typeof User>) => ({
  id:              user.id,
  username:        user.username,
  email:           user.email,
  profileComplete: user.profileComplete,
  investingSince:  user.investingSince,
  role:            user.role,
  strategy:        user.strategy,
  aum:             user.aum,
  bio:             user.bio,
  avatar:          user.avatar ?? '',
});

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, inviteToken } = req.body;

    if (!username || !email || !password) {
      res.status(400).json({ message: 'All fields are required' }); return;
    }
    if (password.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' }); return;
    }

    if (!inviteToken) {
      res.status(403).json({ message: 'Registration is by invitation only' }); return;
    }
    const invite = await Invite.findOne({ token: inviteToken });
    if (!invite || invite.used || invite.expiresAt < new Date()) {
      res.status(403).json({ message: 'Invite link is invalid or has expired' }); return;
    }
    if (invite.email !== email.toLowerCase()) {
      res.status(403).json({ message: 'This invite was sent to a different email address' }); return;
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      res.status(400).json({
        message: existing.email === email.toLowerCase()
          ? 'Email already in use'
          : 'Username already taken',
      }); return;
    }

    const ip   = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip ?? '';
    const user = await User.create({ username, email, password, registrationIp: ip });

    invite.used = true;
    await invite.save();

    const token = signToken(user.id as string);
    res.status(201).json({ token, user: userPayload(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' }); return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid email or password' }); return;
    }

    const token = signToken(user.id as string);
    res.json({ token, user: userPayload(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ user: userPayload(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const completeProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role, strategy, aum, bio } = req.body as {
      investingSince: string;
      role:           string;
      strategy:       string;
      aum:            string;
      bio:            string;
    };
    const investingSince = Number(req.body.investingSince);

    if (!investingSince || !role || !strategy || !aum) {
      res.status(400).json({ message: 'All profile fields are required' }); return;
    }
    const currentYear = new Date().getFullYear();
    if (investingSince < 1950 || investingSince > currentYear) {
      res.status(400).json({ message: 'Invalid start year' }); return;
    }

    const update: Record<string, unknown> = {
      investingSince, role, strategy, aum, bio: bio?.trim() ?? '', profileComplete: true,
    };
    if (req.file) update.avatar = req.file.filename;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true });
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    res.json({ user: userPayload(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ message: 'No image provided' }); return; }
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatar: req.file.filename },
      { new: true },
    );
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    res.json({ user: userPayload(user) });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
