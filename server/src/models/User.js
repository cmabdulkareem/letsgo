import mongoose from 'mongoose';
import { defineModel } from './define.js';
import { geoPointSchema } from './geo.js';

const notificationChannelSchema = new mongoose.Schema(
  {
    joinRequests: { type: Boolean, default: true },
    membership: { type: Boolean, default: true },
    scheduling: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    cancellations: { type: Boolean, default: true },
    chat: { type: Boolean, default: true },
    moderation: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/,
    },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '', maxlength: 300 },
    city: { type: String, default: '', maxlength: 80 },
    homeLocation: {
      name: { type: String, default: '' },
      geo: { type: geoPointSchema, default: undefined },
    },
    interests: [{ type: String, maxlength: 40, lowercase: true, trim: true }],
    preferredActivities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    languages: [{ type: String, maxlength: 30, trim: true }],
    ageRange: { type: String, enum: ['', '18-24', '25-34', '35-44', '45-54', '55+'], default: '' },
    privacySettings: {
      profileVisibility: { type: String, enum: ['public', 'members'], default: 'public' },
      showActivityHistory: { type: Boolean, default: true },
      showAttendance: { type: Boolean, default: true },
    },
    notificationPreferences: {
      inApp: { type: notificationChannelSchema, default: () => ({}) },
      email: { type: notificationChannelSchema, default: () => ({}) },
      push: { type: notificationChannelSchema, default: () => ({}) },
    },
    verificationStatus: {
      emailVerified: { type: Boolean, default: false },
      verifiedBadge: { type: Boolean, default: false },
    },
    accountStatus: { type: String, enum: ['active', 'suspended', 'deactivated'], default: 'active' },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    tokenVersion: { type: Number, default: 0 },
    savedActivities: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom' }],
    badges: [
      {
        id: { type: String },
        title: { type: String },
        icon: { type: String },
        description: { type: String },
        unlockedAt: { type: Date, default: Date.now },
      },
    ],
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ 'homeLocation.geo': '2dsphere' });
userSchema.index({ interests: 1 });

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const obj = this.toObject({ virtuals: false });
  delete obj.passwordHash;
  delete obj.__v;
  delete obj.tokenVersion;
  return obj;
};

const User = defineModel('User', userSchema);
export default User;
