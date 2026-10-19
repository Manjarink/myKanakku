import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { logger } from '../utils/logger';
import { startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay, subDays, format } from 'date-fns';

const router = Router();
router.use(requireAuth);

// GET /api/reports?period=monthly|daily
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const period = (req.query.period as string) || 'monthly';

    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date;
    let prevStart: Date;
    let prevEnd: Date;
    let periodLabel: string;

    if (period === 'daily') {
      currentStart = startOfDay(now);
      currentEnd = endOfDay(now);
      prevStart = startOfDay(subDays(now, 1));
      prevEnd = endOfDay(subDays(now, 1));
      periodLabel = `Today (${format(now, 'dd MMMM yyyy')})`;
    } else {
      currentStart = startOfMonth(now);
      currentEnd = endOfMonth(now);
      prevStart = startOfMonth(subMonths(now, 1));
      prevEnd = endOfMonth(subMonths(now, 1));
      periodLabel = format(now, 'MMMM yyyy');
    }

    const curStartStr = currentStart.toISOString().split('T')[0];
    const curEndStr = currentEnd.toISOString().split('T')[0];
    const prevStartStr = prevStart.toISOString().split('T')[0];
    const prevEndStr = prevEnd.toISOString().split('T')[0];

    // Combine Supabase and local dataStore transactions
    let allUserTxs = dataStore.getTransactions(userId);
    try {
      const { data: dbTxs } = await supabaseAdmin
        .from('transactions')
        .select('*, categories(name, icon, color)')
        .eq('user_id', userId)
        .eq('is_confirmed', true);
      if (dbTxs && dbTxs.length > 0) {
        const localIds = new Set(allUserTxs.map((t) => t.id));
        const missing = dbTxs.filter((t) => !localIds.has(t.id)).map((t) => ({
          id: t.id,
          userId: t.user_id,
          type: t.type,
          amount: Number(t.amount),
          description: t.description,
          categoryId: t.category_id,
          categoryName: t.categories?.name,
          categoryIcon: t.categories?.icon,
          categoryColor: t.categories?.color,
          date: t.date,
          isConfirmed: t.is_confirmed,
          source: t.source,
          createdAt: t.created_at,
          updatedAt: t.updated_at,
        }));
        allUserTxs = [...allUserTxs, ...missing];
      }
    } catch {
      // Ignored
    }

    const curTxs = allUserTxs.filter((t) => t.date >= curStartStr && t.date <= curEndStr);
    const prevTxs = allUserTxs.filter((t) => t.date >= prevStartStr && t.date <= prevEndStr);

    const currentIncome = curTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const currentExpenses = curTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const prevIncome = prevTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const prevExpenses = prevTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const incomeChange = prevIncome > 0 ? ((currentIncome - prevIncome) / prevIncome) * 100 : 0;
    const expenseChange = prevExpenses > 0 ? ((currentExpenses - prevExpenses) / prevExpenses) * 100 : 0;
    const netChange = (currentIncome - currentExpenses) - (prevIncome - prevExpenses);

    // Category breakdown for expenses
    const categoryMap = new Map<string, {
      name: string;
      color: string;
      icon: string;
      amount: number;
      count: number;
    }>();

    for (const tx of curTxs) {
      if (tx.type !== 'expense') continue;
      const catId = tx.categoryId || 'uncategorized';
      const catName = tx.categoryName || 'General';
      const catColor = tx.categoryColor || '#7c3aed';
      const catIcon = tx.categoryIcon || '📦';

      const existing = categoryMap.get(catId) || {
        name: catName,
        color: catColor,
        icon: catIcon,
        amount: 0,
        count: 0,
      };

      existing.amount += Number(tx.amount);
      existing.count += 1;
      categoryMap.set(catId, existing);
    }

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      categoryColor: data.color,
      categoryIcon: data.icon,
      amount: data.amount,
      percentage: currentExpenses > 0 ? Math.round((data.amount / currentExpenses) * 100) : 0,
      transactionCount: data.count,
    })).sort((a, b) => b.amount - a.amount);

    // Largest expenses (top 5)
    const largestExpenses = curTxs
      .filter((t) => t.type === 'expense')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        categoryId: tx.categoryId,
        categoryName: tx.categoryName,
        categoryIcon: tx.categoryIcon,
        categoryColor: tx.categoryColor,
        date: tx.date,
        isConfirmed: tx.isConfirmed,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
      }));

    // Budgets & overruns
    const budgetsData = dataStore.getBudgets(userId);
    const budgetOverruns = budgetsData
      .map((b) => {
        const catSpending = categoryMap.get(b.categoryId)?.amount || 0;
        return {
          id: b.id,
          userId: b.userId,
          categoryId: b.categoryId,
          categoryName: b.categoryName || 'General',
          categoryColor: b.categoryColor || '#7c3aed',
          categoryIcon: b.categoryIcon || '💰',
          amount: b.amount,
          spent: catSpending,
          remaining: b.amount - catSpending,
          period: b.period,
          startDate: b.startDate,
          createdAt: b.createdAt,
        };
      })
      .filter((b) => b.spent > b.amount);

    // Savings goals
    const goalsData = dataStore.getSavingsGoals(userId);
    const savingsProgress = goalsData.map((g) => ({
      id: g.id,
      userId: g.userId,
      name: g.name,
      targetAmount: g.targetAmount,
      savedAmount: g.savedAmount,
      remainingAmount: g.remainingAmount,
      progressPercent: g.progressPercent,
      targetDate: g.targetDate,
      isCompleted: g.isCompleted,
      notes: g.notes,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));

    // Student-focused financial recommendations
    const recommendations: string[] = [];
    if (categoryBreakdown.length > 0) {
      const topCategory = categoryBreakdown[0];
      if (topCategory.percentage > 40) {
        recommendations.push(`High spending on ${topCategory.categoryName} (${topCategory.percentage}% of total expenses). Look for campus discounts or bulk meal passes.`);
      }
    }
    if (budgetOverruns.length > 0) {
      recommendations.push(`You have exceeded budgets in ${budgetOverruns.length} categories. Consider adjusting spending or allocating from savings.`);
    }
    if (currentIncome > 0 && currentExpenses > currentIncome) {
      recommendations.push('Your expenses exceed your current income for this period. Try reducing non-essential expenses like takeout or subscriptions.');
    } else if (currentIncome > currentExpenses) {
      const surplus = currentIncome - currentExpenses;
      recommendations.push(`Great job! You have a surplus of ₹${surplus.toLocaleString('en-IN')}. Consider allocating 20% to your emergency or savings fund.`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Keep tracking your daily transactions! Regular logs give you an accurate view of where your money goes.');
    }

    res.json({
      success: true,
      data: {
        period: periodLabel,
        totalIncome: currentIncome,
        totalExpenses: currentExpenses,
        netCashFlow: currentIncome - currentExpenses,
        categoryBreakdown,
        largestExpenses,
        budgetOverruns,
        savingsProgress,
        previousPeriodComparison: {
          incomeChange: Math.round(incomeChange * 10) / 10,
          expenseChange: Math.round(expenseChange * 10) / 10,
          netChange,
        },
        recommendations,
      },
    });
  } catch (err: unknown) {
    logger.error('Get reports error', { err });
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
});

// GET /api/reports/export - CSV Export
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const txs = dataStore.getTransactions(userId);

    const headers = 'Date,Type,Amount,Category,Description\n';
    const rows = txs.map((t) => {
      const cat = t.categoryName || 'Uncategorized';
      const cleanDesc = `"${(t.description || '').replace(/"/g, '""')}"`;
      return `${t.date},${t.type},${t.amount},"${cat}",${cleanDesc}`;
    }).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="mykanakku-expenses.csv"');
    res.send(headers + rows);
  } catch (err: unknown) {
    logger.error('Export report error', { err });
    res.status(500).json({ success: false, error: 'Failed to export report' });
  }
});

export default router;
