import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listMessagesQuerySchema, sendMessageSchema } from '../validators/messageValidators.js';

const router = Router();

router.get('/:roomId/messages', authenticate, validate(listMessagesQuerySchema, 'query'), messageController.list);
router.post('/:roomId/messages', authenticate, validate(sendMessageSchema), messageController.send);

export default router;
