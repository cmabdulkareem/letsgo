import asyncHandler from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import * as adminService from '../services/adminService.js';

export const reports = asyncHandler(async (req, res) => ok(res, await adminService.listReports(req.query)));

export const reviewReport = asyncHandler(async (req, res) =>
  ok(res, { report: await adminService.reviewReport(req.params.reportId, req.user, req.body) }, 'Report reviewed')
);

export const suspendUser = asyncHandler(async (req, res) =>
  ok(res, { user: await adminService.suspendUser(req.params.userId, req.user, req.body?.detail || '') }, 'User suspended')
);

export const unsuspendUser = asyncHandler(async (req, res) =>
  ok(res, { user: await adminService.unsuspendUser(req.params.userId, req.user, req.body?.detail || '') }, 'User unsuspended')
);

export const users = asyncHandler(async (req, res) => ok(res, await adminService.listUsers(req.query)));

export const audit = asyncHandler(async (req, res) => ok(res, await adminService.listAudit(req.query)));

export const createCategory = asyncHandler(async (req, res) =>
  ok(res, { category: await adminService.createCategory(req.body, req.user) }, 'Category created')
);

export const updateCategory = asyncHandler(async (req, res) =>
  ok(res, { category: await adminService.updateCategory(req.params.categoryId, req.body, req.user) }, 'Category updated')
);
