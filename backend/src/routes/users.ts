import { Router, Response } from 'express';
import { body } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { auditLog, logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/users/profile
router.get('/profile', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      // Auto-create profile from auth user if it doesn't exist yet
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(userId);
      const email = authData?.user?.email || '';
      const fullName = authData?.user?.user_metadata?.full_name || 'Student';

      const initialProfile = {
        id: userId,
        email,
        full_name: fullName,
        currency: 'INR',
        language: 'en',
        notifications_enabled: true,
      };

      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('users')
        .insert(initialProfile)
        .select()
        .single();

      if (insertErr) {
        // Fallback response even if DB table trigger is pending
        return res.json({
          success: true,
          data: {
            id: userId,
            email,
            fullName,
            currency: 'INR',
            language: 'en',
            notificationsEnabled: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        });
      }

      return res.json({
        success: true,
        data: {
          id: inserted.id,
          email: inserted.email,
          fullName: inserted.full_name,
          avatarUrl: inserted.avatar_url,
          currency: inserted.currency || 'INR',
          language: inserted.language || 'en',
          phoneNumber: inserted.phone_number,
          notificationsEnabled: inserted.notifications_enabled ?? true,
          reminderTime: inserted.reminder_time,
          twoFactorEnabled: inserted.two_factor_enabled ?? false,
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        currency: user.currency || 'INR',
        language: user.language || 'en',
        phoneNumber: user.phone_number,
        notificationsEnabled: user.notifications_enabled ?? true,
        reminderTime: user.reminder_time,
        twoFactorEnabled: user.two_factor_enabled ?? false,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (err: unknown) {
    logger.error('Get profile error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/profile
router.put('/profile', [
  body('fullName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('language').optional().isString().isIn(['en', 'ml', 'hi', 'ta', 'kn', 'te', 'bn']),
  body('currency').optional().isString().isIn(['INR', 'USD', 'EUR', 'GBP']),
  body('phoneNumber').optional({ nullable: true }).isString().trim(),
  body('notificationsEnabled').optional().isBoolean(),
  body('reminderTime').optional({ nullable: true }).isString(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const {
      fullName, language, currency, phoneNumber,
      notificationsEnabled, reminderTime,
    } = req.body;

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (fullName !== undefined) updates.full_name = fullName;
    if (language !== undefined) updates.language = language;
    if (currency !== undefined) updates.currency = currency;
    if (phoneNumber !== undefined) updates.phone_number = phoneNumber;
    if (notificationsEnabled !== undefined) updates.notifications_enabled = notificationsEnabled;
    if (reminderTime !== undefined) updates.reminder_time = reminderTime;

    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    auditLog('PROFILE_UPDATED', userId, { fields: Object.keys(updates) });

    res.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name,
        avatarUrl: updated.avatar_url,
        currency: updated.currency || 'INR',
        language: updated.language || 'en',
        phoneNumber: updated.phone_number,
        notificationsEnabled: updated.notifications_enabled ?? true,
        reminderTime: updated.reminder_time,
        twoFactorEnabled: updated.two_factor_enabled ?? false,
        createdAt: updated.created_at,
        updatedAt: updated.updated_at,
      },
    });
  } catch (err: unknown) {
    logger.error('Update profile error', { err });
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// DELETE /api/users/account
router.delete('/account', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // 1. Audit log the deletion before deleting data
    auditLog('ACCOUNT_DELETION_REQUESTED', userId, { ip: req.ip });

    // 2. Cascade delete will clean up related records via DB FK constraints,
    // but we can also explicitly delete related records for extra safety
    await supabaseAdmin.from('transactions').delete().eq('user_id', userId);
    await supabaseAdmin.from('budgets').delete().eq('user_id', userId);
    await supabaseAdmin.from('savings_goals').delete().eq('user_id', userId);
    await supabaseAdmin.from('conversations').delete().eq('user_id', userId);
    await supabaseAdmin.from('categories').delete().eq('user_id', userId);
    await supabaseAdmin.from('reminder_settings').delete().eq('user_id', userId);
    await supabaseAdmin.from('users').delete().eq('id', userId);

    // 3. Delete from Supabase Auth
    await supabaseAdmin.auth.admin.deleteUser(userId);

    res.json({ success: true, message: 'Account and all associated data deleted successfully' });
  } catch (err: unknown) {
    logger.error('Delete account error', { err });
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
});

export default router;
