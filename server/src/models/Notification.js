import mongoose from 'mongoose';
import { defineModel } from './define.js';

export const NOTIFICATION_TYPES = [
  'join_request_received',
  'join_request_approved',
  'join_request_rejected',
  'member_joined',
  'member_left',
  'poll_created',
  'poll_closing_soon',
  'schedule_confirmed',
  'schedule_changed',
  'activity_reminder',
  'activity_cancelled',
  'waitlist_promoted',
  'room_announcement',
  'room_invitation',
  'moderation_action',
];

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true, maxlength: 120 },
    body: { type: String, default: '', maxlength: 300 },
    relatedEntity: {
      kind: { type: String, enum: ['room', 'community', 'session', 'user', 'report', 'message'], default: 'room' },
      id: { type: mongoose.Schema.Types.ObjectId },
    },
    readAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

const Notification = defineModel('Notification', notificationSchema);
export default Notification;
