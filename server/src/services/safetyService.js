import { Block, Report, User, ActivityRoom, Message } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { notify } from './notificationService.js';

export async function blockUser(blocker, targetUserId) {
  if (String(blocker._id) === String(targetUserId)) {
    throw ApiError.badRequest('You cannot block yourself');
  }
  const target = await User.findById(targetUserId);
  if (!target) throw ApiError.notFound('User not found');
  const existing = await Block.findOne({ blocker: blocker._id, blockedUser: targetUserId });
  if (existing) throw ApiError.conflict('User is already blocked');
  try {
    await Block.create({ blocker: blocker._id, blockedUser: targetUserId });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('User is already blocked');
    throw err;
  }
  return target;
}

export async function unblockUser(blocker, targetUserId) {
  const res = await Block.deleteOne({ blocker: blocker._id, blockedUser: targetUserId });
  if (res.deletedCount === 0) throw ApiError.notFound('Block not found');
}

export async function listBlocked(blocker, query = {}) {
  const { limit, skip } = {
    limit: Math.min(100, parseInt(query.limit, 10) || 50),
    skip: Math.max(0, ((parseInt(query.page, 10) || 1) - 1) * (parseInt(query.limit, 10) || 50)),
  };
  const [items, total] = await Promise.all([
    Block.find({ blocker: blocker._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('blockedUser', 'displayName username avatar bio city'),
    Block.countDocuments({ blocker: blocker._id }),
  ]);
  return { items, total };
}

/** True when either party has blocked the other. Used by discovery, joining, chat. */
export async function isBlockedEitherWay(userA, userB) {
  if (!userA || !userB) return false;
  const count = await Block.countDocuments({
    $or: [
      { blocker: userA, blockedUser: userB },
      { blocker: userB, blockedUser: userA },
    ],
  });
  return count > 0;
}

/** IDs of everyone the viewer has blocked or is blocked by — for exclusion filters. */
export async function blockedIdsFor(viewerId) {
  if (!viewerId) return [];
  const docs = await Block.find({
    $or: [{ blocker: viewerId }, { blockedUser: viewerId }],
  }).select('blocker blockedUser');
  const ids = new Set();
  for (const d of docs) {
    ids.add(String(d.blocker));
    ids.add(String(d.blockedUser));
  }
  ids.delete(String(viewerId));
  return [...ids];
}

export async function createReport(reporter, { userId, roomId, messageId, reason, description }) {
  if (String(reporter._id) === String(userId)) {
    throw ApiError.badRequest('You cannot report yourself');
  }
  const reportedUser = await User.findById(userId);
  if (!reportedUser) throw ApiError.notFound('User not found');

  if (roomId) {
    const room = await ActivityRoom.findById(roomId);
    if (!room) throw ApiError.notFound('Activity not found');
  }
  if (messageId) {
    const message = await Message.findById(messageId);
    if (!message) throw ApiError.notFound('Message not found');
  }

  const report = await Report.create({
    reporter: reporter._id,
    reportedUser,
    relatedRoom: roomId || undefined,
    relatedMessage: messageId || undefined,
    reason,
    description,
  });
  return report;
}
