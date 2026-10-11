import mongoose from 'mongoose';
import { defineModel } from './define.js';
import { geoPointSchema } from './geo.js';

const attendeeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['going', 'attended', 'noShow', 'cancelled'],
      default: 'going',
    },
    checkedInAt: { type: Date },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const sessionLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 120 },
    city: { type: String, default: '' },
    geo: { type: geoPointSchema, default: undefined },
  },
  { _id: false }
);

const activitySessionSchema = new mongoose.Schema(
  {
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', default: null, index: true },
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', default: null, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 2000 },
    host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    timeZone: { type: String, default: 'Asia/Kolkata' },
    location: { type: sessionLocationSchema, required: true },
    capacity: { type: Number, min: 2, max: 500, default: 20 },
    sessionStatus: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    attendees: { type: [attendeeSchema], default: [] },
    // Idempotency key for recurrence generation: `${communityId}:${yyyy-mm-dd}`.
    // A unique sparse index makes session creation safe to retry.
    recurrenceKey: { type: String, default: null },
    remindersSent: {
      dayBefore: { type: Boolean, default: false },
      hourBefore: { type: Boolean, default: false },
    },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

activitySessionSchema.index({ community: 1, recurrenceKey: 1 }, { unique: true, sparse: true });
activitySessionSchema.index({ 'location.geo': '2dsphere' });
activitySessionSchema.index({ sessionStatus: 1, startAt: 1 });

const ActivitySession = defineModel('ActivitySession', activitySessionSchema);
export default ActivitySession;
