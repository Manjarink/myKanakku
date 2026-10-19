import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, AlertTriangle, TrendingUp, Trash2, Edit2, Tag } from 'lucide-react';
import api from '../lib/api';
import type { Budget, Category } from '../types';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/shared/LoadingSpinner';

function BudgetCard({ budget, onDelete, onEdit }: { budget: Budget; onDelete: (id: string) => void; onEdit: (b: Budget) => void }) {
  const pct = Math.min((budget.spent / budget.amount) * 100, 100);
  const isOverrun = budget.spent > budget.amount;
  const isWarning = pct >= 80 && !isOverrun;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card-hover p-5 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${budget.categoryColor}20`, border: `1px solid ${budget.categoryColor}40` }}>
            {budget.categoryIcon}
          </div>
          <div>
            <h3 className="text-white font-semibold">{budget.categoryName}</h3>
            <p className="text-gray-500 text-xs capitalize">{budget.period} budget</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(budget)} className="btn-ghost p-1.5"><Edit2 className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(budget.id)} className="btn-ghost p-1.5 hover:text-danger-400"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold text-white tabular-nums">₹{budget.spent.toLocaleString('en-IN')}</span>
          <span className="text-gray-400 text-sm">of ₹{budget.amount.toLocaleString('en-IN')}</span>
        </div>
        <div className="progress-bar h-2">
          <div
            className="progress-fill h-full"
            style={{
              width: `${pct}%`,
              background: isOverrun ? '#f43f5e' : isWarning ? '#f59e0b' : budget.categoryColor || '#7c3aed',
            }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${isOverrun ? 'text-danger-400' : isWarning ? 'text-warning-400' : 'text-success-400'}`}>
            {isOverrun ? `₹${Math.abs(budget.remaining).toLocaleString('en-IN')} over` : `₹${budget.remaining.toLocaleString('en-IN')} left`}
          </span>
          <span className="text-gray-500 text-xs">{pct.toFixed(0)}% used</span>
        </div>
      </div>

      {(isOverrun || isWarning) && (
        <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-xl text-xs ${isOverrun ? 'bg-danger-500/10 text-danger-300' : 'bg-warning-500/10 text-warning-300'}`}>
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          {isOverrun ? 'Budget exceeded' : 'Approaching budget limit'}
        </div>
      )}
    </motion.div>
  );
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ categoryId: '', amount: '', period: 'monthly' });
  const [newCat, setNewCat] = useState({ name: '', icon: '💰', color: '#7c3aed' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, c] = await Promise.all([
        api.get<{ data: Budget[] }>('/budgets'),
        api.get<{ data: Category[] }>('/categories'),
      ]);
      setBudgets(b.data.data);
      setCategories(c.data.data);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Delete this budget?')) return;
    await api.delete(`/budgets/${id}`);
    setBudgets((p) => p.filter((b) => b.id !== id));
    toast.success('Budget deleted');
  };

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post<{ data: Budget }>('/budgets', { ...newBudget, amount: parseFloat(newBudget.amount) });
      setBudgets((p) => [data.data, ...p]);
      setShowAddModal(false);
      setNewBudget({ categoryId: '', amount: '', period: 'monthly' });
      toast.success('Budget created');
    } catch { toast.error('Failed to create budget'); }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await api.post<{ data: Category }>('/categories', newCat);
      setCategories((p) => [...p, data.data]);
      setShowCatModal(false);
      setNewCat({ name: '', icon: '💰', color: '#7c3aed' });
      toast.success('Category created');
    } catch { toast.error('Failed to create category'); }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Budgets & Categories</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your spending limits</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCatModal(true)} className="btn-secondary flex items-center gap-2 text-sm" id="add-category-btn">
            <Tag className="w-4 h-4" /> Add Category
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2" id="add-budget-btn">
            <Plus className="w-4 h-4" /> Add Budget
          </button>
        </div>
      </div>

      {/* Summary */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Budget', value: totalBudget, color: 'text-white' },
            { label: 'Total Spent', value: totalSpent, color: 'text-danger-400' },
            { label: 'Remaining', value: totalBudget - totalSpent, color: totalBudget - totalSpent >= 0 ? 'text-success-400' : 'text-danger-400' },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className={`text-xl font-bold tabular-nums ${s.color}`}>₹{s.value.toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}

      {/* Budgets grid */}
      {budgets.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">No budgets yet</p>
          <p className="text-gray-400 text-sm mb-4">Create budgets to track your spending limits</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">Create First Budget</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((b) => <BudgetCard key={b.id} budget={b} onDelete={handleDeleteBudget} onEdit={() => {}} />)}
        </div>
      )}

      {/* Categories */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">My Categories ({categories.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {categories.map((cat) => (
            <div key={cat.id} className="glass-card-hover p-4 text-center cursor-default">
              <div className="text-2xl mb-2">{cat.icon}</div>
              <p className="text-white text-sm font-medium truncate">{cat.name}</p>
              {cat.transactionCount !== undefined && <p className="text-gray-500 text-xs">{cat.transactionCount} tx</p>}
            </div>
          ))}
          <button onClick={() => setShowCatModal(true)} className="glass-card p-4 text-center border-dashed border-surface-500 hover:border-primary-500/50 transition-all cursor-pointer" id="add-category-card-btn">
            <Plus className="w-6 h-6 text-gray-500 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Add</p>
          </button>
        </div>
      </div>

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Create Budget</h3>
            <form onSubmit={handleAddBudget} className="space-y-4" id="add-budget-form">
              <div>
                <label className="input-label">Category</label>
                <select value={newBudget.categoryId} onChange={(e) => setNewBudget((p) => ({ ...p, categoryId: e.target.value }))} className="input-field" required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Budget Amount (₹)</label>
                <input type="number" value={newBudget.amount} onChange={(e) => setNewBudget((p) => ({ ...p, amount: e.target.value }))} className="input-field" placeholder="0.00" min="1" required />
              </div>
              <div>
                <label className="input-label">Period</label>
                <select value={newBudget.period} onChange={(e) => setNewBudget((p) => ({ ...p, period: e.target.value }))} className="input-field">
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Budget</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={() => setShowCatModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">New Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4" id="add-category-form">
              <div>
                <label className="input-label">Category Name</label>
                <input type="text" value={newCat.name} onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))} className="input-field" placeholder="e.g. Skincare" required />
              </div>
              <div>
                <label className="input-label">Icon (Emoji)</label>
                <input type="text" value={newCat.icon} onChange={(e) => setNewCat((p) => ({ ...p, icon: e.target.value }))} className="input-field" maxLength={4} />
              </div>
              <div>
                <label className="input-label">Color</label>
                <input type="color" value={newCat.color} onChange={(e) => setNewCat((p) => ({ ...p, color: e.target.value }))} className="w-full h-10 rounded-xl cursor-pointer border border-surface-500 bg-surface-700" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCatModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Category</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
