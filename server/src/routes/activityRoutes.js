import { Router } from 'express';
import * as activityController from '../controllers/activityController.js';
import { authenticate, optionalAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createActivitySchema,
  updateActivitySchema,
  listActivitiesQuerySchema,
  attendanceSchema,
  hostAttendanceSchema,
  reviewRequestSchema,
  joinRequestSchema,
} from '../validators/activityValidators.js';

const router = Router();

router.get('/', optionalAuth, validate(listActivitiesQuerySchema, 'query'), activityController.list);
router.post('/', authenticate, requireVerifiedEmail, validate(createActivitySchema), activityController.create);
router.get('/saved', authenticate, activityController.saved);
router.get('/:activityId', optionalAuth, activityController.detail);
router.patch('/:activityId', authenticate, requireVerifiedEmail, validate(updateActivitySchema), activityController.update);
router.delete('/:activityId', authenticate, activityController.remove);
router.post('/:activityId/join', authenticate, requireVerifiedEmail, activityController.join);
router.post('/:activityId/leave', authenticate, activityController.leave);
router.post('/:activityId/join-requests', authenticate, requireVerifiedEmail, validate(joinRequestSchema), activityController.requestToJoin);
router.get('/:activityId/join-requests', authenticate, activityController.joinRequests);
router.patch('/:activityId/join-requests/:requestId', authenticate, validate(reviewRequestSchema), activityController.reviewJoinRequest);
router.get('/:activityId/members', optionalAuth, activityController.members);
router.delete('/:activityId/members/:userId', authenticate, activityController.removeMember);
router.post('/:activityId/attendance', authenticate, validate(attendanceSchema), activityController.attendance);
router.post('/:activityId/members/:userId/attendance', authenticate, validate(hostAttendanceSchema), activityController.memberAttendance);
router.post('/:activityId/cancel', authenticate, activityController.cancel);
router.post('/:activityId/save', authenticate, activityController.save);
router.delete('/:activityId/save', authenticate, activityController.unsave);

export default router;
