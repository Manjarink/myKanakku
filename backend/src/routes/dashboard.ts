import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

function getUserTransactions(userId: string) {
  return dataStore.getTransactions(userId);
}

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { period = 'month', start, end } = req.query as Record<string, string>;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    if (period === 'custom' && start && end) {
      startDate = new Date(start);
      endDate = new Date(end);
    } else if (period === 'today') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else { // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // Combine Supabase and local dataStore transactions
    let allTxs = getUserTransactions(userId);
    try {
      const { data: dbTxs } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_confirmed', true);
      if (dbTxs && dbTxs.length > 0) {
        const localIds = new Set(allTxs.map((t) => t.id));
        const missingFromLocal = dbTxs.filter((t) => !localIds.has(t.id)).map((t) => ({
          id: t.id,
          userId: t.user_id,
          type: t.type,
          amount: Number(t.amount),
          description: t.description,
          categoryId: t.category_id,
          date: t.date,
          isConfirmed: t.is_confirmed,
          source: t.source,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        allTxs = [...allTxs, ...missingFromLocal];
      }
    } catch {
      // Ignored
    }

    // Filter by period
    const periodTxs = allTxs.filter((t) => t.date >= startStr && t.date <= endStr);

    const totalIncome = periodTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpenses = periodTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

    const allIncome = allTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const allExpense = allTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const availableBalance = allIncome - allExpense;
    const netCashFlow = totalIncome - totalExpenses;

    // Budgets
    const budgets = dataStore.getBudgets(userId);
    const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
    const totalBudgetSpent = budgets.reduce((s, b) => s + b.spent, 0);
    const remainingBudget = totalBudget - totalBudgetSpent;

    // Savings progress
    const goals = dataStore.getSavingsGoals(userId);
    const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
    const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
    const savingsProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

    res.json({
      success: true,
      data: {
        availableBalance,
        totalIncome,
        totalExpenses,
        netCashFlow,
        remainingBudget,
        savingsProgress,
        period,
        dateRange: { start: startStr, end: endStr },
      },
    });
  } catch (err: unknown) {
    logger.error('Dashboard stats error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/dashboard/category-spending
router.get('/category-spending', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { period = 'month', start, end } = req.query as Record<string, string>;

    const now = new Date();
    let startStr: string;
    const endStr = now.toISOString().split('T')[0];

    if (period === 'custom' && start) startStr = start;
    else if (period === 'today') startStr = endStr;
    else if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      startStr = d.toISOString().split('T')[0];
    } else {
      startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    }

    const allTxs = getUserTransactions(userId);
    const expenses = allTxs.filter(
      (t) => t.type === 'expense' && t.date >= startStr && t.date <= (end || endStr)
    );

    const categoryMap = new Map<string, { amount: number; name: string; icon: string; color: string; count: number }>();
    let totalAmount = 0;

    for (const tx of expenses) {
      const key = tx.categoryId || 'uncategorized';
      const existing = categoryMap.get(key);
      const amount = tx.amount;
      totalAmount += amount;

      if (existing) {
        existing.amount += amount;
        existing.count++;
      } else {
        categoryMap.set(key, {
          amount,
          name: tx.categoryName || 'General',
          icon: tx.categoryIcon || '💸',
          color: tx.categoryColor || '#7c3aed',
          count: 1,
        });
      }
    }

    const result = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      categoryIcon: data.icon,
      categoryColor: data.color,
      amount: data.amount,
      percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
      transactionCount: data.count,
    })).sort((a, b) => b.amount - a.amount);

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    logger.error('Category spending error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch category spending' });
  }
});

// GET /api/dashboard/daily-spending
router.get('/daily-spending', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const now = new Date();
    const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endStr = now.toISOString().split('T')[0];

    const allTxs = getUserTransactions(userId);
    const txs = allTxs.filter((t) => t.date >= startStr && t.date <= endStr);

    const dateMap = new Map<string, { income: number; expenses: number }>();
    for (const tx of txs) {
      const existing = dateMap.get(tx.date) || { income: 0, expenses: 0 };
      if (tx.type === 'income') existing.income += tx.amount;
      else existing.expenses += tx.amount;
      dateMap.set(tx.date, existing);
    }

    const result = Array.from(dateMap.entries()).map(([date, amounts]) => ({
      date,
      income: amounts.income,
      expenses: amounts.expenses,
      net: amounts.income - amounts.expenses,
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    logger.error('Daily spending error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch daily spending' });
  }
});

// GET /api/dashboard/monthly-trends
router.get('/monthly-trends', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const allTxs = getUserTransactions(userId);

    const monthMap = new Map<string, { income: number; expenses: number }>();
    for (const tx of allTxs) {
      const monthKey = tx.date.slice(0, 7); // yyyy-MM
      const existing = monthMap.get(monthKey) || { income: 0, expenses: 0 };
      if (tx.type === 'income') existing.income += tx.amount;
      else existing.expenses += tx.amount;
      monthMap.set(monthKey, existing);
    }

    // Default current month if empty
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    if (!monthMap.has(currentMonthKey)) {
      monthMap.set(currentMonthKey, { income: 0, expenses: 0 });
    }

    const result = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      income: data.income,
      expenses: data.expenses,
      savings: Math.max(0, data.income - data.expenses),
    })).sort((a, b) => a.month.localeCompare(b.month));

    res.json({ success: true, data: result });
  } catch (err: unknown) {
    logger.error('Monthly trends error', { err });
    res.status(500).json({ success: false, error: 'Failed to fetch monthly trends' });
  }
});

export default router;
