import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';
import * as roomService from '../services/roomService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await roomService.listActivities(req.query, req.user?._id);
  return ok(res, result);
});

export const saved = asyncHandler(async (req, res) => {
  const result = await roomService.listSaved(req.user, req.query);
  return ok(res, result);
});

export const save = asyncHandler(async (req, res) => {
  await roomService.saveActivity(req.params.activityId, req.user);
  return ok(res, null, 'Saved');
});

export const unsave = asyncHandler(async (req, res) => {
  await roomService.unsaveActivity(req.params.activityId, req.user);
  return ok(res, null, 'Removed from saved');
});

export const detail = asyncHandler(async (req, res) => {
  const result = await roomService.getActivityDetail(req.params.activityId, req.user);
  return ok(res, result);
});

export const create = asyncHandler(async (req, res) => {
  const room = await roomService.createActivity(req.body, req.user);
  return created(res, { room }, 'Activity created');
});

export const update = asyncHandler(async (req, res) => {
  const room = await roomService.updateActivity(req.params.activityId, req.body, req.user);
  return ok(res, { room }, 'Activity updated');
});

export const cancel = asyncHandler(async (req, res) => {
  const room = await roomService.cancelActivity(req.params.activityId, req.user);
  return ok(res, { room }, 'Activity cancelled');
});

export const remove = asyncHandler(async (req, res) => {
  // Drafts are hard-deleted; live activities are cancelled instead.
  const room = await roomService.cancelActivity(req.params.activityId, req.user);
  return ok(res, { room }, 'Activity closed');
});

export const join = asyncHandler(async (req, res) => {
  const result = await roomService.joinRoom(req.params.activityId, req.user);
  return ok(
    res,
    result,
    result.waitlisted ? 'Added to the waitlist' : 'You joined the activity'
  );
});

export const leave = asyncHandler(async (req, res) => {
  await roomService.leaveRoom(req.params.activityId, req.user);
  return ok(res, null, 'You left the activity');
});

export const requestToJoin = asyncHandler(async (req, res) => {
  const request = await roomService.requestToJoin(req.params.activityId, req.user, req.body.message);
  return created(res, { request }, 'Join request sent');
});

export const reviewJoinRequest = asyncHandler(async (req, res) => {
  const result = await roomService.reviewJoinRequest(
    req.params.activityId,
    req.params.requestId,
    req.user,
    req.body.approve
  );
  return ok(
    res,
    result,
    req.body.approve ? 'Request approved' : 'Request declined'
  );
});

export const joinRequests = asyncHandler(async (req, res) => {
  const result = await roomService.listJoinRequests(req.params.activityId, req.user, req.query);
  return ok(res, result);
});

export const members = asyncHandler(async (req, res) => {
  const result = await roomService.listMembers(req.params.activityId, req.user, req.query);
  return ok(res, result);
});

export const removeMember = asyncHandler(async (req, res) => {
  const room = await roomService.removeMember(req.params.activityId, req.params.userId, req.user);
  return ok(res, { room }, 'Member removed');
});

export const attendance = asyncHandler(async (req, res) => {
  const membership = await roomService.setMyAttendance(
    req.params.activityId,
    req.user,
    req.body.status
  );
  return ok(res, { membership }, 'Attendance updated');
});

export const memberAttendance = asyncHandler(async (req, res) => {
  const membership = await roomService.hostSetAttendance(
    req.params.activityId,
    req.params.userId,
    req.user,
    req.body.status
  );
  return ok(res, { membership }, 'Attendance updated');
});

export const invite = asyncHandler(async (req, res) => {
  const result = await roomService.inviteUserToRoom(
    req.params.activityId,
    req.user,
    req.body.identifier
  );
  return ok(res, result, result.message);
});
