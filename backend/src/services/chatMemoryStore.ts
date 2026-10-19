import { v4 as uuidv4 } from 'uuid';

export interface MemoryConversation {
  id: string;
  userId: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  parsedTransactions?: any[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

class ChatMemoryStore {
  private conversations: Map<string, MemoryConversation> = new Map();
  private messages: Map<string, MemoryMessage[]> = new Map();

  getConversations(userId: string): MemoryConversation[] {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getConversation(id: string, userId: string): MemoryConversation | undefined {
    const c = this.conversations.get(id);
    if (c && c.userId === userId) return c;
    return undefined;
  }

  createConversation(userId: string, title = 'New Chat'): MemoryConversation {
    const id = uuidv4();
    const now = new Date().toISOString();
    const welcome = "Hi! I'm your AI financial assistant for MyKanakku. You can tell me what you spent (e.g., 'Spent ₹120 on canteen lunch' or 'Auto ₹50') or ask about your budget, savings, and expenses.";

    const conv: MemoryConversation = {
      id,
      userId,
      title,
      lastMessage: welcome,
      messageCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conv);

    const welcomeMsg: MemoryMessage = {
      id: uuidv4(),
      conversationId: id,
      role: 'assistant',
      content: welcome,
      intent: 'general_chat',
      createdAt: now,
    };
    this.messages.set(id, [welcomeMsg]);

    return conv;
  }

  getMessages(conversationId: string): MemoryMessage[] {
    return this.messages.get(conversationId) || [];
  }

  addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, intent?: string, parsedTransactions?: any[]): MemoryMessage {
    const msg: MemoryMessage = {
      id: uuidv4(),
      conversationId,
      role,
      content,
      intent,
      parsedTransactions,
      createdAt: new Date().toISOString(),
    };

    const list = this.messages.get(conversationId) || [];
    list.push(msg);
    this.messages.set(conversationId, list);

    // Update conversation metadata
    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.lastMessage = content.slice(0, 100);
      conv.messageCount = list.length;
      conv.updatedAt = new Date().toISOString();
      if (role === 'user' && list.length <= 3) {
        conv.title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      }
    }

    return msg;
  }

  deleteConversation(id: string, userId: string): boolean {
    const conv = this.conversations.get(id);
    if (conv && conv.userId === userId) {
      this.conversations.delete(id);
      this.messages.delete(id);
      return true;
    }
    return false;
  }
}

export const chatMemoryStore = new ChatMemoryStore();
