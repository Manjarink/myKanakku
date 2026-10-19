import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { auditLog, logger } from '../utils/logger';

const router = Router();

// POST /api/auth/register - Register new student account with confirmed email
router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('fullName').isString().trim().isLength({ min: 1, max: 100 }).withMessage('Full name is required'),
  validateRequest,
], async (req: Request, res: Response) => {
  try {
    const { email, password, fullName } = req.body;

    // Create user in Supabase with email_confirm: true (bypasses email rate limit)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('already exists') || error.code === 'email_exists') {
        return res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in.' });
      }
      return res.status(400).json({ success: false, error: error.message });
    }

    if (!data.user) {
      return res.status(500).json({ success: false, error: 'Failed to create user account' });
    }

    // Attempt to upsert user profile in public.users if table exists
    try {
      await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        email: data.user.email,
        full_name: fullName,
        currency: 'INR',
        language: 'en',
      });
    } catch {
      // Ignored if table is pending migration
    }

    auditLog('USER_REGISTERED', data.user.id, { email });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        id: data.user.id,
        email: data.user.email,
        fullName,
      },
    });
  } catch (err: unknown) {
    logger.error('Registration error', { err });
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// GET /api/auth/me - Verify session and return user profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !user) {
      // If user profile record not created yet, get from auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!authUser?.user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // Upsert profile
      const newProfile = {
        id: userId,
        email: authUser.user.email,
        full_name: authUser.user.user_metadata?.full_name || 'Student',
        currency: 'INR',
        language: 'en',
      };
      await supabaseAdmin.from('users').upsert(newProfile);
      return res.json({
        success: true,
        data: {
          id: userId,
          email: authUser.user.email,
          fullName: newProfile.full_name,
          currency: newProfile.currency,
          language: newProfile.language,
          createdAt: authUser.user.created_at,
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
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (err: unknown) {
    logger.error('Auth /me error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch auth user' });
  }
});

// POST /api/auth/audit-login
router.post('/audit-login', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    auditLog('USER_LOGIN', userId, { ip: req.ip, userAgent: req.headers['user-agent'] });
    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    auditLog('USER_LOGOUT', userId, { ip: req.ip });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err: unknown) {
    logger.error('Logout error', { err });
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

export default router;
