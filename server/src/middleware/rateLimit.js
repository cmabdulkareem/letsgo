import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

const handler = (_req, res) =>
  res.status(429).json({
    success: false,
    message: 'Too many requests, please slow down and try again shortly',
    code: 'RATE_LIMITED',
  });

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler,
});

// In-memory token bucket per user for Socket.IO chat events.
const buckets = new Map();
const CHAT_LIMIT = 20; // messages per window
const CHAT_WINDOW_MS = 10 * 1000;

export function socketChatRateOk(userId) {
  const now = Date.now();
  let bucket = buckets.get(userId);
  if (!bucket || now - bucket.start > CHAT_WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(userId, bucket);
    if (buckets.size > 10000) buckets.clear(); // bounded memory
  }
  bucket.count += 1;
  return bucket.count <= CHAT_LIMIT;
}

export const isProd = env.isProduction;
