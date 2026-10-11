import mongoose from 'mongoose';
import { defineModel } from './define.js';

const communityMembershipSchema = new mongoose.Schema(
  {
    community: { type: mongoose.Schema.Types.ObjectId, ref: 'Community', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['owner', 'moderator', 'member'], default: 'member' },
    status: { type: String, enum: ['active', 'pending', 'left', 'removed'], default: 'active' },
    joinedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

communityMembershipSchema.index(
  { community: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['active', 'pending'] } } }
);

const CommunityMembership = defineModel('CommunityMembership', communityMembershipSchema);
export default CommunityMembership;
