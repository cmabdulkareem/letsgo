import { Report, User, AuditLog, Category } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { notify } from './notificationService.js';
import { parsePagination, paged } from '../utils/response.js';
import { slugify } from '../utils/slug.js';

export async function listReports(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (query.status && ['pending', 'resolved', 'dismissed'].includes(query.status)) {
    filter.status = query.status;
  }
  const [items, total] = await Promise.all([
    Report.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reporter', 'displayName username')
      .populate('reportedUser', 'displayName username avatar accountStatus')
      .populate('relatedRoom', 'title slug roomStatus')
      .populate('reviewedBy', 'displayName username'),
    Report.countDocuments(filter),
  ]);
  return paged(items, { page, limit, total });
}

export async function reviewReport(reportId, admin, { status, resolution = '', actionTaken = 'none' }) {
  const report = await Report.findById(reportId);
  if (!report) throw ApiError.notFound('Report not found');
  if (report.status !== 'pending') throw ApiError.conflict('Report has already been reviewed');

  report.status = status;
  report.reviewedBy = admin._id;
  report.reviewedAt = new Date();
  report.resolution = resolution;
  report.actionTaken = actionTaken;
  await report.save();

  if (status === 'resolved') {
    if (actionTaken === 'suspension') {
      await suspendUser(report.reportedUser, admin, `Suspended based on report ${report._id}`);
    }
    await notify(report.reportedUser, {
      type: 'moderation_action',
      title: 'A moderation review affecting your account was completed',
      relatedEntity: { kind: 'report', id: report._id },
      url: '/settings',
    }).catch(() => {});
  }

  await AuditLog.create({
    actor: admin._id,
    action: status === 'resolved' ? 'report_resolved' : 'report_dismissed',
    targetUser: report.reportedUser,
    report: report._id,
    detail: resolution,
  });
  return report;
}

export async function suspendUser(userId, admin, detail = '') {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  if (user.role === 'admin') throw ApiError.forbidden('Administrators cannot be suspended');
  user.accountStatus = 'suspended';
  user.tokenVersion += 1; // kill active sessions
  await user.save();
  await AuditLog.create({ actor: admin._id, action: 'user_suspended', targetUser: user._id, detail });
  return user;
}

export async function unsuspendUser(userId, admin, detail = '') {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  user.accountStatus = 'active';
  await user.save();
  await AuditLog.create({ actor: admin._id, action: 'user_unsuspended', targetUser: user._id, detail });
  return user;
}

export async function listUsers(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  const filter = {};
  if (query.q) {
    const rx = new RegExp(String(query.q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ username: rx }, { email: rx }, { displayName: rx }];
  }
  if (query.status && ['active', 'suspended', 'deactivated'].includes(query.status)) {
    filter.accountStatus = query.status;
  }
  const [items, total] = await Promise.all([
    User.find(filter)
      .select('-passwordHash -tokenVersion -savedActivities -notificationPreferences')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);
  return paged(items, { page, limit, total });
}

export async function listAudit(query) {
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 30, maxLimit: 100 });
  const [items, total] = await Promise.all([
    AuditLog.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('actor', 'displayName username')
      .populate('targetUser', 'displayName username'),
    AuditLog.countDocuments({}),
  ]);
  return paged(items, { page, limit, total });
}

export async function createCategory(data, admin) {
  const slug = slugify(data.name);
  const exists = await Category.findOne({ slug });
  if (exists) throw ApiError.conflict('A category with this name already exists');
  const category = await Category.create({ ...data, slug });
  await AuditLog.create({ actor: admin._id, action: 'category_created', detail: category.name });
  return category;
}

export async function updateCategory(categoryId, data, admin) {
  const category = await Category.findById(categoryId);
  if (!category) throw ApiError.notFound('Category not found');
  for (const key of ['name', 'description', 'icon', 'color', 'isActive', 'sortOrder']) {
    if (data[key] !== undefined) category[key] = data[key];
  }
  if (data.name) category.slug = slugify(data.name);
  await category.save();
  await AuditLog.create({ actor: admin._id, action: 'category_updated', detail: category.name });
  return category;
}
