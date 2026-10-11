import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';
import * as authService from '../services/authService.js';
import env from '../config/env.js';

export const register = asyncHandler(async (req, res) => {
  const user = await authService.register(req.body);
  const tokens = await authService.issueTokens(req, res, user);
  return created(res, tokens, 'Account created. Check your inbox to verify your email.');
});

export const login = asyncHandler(async (req, res) => {
  const user = await authService.login(req.body);
  const tokens = await authService.issueTokens(req, res, user);
  return ok(res, tokens, 'Signed in');
});

export const refresh = asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req, res);
  return ok(res, tokens, 'Token refreshed');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req, res);
  return ok(res, null, 'Signed out');
});

export const me = asyncHandler(async (req, res) => {
  return ok(res, { user: req.user.toSafeJSON() });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  await authService.verifyEmail(req.body);
  return ok(res, null, 'Email verified. You now have full access.');
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerification(req.user);
  return ok(res, null, 'Verification email sent');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body);
  return ok(res, null, 'If an account exists for that email, a reset link is on its way.');
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body);
  return ok(res, null, 'Password updated. Please sign in with your new password.');
});

export const pushConfig = asyncHandler(async (_req, res) => {
  return ok(res, { publicKey: env.webPush.publicKey });
});
