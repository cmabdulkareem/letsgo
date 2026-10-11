import mongoose from 'mongoose';
import { defineModel } from './define.js';

const joinRequestSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
    message: { type: String, default: '', maxlength: 300 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

joinRequestSchema.index(
  { room: 1, user: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } }
);
joinRequestSchema.index({ room: 1, status: 1, createdAt: -1 });

const JoinRequest = defineModel('JoinRequest', joinRequestSchema);
export default JoinRequest;
