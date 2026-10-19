import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';
import { differenceInDays } from 'date-fns';

const router = Router();
router.use(requireAuth);

function calcMonthlyContribution(remaining: number, targetDate: string): number {
  const daysLeft = differenceInDays(new Date(targetDate), new Date());
  const monthsLeft = Math.max(1, daysLeft / 30);
  return Math.ceil(remaining / monthsLeft);
}

// GET /api/savings-goals
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const { data, error } = await supabaseAdmin
      .from('savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const goals = data.map((g) => {
        const remaining = Math.max(0, g.target_amount - g.saved_amount);
        const progress = g.target_amount > 0 ? (g.saved_amount / g.target_amount) * 100 : 0;
        return {
          id: g.id, userId: g.user_id, name: g.name, targetAmount: g.target_amount,
          savedAmount: g.saved_amount, remainingAmount: remaining, progressPercent: progress,
          targetDate: g.target_date, isCompleted: g.is_completed || g.saved_amount >= g.target_amount,
          suggestedMonthlyContribution: remaining > 0 ? calcMonthlyContribution(remaining, g.target_date) : 0,
          notes: g.notes, createdAt: g.created_at, updatedAt: g.updated_at,
        };
      });
      return res.json({ success: true, data: goals });
    }
  } catch (err: unknown) {
    logger.warn('Savings goals DB query error, using dataStore', { err });
  }

  // Fallback to dataStore savings goals
  const localGoals = dataStore.getSavingsGoals(userId);
  res.json({ success: true, data: localGoals });
});

// POST /api/savings-goals
router.post('/', [
  body('name').isString().trim().isLength({ min: 1, max: 200 }),
  body('targetAmount').isFloat({ min: 1 }),
  body('targetDate').isISO8601(),
  body('notes').optional().isString().trim().isLength({ max: 500 }),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, targetAmount, targetDate, notes } = req.body;

    const goal = dataStore.addSavingsGoal(userId, name.trim(), parseFloat(targetAmount), targetDate, notes?.trim());

    try {
      await supabaseAdmin.from('savings_goals').insert({
        id: goal.id,
        user_id: userId,
        name: name.trim(),
        target_amount: parseFloat(targetAmount),
        target_date: targetDate,
        saved_amount: 0,
        is_completed: false,
        notes: notes?.trim() || null,
      });
    } catch {
      // Ignored
    }

    res.status(201).json({ success: true, data: goal });
  } catch (err: unknown) {
    logger.error('Create savings goal error', { err });
    res.status(500).json({ success: false, error: 'Failed to create savings goal' });
  }
});

// POST /api/savings-goals/:id/contribute
router.post('/:id/contribute', [
  param('id').isString(),
  body('amount').isFloat({ min: 0.01 }),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);
    const { amount } = req.body;

    const updated = dataStore.contributeToGoal(id, userId, parseFloat(amount));

    try {
      if (updated) {
        await supabaseAdmin.from('savings_goals').update({
          saved_amount: updated.savedAmount,
          is_completed: updated.isCompleted,
          updated_at: updated.updatedAt,
        }).eq('id', id).eq('user_id', userId);
      }
    } catch {
      // Ignored
    }

    if (!updated) return res.status(404).json({ success: false, error: 'Goal not found' });
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    logger.error('Contribute savings error', { err });
    res.status(500).json({ success: false, error: 'Failed to update savings' });
  }
});

// DELETE /api/savings-goals/:id
router.delete('/:id', [param('id').isString(), validateRequest], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    dataStore.deleteSavingsGoal(id, userId);

    try {
      await supabaseAdmin.from('savings_goals').delete().eq('id', id).eq('user_id', userId);
    } catch {
      // Ignored
    }

    res.json({ success: true, message: 'Savings goal deleted' });
  } catch (err: unknown) {
    logger.error('Delete savings goal error', { err });
    res.status(500).json({ success: false, error: 'Failed to delete goal' });
  }
});

export default router;
