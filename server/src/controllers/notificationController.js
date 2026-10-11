import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { Notification, PushSubscription } from '../models/index.js';
import { parsePagination, paged } from '../utils/response.js';
import env from '../config/env.js';
import logger from '../config/logger.js';

export const list = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 50 });
  const filter = { recipient: req.user._id };
  if (req.query.unread === 'true') filter.readAt = null;
  const [items, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, readAt: null }),
  ]);
  return ok(res, { ...paged(items, { page, limit, total }), unread });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const unread = await Notification.countDocuments({ recipient: req.user._id, readAt: null });
  return ok(res, { unread });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.notificationId, recipient: req.user._id },
    { $set: { readAt: new Date() } }
  );
  return ok(res, null, 'Marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  return ok(res, null, 'All notifications marked as read');
});

export const subscribePush = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return ok(res, { configured: Boolean(env.webPush.publicKey) }, 'Subscription ignored');
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    {
      user: req.user._id,
      endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    },
    { upsert: true, new: true }
  );
  return ok(res, { configured: Boolean(env.webPush.publicKey) }, 'Push subscription saved');
});

export const unsubscribePush = asyncHandler(async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (endpoint) {
    await PushSubscription.deleteOne({ user: req.user._id, endpoint });
  } else {
    await PushSubscription.deleteMany({ user: req.user._id });
  }
  return ok(res, null, 'Push subscription removed');
});

export const pushConfig = asyncHandler(async (_req, res) => {
  ok(res, { publicKey: env.webPush.publicKey });
});
