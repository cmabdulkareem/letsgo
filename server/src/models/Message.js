import mongoose from 'mongoose';
import { defineModel } from './define.js';

const messageSchema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'ActivityRoom', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 2000 },
    messageType: { type: String, enum: ['text', 'system'], default: 'text' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

messageSchema.index({ room: 1, createdAt: -1 });

const Message = defineModel('Message', messageSchema);
export default Message;
