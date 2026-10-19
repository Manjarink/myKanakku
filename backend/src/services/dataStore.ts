import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

export interface StoredCategory {
  id: string;
  userId?: string | null;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface StoredTransaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId?: string | null;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  date: string;
  notes?: string;
  isConfirmed: boolean;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredBudget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  amount: number;
  spent: number;
  remaining: number;
  period: 'monthly' | 'weekly' | 'custom';
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  remainingAmount: number;
  progressPercent: number;
  targetDate: string;
  isCompleted: boolean;
  notes?: string;
  suggestedMonthlyContribution?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredConversation {
  id: string;
  userId: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: string;
  parsedTransactions?: any[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface StoredReminderSettings {
  id: string;
  userId: string;
  enabled: boolean;
  time: string;
  days: number[];
  message?: string;
  updatedAt: string;
}

export interface StoredNotification {
  id: string;
  userId: string;
  type: 'reminder' | 'budget_warning' | 'savings_milestone' | 'monthly_report';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const DEFAULT_CATEGORIES: StoredCategory[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', name: 'Food & Canteen', icon: '🍔', color: '#f97316', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000002', name: 'Groceries & Snacks', icon: '🛒', color: '#10b981', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000003', name: 'Transport & Auto', icon: '🚌', color: '#06b6d4', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000004', name: 'College & Tuition', icon: '🎓', color: '#8b5cf6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000005', name: 'Books & Stationary', icon: '📚', color: '#3b82f6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000006', name: 'Hostel & Rent', icon: '🏠', color: '#6366f1', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000007', name: 'Entertainment & Movies', icon: '🍿', color: '#ec4899', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000008', name: 'Subscriptions & Recharge', icon: '📱', color: '#14b8a6', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000009', name: 'Health & Medicine', icon: '💊', color: '#ef4444', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000010', name: 'Shopping & Personal', icon: '🛍️', color: '#f59e0b', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000011', name: 'Allowance & Pocket Money', icon: '💵', color: '#22c55e', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000012', name: 'Freelance & Part-time', icon: '💼', color: '#10b981', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000013', name: 'Scholarships', icon: '🏆', color: '#eab308', isDefault: true, createdAt: new Date().toISOString() },
  { id: 'c0000000-0000-0000-0000-000000000014', name: 'General & Miscellaneous', icon: '📦', color: '#64748b', isDefault: true, createdAt: new Date().toISOString() },
];

class UnifiedDataStore {
  private transactions: Map<string, StoredTransaction> = new Map();
  private categories: Map<string, StoredCategory> = new Map();
  private budgets: Map<string, StoredBudget> = new Map();
  private savingsGoals: Map<string, StoredSavingsGoal> = new Map();
  private conversations: Map<string, StoredConversation> = new Map();
  private messages: Map<string, StoredChatMessage[]> = new Map();
  private reminderSettings: Map<string, StoredReminderSettings> = new Map();
  private notifications: Map<string, StoredNotification[]> = new Map();

  // Track user initialization so we NEVER recreate deleted items on refresh
  private initializedUsers: Set<string> = new Set();
  private initializedBudgets: Set<string> = new Set();
  private initializedGoals: Set<string> = new Set();

  // Track deleted transaction IDs so they are NEVER resurrected from DB or anywhere
  private deletedTransactionIds: Set<string> = new Set();

  private storageFilePath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    this.storageFilePath = path.join(dataDir, 'store.json');

    // Initialize default categories
    for (const cat of DEFAULT_CATEGORIES) {
      this.categories.set(cat.id, cat);
    }

    // Load persisted state if file exists
    this.loadFromFile();
  }

  private loadFromFile(): void {
    try {
      if (fs.existsSync(this.storageFilePath)) {
        const raw = fs.readFileSync(this.storageFilePath, 'utf-8');
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed.transactions)) {
          for (const tx of parsed.transactions) {
            this.transactions.set(tx.id, tx);
          }
        }
        if (Array.isArray(parsed.categories)) {
          for (const cat of parsed.categories) {
            this.categories.set(cat.id, cat);
          }
        }
        if (Array.isArray(parsed.budgets)) {
          for (const b of parsed.budgets) {
            this.budgets.set(b.id, b);
          }
        }
        if (Array.isArray(parsed.savingsGoals)) {
          for (const g of parsed.savingsGoals) {
            this.savingsGoals.set(g.id, g);
          }
        }
        if (Array.isArray(parsed.conversations)) {
          for (const c of parsed.conversations) {
            this.conversations.set(c.id, c);
          }
        }
        if (parsed.messages && typeof parsed.messages === 'object') {
          for (const [k, v] of Object.entries(parsed.messages)) {
            if (Array.isArray(v)) this.messages.set(k, v as StoredChatMessage[]);
          }
        }
        if (Array.isArray(parsed.reminderSettings)) {
          for (const r of parsed.reminderSettings) {
            this.reminderSettings.set(r.userId, r);
          }
        }
        if (parsed.notifications && typeof parsed.notifications === 'object') {
          for (const [k, v] of Object.entries(parsed.notifications)) {
            if (Array.isArray(v)) this.notifications.set(k, v as StoredNotification[]);
          }
        }
        if (Array.isArray(parsed.initializedUsers)) {
          this.initializedUsers = new Set(parsed.initializedUsers);
        }
        if (Array.isArray(parsed.initializedBudgets)) {
          this.initializedBudgets = new Set(parsed.initializedBudgets);
        }
        if (Array.isArray(parsed.initializedGoals)) {
          this.initializedGoals = new Set(parsed.initializedGoals);
        }
        if (Array.isArray(parsed.deletedTransactionIds)) {
          this.deletedTransactionIds = new Set(parsed.deletedTransactionIds);
        }
      }
    } catch (err) {
      console.warn('[UnifiedDataStore] Could not load persisted data:', err);
    }
  }

  private saveToFile(): void {
    try {
      const dataDir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const dataToSave = {
        transactions: Array.from(this.transactions.values()),
        categories: Array.from(this.categories.values()),
        budgets: Array.from(this.budgets.values()),
        savingsGoals: Array.from(this.savingsGoals.values()),
        conversations: Array.from(this.conversations.values()),
        messages: Object.fromEntries(this.messages.entries()),
        reminderSettings: Array.from(this.reminderSettings.values()),
        notifications: Object.fromEntries(this.notifications.entries()),
        initializedUsers: Array.from(this.initializedUsers),
        initializedBudgets: Array.from(this.initializedBudgets),
        initializedGoals: Array.from(this.initializedGoals),
        deletedTransactionIds: Array.from(this.deletedTransactionIds),
      };

      fs.writeFileSync(this.storageFilePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[UnifiedDataStore] Could not save persisted data:', err);
    }
  }

  // ─── Categories ─────────────────────────────────────────────────────────────
  getCategories(userId: string): StoredCategory[] {
    return Array.from(this.categories.values()).filter(
      (c) => c.isDefault || c.userId === userId
    );
  }

  getCategory(id: string): StoredCategory | undefined {
    return this.categories.get(id);
  }

  findCategoryByName(name?: string): StoredCategory | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();
    return Array.from(this.categories.values()).find(
      (c) => c.name.toLowerCase().includes(lower) || lower.includes(c.name.toLowerCase().split(' ')[0])
    );
  }

  addCategory(userId: string, name: string, icon = '📦', color = '#7c3aed'): StoredCategory {
    const id = uuidv4();
    const cat: StoredCategory = {
      id,
      userId,
      name,
      icon,
      color,
      isDefault: false,
      createdAt: new Date().toISOString(),
    };
    this.categories.set(id, cat);
    this.saveToFile();
    return cat;
  }

  // ─── Transactions ───────────────────────────────────────────────────────────
  getTransactions(userId: string): StoredTransaction[] {
    const userTxs = Array.from(this.transactions.values())
      .filter((t) => t.userId === userId && t.isConfirmed && !this.deletedTransactionIds.has(t.id));

    // Only seed initial pocket money if user has NEVER been initialized before.
    // If the user already deleted transactions or has 0 transactions after deletion, NEVER re-seed!
    if (!this.initializedUsers.has(userId) && userTxs.length === 0) {
      this.initializedUsers.add(userId);
      const starter = this.addTransaction(
        userId,
        'income',
        5000,
        'Monthly Allowance / Pocket Money',
        new Date().toISOString().split('T')[0],
        'c0000000-0000-0000-0000-000000000011',
        'Initial starter student allowance',
        'starter'
      );
      return [starter];
    }

    return userTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  isTransactionDeleted(id: string): boolean {
    return this.deletedTransactionIds.has(id);
  }

  addTransaction(
    userId: string,
    type: 'income' | 'expense',
    amount: number,
    description: string,
    date?: string,
    categoryId?: string | null,
    notes?: string,
    source = 'manual',
    suggestedCategory?: string
  ): StoredTransaction {
    const id = uuidv4();
    const now = new Date().toISOString();

    let cat = categoryId ? this.categories.get(categoryId) : undefined;
    if (!cat && suggestedCategory) {
      cat = this.findCategoryByName(suggestedCategory);
    }
    if (!cat) {
      cat = this.findCategoryByName(description) || this.categories.get('c0000000-0000-0000-0000-000000000014');
    }

    const tx: StoredTransaction = {
      id,
      userId,
      type,
      amount: Number(amount),
      description,
      categoryId: cat?.id || null,
      categoryName: cat?.name || (type === 'income' ? 'Allowance & Pocket Money' : 'General & Miscellaneous'),
      categoryIcon: cat?.icon || (type === 'income' ? '💵' : '💸'),
      categoryColor: cat?.color || (type === 'income' ? '#22c55e' : '#7c3aed'),
      date: date || new Date().toISOString().split('T')[0],
      notes,
      isConfirmed: true,
      source,
      createdAt: now,
      updatedAt: now,
    };

    this.initializedUsers.add(userId);
    this.transactions.set(id, tx);
    this.saveToFile();
    return tx;
  }

  deleteTransaction(id: string, userId: string): boolean {
    this.deletedTransactionIds.add(id);
    this.initializedUsers.add(userId);
    const tx = this.transactions.get(id);
    if (tx && tx.userId === userId) {
      this.transactions.delete(id);
      this.saveToFile();
      return true;
    }
    this.saveToFile();
    return false;
  }

  deleteAllTransactions(userId: string): number {
    this.initializedUsers.add(userId);
    let count = 0;
    for (const [id, tx] of this.transactions.entries()) {
      if (tx.userId === userId) {
        this.deletedTransactionIds.add(id);
        this.transactions.delete(id);
        count++;
      }
    }
    this.saveToFile();
    return count;
  }

  // ─── Budgets ────────────────────────────────────────────────────────────────
  getBudgets(userId: string): StoredBudget[] {
    const existing = Array.from(this.budgets.values()).filter((b) => b.userId === userId);
    if (!this.initializedBudgets.has(userId) && existing.length === 0) {
      this.initializedBudgets.add(userId);
      this.addBudget(userId, 'c0000000-0000-0000-0000-000000000001', 3000, 'monthly'); // Food & Canteen
      this.addBudget(userId, 'c0000000-0000-0000-0000-000000000003', 1000, 'monthly'); // Transport
      this.addBudget(userId, 'c0000000-0000-0000-0000-000000000005', 1500, 'monthly'); // Books
    }

    const userTxs = this.getTransactions(userId);
    return Array.from(this.budgets.values())
      .filter((b) => b.userId === userId)
      .map((b) => {
        const spent = userTxs
          .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
          .reduce((sum, t) => sum + t.amount, 0);
        return {
          ...b,
          spent,
          remaining: b.amount - spent,
        };
      });
  }

  addBudget(userId: string, categoryId: string, amount: number, period: 'monthly' | 'weekly' | 'custom' = 'monthly'): StoredBudget {
    const id = uuidv4();
    const now = new Date().toISOString();
    const cat = this.categories.get(categoryId);

    const b: StoredBudget = {
      id,
      userId,
      categoryId,
      categoryName: cat?.name || 'Category',
      categoryIcon: cat?.icon || '💰',
      categoryColor: cat?.color || '#7c3aed',
      amount: Number(amount),
      spent: 0,
      remaining: Number(amount),
      period,
      startDate: new Date().toISOString().split('T')[0],
      createdAt: now,
      updatedAt: now,
    };
    this.initializedBudgets.add(userId);
    this.budgets.set(id, b);
    this.saveToFile();
    return b;
  }

  deleteBudget(id: string, userId: string): boolean {
    this.initializedBudgets.add(userId);
    const b = this.budgets.get(id);
    if (b && b.userId === userId) {
      this.budgets.delete(id);
      this.saveToFile();
      return true;
    }
    return false;
  }

  // ─── Savings Goals ──────────────────────────────────────────────────────────
  getSavingsGoals(userId: string): StoredSavingsGoal[] {
    const existing = Array.from(this.savingsGoals.values()).filter((g) => g.userId === userId);
    if (!this.initializedGoals.has(userId) && existing.length === 0) {
      this.initializedGoals.add(userId);
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + 3);
      this.addSavingsGoal(userId, 'Semester Tech & Exam Fund', 5000, targetDate.toISOString().split('T')[0], 'Savings for semester exams and laptop repairs');
    }
    return Array.from(this.savingsGoals.values()).filter((g) => g.userId === userId);
  }

  addSavingsGoal(userId: string, name: string, targetAmount: number, targetDate: string, notes?: string): StoredSavingsGoal {
    const id = uuidv4();
    const now = new Date().toISOString();
    const remaining = Number(targetAmount);

    const goal: StoredSavingsGoal = {
      id,
      userId,
      name,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      remainingAmount: remaining,
      progressPercent: 0,
      targetDate,
      isCompleted: false,
      notes,
      suggestedMonthlyContribution: Math.ceil(remaining / 3),
      createdAt: now,
      updatedAt: now,
    };
    this.initializedGoals.add(userId);
    this.savingsGoals.set(id, goal);
    this.saveToFile();
    return goal;
  }

  contributeToGoal(id: string, userId: string, amount: number): StoredSavingsGoal | undefined {
    const goal = this.savingsGoals.get(id);
    if (!goal || goal.userId !== userId) return undefined;
    goal.savedAmount += Number(amount);
    goal.remainingAmount = Math.max(0, goal.targetAmount - goal.savedAmount);
    goal.progressPercent = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 100;
    goal.isCompleted = goal.savedAmount >= goal.targetAmount;
    goal.updatedAt = new Date().toISOString();
    this.saveToFile();
    return goal;
  }

  deleteSavingsGoal(id: string, userId: string): boolean {
    this.initializedGoals.add(userId);
    const g = this.savingsGoals.get(id);
    if (g && g.userId === userId) {
      this.savingsGoals.delete(id);
      this.saveToFile();
      return true;
    }
    return false;
  }

  // ─── Conversations & Messages ───────────────────────────────────────────────
  getConversations(userId: string): StoredConversation[] {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  getConversation(id: string, userId: string): StoredConversation | undefined {
    const c = this.conversations.get(id);
    if (c && c.userId === userId) return c;
    return undefined;
  }

  createConversation(userId: string, title = 'New Chat'): StoredConversation {
    const id = uuidv4();
    const now = new Date().toISOString();
    const welcome = "Hi! I'm your AI financial assistant for MyKanakku. You can tell me what you spent (e.g., 'Spent ₹120 on canteen lunch' or 'Auto ₹50') or ask about your budget, savings, and expenses.";

    const conv: StoredConversation = {
      id,
      userId,
      title,
      lastMessage: welcome,
      messageCount: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(id, conv);

    const welcomeMsg: StoredChatMessage = {
      id: uuidv4(),
      conversationId: id,
      role: 'assistant',
      content: welcome,
      intent: 'general_chat',
      createdAt: now,
    };
    this.messages.set(id, [welcomeMsg]);
    this.saveToFile();
    return conv;
  }

  getMessages(conversationId: string): StoredChatMessage[] {
    return this.messages.get(conversationId) || [];
  }

  addMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string, intent?: string, parsedTransactions?: any[]): StoredChatMessage {
    const msg: StoredChatMessage = {
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

    const conv = this.conversations.get(conversationId);
    if (conv) {
      conv.lastMessage = content.slice(0, 100);
      conv.messageCount = list.length;
      conv.updatedAt = new Date().toISOString();
      if (role === 'user' && list.length <= 3) {
        conv.title = content.slice(0, 60) + (content.length > 60 ? '...' : '');
      }
    }
    this.saveToFile();
    return msg;
  }

  deleteConversation(id: string, userId: string): boolean {
    const conv = this.conversations.get(id);
    if (conv && conv.userId === userId) {
      this.conversations.delete(id);
      this.messages.delete(id);
      this.saveToFile();
      return true;
    }
    return false;
  }

  // ─── Reminders ──────────────────────────────────────────────────────────────
  getReminderSettings(userId: string): StoredReminderSettings {
    let settings = this.reminderSettings.get(userId);
    if (!settings) {
      settings = {
        id: uuidv4(),
        userId,
        enabled: true,
        time: '21:00',
        days: [1, 2, 3, 4, 5, 6, 0],
        message: 'Remember to record your campus expenses in MyKanakku today!',
        updatedAt: new Date().toISOString(),
      };
      this.reminderSettings.set(userId, settings);
      this.saveToFile();
    }
    return settings;
  }

  saveReminderSettings(userId: string, data: Partial<StoredReminderSettings>): StoredReminderSettings {
    const current = this.getReminderSettings(userId);
    const updated: StoredReminderSettings = {
      ...current,
      ...data,
      userId,
      updatedAt: new Date().toISOString(),
    };
    this.reminderSettings.set(userId, updated);
    this.saveToFile();
    return updated;
  }

  // ─── Notifications ──────────────────────────────────────────────────────────
  getNotifications(userId: string): StoredNotification[] {
    let list = this.notifications.get(userId);
    if (!list) {
      const now = new Date();
      list = [
        {
          id: uuidv4(),
          userId,
          type: 'reminder',
          title: 'Daily Expense Reminder',
          message: 'Remember to record your campus expenses in MyKanakku today!',
          isRead: false,
          createdAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
        },
        {
          id: uuidv4(),
          userId,
          type: 'budget_warning',
          title: 'Budget Alert',
          message: 'You have spent on Books & Stationary this week. Review your budget in Budgets.',
          isRead: false,
          createdAt: new Date(now.getTime() - 1000 * 60 * 120).toISOString(),
        },
        {
          id: uuidv4(),
          userId,
          type: 'savings_milestone',
          title: 'Savings Goal Update',
          message: 'Your Semester Tech & Exam Fund is active! Keep saving small amounts daily.',
          isRead: true,
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
        },
      ];
      this.notifications.set(userId, list);
      this.saveToFile();
    }
    return list;
  }

  markNotificationAsRead(id: string, userId: string): boolean {
    const list = this.getNotifications(userId);
    const n = list.find((item) => item.id === id);
    if (n) {
      n.isRead = true;
      this.saveToFile();
      return true;
    }
    return false;
  }

  markAllNotificationsAsRead(userId: string): boolean {
    const list = this.getNotifications(userId);
    for (const item of list) {
      item.isRead = true;
    }
    this.saveToFile();
    return true;
  }
}

export const dataStore = new UnifiedDataStore();
export const chatMemoryStore = dataStore; // Alias for backward compatibility
