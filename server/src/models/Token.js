import mongoose from 'mongoose';
import { defineModel } from './define.js';

// Shared shape for one-time email verification and password reset tokens.
// Only SHA-256 hashes are stored.
const tokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const EmailVerificationToken = defineModel('EmailVerificationToken', tokenSchema);
export const PasswordResetToken = defineModel('PasswordResetToken', tokenSchema.clone());
