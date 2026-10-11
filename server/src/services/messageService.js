import { Message, Block, Membership, ActivityRoom } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { getMembership } from './roomService.js';
import { emitToRoom } from '../sockets/emitter.js';
import { parsePagination, paged } from '../utils/response.js';

async function assertCanAccess(roomId, user) {
  const room = await ActivityRoom.findById(roomId).select('visibility roomStatus title');
  if (!room) throw ApiError.notFound('Activity not found');
  const membership = await getMembership(roomId, user._id);
  if (room.visibility === 'private' && (!membership || membership.membershipStatus !== 'active')) {
    throw ApiError.notFound('Activity not found');
  }
  if (!membership || membership.membershipStatus !== 'active') {
    throw ApiError.forbidden('Join the activity to view its chat');
  }
  return room;
}

/** Sender ids the viewer has blocked — their messages are hidden from the viewer. */
async function hiddenSenderIds(viewerId) {
  const blocks = await Block.find({ blocker: viewerId }).select('blockedUser');
  return blocks.map((b) => b.blockedUser);
}

export async function listMessages(roomId, user, query) {
  await assertCanAccess(roomId, user);
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 30, maxLimit: 100 });

  const filter = { room: roomId, isDeleted: false };
  const hidden = await hiddenSenderIds(user._id);
  if (hidden.length) filter.sender = { $nin: hidden };
  if (query.before) {
    filter.createdAt = { $lt: new Date(query.before) };
  }

  const [items, total] = await Promise.all([
    Message.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'displayName username avatar'),
    Message.countDocuments(filter),
  ]);
  return { ...paged(items.reverse(), { page, limit, total }), hasMore: skip + items.length < total };
}

export async function sendMessage(roomId, user, content) {
  const room = await assertCanAccess(roomId, user);
  const message = await Message.create({
    room: roomId,
    sender: user._id,
    content,
    messageType: 'text',
  });
  const populated = await message.populate('sender', 'displayName username avatar');
  emitToRoom(roomId, 'message:new', populated);
  return populated;
}

export async function deleteMessage(messageId, user) {
  const message = await Message.findById(messageId);
  if (!message) throw ApiError.notFound('Message not found');
  const membership = await Membership.findOne({
    room: message.room,
    user: user._id,
    membershipStatus: 'active',
  });
  const isSender = String(message.sender) === String(user._id);
  const isManager = membership && ['host', 'coHost'].includes(membership.role);
  const isAdmin = user.role === 'admin';
  if (!isSender && !isManager && !isAdmin) {
    throw ApiError.forbidden('You cannot delete this message');
  }
  message.isDeleted = true;
  message.content = '';
  await message.save();
  emitToRoom(message.room, 'message:deleted', { messageId: message._id, roomId: message.room });
  return message;
}
