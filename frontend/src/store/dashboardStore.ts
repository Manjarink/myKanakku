import { create } from 'zustand';
import type {
  DashboardStats,
  CategorySpending,
  DailySpending,
  MonthlyTrend,
  Transaction,
  DateFilter,
  DateRange,
} from '../types';
import api from '../lib/api';

interface DashboardState {
  stats: DashboardStats | null;
  categorySpending: CategorySpending[];
  dailySpending: DailySpending[];
  monthlyTrends: MonthlyTrend[];
  recentTransactions: Transaction[];
  dateFilter: DateFilter;
  customRange: DateRange | null;
  isLoading: boolean;
  error: string | null;

  setDateFilter: (filter: DateFilter, customRange?: DateRange) => void;
  fetchDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  stats: null,
  categorySpending: [],
  dailySpending: [],
  monthlyTrends: [],
  recentTransactions: [],
  dateFilter: 'month',
  customRange: null,
  isLoading: false,
  error: null,

  setDateFilter: (filter, customRange) => {
    set({ dateFilter: filter, customRange: customRange || null });
    get().fetchDashboard();
  },

  fetchDashboard: async () => {
    set({ isLoading: true, error: null });
    const { dateFilter, customRange } = get();

    try {
      const params: Record<string, string> = { period: dateFilter };
      if (dateFilter === 'custom' && customRange) {
        params.start = customRange.start;
        params.end = customRange.end;
      }

      const results = await Promise.allSettled([
        api.get<{ data: DashboardStats }>('/dashboard/stats', { params }),
        api.get<{ data: CategorySpending[] }>('/dashboard/category-spending', { params }),
        api.get<{ data: DailySpending[] }>('/dashboard/daily-spending', { params }),
        api.get<{ data: MonthlyTrend[] }>('/dashboard/monthly-trends'),
        api.get<{ data: Transaction[] }>('/transactions?limit=10&sort=date:desc'),
      ]);

      const stats = results[0].status === 'fulfilled' ? results[0].value.data.data : null;
      const categorySpending = results[1].status === 'fulfilled' ? results[1].value.data.data : [];
      const dailySpending = results[2].status === 'fulfilled' ? results[2].value.data.data : [];
      const monthlyTrends = results[3].status === 'fulfilled' ? results[3].value.data.data : [];
      const recentTransactions = results[4].status === 'fulfilled' ? results[4].value.data.data : [];

      set({
        stats,
        categorySpending: Array.isArray(categorySpending) ? categorySpending : [],
        dailySpending: Array.isArray(dailySpending) ? dailySpending : [],
        monthlyTrends: Array.isArray(monthlyTrends) ? monthlyTrends : [],
        recentTransactions: Array.isArray(recentTransactions) ? recentTransactions : [],
        isLoading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      set({ error: message, isLoading: false });
    }
  },

  refreshDashboard: async () => {
    await get().fetchDashboard();
  },
}));
