import mongoose from 'mongoose';
import { defineModel } from './define.js';

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

const PushSubscription = defineModel('PushSubscription', pushSubscriptionSchema);
export default PushSubscription;
