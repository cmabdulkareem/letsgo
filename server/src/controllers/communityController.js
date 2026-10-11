import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';
import * as communityService from '../services/communityService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await communityService.listCommunities(req.query, req.user?._id);
  return ok(res, result);
});

export const detail = asyncHandler(async (req, res) => {
  const result = await communityService.getCommunityDetail(req.params.communityId, req.user);
  return ok(res, result);
});

export const create = asyncHandler(async (req, res) => {
  const community = await communityService.createCommunity(req.body, req.user);
  return created(res, { community }, 'Community created');
});

export const update = asyncHandler(async (req, res) => {
  const community = await communityService.updateCommunity(req.params.communityId, req.body, req.user);
  return ok(res, { community }, 'Community updated');
});

export const join = asyncHandler(async (req, res) => {
  const result = await communityService.joinCommunity(req.params.communityId, req.user);
  return ok(
    res,
    result,
    result.status === 'pending' ? 'Membership request sent' : 'You joined the community'
  );
});

export const review = asyncHandler(async (req, res) => {
  const membership = await communityService.reviewMembership(
    req.params.communityId,
    req.params.userId,
    req.user,
    req.body.approve
  );
  return ok(res, { membership }, 'Request reviewed');
});

export const leave = asyncHandler(async (req, res) => {
  await communityService.leaveCommunity(req.params.communityId, req.user);
  return ok(res, null, 'You left the community');
});

export const members = asyncHandler(async (req, res) => {
  const result = await communityService.listCommunityMembers(req.params.communityId, req.user, req.query);
  return ok(res, result);
});

export const sessions = asyncHandler(async (req, res) => {
  const result = await communityService.listSessions(req.params.communityId, req.user, req.query);
  return ok(res, result);
});

export const createSession = asyncHandler(async (req, res) => {
  const session = await communityService.createSession(req.params.communityId, req.user, req.body);
  return created(res, { session }, 'Session created');
});

export const rsvp = asyncHandler(async (req, res) => {
  const session = await communityService.rsvpSession(req.params.sessionId, req.user, req.body.going);
  return ok(res, { session }, req.body.going ? 'See you there!' : 'RSVP removed');
});

export const cancelSession = asyncHandler(async (req, res) => {
  const session = await communityService.cancelSession(req.params.sessionId, req.user);
  return ok(res, { session }, 'Session cancelled');
});
