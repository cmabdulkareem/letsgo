import { Router } from 'express';
import * as notificationController from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, notificationController.list);
router.get('/unread-count', authenticate, notificationController.unreadCount);
router.post('/read-all', authenticate, notificationController.markAllRead);
router.patch('/:notificationId/read', authenticate, notificationController.markRead);
router.post('/push/subscribe', authenticate, notificationController.subscribePush);
router.delete('/push/subscribe', authenticate, notificationController.unsubscribePush);

export default router;
