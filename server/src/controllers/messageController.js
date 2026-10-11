import asyncHandler from '../utils/asyncHandler.js';
import { ok, created } from '../utils/response.js';
import * as messageService from '../services/messageService.js';

export const list = asyncHandler(async (req, res) => {
  const result = await messageService.listMessages(req.params.roomId, req.user, req.query);
  return ok(res, result);
});

export const send = asyncHandler(async (req, res) => {
  const message = await messageService.sendMessage(req.params.roomId, req.user, req.body.content);
  return created(res, { message }, 'Message sent');
});
