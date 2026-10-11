import { Router } from 'express';
import * as communityController from '../controllers/communityController.js';
import { authenticate, optionalAuth, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createCommunitySchema,
  updateCommunitySchema,
  listCommunitiesQuerySchema,
  createSessionSchema,
  listSessionsQuerySchema,
} from '../validators/communityValidators.js';
import { reviewRequestSchema } from '../validators/activityValidators.js';

const router = Router();

router.get('/', optionalAuth, validate(listCommunitiesQuerySchema, 'query'), communityController.list);
router.post('/', authenticate, requireVerifiedEmail, validate(createCommunitySchema), communityController.create);
router.get('/:communityId', optionalAuth, communityController.detail);
router.patch('/:communityId', authenticate, requireVerifiedEmail, validate(updateCommunitySchema), communityController.update);
router.post('/:communityId/join', authenticate, requireVerifiedEmail, communityController.join);
router.post('/:communityId/leave', authenticate, communityController.leave);
router.get('/:communityId/members', optionalAuth, communityController.members);
router.patch('/:communityId/members/:userId', authenticate, validate(reviewRequestSchema), communityController.review);
router.get('/:communityId/sessions', optionalAuth, validate(listSessionsQuerySchema, 'query'), communityController.sessions);
router.post('/:communityId/sessions', authenticate, requireVerifiedEmail, validate(createSessionSchema), communityController.createSession);
router.post('/sessions/:sessionId/rsvp', authenticate, communityController.rsvp);
router.post('/sessions/:sessionId/cancel', authenticate, communityController.cancelSession);

export default router;
