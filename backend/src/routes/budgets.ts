import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/budgets
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const { data: budgets, error } = await supabaseAdmin
      .from('budgets')
      .select('*, categories(name,icon,color)')
      .eq('user_id', userId);

    if (!error && budgets && budgets.length > 0) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const budgetsWithSpent = await Promise.all(budgets.map(async (b) => {
        let spent = 0;
        try {
          const { data: txs } = await supabaseAdmin
            .from('transactions')
            .select('amount')
            .eq('user_id', userId)
            .eq('category_id', b.category_id)
            .eq('type', 'expense')
            .eq('is_confirmed', true)
            .gte('date', startOfMonth)
            .lte('date', endOfMonth);
          spent = (txs || []).reduce((sum, t) => sum + t.amount, 0);
        } catch {
          // Ignored
        }

        return {
          id: b.id,
          userId: b.user_id,
          categoryId: b.category_id,
          categoryName: b.categories?.name || 'Unknown',
          categoryColor: b.categories?.color || '#7c3aed',
          categoryIcon: b.categories?.icon || '💰',
          amount: b.amount,
          spent,
          remaining: b.amount - spent,
          period: b.period,
          startDate: b.start_date,
          endDate: b.end_date,
          createdAt: b.created_at,
        };
      }));

      return res.json({ success: true, data: budgetsWithSpent });
    }
  } catch (err: unknown) {
    logger.warn('Budgets DB query error, using dataStore', { err });
  }

  // Fallback to dataStore budgets
  const localBudgets = dataStore.getBudgets(userId);
  res.json({ success: true, data: localBudgets });
});

// POST /api/budgets
router.post('/', [
  body('categoryId').isString(),
  body('amount').isFloat({ min: 1 }),
  body('period').isIn(['monthly', 'weekly', 'custom']),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { categoryId, amount, period } = req.body;

    const b = dataStore.addBudget(userId, categoryId, parseFloat(amount), period);

    try {
      await supabaseAdmin.from('budgets').insert({
        id: b.id,
        user_id: userId,
        category_id: categoryId,
        amount: parseFloat(amount),
        period,
        start_date: b.startDate,
        spent: 0,
      });
    } catch {
      // Ignored
    }

    res.status(201).json({
      success: true,
      data: b,
    });
  } catch (err: unknown) {
    logger.error('Create budget error', { err });
    res.status(500).json({ success: false, error: 'Failed to create budget' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', [param('id').isString(), validateRequest], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const id = String(req.params.id);

    dataStore.deleteBudget(id, userId);

    try {
      await supabaseAdmin.from('budgets').delete().eq('id', id).eq('user_id', userId);
    } catch {
      // Ignored
    }

    res.json({ success: true, message: 'Budget deleted' });
  } catch (err: unknown) {
    logger.error('Delete budget error', { err });
    res.status(500).json({ success: false, error: 'Failed to delete budget' });
  }
});

export default router;
