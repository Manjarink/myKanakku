import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MessageCircle, BarChart3, Shield, Target, Zap, Globe,
  ArrowRight, Star, TrendingUp, Wallet, CheckCircle2
} from 'lucide-react';

const features = [
  {
    icon: MessageCircle,
    title: 'Natural Language Tracking',
    desc: 'Just type "spent ₹150 on lunch" and we handle the rest. No forms needed.',
    color: 'text-primary-400',
    bg: 'bg-primary-500/10 border-primary-500/20',
  },
  {
    icon: BarChart3,
    title: 'Smart Dashboard',
    desc: 'Visual charts and real-time insights into your spending patterns.',
    color: 'text-accent-400',
    bg: 'bg-accent-500/10 border-accent-500/20',
  },
  {
    icon: Target,
    title: 'Savings Goals',
    desc: 'Set goals, track progress, and get personalized contribution plans.',
    color: 'text-success-400',
    bg: 'bg-success-500/10 border-success-500/20',
  },
  {
    icon: Shield,
    title: 'Bank-Grade Security',
    desc: 'Row Level Security ensures your data is completely private.',
    color: 'text-warning-400',
    bg: 'bg-warning-500/10 border-warning-500/20',
  },
  {
    icon: Globe,
    title: 'Multilingual Support',
    desc: 'Chat in Malayalam, Hindi, Tamil, Manglish, Hinglish and more.',
    color: 'text-danger-400',
    bg: 'bg-danger-500/10 border-danger-500/20',
  },
  {
    icon: Zap,
    title: 'Instant Allocation',
    desc: 'Receive money? AI suggests smart budget allocations instantly.',
    color: 'text-primary-300',
    bg: 'bg-primary-500/10 border-primary-500/20',
  },
];

const testimonials = [
  { name: 'Arjun M.', college: 'NIT Calicut', text: 'MyKanakku made budgeting effortless! I just chat and it tracks everything.', rating: 5 },
  { name: 'Priya K.', college: 'Christ University', text: 'The Malayalam support is amazing. "Innu lunch ku 150 roopa" — it just works!', rating: 5 },
  { name: 'Rahul S.', college: 'IIT Bombay', text: 'Finally a finance app that actually helps me save money each month.', rating: 5 },
];

const stats = [
  { value: '₹2.4L+', label: 'Tracked Monthly' },
  { value: '7+', label: 'Languages Supported' },
  { value: '99.9%', label: 'Uptime' },
  { value: '0', label: 'Data Sold' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-900 overflow-x-hidden">
      {/* Hero Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-surface-900/80 backdrop-blur-xl border-b border-surface-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-xl">MyKanakku</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-ghost text-sm px-4 py-2" id="nav-login-btn">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm px-4 py-2" id="nav-register-btn">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-accent-500/8 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/30 text-primary-300 text-sm font-medium mb-8">
              <Zap className="w-4 h-4" />
              AI-Powered • Multilingual • Secure
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Your Money,{' '}
              <span className="gradient-text">Smartly</span>
              <br />Managed
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              The AI expense tracker that understands you. Just chat naturally —
              in English, Malayalam, Hindi, Tamil or Manglish — and MyKanakku
              handles your finances intelligently.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/register"
                className="btn-primary text-base px-8 py-4 flex items-center gap-2 w-full sm:w-auto justify-center"
                id="hero-cta-btn"
              >
                Start Tracking Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                to="/login"
                className="btn-secondary text-base px-8 py-4 w-full sm:w-auto justify-center"
                id="hero-login-btn"
              >
                Sign In
              </Link>
            </div>

            {/* Chat Preview */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="max-w-2xl mx-auto glass-card p-6 rounded-3xl border border-primary-500/20"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-danger-500" />
                <div className="w-3 h-3 rounded-full bg-warning-500" />
                <div className="w-3 h-3 rounded-full bg-success-500" />
                <span className="ml-2 text-xs text-gray-500">MyKanakku Chat</span>
              </div>
              <div className="space-y-3 text-left">
                <div className="chat-bubble-user text-sm">
                  Innu lunch ku 150 roopa spend cheythu, auto ku 40 um
                </div>
                <div className="chat-bubble-ai text-sm">
                  <p className="font-medium text-primary-300 mb-2">Found 2 expenses totaling ₹190:</p>
                  <div className="space-y-1 ml-2">
                    <p>🍽️ Lunch: <span className="font-semibold">₹150</span> · <span className="text-gray-400">Food</span></p>
                    <p>🚗 Auto: <span className="font-semibold">₹40</span> · <span className="text-gray-400">Travel</span></p>
                  </div>
                  <p className="mt-3 text-gray-300">Save these expenses?</p>
                  <div className="flex gap-2 mt-2">
                    <button className="px-3 py-1 bg-success-500/20 border border-success-500/40 text-success-300 rounded-lg text-xs">
                      ✓ Confirm
                    </button>
                    <button className="px-3 py-1 bg-surface-600 border border-surface-500 text-gray-300 rounded-lg text-xs">
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y border-surface-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-gray-400 text-sm mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything a Student Needs
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Built for students by people who understand the struggle of managing money on a budget.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`glass-card-hover p-6 border ${feature.bg}`}
              >
                <div className={`w-12 h-12 rounded-2xl ${feature.bg} border flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 bg-surface-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-gray-400 text-lg">Three simple steps to financial clarity</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up with email. Your data is secured with bank-grade encryption.' },
              { step: '02', title: 'Chat Naturally', desc: 'Just type your expenses, income or questions in any language.' },
              { step: '03', title: 'Get Insights', desc: 'Track spending, hit savings goals, and make smarter decisions.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-6xl font-black gradient-text mb-4">{item.step}</div>
                <h3 className="text-white font-semibold text-xl mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Students Love It</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="glass-card p-6"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-warning-400 fill-warning-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <p className="text-white font-medium">{t.name}</p>
                  <p className="text-gray-500 text-xs">{t.college}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-900/40 to-accent-900/40" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <TrendingUp className="w-16 h-16 text-primary-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold text-white mb-4">
              Start Managing Your Money Smartly
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              Free to start. No credit card required. Just you and your goals.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="btn-primary text-base px-10 py-4 flex items-center gap-2"
                id="cta-register-btn"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-gray-500">
              {['Free to use', 'Privacy first', 'No ads'].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success-400" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-700/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white">MyKanakku</span>
            </div>
            <p className="text-gray-500 text-sm">
              © 2024 MyKanakku. Built for students, by students.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="#privacy" className="hover:text-white transition-colors">Privacy</a>
              <a href="#terms" className="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
