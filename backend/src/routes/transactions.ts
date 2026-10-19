import { Router, Response } from 'express';
import { body } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { dataStore } from '../services/dataStore';
import { auditLog, logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/transactions
router.get('/', async (req: AuthRequest, res: Response) => {
  const { page = '1', limit = '20', type, categoryId, search, start, end, sort = 'date:desc' } = req.query as Record<string, string>;
  const userId = req.userId!;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;
  const [sortField, sortDir] = sort.split(':');

  let dbTransactions: any[] = [];
  let dbCount = 0;
  let useFallback = false;

  try {
    let q = supabaseAdmin
      .from('transactions')
      .select('*, categories(name,icon,color)', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_confirmed', true);

    if (type) q = q.eq('type', type);
    if (categoryId) q = q.eq('category_id', categoryId);
    if (search) q = q.ilike('description', `%${search}%`);
    if (start) q = q.gte('date', start);
    if (end) q = q.lte('date', end);

    const validSortFields = ['date', 'amount', 'created_at'];
    if (validSortFields.includes(sortField)) {
      q = q.order(sortField, { ascending: sortDir === 'asc' });
    }

    q = q.range(offset, offset + limitNum - 1);
    const { data, error, count } = await q;

    if (error) throw error;
    dbTransactions = (data || []).map((tx) => ({
      id: tx.id,
      userId: tx.user_id,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      categoryId: tx.category_id,
      categoryName: tx.categories?.name,
      categoryIcon: tx.categories?.icon,
      categoryColor: tx.categories?.color,
      date: tx.date,
      notes: tx.notes,
      isConfirmed: tx.is_confirmed,
      createdAt: tx.created_at,
      updatedAt: tx.updated_at,
    }));
    dbCount = count || dbTransactions.length;
  } catch (err: unknown) {
    logger.warn('Transactions DB query error, using dataStore', { err });
    useFallback = true;
  }

  // Get dataStore transactions
  let localTxs = dataStore.getTransactions(userId);
  if (type) localTxs = localTxs.filter((t) => t.type === type);
  if (categoryId) localTxs = localTxs.filter((t) => t.categoryId === categoryId);
  if (search) localTxs = localTxs.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()));
  if (start) localTxs = localTxs.filter((t) => t.date >= start);
  if (end) localTxs = localTxs.filter((t) => t.date <= end);

  // Merge DB and dataStore avoiding duplicates and ignoring deleted items
  const dbIds = new Set(dbTransactions.map((t) => t.id));
  const merged = [...dbTransactions, ...localTxs.filter((t) => !dbIds.has(t.id))]
    .filter((t) => !dataStore.isTransactionDeleted(t.id));

  // Sort
  merged.sort((a, b) => {
    if (sortField === 'amount') {
      return sortDir === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    return sortDir === 'asc'
      ? new Date(a.date).getTime() - new Date(b.date).getTime()
      : new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const total = merged.length;
  const paginated = merged.slice(offset, offset + limitNum);

  res.json({
    success: true,
    data: paginated,
    total,
    page: pageNum,
    limit: limitNum,
    hasMore: total > offset + limitNum,
  });
});

// POST /api/transactions
router.post('/', [
  body('type').isIn(['income', 'expense']),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('description').isString().trim().isLength({ min: 1, max: 500 }),
  body('date').isISO8601(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { type, amount, description, categoryId, date, notes } = req.body;
    const dateStr = typeof date === 'string' ? date.split('T')[0] : new Date(date).toISOString().split('T')[0];

    // Always record in unified dataStore
    const localTx = dataStore.addTransaction(
      userId,
      type,
      parseFloat(amount),
      description.trim(),
      dateStr,
      categoryId || null,
      notes?.trim() || null,
      'manual'
    );

    // Attempt Supabase insert
    try {
      await supabaseAdmin.from('transactions').insert({
        id: localTx.id,
        user_id: userId,
        type,
        amount: parseFloat(amount),
        description: description.trim(),
        category_id: categoryId || null,
        date: dateStr,
        notes: notes?.trim() || null,
        is_confirmed: true,
      });
    } catch {
      // Ignored
    }

    auditLog('TRANSACTION_CREATED', userId, { transactionId: localTx.id, type, amount });

    res.status(201).json({
      success: true,
      data: localTx,
    });
  } catch (err: unknown) {
    logger.error('Create transaction error', { err });
    res.status(500).json({ success: false, error: 'Failed to create transaction' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const txId = String(req.params.id);

    dataStore.deleteTransaction(txId, userId);

    try {
      await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('id', txId)
        .eq('user_id', userId);
    } catch {
      // Ignored
    }

    auditLog('TRANSACTION_DELETED', userId, { transactionId: txId });
    res.json({ success: true, message: 'Transaction deleted' });
  } catch (err: unknown) {
    logger.error('Delete transaction error', { err });
    res.status(500).json({ success: false, error: 'Failed to delete transaction' });
  }
});

// DELETE /api/transactions - Delete ALL transactions for the current user (reset)
router.delete('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Delete from memory store
    const count = dataStore.deleteAllTransactions(userId);

    // Delete from Supabase
    try {
      await supabaseAdmin
        .from('transactions')
        .delete()
        .eq('user_id', userId);
    } catch (dbErr) {
      logger.warn('Bulk delete from Supabase failed (memory store cleared)', { dbErr });
    }

    auditLog('ALL_TRANSACTIONS_DELETED', userId, { count });
    res.json({ success: true, message: `Deleted all ${count} transactions. You can start fresh!` });
  } catch (err: unknown) {
    logger.error('Delete all transactions error', { err });
    res.status(500).json({ success: false, error: 'Failed to delete all transactions' });
  }
});

export default router;
