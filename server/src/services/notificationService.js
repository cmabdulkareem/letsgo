import { Notification, User } from '../models/index.js';
import { sendPushToUser, isPushConfigured } from './pushService.js';
import { emitToUser } from '../sockets/emitter.js';
import logger from '../config/logger.js';

// Maps notification types to the per-channel preference buckets on the User model.
const TYPE_TO_CHANNEL = {
  join_request_received: 'joinRequests',
  join_request_approved: 'joinRequests',
  join_request_rejected: 'joinRequests',
  member_joined: 'membership',
  member_left: 'membership',
  poll_created: 'scheduling',
  poll_closing_soon: 'scheduling',
  schedule_confirmed: 'scheduling',
  schedule_changed: 'scheduling',
  activity_reminder: 'reminders',
  activity_cancelled: 'cancellions',
  waitlist_promoted: 'membership',
  room_announcement: 'membership',
  moderation_action: 'moderation',
};

/**
 * Creates a persisted notification (authoritative store) and best-effort delivers
 * real-time socket + web-push copies according to the recipient's preferences.
 */
export async function notify(recipientId, { type, title, body = '', relatedEntity, url }) {
  const channel = TYPE_TO_CHANNEL[type] || 'membership';
  const user = await User.findById(recipientId).select('notificationPreferences accountStatus');
  if (!user || user.accountStatus !== 'active') return null;

  const prefs = user.notificationPreferences || {};
  const inAppEnabled = prefs.inApp?.[channel] !== false;

  let notification = null;
  if (inAppEnabled) {
    notification = await Notification.create({
      recipient: recipientId,
      type,
      title,
      body,
      relatedEntity,
    });
    emitToUser(recipientId, 'notification:new', {
      _id: notification._id,
      type,
      title,
      body,
      relatedEntity,
      url,
      createdAt: notification.createdAt,
    });
  }

  if (prefs.push?.[channel] !== false && isPushConfigured()) {
    sendPushToUser(recipientId, { title, body, url: url || '/' }).catch((err) =>
      logger.warn('push.dispatch_failed', { error: err.message })
    );
  }
  return notification;
}

export async function notifyMany(recipientIds, payload) {
  const unique = [...new Set(recipientIds.map(String))];
  await Promise.allSettled(unique.map((id) => notify(id, payload)));
}

export async function getUnreadCount(userId) {
  return Notification.countDocuments({ recipient: userId, readAt: null });
}
