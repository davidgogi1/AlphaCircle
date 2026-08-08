import rateLimit from 'express-rate-limit';
import { extractIp } from '../utils/geo';

// Complements the existing per-account lockout in authController (3 wrong
// passwords -> 60s lock on that one account) — this catches the case that
// doesn't cover: many requests spread across many different accounts from
// the same IP (credential stuffing, scripted signup/reset abuse).
const keyGenerator = (req: Parameters<typeof extractIp>[0]) => extractIp(req);

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: 'Too many login attempts from this network. Please try again later.' },
});

export const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: 'Too many registration attempts from this network. Please try again later.' },
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  message: { message: 'Too many password reset requests from this network. Please try again later.' },
});
