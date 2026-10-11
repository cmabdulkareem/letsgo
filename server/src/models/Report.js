import mongoose from 'mongoose';
import { defineModel } from './define.js';

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    relatedRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom' },
    relatedMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    reason: {
      type: String,
      enum: ['spam', 'harassment', 'inappropriate_behavior', 'scam', 'unsafe', 'other'],
      required: true,
    },
    description: { type: String, default: '', maxlength: 1000 },
    status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    resolution: { type: String, default: '', maxlength: 1000 },
    actionTaken: { type: String, enum: ['none', 'warning', 'suspension', 'content_removal'], default: 'none' },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });

const Report = defineModel('Report', reportSchema);
export default Report;
