import mongoose from 'mongoose';
import { defineModel } from './define.js';
import { geoPointSchema } from './geo.js';

const recurrenceSchema = new mongoose.Schema(
  {
    frequency: { type: String, enum: ['weekly', 'biweekly', 'monthly'], default: 'weekly' },
    byWeekday: [{ type: Number, min: 0, max: 6, required: true }], // 0 = Sunday
    startTime: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/, default: '07:00' }, // local, community timeZone
    durationMinutes: { type: Number, min: 15, max: 1440, default: 120 },
    timeZone: { type: String, default: 'Asia/Kolkata' },
    nextSessionAt: { type: Date },
  },
  { _id: false }
);

const communitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    description: { type: String, required: true, maxlength: 2000 },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    coverImage: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    moderators: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    visibility: { type: String, enum: ['public', 'private'], default: 'public', index: true },
    membershipPolicy: { type: String, enum: ['open', 'approval'], default: 'open' },
    communityRules: { type: String, default: '', maxlength: 1500 },
    guidelines: { type: String, default: '', maxlength: 1500 },
    defaultLocation: {
      name: { type: String, default: '', maxlength: 120 },
      city: { type: String, default: '', maxlength: 80 },
      geo: { type: geoPointSchema, default: undefined },
    },
    recurrenceSettings: { type: recurrenceSchema, default: undefined },
    memberCount: { type: Number, default: 1 }, // owner included
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

communitySchema.index({ name: 'text', description: 'text' });
communitySchema.index({ 'defaultLocation.geo': '2dsphere' });

const Community = defineModel('Community', communitySchema);
export default Community;
