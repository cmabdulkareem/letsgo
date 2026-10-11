import { Router } from 'express';
import * as schedulingController from '../controllers/schedulingController.js';
import { authenticate, requireVerifiedEmail } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createPollSchema, voteSchema, confirmPollSchema } from '../validators/pollValidators.js';

const router = Router();

router.post('/activities/:activityId/polls', authenticate, requireVerifiedEmail, validate(createPollSchema), schedulingController.createPoll);
router.get('/activities/:activityId/polls', authenticate, schedulingController.listPolls);
router.post('/polls/:pollId/votes', authenticate, validate(voteSchema), schedulingController.vote);
router.patch('/polls/:pollId/votes', authenticate, validate(voteSchema), schedulingController.changeVote);
router.post('/polls/:pollId/close', authenticate, schedulingController.closePoll);
router.post('/polls/:pollId/confirm', authenticate, validate(confirmPollSchema), schedulingController.confirmPoll);

export default router;
