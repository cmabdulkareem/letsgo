import mongoose from 'mongoose';
import { defineModel } from './define.js';

const blockSchema = new mongoose.Schema(
  {
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blockedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

blockSchema.index({ blocker: 1, blockedUser: 1 }, { unique: true });

const Block = defineModel('Block', blockSchema);
export default Block;
