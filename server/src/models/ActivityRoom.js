import mongoose from 'mongoose';
import { defineModel } from './define.js';
import { geoPointSchema } from './geo.js';

export const ROOM_STATUSES = [
  'draft',
  'open',
  'full',
  'scheduling',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'archived',
];

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 }, // venue / meeting point
    city: { type: String, default: '', trim: true, maxlength: 80 },
    area: { type: String, default: '', trim: true, maxlength: 80 },
    geo: { type: geoPointSchema, default: undefined },
  },
  { _id: false }
);

const activityRoomSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true, maxlength: 3000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    coverImage: { type: String, default: '' },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null },
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    joinPolicy: { type: String, enum: ['open', 'approval'], default: 'open' },
    roomStatus: { type: String, enum: ROOM_STATUSES, default: 'open', index: true },
    location: { type: locationSchema, required: true },
    confirmedStartAt: { type: Date },
    confirmedEndAt: { type: Date },
    // Denormalized scheduling key used for "upcoming" sort and date filters.
    nextAt: { type: Date, index: true },
    timeZone: { type: String, default: 'Asia/Kolkata' },
    minimumParticipants: { type: Number, min: 2, default: 2 },
    maximumParticipants: { type: Number, min: 2, max: 500, required: true },
    memberCount: { type: Number, default: 0 }, // denormalized; host is counted as a member
    waitlistEnabled: { type: Boolean, default: true },
    skillLevel: { type: String, enum: ['any', 'beginner', 'intermediate', 'advanced'], default: 'any' },
    cost: {
      isFree: { type: Boolean, default: true },
      amount: { type: Number, min: 0, default: 0 },
      currency: { type: String, default: 'INR', maxlength: 3 },
      notes: { type: String, default: '', maxlength: 200 },
    },
    equipment: [{ type: String, maxlength: 80 }],
    durationMinutes: { type: Number, min: 15, max: 1440, default: 120 },
    ageRestriction: {
      min: { type: Number, min: 0, max: 120 },
      max: { type: Number, min: 0, max: 120 },
    },
    roomRules: { type: String, default: '', maxlength: 1500 },
    cancellationPolicy: { type: String, default: '', maxlength: 1000 },
    recurrenceSettings: {
      frequency: { type: String, enum: ['none', 'weekly', 'biweekly', 'monthly'], default: 'none' },
      byWeekday: [{ type: Number, min: 0, max: 6 }], // 0 = Sunday
      nextSessionAt: { type: Date },
    },
    attendanceConfirmationRequired: { type: Boolean, default: true },
  },
  { timestamps: true }
);

activityRoomSchema.index({ 'location.geo': '2dsphere' });
activityRoomSchema.index({ roomStatus: 1, visibility: 1, category: 1 });
activityRoomSchema.index({ createdAt: -1 });
activityRoomSchema.index({ confirmedStartAt: 1 }, { sparse: true });
activityRoomSchema.index({ title: 'text', description: 'text' });

const ActivityRoom = defineModel('ActivityRoom', activityRoomSchema);
export default ActivityRoom;
