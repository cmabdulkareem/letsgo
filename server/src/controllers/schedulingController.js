import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';
import * as pollService from '../services/pollService.js';

export const createPoll = asyncHandler(async (req, res) => {
  const poll = await pollService.createPoll(req.params.activityId, req.user, req.body);
  return created(res, { poll }, 'Schedule options published');
});

export const listPolls = asyncHandler(async (req, res) => {
  const polls = await pollService.listPolls(req.params.activityId, req.user);
  return ok(res, { polls });
});

export const vote = asyncHandler(async (req, res) => {
  const poll = await pollService.vote(req.params.pollId, req.user, req.body.optionIds);
  return ok(res, { poll }, 'Vote recorded');
});

export const changeVote = asyncHandler(async (req, res) => {
  const poll = await pollService.vote(req.params.pollId, req.user, req.body.optionIds);
  return ok(res, { poll }, 'Vote updated');
});

export const closePoll = asyncHandler(async (req, res) => {
  const poll = await pollService.closePoll(req.params.pollId, req.user);
  return ok(res, { poll }, 'Poll closed');
});

export const confirmPoll = asyncHandler(async (req, res) => {
  const result = await pollService.confirmPoll(req.params.pollId, req.user, req.body.optionId);
  return ok(res, result, 'Schedule confirmed');
});
