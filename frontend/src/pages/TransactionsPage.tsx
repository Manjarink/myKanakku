import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus, ArrowUpCircle, ArrowDownCircle, Trash2, Edit2, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../lib/api';
import type { Transaction, Category } from '../types';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({ type: 'expense', amount: '', description: '', categoryId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (search) params.search = search;
      if (typeFilter !== 'all') params.type = typeFilter;
      if (categoryFilter !== 'all') params.categoryId = categoryFilter;
      const { data } = await api.get<{ data: Transaction[]; total: number; hasMore: boolean }>('/transactions', { params });
      setTransactions(page === 1 ? data.data : (prev) => [...prev, ...data.data]);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch { toast.error('Failed to load transactions'); }
    finally { setLoading(false); }
  }, [page, search, typeFilter, categoryFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, categoryFilter]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  useEffect(() => {
    api.get<{ data: Category[] }>('/categories').then(({ data }) => setCategories(data.data));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return;
    try {
      await api.delete(`/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((prev) => prev - 1);
      toast.success('Transaction deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/transactions', { ...newTx, amount: parseFloat(newTx.amount) });
      setShowAddModal(false);
      setNewTx({ type: 'expense', amount: '', description: '', categoryId: '', date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
      setPage(1);
      fetchTransactions();
      toast.success('Transaction added');
    } catch { toast.error('Failed to add transaction'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-gray-400 text-sm mt-0.5">{total} total transactions</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2" id="add-transaction-btn">
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-9 py-2.5"
            id="search-transactions"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'income', 'expense'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              id={`filter-${t}-btn`}
              className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition-all ${typeFilter === t ? 'bg-primary-600 text-white' : 'bg-surface-700 text-gray-400 hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field pl-9 py-2.5 pr-8 appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Transaction List */}
      <div className="glass-card overflow-hidden">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center h-40"><LoadingSpinner /></div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3">
            <ArrowDownCircle className="w-10 h-10 text-gray-600" />
            <p className="text-gray-500 text-sm">No transactions found</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-600/30">
            {transactions.map((tx, i) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 hover:bg-surface-700/30 transition-colors group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-success-500/20' : 'bg-danger-500/20'}`}>
                  {tx.type === 'income' ? <ArrowUpCircle className="w-5 h-5 text-success-400" /> : <ArrowDownCircle className="w-5 h-5 text-danger-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{tx.description}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {tx.categoryName && <span className="text-xs px-2 py-0.5 bg-surface-600 text-gray-300 rounded-full">{tx.categoryIcon} {tx.categoryName}</span>}
                    <span className="text-gray-500 text-xs">{format(parseISO(tx.date), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-base font-bold tabular-nums ${tx.type === 'income' ? 'text-success-400' : 'text-danger-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="btn-ghost p-1.5" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(tx.id)} className="btn-ghost p-1.5 hover:text-danger-400" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
        {hasMore && (
          <div className="p-4 text-center">
            <button onClick={() => setPage((p) => p + 1)} className="btn-secondary text-sm" id="load-more-btn">
              {loading ? <LoadingSpinner size="sm" /> : 'Load More'}
            </button>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Add Transaction</h3>
            <form onSubmit={handleAdd} className="space-y-4" id="add-transaction-form">
              <div className="grid grid-cols-2 gap-2">
                {(['expense', 'income'] as const).map((t) => (
                  <button type="button" key={t} onClick={() => setNewTx((p) => ({ ...p, type: t }))}
                    className={`py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${newTx.type === t ? (t === 'income' ? 'bg-success-500/30 text-success-300 border border-success-500/50' : 'bg-danger-500/30 text-danger-300 border border-danger-500/50') : 'bg-surface-700 text-gray-400'}`}
                  >
                    {t === 'income' ? '💰 Income' : '💸 Expense'}
                  </button>
                ))}
              </div>
              <div>
                <label className="input-label">Amount (₹)</label>
                <input type="number" value={newTx.amount} onChange={(e) => setNewTx((p) => ({ ...p, amount: e.target.value }))} className="input-field" placeholder="0.00" min="0" step="0.01" required />
              </div>
              <div>
                <label className="input-label">Description</label>
                <input type="text" value={newTx.description} onChange={(e) => setNewTx((p) => ({ ...p, description: e.target.value }))} className="input-field" placeholder="e.g. Lunch at college canteen" required />
              </div>
              <div>
                <label className="input-label">Category</label>
                <select value={newTx.categoryId} onChange={(e) => setNewTx((p) => ({ ...p, categoryId: e.target.value }))} className="input-field">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Date</label>
                <input type="date" value={newTx.date} onChange={(e) => setNewTx((p) => ({ ...p, date: e.target.value }))} className="input-field" required />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" id="save-transaction-btn">Save</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
