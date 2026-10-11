import mongoose from 'mongoose';
import { defineModel } from './define.js';

const pollOptionSchema = new mongoose.Schema(
  {
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    label: { type: String, default: '', maxlength: 80 },
    voteCount: { type: Number, default: 0 },
  },
  { timestamps: false }
);

const schedulingPollSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    options: { type: [pollOptionSchema], validate: (v) => Array.isArray(v) && v.length >= 1 && v.length <= 10 },
    votingMode: { type: String, enum: ['single', 'multiple'], default: 'single' },
    allowVoteChange: { type: Boolean, default: true },
    deadline: { type: Date },
    status: { type: String, enum: ['open', 'closed', 'confirmed'], default: 'open', index: true },
    selectedOptionId: { type: mongoose.Schema.Types.ObjectId },
    confirmedAt: { type: Date },
    closedAt: { type: Date },
    notifiedClosingSoon: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SchedulingPoll = defineModel('SchedulingPoll', schedulingPollSchema);
export default SchedulingPoll;
