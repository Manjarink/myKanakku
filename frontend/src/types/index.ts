// ─── User & Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  currency: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile extends User {
  phoneNumber?: string;
  notificationsEnabled: boolean;
  reminderTime?: string;
  twoFactorEnabled: boolean;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
  date: string;
  notes?: string;
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionCreate {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId?: string;
  date: string;
  notes?: string;
}

export interface TransactionUpdate {
  amount?: number;
  description?: string;
  categoryId?: string;
  date?: string;
  notes?: string;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  isDefault: boolean;
  transactionCount?: number;
  createdAt: string;
}

// ─── Budgets ──────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  spent: number;
  remaining: number;
  period: 'monthly' | 'weekly' | 'custom';
  startDate: string;
  endDate?: string;
  createdAt: string;
}

export interface BudgetAllocation {
  id: string;
  budgetId: string;
  amount: number;
  allocatedAt: string;
  description?: string;
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  remainingAmount: number;
  progressPercent: number;
  targetDate: string;
  isCompleted: boolean;
  suggestedMonthlyContribution?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageIntent =
  | 'add_expense'
  | 'add_income'
  | 'query_balance'
  | 'query_spending'
  | 'add_category'
  | 'budget_management'
  | 'savings_goal'
  | 'allocation_suggestion'
  | 'purchase_advice'
  | 'spending_report'
  | 'transaction_correction'
  | 'set_reminder'
  | 'out_of_scope'
  | 'clarification'
  | 'general_chat';

export interface ParsedTransaction {
  tempId: string;
  type: TransactionType;
  amount: number;
  description: string;
  suggestedCategory?: string;
  suggestedCategoryId?: string;
  date: string;
  confidence: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  intent?: MessageIntent;
  parsedTransactions?: ParsedTransaction[];
  pendingAction?: PendingAction;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type PendingActionType =
  | 'confirm_transactions'
  | 'confirm_budget'
  | 'confirm_savings_goal'
  | 'confirm_allocation'
  | 'confirm_delete'
  | 'confirm_correction';

export interface PendingAction {
  type: PendingActionType;
  data: unknown;
  expiresAt?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export type DateFilter = 'today' | 'week' | 'month' | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

export interface DashboardStats {
  availableBalance: number;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  remainingBudget: number;
  savingsProgress: number;
  period: DateFilter;
  dateRange: DateRange;
}

export interface CategorySpending {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface DailySpending {
  date: string;
  income: number;
  expenses: number;
  net: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export interface SpendingReport {
  period: string;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  categoryBreakdown: CategorySpending[];
  largestExpenses: Transaction[];
  budgetOverruns: Budget[];
  savingsProgress: SavingsGoal[];
  previousPeriodComparison: {
    incomeChange: number;
    expenseChange: number;
    netChange: number;
  };
  recommendations: string[];
}

// ─── Notifications & Reminders ────────────────────────────────────────────────

export interface ReminderSettings {
  id: string;
  userId: string;
  enabled: boolean;
  time: string;
  days: number[];
  message?: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'reminder' | 'budget_warning' | 'savings_milestone' | 'monthly_report';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Preferences ─────────────────────────────────────────────────────────────

export interface UserPreference {
  id: string;
  userId: string;
  keyword: string;
  categoryId: string;
  categoryName: string;
  createdAt: string;
}
