import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Wallet, Target, PiggyBank,
  ArrowUpRight, ArrowDownRight, AlertTriangle, Calendar,
  RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { useDashboardStore } from '../store/dashboardStore';
import type { DateFilter } from '../types';
import { format, parseISO } from 'date-fns';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'custom', label: 'Custom' },
];

function formatAmount(amount: number, currency = '₹') {
  return `${currency}${Math.abs(amount).toLocaleString('en-IN')}`;
}

function StatCard({
  title, value, icon: Icon, change, changeLabel, gradient, delay = 0
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  change?: number;
  changeLabel?: string;
  gradient: string;
  delay?: number;
}) {
  const isPositive = (change ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card group hover:border-primary-500/30 transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl ${gradient} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {isPositive
            ? <ArrowUpRight className="w-4 h-4 text-success-400" />
            : <ArrowDownRight className="w-4 h-4 text-danger-400" />
          }
          <span className={`text-sm font-medium ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
            {Math.abs(change).toFixed(1)}%
          </span>
          <span className="text-gray-500 text-xs">{changeLabel}</span>
        </div>
      )}
    </motion.div>
  );
}

const CHART_COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#0ea5e9'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-4 py-3 text-sm">
      <p className="text-gray-300 font-medium mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="text-white font-semibold">₹{p.value.toLocaleString('en-IN')}</span>
        </div>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const {
    stats, categorySpending, dailySpending, monthlyTrends,
    recentTransactions, dateFilter, isLoading, fetchDashboard, setDateFilter
  } = useDashboardStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (isLoading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const emptyStats = {
    availableBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    netCashFlow: 0,
    remainingBudget: 0,
    savingsProgress: 0,
    period: 'month' as DateFilter,
    dateRange: { start: '', end: '' },
  };
  const s = stats || emptyStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financial Overview</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {s.dateRange.start && s.dateRange.end
              ? `${format(parseISO(s.dateRange.start), 'MMM d')} – ${format(parseISO(s.dateRange.end), 'MMM d, yyyy')}`
              : 'All time'
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date filter */}
          <div className="flex items-center gap-1 bg-surface-800 rounded-xl p-1 border border-surface-600/50">
            {DATE_FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateFilter(key)}
                id={`date-filter-${key}`}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  dateFilter === key
                    ? 'bg-primary-600 text-white shadow-glow-primary'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchDashboard()}
            id="refresh-dashboard-btn"
            className={`btn-ghost p-2 ${isLoading ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Available Balance"
          value={formatAmount(s.availableBalance)}
          icon={Wallet}
          gradient="bg-gradient-primary"
          delay={0}
        />
        <StatCard
          title="Total Income"
          value={formatAmount(s.totalIncome)}
          icon={TrendingUp}
          gradient="bg-gradient-income"
          delay={0.05}
        />
        <StatCard
          title="Total Expenses"
          value={formatAmount(s.totalExpenses)}
          icon={TrendingDown}
          gradient="bg-gradient-expense"
          delay={0.1}
        />
        <StatCard
          title="Savings Progress"
          value={`${s.savingsProgress.toFixed(1)}%`}
          icon={PiggyBank}
          gradient="bg-accent-600"
          delay={0.15}
        />
      </div>

      {/* Budget warning */}
      {s.remainingBudget < 0 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4 p-4 bg-danger-500/10 border border-danger-500/30 rounded-2xl"
        >
          <AlertTriangle className="w-6 h-6 text-danger-400 flex-shrink-0" />
          <div>
            <p className="text-danger-300 font-medium">Budget Exceeded</p>
            <p className="text-danger-400/70 text-sm">
              You've exceeded your budget by {formatAmount(Math.abs(s.remainingBudget))} this period.
            </p>
          </div>
        </motion.div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Daily spending chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 lg:col-span-2"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white font-semibold">Income vs Expenses</h3>
              <p className="text-gray-400 text-sm">Daily breakdown</p>
            </div>
            <Calendar className="w-5 h-5 text-gray-500" />
          </div>
          {dailySpending.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailySpending}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-gray-500 text-sm">No transaction data for this period</p>
            </div>
          )}
        </motion.div>

        {/* Category Pie Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-6"
        >
          <h3 className="text-white font-semibold mb-1">Spending by Category</h3>
          <p className="text-gray-400 text-sm mb-4">This period</p>
          {categorySpending.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categorySpending}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="categoryName"
                  >
                    {categorySpending.map((entry, idx) => (
                      <Cell key={entry.categoryId} fill={entry.categoryColor || CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categorySpending.slice(0, 5).map((cat, idx) => (
                  <div key={cat.categoryId} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.categoryColor || CHART_COLORS[idx % CHART_COLORS.length] }} />
                    <span className="text-gray-300 text-xs flex-1 truncate">{cat.categoryName}</span>
                    <span className="text-white text-xs font-semibold tabular-nums">₹{cat.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <p className="text-gray-500 text-sm text-center">No expenses recorded<br />yet this period</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Monthly trends + Recent transactions */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly trends */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <h3 className="text-white font-semibold mb-1">Monthly Trends</h3>
          <p className="text-gray-400 text-sm mb-4">6-month overview</p>
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyTrends} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-gray-500 text-sm">Not enough data for trends</p>
            </div>
          )}
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-white font-semibold">Recent Transactions</h3>
              <p className="text-gray-400 text-sm">Latest activity</p>
            </div>
            <a href="/transactions" className="text-primary-400 text-sm hover:text-primary-300 transition-colors flex items-center gap-1">
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3">
              {recentTransactions.slice(0, 6).map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-700/50 transition-colors">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${
                    tx.type === 'income' ? 'bg-success-500/20' : 'bg-danger-500/20'
                  }`}>
                    {tx.categoryIcon || (tx.type === 'income' ? '💰' : '💸')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-gray-500 text-xs">{tx.categoryName || 'Uncategorized'} · {format(parseISO(tx.date), 'MMM d')}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${
                    tx.type === 'income' ? 'text-success-400' : 'text-danger-400'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <Target className="w-10 h-10 text-gray-600" />
              <p className="text-gray-500 text-sm text-center">
                No transactions yet.<br />
                <a href="/chat" className="text-primary-400 hover:underline">Start chatting</a> to record expenses.
              </p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
