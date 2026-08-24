import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getNotifications,
  markNotificationRead,
} from '../controllers/notification.controller';

const router = Router();

router.get('/', authenticate, getNotifications);
router.patch('/:id/read', authenticate, markNotificationRead);

export default router;
