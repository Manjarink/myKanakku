import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/notifications - List notifications
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const list = dataStore.getNotifications(userId);
    res.json({ success: true, data: list });
  } catch (err: unknown) {
    logger.error('Get notifications error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark one as read
router.patch('/:id/read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    dataStore.markNotificationAsRead(id, userId);
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err: unknown) {
    logger.error('Mark notification read error', { err });
    res.status(500).json({ success: false, error: 'Failed to mark notification read' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    dataStore.markAllNotificationsAsRead(userId);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: unknown) {
    logger.error('Mark all read error', { err });
    res.status(500).json({ success: false, error: 'Failed to mark all read' });
  }
});

export default router;
