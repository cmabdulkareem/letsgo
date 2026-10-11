import webpush from 'web-push';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { PushSubscription } from '../models/index.js';

let configured = false;

export function isPushConfigured() {
  return Boolean(env.webPush.publicKey && env.webPush.privateKey);
}

function ensureConfigured() {
  if (configured || !isPushConfigured()) return configured;
  webpush.setVapidDetails(env.webPush.subject, env.webPush.publicKey, env.webPush.privateKey);
  configured = true;
  return true;
}

/** Fire-and-forget push to all of a user's subscriptions. Dead subscriptions are pruned. */
export async function sendPushToUser(userId, { title, body, url = '/' }) {
  if (!ensureConfigured()) return;
  const subs = await PushSubscription.find({ user: userId });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({ title, body, url })
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await PushSubscription.deleteOne({ _id: sub._id });
      } else {
        logger.warn('push.failed', { userId: String(userId), status: err.statusCode });
      }
    }
  }
}
