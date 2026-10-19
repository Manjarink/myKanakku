import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Send, Bot, Plus, Trash2, MessageCircle, Sparkles,
  CheckCircle, XCircle, Edit3, ChevronDown, Mic, LayoutDashboard
} from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useDashboardStore } from '../store/dashboardStore';
import type { ParsedTransaction, ChatMessage } from '../types';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const QUICK_PROMPTS = [
  'How much did I spend this week?',
  'What\'s my remaining budget?',
  'Show my top spending categories',
  'Help me save ₹2000 this month',
  'I received ₹5000 today',
];

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-primary-400 rounded-full"
            animate={{ y: [0, -6, 0] }}
            transition={{ delay: i * 0.15, repeat: Infinity, duration: 0.8 }}
          />
        ))}
      </div>
      <span className="text-gray-500 text-xs">AI is thinking...</span>
    </div>
  );
}

function TransactionConfirmCard({
  transactions,
  onConfirm,
  onCancel,
  onEdit,
}: {
  transactions: ParsedTransaction[];
  onConfirm: (txs: ParsedTransaction[]) => void;
  onCancel: () => void;
  onEdit: (idx: number, field: keyof ParsedTransaction, value: string | number) => void;
}) {
  const total = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="transaction-preview-card space-y-3"
    >
      <div className="flex items-center gap-2 text-primary-300 text-sm font-semibold">
        <Sparkles className="w-4 h-4" />
        Found {transactions.length} transaction{transactions.length > 1 ? 's' : ''} · Total: ₹{total.toLocaleString('en-IN')}
      </div>

      <div className="space-y-2">
        {transactions.map((tx, idx) => (
          <div key={tx.tempId} className="flex items-center gap-3 p-3 bg-surface-700/50 rounded-xl">
            <span className="text-lg">{tx.type === 'income' ? '💰' : '💸'}</span>
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={tx.description}
                onChange={(e) => onEdit(idx, 'description', e.target.value)}
                className="bg-transparent text-white text-sm font-medium w-full focus:outline-none focus:ring-1 focus:ring-primary-500/50 rounded px-1"
                aria-label="Transaction description"
              />
              <p className="text-gray-500 text-xs mt-0.5">{tx.suggestedCategory || 'Uncategorized'} · {format(parseISO(tx.date), 'MMM d, yyyy')}</p>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-gray-400 text-sm">₹</span>
              <input
                type="number"
                value={tx.amount}
                onChange={(e) => onEdit(idx, 'amount', parseFloat(e.target.value) || 0)}
                className="bg-transparent text-white text-sm font-bold w-20 text-right focus:outline-none focus:ring-1 focus:ring-primary-500/50 rounded px-1"
                aria-label="Transaction amount"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => onConfirm(transactions)}
          className="flex items-center gap-2 px-4 py-2 bg-success-500/20 border border-success-500/40 text-success-300 rounded-xl text-sm font-medium hover:bg-success-500/30 transition-colors"
          id="confirm-transactions-btn"
        >
          <CheckCircle className="w-4 h-4" />
          Save {transactions.length > 1 ? 'All' : ''}
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2 bg-surface-600 border border-surface-500 text-gray-300 rounded-xl text-sm font-medium hover:bg-surface-500 transition-colors"
          id="cancel-transactions-btn"
        >
          <XCircle className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function MessageBubble({ message, onConfirm, onCancel }: {
  message: ChatMessage;
  onConfirm?: (txs: ParsedTransaction[]) => void;
  onCancel?: () => void;
}) {
  const [editableTransactions, setEditableTransactions] = useState<ParsedTransaction[]>(
    message.parsedTransactions || []
  );
  const isUser = message.role === 'user';

  const handleEdit = (idx: number, field: keyof ParsedTransaction, value: string | number) => {
    setEditableTransactions((prev) => {
      const next = [...prev];
      (next[idx] as unknown as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 mt-1 shadow-glow-primary">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {isUser ? (
          <div className="chat-bubble-user">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div className="chat-bubble-ai">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          </div>
        )}

        {/* Transaction confirmation card */}
        {!isUser && editableTransactions.length > 0 && onConfirm && onCancel && (
          <TransactionConfirmCard
            transactions={editableTransactions}
            onConfirm={onConfirm}
            onCancel={onCancel}
            onEdit={handleEdit}
          />
        )}

        <span className="text-gray-600 text-xs px-1">
          {format(parseISO(message.createdAt), 'HH:mm')}
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    conversations, messages, isSending, activeConversationId,
    sendMessage, confirmTransactions, cancelPendingAction,
    fetchConversations, createConversation, setActiveConversation,
    deleteConversation, pendingTransactions,
  } = useChatStore();

  const { refreshDashboard } = useDashboardStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    await sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleConfirmTransactions = async (txs: ParsedTransaction[]) => {
    try {
      await confirmTransactions(txs);
      await refreshDashboard();
      toast.success('Saved to Transactions & Dashboard!');
    } catch {
      toast.error('Failed to save transactions. Please try again.');
    }
  };

  const handleNewConversation = async () => {
    await createConversation();
    inputRef.current?.focus();
  };

  const handleDeleteConversation = async (id: string) => {
    if (confirm('Delete this conversation? Your saved transactions will not be affected.')) {
      await deleteConversation(id);
      toast.success('Conversation deleted');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversation Sidebar */}
      <div className={`${showHistory ? 'w-72' : 'w-0'} lg:w-72 transition-all duration-300 overflow-hidden flex-shrink-0`}>
        <div className="glass-card h-full flex flex-col p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold text-sm">Conversations</h3>
            <button
              onClick={handleNewConversation}
              className="btn-ghost p-1.5"
              title="New conversation"
              id="new-conversation-btn"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {conversations.length === 0 ? (
              <p className="text-gray-500 text-xs text-center py-8">No conversations yet</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`group flex items-center gap-2 p-3 rounded-xl cursor-pointer transition-all ${
                    activeConversationId === conv.id
                      ? 'bg-primary-600/20 border border-primary-500/30'
                      : 'hover:bg-surface-700'
                  }`}
                  onClick={() => setActiveConversation(conv.id)}
                >
                  <MessageCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs font-medium truncate">{conv.title || 'New Chat'}</p>
                    <p className="text-gray-500 text-xs truncate">{conv.lastMessage || ''}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-danger-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 glass-card flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-600/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="btn-ghost p-1.5 lg:hidden"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
            </button>
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Kanakku AI</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-success-400 animate-pulse" />
                <span className="text-gray-400 text-xs">Personal Finance Assistant</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 hidden sm:block">
              {messages.length} message{messages.length !== 1 ? 's' : ''}
            </span>
            <Link
              to="/dashboard"
              className="btn-secondary text-xs px-2.5 py-1.5 flex items-center gap-1.5 text-gray-300 hover:text-white"
              id="chat-header-dashboard-btn"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-primary-400" />
              <span>Dashboard</span>
            </Link>
            <button onClick={handleNewConversation} className="btn-ghost text-xs px-3 py-1.5 flex items-center gap-1.5" id="new-chat-btn">
              <Plus className="w-3.5 h-3.5" />
              New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center shadow-glow-primary animate-bounce-subtle">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl mb-2">Hi! I'm Kanakku AI</h3>
                <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                  Your personal finance assistant. Tell me about your expenses, income, or ask anything about your finances.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                    className="text-left text-xs text-gray-300 px-3 py-2.5 bg-surface-700/50 border border-surface-500/50 rounded-xl hover:border-primary-500/50 hover:text-white transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <>
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <MessageBubble
                      message={msg}
                      onConfirm={msg.parsedTransactions?.length ? handleConfirmTransactions : undefined}
                      onCancel={msg.parsedTransactions?.length ? cancelPendingAction : undefined}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
              {isSending && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chat-bubble-ai inline-flex">
                  <TypingIndicator />
                </motion.div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-surface-600/50">
          {/* Pending transactions notice */}
          {pendingTransactions && (
            <div className="mb-3 flex items-center gap-2 text-xs text-warning-300 bg-warning-500/10 border border-warning-500/30 rounded-xl px-3 py-2">
              <Edit3 className="w-3.5 h-3.5" />
              Please confirm or cancel the pending transactions above before continuing.
            </div>
          )}
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your expense, ask a question, or request a report..."
                className="input-field resize-none min-h-[48px] max-h-32 py-3 pr-10 leading-relaxed"
                rows={1}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
                }}
                id="chat-input"
                disabled={isSending}
              />
              <button className="absolute right-3 bottom-3 text-gray-500 hover:text-gray-300">
                <Mic className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="btn-primary p-3 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              id="send-message-btn"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-600 text-xs mt-2 text-center">
            Kanakku AI handles finances only · Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
