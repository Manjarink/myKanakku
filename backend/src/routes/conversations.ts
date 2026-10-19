import { Router, Response } from 'express';
import { param } from 'express-validator';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { supabaseAdmin } from '../config/supabase';
import { chatMemoryStore } from '../services/chatMemoryStore';
import { logger } from '../utils/logger';

const router = Router();
router.use(requireAuth);

// GET /api/conversations - List conversations for user
router.get('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('id, user_id, title, last_message, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    const conversations = await Promise.all(
      (data || []).map(async (c) => {
        const { count } = await supabaseAdmin
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id);

        return {
          id: c.id,
          userId: c.user_id,
          title: c.title || 'New Chat',
          lastMessage: c.last_message || undefined,
          messageCount: count || 0,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
        };
      })
    );

    // Merge with memory store conversations
    const memConvs = chatMemoryStore.getConversations(userId);
    const existingIds = new Set(conversations.map((c) => c.id));
    const merged = [...conversations, ...memConvs.filter((c) => !existingIds.has(c.id))];

    res.json({ success: true, data: merged });
  } catch (err: unknown) {
    logger.warn('Conversations DB query failed, falling back to memory store', { err });
    const fallbackConvs = chatMemoryStore.getConversations(userId);
    res.json({ success: true, data: fallbackConvs });
  }
});

// POST /api/conversations - Create a new conversation
router.post('/', async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const title = (req.body.title as string) || 'New Chat';

  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        user_id: userId,
        title,
        last_message: null,
      })
      .select()
      .single();

    if (error) throw error;

    const welcomeText = "Hi! I'm your AI financial assistant for MyKanakku. You can tell me what you spent (e.g., 'Spent ₹120 on canteen lunch' or 'Auto ₹50') or ask about your budget, savings, and expenses.";
    await supabaseAdmin.from('chat_messages').insert({
      conversation_id: data.id,
      role: 'assistant',
      content: welcomeText,
      intent: 'general_chat',
    });

    res.status(201).json({
      success: true,
      data: {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        lastMessage: welcomeText,
        messageCount: 1,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err: unknown) {
    logger.warn('Create conversation DB insert failed, using memory store', { err });
    const memConv = chatMemoryStore.createConversation(userId, title);
    res.status(201).json({ success: true, data: memConv });
  }
});

// GET /api/conversations/:id/messages - Get messages for conversation
router.get('/:id/messages', [
  param('id').isUUID(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const conversationId = String(req.params.id);

  try {
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (conv) {
      const { data: messages, error } = await supabaseAdmin
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formatted = (messages || []).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        role: m.role,
        content: m.content,
        intent: m.intent,
        parsedTransactions: m.parsed_transactions,
        metadata: m.metadata,
        createdAt: m.created_at,
      }));

      return res.json({ success: true, data: formatted });
    }

    // Fallback to memory store
    const memMsgs = chatMemoryStore.getMessages(conversationId);
    res.json({ success: true, data: memMsgs });
  } catch (err: unknown) {
    logger.warn('Get messages DB query failed, using memory store', { err });
    const memMsgs = chatMemoryStore.getMessages(conversationId);
    res.json({ success: true, data: memMsgs });
  }
});

// DELETE /api/conversations/:id - Delete conversation and its messages
router.delete('/:id', [
  param('id').isUUID(),
  validateRequest,
], async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const conversationId = String(req.params.id);

  try {
    await supabaseAdmin.from('chat_messages').delete().eq('conversation_id', conversationId);
    await supabaseAdmin.from('conversations').delete().eq('id', conversationId).eq('user_id', userId);
  } catch {
    // Ignore error
  }

  chatMemoryStore.deleteConversation(conversationId, userId);
  res.json({ success: true, message: 'Conversation deleted' });
});

export default router;
