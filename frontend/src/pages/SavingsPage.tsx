import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Plus, Trash2, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { format, parseISO, differenceInDays, isPast } from 'date-fns';
import api from '../lib/api';
import type { SavingsGoal } from '../types';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/shared/LoadingSpinner';

function GoalCard({ goal, onDelete, onContribute }: { goal: SavingsGoal; onDelete: (id: string) => void; onContribute: (goal: SavingsGoal) => void }) {
  const daysLeft = differenceInDays(parseISO(goal.targetDate), new Date());
  const isCompleted = goal.isCompleted || goal.savedAmount >= goal.targetAmount;
  const isOverdue = isPast(parseISO(goal.targetDate)) && !isCompleted;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass-card p-6 ${isCompleted ? 'border-success-500/30' : isOverdue ? 'border-danger-500/30' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCompleted ? 'bg-success-500/20' : 'bg-primary-500/20'}`}>
            {isCompleted ? <CheckCircle2 className="w-6 h-6 text-success-400" /> : <Target className="w-6 h-6 text-primary-400" />}
          </div>
          <div>
            <h3 className="text-white font-semibold">{goal.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span className={`text-xs ${isOverdue ? 'text-danger-400' : isCompleted ? 'text-success-400' : 'text-gray-400'}`}>
                {isCompleted ? 'Goal reached! 🎉' : isOverdue ? 'Overdue' : `${daysLeft} days left`}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => onDelete(goal.id)} className="btn-ghost p-1.5 hover:text-danger-400 opacity-60 hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
      </div>

      {/* Progress */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-2xl font-bold text-white tabular-nums">₹{goal.savedAmount.toLocaleString('en-IN')}</span>
          <span className="text-gray-400 text-sm">of ₹{goal.targetAmount.toLocaleString('en-IN')}</span>
        </div>
        <div className="progress-bar h-3 rounded-full">
          <motion.div
            className="progress-fill h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${goal.progressPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            style={{ background: isCompleted ? '#10b981' : 'linear-gradient(90deg, #7c3aed, #06b6d4)' }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">{goal.progressPercent.toFixed(1)}% saved</span>
          <span className={`font-medium ${isCompleted ? 'text-success-400' : 'text-primary-300'}`}>
            ₹{goal.remainingAmount.toLocaleString('en-IN')} remaining
          </span>
        </div>
      </div>

      {/* Deadline & contribution */}
      <div className="mt-4 p-3 bg-surface-700/50 rounded-xl">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">Target date: {format(parseISO(goal.targetDate), 'MMM d, yyyy')}</span>
          {goal.suggestedMonthlyContribution && !isCompleted && (
            <span className="text-accent-300">~₹{goal.suggestedMonthlyContribution.toLocaleString('en-IN')}/month needed</span>
          )}
        </div>
      </div>

      {!isCompleted && (
        <button onClick={() => onContribute(goal)} className="w-full mt-3 btn-secondary text-sm flex items-center justify-center gap-2" id={`contribute-${goal.id}-btn`}>
          <TrendingUp className="w-4 h-4" /> Add Savings
        </button>
      )}
    </motion.div>
  );
}

export default function SavingsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState<SavingsGoal | null>(null);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', targetDate: '', notes: '' });
  const [contribution, setContribution] = useState('');

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ data: SavingsGoal[] }>('/savings-goals');
      setGoals(data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchGoals(); }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/savings-goals', { ...newGoal, targetAmount: parseFloat(newGoal.targetAmount) });
      setShowAddModal(false);
      setNewGoal({ name: '', targetAmount: '', targetDate: '', notes: '' });
      fetchGoals();
      toast.success('Savings goal created!');
    } catch { toast.error('Failed to create goal'); }
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showContributeModal) return;
    try {
      await api.post(`/savings-goals/${showContributeModal.id}/contribute`, { amount: parseFloat(contribution) });
      setShowContributeModal(null);
      setContribution('');
      fetchGoals();
      toast.success('Savings updated!');
    } catch { toast.error('Failed to update savings'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this savings goal?')) return;
    await api.delete(`/savings-goals/${id}`);
    setGoals((p) => p.filter((g) => g.id !== id));
    toast.success('Goal deleted');
  };

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const completedGoals = goals.filter((g) => g.isCompleted || g.savedAmount >= g.targetAmount).length;

  if (loading) return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
          <p className="text-gray-400 text-sm mt-0.5">{completedGoals}/{goals.length} goals completed</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2" id="add-goal-btn">
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* Overview */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Saved', value: totalSaved, className: 'text-success-400' },
            { label: 'Total Target', value: totalTarget, className: 'text-primary-300' },
            { label: 'Overall Progress', value: totalTarget ? `${((totalSaved / totalTarget) * 100).toFixed(0)}%` : '0%', className: 'text-accent-300', isPercent: true },
          ].map((s) => (
            <div key={s.label} className="glass-card p-4 text-center">
              <p className="text-gray-400 text-xs mb-1">{s.label}</p>
              <p className={`text-xl font-bold tabular-nums ${s.className}`}>
                {typeof s.value === 'string' ? s.value : `₹${s.value.toLocaleString('en-IN')}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-white font-medium mb-2">No savings goals yet</p>
          <p className="text-gray-400 text-sm mb-4">Set goals to track your progress toward big purchases or savings targets</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary">Create First Goal</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {goals.map((g) => <GoalCard key={g.id} goal={g} onDelete={handleDelete} onContribute={setShowContributeModal} />)}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">New Savings Goal</h3>
            <form onSubmit={handleAddGoal} className="space-y-4" id="add-goal-form">
              <div><label className="input-label">Goal Name</label>
                <input type="text" value={newGoal.name} onChange={(e) => setNewGoal((p) => ({ ...p, name: e.target.value }))} className="input-field" placeholder="e.g. New Laptop, Trip to Goa" required /></div>
              <div><label className="input-label">Target Amount (₹)</label>
                <input type="number" value={newGoal.targetAmount} onChange={(e) => setNewGoal((p) => ({ ...p, targetAmount: e.target.value }))} className="input-field" placeholder="0.00" min="1" required /></div>
              <div><label className="input-label">Target Date</label>
                <input type="date" value={newGoal.targetDate} onChange={(e) => setNewGoal((p) => ({ ...p, targetDate: e.target.value }))} className="input-field" required min={format(new Date(), 'yyyy-MM-dd')} /></div>
              <div><label className="input-label">Notes (optional)</label>
                <textarea value={newGoal.notes} onChange={(e) => setNewGoal((p) => ({ ...p, notes: e.target.value }))} className="input-field resize-none" rows={2} placeholder="Why is this goal important?" /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Create Goal</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Contribute Modal */}
      {showContributeModal && (
        <div className="modal-overlay" onClick={() => setShowContributeModal(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-1">Add to Savings</h3>
            <p className="text-gray-400 text-sm mb-4">Goal: {showContributeModal.name}</p>
            <form onSubmit={handleContribute} className="space-y-4" id="contribute-form">
              <div><label className="input-label">Amount to Save (₹)</label>
                <input type="number" value={contribution} onChange={(e) => setContribution(e.target.value)} className="input-field" placeholder="0.00" min="1" max={showContributeModal.remainingAmount} required /></div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowContributeModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1">Add Savings</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
