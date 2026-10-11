import mongoose from 'mongoose';
import { defineModel } from './define.js';

const schedulingVoteSchema = new mongoose.Schema(
  {
    poll: { type: mongoose.Schema.Types.ObjectId, ref: 'SchedulingPoll', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    selectedOptions: [{ type: mongoose.Schema.Types.ObjectId }],
  },
  { timestamps: true }
);

schedulingVoteSchema.index({ poll: 1, user: 1 }, { unique: true });

const SchedulingVote = defineModel('SchedulingVote', schedulingVoteSchema);
export default SchedulingVote;
