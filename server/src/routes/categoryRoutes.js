import { Router } from 'express';
import { Category } from '../models/index.js';
import { ok } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1, name: 1 });
    return ok(res, { categories });
  })
);

export default router;
