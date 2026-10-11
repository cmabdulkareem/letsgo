import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateProfileSchema, reportUserSchema, myActivityQuerySchema } from '../validators/userValidators.js';
import { upload } from '../services/uploadService.js';

const router = Router();

router.get('/me/activities', authenticate, validate(myActivityQuerySchema, 'query'), userController.myActivities);
router.get('/me/communities', authenticate, userController.myCommunities);
router.patch('/me', authenticate, validate(updateProfileSchema), userController.updateMe);
router.post('/me/avatar', authenticate, upload.single('file'), userController.uploadAvatar);
router.post('/me/deactivate', authenticate, userController.deactivate);
router.get('/me/blocked', authenticate, userController.blocked);

router.get('/:username', optionalAuth, userController.getByUsername);
router.post('/:userId/block', authenticate, userController.block);
router.delete('/:userId/block', authenticate, userController.unblock);
router.post('/report', authenticate, validate(reportUserSchema), userController.report);

export default router;
