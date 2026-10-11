import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion || 0 },
    env.accessTokenSecret,
    { expiresIn: env.accessTokenExpiry }
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.accessTokenSecret);
  } catch {
    return null;
  }
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('base64url');
}
