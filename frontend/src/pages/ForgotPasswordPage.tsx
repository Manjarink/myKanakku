import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Wallet, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { resetPassword, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Reset link sent!');
    } catch {
      toast.error('Failed to send reset email');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow-primary">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">MyKanakku</span>
          </Link>
        </div>

        <div className="glass-card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-success-500/20 border border-success-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Email Sent</h2>
              <p className="text-gray-400 text-sm mb-6">Check <span className="text-primary-300">{email}</span> for a password reset link.</p>
              <Link to="/login" className="btn-primary w-full block text-center">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Reset Password</h2>
              <p className="text-gray-400 text-sm mb-6">Enter your email and we'll send a reset link.</p>
              <form onSubmit={handleSubmit} className="space-y-5" id="forgot-password-form">
                <div>
                  <label htmlFor="forgot-email" className="input-label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      id="forgot-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="input-field pl-10"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Send Reset Link</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              <p className="text-center text-gray-400 text-sm mt-6">
                Remembered it? <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
