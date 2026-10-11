import bcrypt from 'bcryptjs';
import env from '../config/env.js';
import logger from '../config/logger.js';
import {
  User,
  RefreshSession,
  EmailVerificationToken,
  PasswordResetToken,
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  generateOpaqueToken,
} from '../utils/tokens.js';
import { sendEmail, buildVerificationEmail, buildPasswordResetEmail } from './emailService.js';

const BCRYPT_ROUNDS = 12;
const REFRESH_COOKIE = 'lg_refresh';
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;

export function refreshCookieOptions() {
  const sameSite = env.cookieSameSite === 'none' ? 'none' : env.cookieSameSite;
  return {
    httpOnly: true,
    // SameSite=None requires Secure=true in all browsers.
    secure: env.isProduction || sameSite === 'none',
    sameSite,
    path: '/api/v1/auth',
    maxAge: env.refreshTokenExpiryDays * 24 * 60 * 60 * 1000,
  };
}

export function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions(), maxAge: 0 });
}

async function createRefreshSession(req, res, user) {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + env.refreshTokenExpiryDays * 24 * 60 * 60 * 1000);
  await RefreshSession.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt,
    userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    ip: req.ip || '',
  });
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions());
}

async function sendVerificationEmail(user) {
  const token = generateOpaqueToken();
  await EmailVerificationToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + VERIFICATION_TTL_MS),
  });
  const verifyUrl = `${env.frontendPublicUrl}/verify-email?token=${token}`;
  const { subject, text } = buildVerificationEmail(verifyUrl);
  await sendEmail({ to: user.email, subject, text });
}

export async function register({ displayName, username, email, password, city }) {
  const existing = await User.findOne({ $or: [{ email }, { username }] }).select('_id email username');
  if (existing) {
    throw ApiError.conflict(
      existing.email === email ? 'An account with this email already exists' : 'This username is taken'
    );
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ displayName, username, email, passwordHash, city });
  await sendVerificationEmail(user);
  logger.info('auth.registered', { userId: String(user._id) });
  return user;
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user) throw ApiError.unauthorized('Invalid email or password');
  if (user.accountStatus !== 'active') {
    throw ApiError.forbidden('This account has been suspended or deactivated');
  }
  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw ApiError.unauthorized('Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();
  return user;
}

export async function issueTokens(req, res, user) {
  const accessToken = signAccessToken(user);
  await createRefreshSession(req, res, user);
  return { accessToken, user: user.toSafeJSON() };
}

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw ApiError.unauthorized('No refresh token');

  const session = await RefreshSession.findOne({ tokenHash: hashToken(token) }).populate('user');
  if (!session || session.expiresAt < new Date()) {
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Refresh token expired, please sign in again');
  }
  if (session.revokedAt) {
    // Reuse of a rotated token: treat as compromise and revoke all sessions.
    logger.warn('auth.refresh_reuse_detected', { userId: String(session.user?._id) });
    await RefreshSession.updateMany(
      { user: session.user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Session invalid, please sign in again');
  }
  const user = session.user;
  if (!user || user.accountStatus !== 'active') {
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Account is not active');
  }

  session.revokedAt = new Date();
  await session.save();
  const accessToken = signAccessToken(user);
  await createRefreshSession(req, res, user);
  return { accessToken, user: user.toSafeJSON() };
}

export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    await RefreshSession.updateOne(
      { tokenHash: hashToken(token), revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
  }
  clearRefreshCookie(res);
}

export async function verifyEmail({ token }) {
  const record = await EmailVerificationToken.findOne({ tokenHash: hashToken(token) });
  if (!record || record.expiresAt < new Date() || record.consumedAt) {
    throw ApiError.badRequest('This verification link is invalid or has expired');
  }
  record.consumedAt = new Date();
  await record.save();
  await User.updateOne(
    { _id: record.user },
    { $set: { 'verificationStatus.emailVerified': true } }
  );
}

export async function resendVerification(user) {
  if (user.verificationStatus.emailVerified) {
    throw ApiError.badRequest('Email is already verified');
  }
  await EmailVerificationToken.deleteMany({ user: user._id, consumedAt: null });
  await sendVerificationEmail(user);
}

export async function forgotPassword({ email }) {
  const user = await User.findOne({ email });
  // Uniform response regardless of whether the account exists.
  if (!user || user.accountStatus !== 'active') return;
  await PasswordResetToken.deleteMany({ user: user._id, consumedAt: null });
  const token = generateOpaqueToken();
  await PasswordResetToken.create({
    user: user._id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  const resetUrl = `${env.frontendPublicUrl}/reset-password?token=${token}`;
  const { subject, text } = buildPasswordResetEmail(resetUrl);
  await sendEmail({ to: user.email, subject, text });
}

export async function resetPassword({ token, password }) {
  const record = await PasswordResetToken.findOne({ tokenHash: hashToken(token) });
  if (!record || record.expiresAt < new Date() || record.consumedAt) {
    throw ApiError.badRequest('This reset link is invalid or has expired');
  }
  record.consumedAt = new Date();
  await record.save();

  const user = await User.findById(record.user);
  if (!user) throw ApiError.notFound('Account not found');
  user.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.tokenVersion += 1; // revoke every existing session
  await user.save();
  await RefreshSession.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
