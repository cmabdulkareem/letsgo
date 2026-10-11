import mongoose from 'mongoose';
import { defineModel } from './define.js';

const membershipSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['host', 'coHost', 'member'], default: 'member' },
    membershipStatus: {
      type: String,
      enum: ['active', 'waitlisted', 'left', 'removed'],
      default: 'active',
      index: true,
    },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date },
    attendanceStatus: {
      type: String,
      enum: ['none', 'going', 'notGoing', 'attended', 'noShow', 'withdrawn'],
      default: 'none',
    },
    attendanceUpdatedAt: { type: Date },
    dayReminderSent: { type: Boolean, default: false },
    hourReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One active or waitlisted membership per user per room. Historical (left/removed)
// records are kept for history but do not conflict.
membershipSchema.index(
  { room: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { membershipStatus: { $in: ['active', 'waitlisted'] } },
  }
);
membershipSchema.index({ room: 1, membershipStatus: 1, joinedAt: 1 });

const Membership = defineModel('Membership', membershipSchema);
export default Membership;
