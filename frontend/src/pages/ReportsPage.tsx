import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';
import type { SpendingReport } from '../types';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ReportsPage() {
  const [report, setReport] = useState<SpendingReport | null>(null);
  const [period, setPeriod] = useState<'monthly' | 'daily'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const { data } = await api.get<{ data: SpendingReport }>(`/reports?period=${period}`);
        setReport(data.data);
      } catch { toast.error('Failed to load report'); }
      finally { setLoading(false); }
    };
    fetchReport();
  }, [period]);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  if (!report) return null;

  const incomeChange = report.previousPeriodComparison.incomeChange;
  const expenseChange = report.previousPeriodComparison.expenseChange;

  const handleExport = async () => {
    try {
      const response = await api.get('/reports/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `mykanakku-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported to CSV!');
    } catch {
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-gray-400 text-sm mt-0.5">{report.period}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-800 rounded-xl p-1 border border-surface-600/50">
            {(['monthly', 'daily'] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} id={`report-period-${p}-btn`}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${period === p ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'}`}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm" id="export-report-btn">
            <Download className="w-4 h-4" /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Income', value: report.totalIncome, change: incomeChange, icon: TrendingUp, positive: true },
          { label: 'Total Expenses', value: report.totalExpenses, change: expenseChange, icon: TrendingDown, positive: false },
          { label: 'Net Cash Flow', value: report.netCashFlow, icon: BarChart3, positive: report.netCashFlow >= 0 },
          { label: 'Budget Overruns', value: report.budgetOverruns.length, isBadge: true },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card">
            <p className="text-gray-400 text-sm">{item.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${item.isBadge ? (item.value > 0 ? 'text-danger-400' : 'text-success-400') : (item.positive ? 'text-success-400' : 'text-danger-400')}`}>
              {item.isBadge ? item.value : `₹${Math.abs(item.value as number).toLocaleString('en-IN')}`}
            </p>
            {item.change !== undefined && (
              <div className="flex items-center gap-1 text-xs">
                {item.change >= 0 ? <ArrowUpRight className="w-3.5 h-3.5 text-success-400" /> : <ArrowDownRight className="w-3.5 h-3.5 text-danger-400" />}
                <span className={item.change >= 0 ? 'text-success-400' : 'text-danger-400'}>{Math.abs(item.change).toFixed(1)}% vs last period</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Category breakdown */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Category Breakdown</h3>
          {report.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.categoryBreakdown} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis dataKey="categoryName" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, 'Amount']}
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12 }}
                  labelStyle={{ color: '#9ca3af' }} itemStyle={{ color: '#fff' }} />
                <Bar dataKey="amount" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-64 flex items-center justify-center text-gray-500 text-sm">No expense data</div>}
        </div>

        {/* Largest Expenses */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Largest Expenses</h3>
          {report.largestExpenses.length > 0 ? (
            <div className="space-y-3">
              {report.largestExpenses.slice(0, 6).map((tx, i) => (
                <div key={tx.id} className="flex items-center gap-3">
                  <span className="text-gray-600 text-sm w-5 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{tx.description}</p>
                    <p className="text-gray-500 text-xs">{tx.categoryName}</p>
                  </div>
                  <span className="text-danger-400 font-semibold text-sm tabular-nums">₹{tx.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-500 text-sm">No expense data</p>}
        </div>
      </div>

      {/* AI Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="glass-card p-6 border border-primary-500/20">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" /> AI Insights
          </h3>
          <ul className="space-y-3">
            {report.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-300 flex-shrink-0 text-xs font-bold mt-0.5">{i + 1}</span>
                <span className="text-gray-300 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
