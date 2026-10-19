import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { aiService } from '../services/aiService';
import { chatMemoryStore, dataStore } from '../services/dataStore';
import { auditLog, logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(requireAuth);

// POST /api/chat/:conversationId/message
router.post('/:conversationId/message', [
  param('conversationId').isUUID(),
  body('content').isString().trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const conversationId = String(req.params.conversationId);
    const { content } = req.body;

    // Check conversation ownership in Supabase or memory store
    let hasConversation = false;
    try {
      const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id, user_id')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      if (conv) hasConversation = true;
    } catch {
      // Supabase query error ignored
    }

    if (!hasConversation && chatMemoryStore.getConversation(conversationId, userId)) {
      hasConversation = true;
    }

    // If conversation doesn't exist anywhere, register it in memory
    if (!hasConversation) {
      chatMemoryStore.createConversation(userId);
      hasConversation = true;
    }

    // Get conversation history
    let history: Array<{ role: string; content: string }> = [];
    try {
      const { data: dbHistory } = await supabaseAdmin
        .from('chat_messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(20);
      if (dbHistory && dbHistory.length > 0) {
        history = dbHistory.map((m) => ({ role: m.role, content: m.content }));
      }
    } catch {
      // Ignored
    }

    if (history.length === 0) {
      history = chatMemoryStore.getMessages(conversationId).map((m) => ({
        role: m.role,
        content: m.content,
      }));
    }

    // Record user message
    try {
      await supabaseAdmin.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content,
      });
    } catch {
      // Ignored
    }
    chatMemoryStore.addMessage(conversationId, 'user', content);

    // Process with AI (Gemini 3.8 Flash with scope enforcement)
    const aiResponse = await aiService.processMessage(
      userId,
      conversationId,
      content,
      history
    );

    const msgId = uuidv4();
    const now = new Date().toISOString();

    // Record AI message in DB if available
    try {
      await supabaseAdmin.from('chat_messages').insert({
        id: msgId,
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse.content,
        intent: aiResponse.intent,
        parsed_transactions: aiResponse.parsedTransactions || null,
        metadata: { intent: aiResponse.intent },
      });

      // Update conversation title and last message in DB
      await supabaseAdmin.from('conversations').update({
        last_message: aiResponse.content.slice(0, 100),
        updated_at: now,
      }).eq('id', conversationId);
    } catch {
      // Ignored
    }

    // Always record in memory store
    const aiMsg = chatMemoryStore.addMessage(
      conversationId,
      'assistant',
      aiResponse.content,
      aiResponse.intent,
      aiResponse.parsedTransactions
    );

    res.json({
      success: true,
      data: {
        id: aiMsg.id,
        conversationId,
        role: 'assistant',
        content: aiResponse.content,
        intent: aiResponse.intent,
        parsedTransactions: aiResponse.parsedTransactions,
        createdAt: aiMsg.createdAt,
      },
    });
  } catch (err: unknown) {
    logger.error('Chat message error', { err });
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// POST /api/chat/:conversationId/confirm
router.post('/:conversationId/confirm', [
  param('conversationId').isUUID(),
  body('transactions').isArray({ min: 1, max: 20 }),
  body('transactions.*.type').isIn(['income', 'expense']),
  body('transactions.*.amount').isFloat({ min: 0.01 }),
  body('transactions.*.description').isString().trim().isLength({ min: 1, max: 500 }),
  body('transactions.*.date').optional(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const conversationId = String(req.params.conversationId);
    const { transactions } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Always record in unified dataStore for immediate dashboard availability
    for (const tx of transactions) {
      const txDate = tx.date && /^\d{4}-\d{2}-\d{2}/.test(String(tx.date))
        ? String(tx.date).split('T')[0]
        : today;

      dataStore.addTransaction(
        userId,
        tx.type as 'income' | 'expense',
        Number(tx.amount),
        tx.description,
        txDate,
        tx.suggestedCategoryId || null,
        undefined,
        'chat',
        tx.suggestedCategory
      );
    }

    const toInsert = transactions.map((tx: {
      type: string; amount: number; description: string;
      suggestedCategoryId?: string; date?: string;
    }) => ({
      user_id: userId,
      type: tx.type as 'income' | 'expense',
      amount: parseFloat(String(tx.amount)),
      description: String(tx.description).trim().slice(0, 500),
      category_id: tx.suggestedCategoryId || null,
      date: tx.date && /^\d{4}-\d{2}-\d{2}/.test(String(tx.date)) ? String(tx.date).split('T')[0] : today,
      is_confirmed: true,
      source: 'chat',
    }));

    try {
      await supabaseAdmin.from('transactions').insert(toInsert);
    } catch (dbErr) {
      logger.warn('Transactions insert warning', { dbErr });
    }

    const total = transactions.reduce((sum: number, tx: { amount: number }) => sum + Number(tx.amount), 0);
    const incomeCount = transactions.filter((tx: { type: string }) => tx.type === 'income').length;
    const expenseCount = transactions.filter((tx: { type: string }) => tx.type === 'expense').length;

    const confirmationMsg = [
      incomeCount > 0 ? `✅ Saved ${incomeCount} income transaction${incomeCount > 1 ? 's' : ''}.` : '',
      expenseCount > 0 ? `✅ Saved ${expenseCount} expense${expenseCount > 1 ? 's' : ''} totaling ₹${total.toLocaleString('en-IN')}.` : '',
    ].filter(Boolean).join(' ') + ' Your dashboard has been updated.';

    const confirmMsg = chatMemoryStore.addMessage(
      conversationId,
      'assistant',
      confirmationMsg,
      'transaction_saved'
    );

    try {
      await supabaseAdmin.from('chat_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: confirmationMsg,
        intent: 'transaction_saved',
      });
    } catch {
      // Ignored
    }

    auditLog('TRANSACTIONS_CONFIRMED_VIA_CHAT', userId, { count: transactions.length, total });

    res.json({
      success: true,
      data: {
        id: confirmMsg.id,
        conversationId,
        role: 'assistant',
        content: confirmationMsg,
        intent: 'transaction_saved',
        createdAt: confirmMsg.createdAt,
      },
    });
  } catch (err: unknown) {
    logger.error('Confirm transactions error', { err });
    res.status(500).json({ success: false, error: 'Failed to confirm transactions' });
  }
});

export default router;
