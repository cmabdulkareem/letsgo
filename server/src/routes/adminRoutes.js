import { Router } from 'express';
import { z } from 'zod';
import * as adminController from '../controllers/adminController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, requireAdmin);

const reviewReportSchema = z.object({
  status: z.enum(['resolved', 'dismissed']),
  resolution: z.string().max(1000).optional().default(''),
  actionTaken: z.enum(['none', 'warning', 'suspension', 'content_removal']).optional().default('none'),
});

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().max(200).optional().default(''),
  icon: z.string().max(40).optional().default('sparkles'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#08B981'),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().optional(),
});

router.get('/reports', adminController.reports);
router.patch('/reports/:reportId', validate(reviewReportSchema), adminController.reviewReport);
router.get('/users', adminController.users);
router.post('/users/:userId/suspend', adminController.suspendUser);
router.post('/users/:userId/unsuspend', adminController.unsuspendUser);
router.get('/audit', adminController.audit);
router.post('/categories', validate(categorySchema), adminController.createCategory);
router.patch('/categories/:categoryId', validate(categorySchema.partial()), adminController.updateCategory);

export default router;
