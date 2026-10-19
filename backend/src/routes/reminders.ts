import { Router, Response } from 'express';
import { body } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/reminders - Get user's reminder settings
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    try {
      const { data, error } = await supabaseAdmin
        .from('reminder_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          data: {
            id: data.id,
            userId: data.user_id,
            enabled: data.enabled ?? true,
            time: data.time || '21:00',
            days: data.days || [1, 2, 3, 4, 5, 6, 0],
            message: data.message || 'Remember to record your expenses in MyKanakku today!',
            updatedAt: data.updated_at,
          },
        });
      }
    } catch {
      // Ignored
    }

    const settings = dataStore.getReminderSettings(userId);
    res.json({
      success: true,
      data: settings,
    });
  } catch (err: unknown) {
    logger.error('Get reminders error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch reminder settings' });
  }
});

// PUT /api/reminders - Update or create reminder settings
router.put('/', [
  body('enabled').isBoolean(),
  body('time').isString().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Time must be in HH:mm format'),
  body('days').isArray({ min: 1, max: 7 }),
  body('days.*').isInt({ min: 0, max: 6 }),
  body('message').optional().isString().trim().isLength({ max: 200 }),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { enabled, time, days, message } = req.body;

    const saved = dataStore.saveReminderSettings(userId, {
      enabled,
      time,
      days,
      message: message || 'Remember to record your campus expenses in MyKanakku today!',
    });

    try {
      await supabaseAdmin
        .from('reminder_settings')
        .upsert({
          id: saved.id,
          user_id: userId,
          enabled,
          time,
          days,
          message: saved.message,
          updated_at: saved.updatedAt,
        }, { onConflict: 'user_id' });
    } catch {
      // Ignored
    }

    res.json({
      success: true,
      data: saved,
    });
  } catch (err: unknown) {
    logger.error('Update reminders error', { err });
    res.status(500).json({ success: false, error: 'Failed to update reminder settings' });
  }
});

export default router;
