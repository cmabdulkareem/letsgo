import mongoose from 'mongoose';
import { defineModel } from './define.js';

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['report_resolved', 'report_dismissed', 'user_suspended', 'user_unsuspended', 'category_created', 'category_updated'],
      required: true,
    },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    report: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
    detail: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

const AuditLog = defineModel('AuditLog', auditLogSchema);
export default AuditLog;
