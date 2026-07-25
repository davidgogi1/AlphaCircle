import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import User from '../models/User';
import Invite from '../models/Invite';
import TrustedDevice from '../models/TrustedDevice';
import PendingLogin from '../models/PendingLogin';
import PasswordReset from '../models/PasswordReset';
import { extractIp, lookupIp, isImpossibleTravel } from '../utils/geo';

const signToken = (id: string) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '7d' });

const DEVICE_COOKIE_MAX_AGE = 180 * 24 * 60 * 60 * 1000; // 180 days

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

function setDeviceCookie(req: Request, res: Response, deviceId: string) {
  const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('device_id', deviceId, {
    httpOnly: true,
    secure:   isHttps,
    sameSite: 'lax',
    maxAge:   DEVICE_COOKIE_MAX_AGE,
    path:     '/',
  });
}

async function trustDevice(req: Request, res: Response, userId: string, ip: string, userAgent: string): Promise<void> {
  const deviceId = crypto.randomBytes(32).toString('hex');
  const geo = await lookupIp(ip);
  await TrustedDevice.create({
    user: userId,
    deviceId,
    userAgent,
    ip,
    city: geo?.city,
    country: geo?.country,
    lat: geo?.lat,
    lon: geo?.lon,
    lastSeenAt: new Date(),
  });
  setDeviceCookie(req, res, deviceId);
}

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

    const ip   = extractIp(req);
    const user = await User.create({ username, email, password, registrationIp: ip });

    invite.used = true;
    await invite.save();

    // Brand-new account — nothing to compare a "new device" against yet, so
    // this first browser is trusted outright rather than immediately challenged.
    const userAgent = (req.headers['user-agent'] as string) ?? '';
    await trustDevice(req, res, user.id as string, ip, userAgent);

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

    // Lockout only ever applies to a real account, so a made-up email can
    // never trigger it — that would otherwise be a way to tell which emails
    // are registered just by watching for a lockout response.
    if (user?.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const secondsLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 1000);
      res.status(429).json({ message: `Too many incorrect attempts. Please try again in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}.` });
      return;
    }

    if (!user || !(await user.comparePassword(password))) {
      if (user) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 3) {
          user.lockedUntil = new Date(Date.now() + 60 * 1000);
          user.failedLoginAttempts = 0;
        }
        await user.save();
      }
      res.status(401).json({ message: 'Invalid email or password' }); return;
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      user.failedLoginAttempts = 0;
      user.lockedUntil = null;
      await user.save();
    }

    const ip        = extractIp(req);
    const userAgent = (req.headers['user-agent'] as string) ?? 'Unknown device';
    const deviceId  = req.cookies?.device_id as string | undefined;

    const trusted = deviceId
      ? await TrustedDevice.findOne({ user: user._id, deviceId })
      : null;

    if (trusted) {
      // Recognized device — refresh its known location/last-seen and log in normally.
      const geo = await lookupIp(ip);
      trusted.ip = ip;
      trusted.lastSeenAt = new Date();
      if (geo) { trusted.city = geo.city; trusted.country = geo.country; trusted.lat = geo.lat; trusted.lon = geo.lon; }
      await trusted.save();

      // Sliding trust window — an actively-used device should never expire out
      // from under someone; only genuine inactivity for the full period should.
      setDeviceCookie(req, res, deviceId!);

      const token = signToken(user.id as string);
      res.json({ token, user: userPayload(user) });
      return;
    }

    // Unrecognized device — never complete the login on password alone.
    // Assess risk against the most recent known-good login, then require an
    // emailed one-time code before granting a session.
    const geo = await lookupIp(ip);
    const lastKnown = await TrustedDevice.findOne({ user: user._id }).sort({ lastSeenAt: -1 });
    let highRisk = false;
    if (geo && lastKnown?.lat != null && lastKnown?.lon != null) {
      highRisk = isImpossibleTravel(
        { lat: lastKnown.lat, lon: lastKnown.lon, city: lastKnown.city ?? '', country: lastKnown.country ?? '' },
        lastKnown.lastSeenAt,
        geo,
        new Date(),
      );
    }

    // Rate limit: cap pending verification emails so this can't be used to spam a user's inbox.
    const since1h = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await PendingLogin.countDocuments({ user: user._id, createdAt: { $gte: since1h } });
    if (recentCount >= 5) {
      res.status(429).json({ message: 'Too many sign-in attempts. Please wait a while before trying again.' });
      return;
    }

    const code     = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const pending  = await PendingLogin.create({ user: user._id, codeHash, ip, userAgent, highRisk });

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const transport = makeTransport();
    const subject = highRisk
      ? '⚠️ Suspicious sign-in blocked on AlphaCircle'
      : 'Confirm your sign-in to AlphaCircle';

    let html: string;
    if (highRisk) {
      // A real reset token, generated proactively — the "change password"
      // link works even though the recipient isn't logged in anywhere.
      const resetToken = crypto.randomBytes(32).toString('hex');
      await PasswordReset.create({ user: user._id, token: resetToken, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
      const resetLink  = `${appUrl}?reset=${resetToken}`;
      const ignoreLink = `${appUrl}?dismissAlert=1`;

      html = `
        <p>We blocked a sign-in attempt on your account from a location inconsistent with your recent activity — reaching it would require travel faster than is physically possible since your last login.</p>
        <p>If this wasn't you, secure your account now:</p>
        <p><a href="${resetLink}" style="background:#f85149;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Change My Password</a></p>
        <p>If this <em>was</em> you — for example, using a VPN, or someone you've knowingly shared access with — no action is needed:</p>
        <p><a href="${ignoreLink}" style="color:#888;text-decoration:underline;">This was me, ignore this alert</a></p>
        <hr style="border:none;border-top:1px solid #333;margin:16px 0;" />
        <p>To finish the sign-in attempt itself, here's the verification code it's waiting on:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
        <p style="color:#888;font-size:12px;">This code expires in 10 minutes.</p>
      `;
    } else {
      html = `
        <p>We noticed a sign-in attempt from a device or browser we don't recognize. Enter the code below to continue.</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
        <p style="color:#888;font-size:12px;">This code expires in 10 minutes. If you didn't try to sign in, you can safely ignore this email — your account is still secure.</p>
      `;
    }

    if (transport) {
      // Fire-and-forget — the code is already generated and hashed, so the
      // response (and the code-entry screen) shouldn't wait on an SMTP round-trip.
      transport.sendMail({ from: process.env.SMTP_FROM ?? 'AlphaCircle <no-reply@alphacircle.app>', to: user.email, subject, html })
        .catch(err => console.error('Login verification email failed:', err.message));
    } else {
      console.log(`\n🔐 LOGIN CODE (no SMTP configured): ${code} for ${user.email}${highRisk ? ' [HIGH RISK]' : ''}\n`);
    }

    // Risk tier is deliberately not returned to the client — the person at the
    // keyboard might be the attacker, and shouldn't learn anything about how
    // (or whether) they tripped detection. The detailed version lives only in
    // the account owner's email.
    res.status(200).json({ verificationRequired: true, pendingLoginId: pending.id });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const verifyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { pendingLoginId, code } = req.body as { pendingLoginId: string; code: string };
    if (!pendingLoginId || !code) {
      res.status(400).json({ message: 'Verification code is required' }); return;
    }

    const pending = await PendingLogin.findById(pendingLoginId);
    if (!pending) {
      res.status(400).json({ message: 'This verification code has expired. Please sign in again.' }); return;
    }
    if (pending.attempts >= 5) {
      await pending.deleteOne();
      res.status(400).json({ message: 'Too many incorrect attempts. Please sign in again.' }); return;
    }

    const match = await bcrypt.compare(code, pending.codeHash);
    if (!match) {
      pending.attempts += 1;
      await pending.save();
      const left = 5 - pending.attempts;
      res.status(401).json({ message: `Incorrect code. ${left} attempt${left === 1 ? '' : 's'} left.` });
      return;
    }

    const user = await User.findById(pending.user);
    if (!user) {
      await pending.deleteOne();
      res.status(404).json({ message: 'User not found' }); return;
    }

    await trustDevice(req, res, user.id as string, pending.ip, pending.userAgent);
    await pending.deleteOne();

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

// Change password while logged in (Settings). Always requires the current
// password, and — unlike a reset — refuses to "change" to the same password,
// since the whole premise here is an intentional change.
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
    if (!currentPassword || !newPassword) {
      res.status(400).json({ message: 'Current and new password are required' }); return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'New password must be at least 6 characters' }); return;
    }

    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    if (!(await user.comparePassword(currentPassword))) {
      res.status(401).json({ message: 'Current password is incorrect' }); return;
    }
    if (await user.comparePassword(newPassword)) {
      res.status(400).json({ message: 'New password must be different from your current password' }); return;
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body as { email: string };
    if (!email?.trim()) { res.status(400).json({ message: 'Email is required' }); return; }

    // Same response whether or not the email is registered — otherwise this
    // endpoint becomes a way to check which emails have accounts.
    const genericMsg = { message: "If an account exists for that email, we've sent a password reset link." };

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) { res.json(genericMsg); return; }

    const since10m = new Date(Date.now() - 10 * 60 * 1000);
    const recent = await PasswordReset.findOne({ user: user._id, createdAt: { $gte: since10m } });
    if (recent) {
      const minutesLeft = Math.ceil((recent.createdAt.getTime() + 10 * 60 * 1000 - Date.now()) / 60000);
      res.status(429).json({ message: `A reset link was already sent recently. Please wait ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'} before requesting another.` });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    await PasswordReset.create({ user: user._id, token, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const link   = `${appUrl}?reset=${token}`;

    const transport = makeTransport();
    const html = `
      <p>We received a request to reset your AlphaCircle password.</p>
      <p><a href="${link}" style="background:#00c9b1;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold;">Reset Password</a></p>
      <p style="color:#888;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
    `;
    if (transport) {
      transport.sendMail({ from: process.env.SMTP_FROM ?? 'AlphaCircle <no-reply@alphacircle.app>', to: user.email, subject: 'Reset your AlphaCircle password', html })
        .catch(err => console.error('Password reset email failed:', err.message));
    } else {
      console.log(`\n🔑 PASSWORD RESET LINK (no SMTP configured): ${link}\n`);
    }

    res.json(genericMsg);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword, confirmSame } = req.body as { token: string; newPassword: string; confirmSame?: boolean };
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required' }); return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ message: 'Password must be at least 6 characters' }); return;
    }

    const reset = await PasswordReset.findOne({ token });
    if (!reset || reset.used || reset.expiresAt < new Date()) {
      res.status(400).json({ message: 'This reset link is invalid or has expired. Please request a new one.' }); return;
    }

    const user = await User.findById(reset.user);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }

    // Unlike changing password while logged in, a reset doesn't reject
    // landing back on the same password outright — it just double-checks
    // that's genuinely intended, since "reset" doesn't always mean "change".
    const isSame = await user.comparePassword(newPassword);
    if (isSame && !confirmSame) {
      res.json({ sameAsCurrentPassword: true, message: 'This is the same as your current password — are you sure you want to keep it?' });
      return;
    }

    user.password = newPassword;
    await user.save();
    reset.used = true;
    await reset.save();

    res.json({ message: 'Password updated. You can now log in.' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};
