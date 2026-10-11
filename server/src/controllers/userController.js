import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import ApiError from '../utils/ApiError.js';
import * as userService from '../services/userService.js';
import * as safetyService from '../services/safetyService.js';
import { saveImage } from '../services/uploadService.js';

export const getByUsername = asyncHandler(async (req, res) => {
  const result = await userService.getPublicProfile(req.params.username, req.user);
  return ok(res, result);
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user, req.body);
  return ok(res, { user: user.toSafeJSON() }, 'Profile updated');
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest('Choose an image to upload');
  const avatarPath = await saveImage(req.file.buffer);
  req.user.avatar = avatarPath;
  await req.user.save();
  return ok(res, { avatar: avatarPath }, 'Avatar updated');
});

export const myActivities = asyncHandler(async (req, res) => {
  const result = await userService.myActivity(req.user, req.query);
  return ok(res, result);
});

export const myCommunities = asyncHandler(async (req, res) => {
  const result = await userService.myCommunities(req.user);
  return ok(res, { communities: result });
});

export const deactivate = asyncHandler(async (req, res) => {
  await userService.deactivateAccount(req.user);
  return ok(res, null, 'Account deactivated');
});

export const block = asyncHandler(async (req, res) => {
  await safetyService.blockUser(req.user, req.params.userId);
  return ok(res, null, 'User blocked');
});

export const unblock = asyncHandler(async (req, res) => {
  await safetyService.unblockUser(req.user, req.params.userId);
  return ok(res, null, 'User unblocked');
});

export const blocked = asyncHandler(async (req, res) => {
  const result = await safetyService.listBlocked(req.user, req.query);
  return ok(res, result);
});

export const report = asyncHandler(async (req, res) => {
  const report = await safetyService.createReport(req.user, req.body);
  return ok(res, { report }, 'Report submitted for review');
});
