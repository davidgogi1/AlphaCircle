import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import nodemailer from 'nodemailer';
import Invite from '../models/Invite';
import User from '../models/User';

function makeTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return null;
}

export const createInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email?.trim()) {
      res.status(400).json({ message: 'Email is required' }); return;
    }

    // Check if someone already registered with this email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'A user with this email is already registered' }); return;
    }

    // Rate limit: max 5 invites sent per user in the last 24 hours
    const since24h   = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentToday  = await Invite.countDocuments({ invitedBy: req.userId, createdAt: { $gte: since24h } });
    if (sentToday >= 5) {
      res.status(429).json({ message: 'You have reached the limit of 5 invites per day' }); return;
    }

    // Pending cap: max 10 unused invites outstanding per user at any time
    const pendingCount = await Invite.countDocuments({ invitedBy: req.userId, used: false, expiresAt: { $gt: new Date() } });
    if (pendingCount >= 10) {
      res.status(429).json({ message: 'You have 10 pending invites that haven\'t been used yet. Wait for some to expire or be accepted.' }); return;
    }

    // Cooldown: block resend if an invite to this email was sent in the last 10 minutes
    const since10m   = new Date(Date.now() - 10 * 60 * 1000);
    const recentSend = await Invite.findOne({ email: email.toLowerCase(), createdAt: { $gte: since10m } });
    if (recentSend) {
      const minutesLeft = Math.ceil((recentSend.createdAt.getTime() + 10 * 60 * 1000 - Date.now()) / 60000);
      res.status(429).json({ message: `An invite was just sent to this address. Please wait ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} before resending.` }); return;
    }

    // Remove any previous unused invite for this email so resending always works
    await Invite.deleteMany({ email: email.toLowerCase(), used: false });

    const token    = uuid();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await Invite.create({ email: email.toLowerCase(), token, invitedBy: req.userId, expiresAt });

    const appUrl  = process.env.APP_URL ?? 'http://localhost:5173';
    const link    = `${appUrl}?invite=${token}`;

    const transport = makeTransport();
    if (transport) {
      await transport.sendMail({
        from:    process.env.SMTP_FROM ?? 'AlphaCircle <no-reply@alphacircle.app>',
        to:      email,
        subject: "You're invited to AlphaCircle",
        html: `
          <p>You've been invited to join <strong>AlphaCircle</strong> — an exclusive investor network.</p>
          <p><a href="${link}" style="background:#00c9b1;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Accept Invitation</a></p>
          <p style="color:#888;font-size:12px;">This link expires in 7 days and can only be used once.</p>
        `,
      });
      console.log(`Invite sent to ${email}`);
    } else {
      console.log(`\n📨  INVITE LINK (no SMTP configured):\n    ${link}\n`);
    }

    res.status(201).json({ message: 'Invite sent', expiresAt });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const validateInvite = async (req: Request, res: Response): Promise<void> => {
  try {
    const invite = await Invite.findOne({ token: req.params.token });

    if (!invite || invite.used || invite.expiresAt < new Date()) {
      res.status(400).json({ valid: false, message: 'Invite link is invalid or has expired' }); return;
    }

    res.json({ valid: true, email: invite.email });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
