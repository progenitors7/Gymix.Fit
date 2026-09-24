import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Calendar, Clock, AlertCircle,
  Phone, ArrowRight, Target, ShieldCheck, X, History, Edit3, Layers, Zap
} from 'lucide-react';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { subscriptionService } from '../../services/subscriptionService';
import StatusBadge from '../UI/StatusBadge';
import { isNativeCapacitorApp } from '../../utils/platform';

const isNativeApp = isNativeCapacitorApp() || window.matchMedia('(display-mode: standalone)').matches;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: isNativeApp ? { duration: 0.1 } : {
      staggerChildren: 0.05
    }
  },
  visible: {
    opacity: 1,
    transition: isNativeApp ? { duration: 0.1 } : {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: isNativeApp ? { opacity: 0 } : { opacity: 0, y: 10 },
  show: isNativeApp 
    ? { opacity: 1, transition: { duration: 0.1 } } 
    : { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
  visible: isNativeApp 
    ? { opacity: 1, transition: { duration: 0.1 } } 
    : { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const statusConfig = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
  expiring_soon: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', dot: 'bg-amber-400' },
  expired: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' },
};

function MemberDetailModal({ sub, onClose, onEdit, onRenew }) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const memberId = sub.member_id || sub.members?.id;

  const fetchHistory = useCallback(async () => {
    if (!memberId) return;
    try {
      setLoadingHistory(true);
      const data = await subscriptionService.getSubscriptionsByMember(memberId, sub.gym_id);
      setHistory(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, [memberId, sub.gym_id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const joinDate = sub.members?.join_date;
  const name = sub.members?.full_name || 'Unknown';
  const phone = sub.members?.phone_number || '—';
  const initial = name.slice(0, 1).toUpperCase();

  const totalSpent = history.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* 1. Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
        onClick={onClose}
      />

      {/* 2. Modal Window */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-zinc-200 text-sm font-bold">
              {initial}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">{name}</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Phone className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium tracking-wider">{phone}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onRenew(memberId)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Renew</span>
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Edit Profile"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unified scrollable body */}
        <div className="overflow-y-auto flex-1 overscroll-contain">
          {/* Stats row */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-zinc-800 border-b border-slate-200 dark:border-zinc-800">
            <div className="px-4 py-4 text-center">
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">Joined</p>
              <p className="text-slate-900 dark:text-white text-xs font-bold">
                {joinDate
                  ? new Date(joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                  : '—'}
              </p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">Plans</p>
              <p className="text-slate-900 dark:text-white text-xs font-bold">{loadingHistory ? '…' : history.length}</p>
            </div>
            <div className="px-4 py-4 text-center">
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider mb-1">Total Spent</p>
              <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">{loadingHistory ? '…' : `₹${totalSpent.toLocaleString('en-IN')}`}</p>
            </div>
          </div>

          {/* Current plan highlight */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">Current Plan</p>
              </div>
              <button
                onClick={() => onRenew(memberId)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Zap className="w-3 h-3" />
                Extend / Renew
              </button>
            </div>
            <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">{sub.plan_name}</p>
                <p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5 font-medium capitalize">{sub.duration_type}</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base">₹{sub.amount}</p>
                <StatusBadge status={sub.status} />
              </div>
            </div>
            <div className="flex justify-between mt-2.5 px-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
                  {new Date(sub.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className={`text-xs font-medium ${sub.status === 'expired' ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-zinc-400'}`}>
                  {new Date(sub.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* Plan History label */}
          <div className="px-6 pb-2 flex items-center gap-2">
            <History className="w-3.5 h-3.5 text-slate-400" />
            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">Plan History</p>
          </div>

          {/* Plan History list */}
          <div className="px-6 pb-6">
            {loadingHistory ? (
              <div className="space-y-3 pt-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-slate-100 dark:bg-zinc-900/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p className="text-slate-400 dark:text-zinc-500 text-xs text-center py-6">No history found.</p>
            ) : (
              <div className="relative pt-2">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                <div className="space-y-3">
                  {history.map((h) => {
                    const cfg = statusConfig[h.status] || statusConfig.expired;
                    const isCurrent = h.id === sub.id;
                    return (
                      <div key={h.id} className="flex items-start gap-4">
                        {/* Dot */}
                        <div className="relative z-10 w-[30px] flex-shrink-0 flex items-center justify-center pt-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900 ring-emerald-500' : ''}`} />
                        </div>
                        {/* Content */}
                        <div className={`flex-1 rounded-2xl p-3.5 border ${isCurrent ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40' : 'bg-slate-50/60 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-slate-900 dark:text-white text-xs font-bold">{h.plan_name}</p>
                            <p className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">₹{h.amount}</p>
                          </div>
                          <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium capitalize">{h.duration_type}</p>
                            <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-medium">
                              {new Date(h.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                              {' → '}
                              {new Date(h.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { subscriptions, loading, error, fetchSubscriptions } = useSubscriptions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState(null);

  // Infinite scroll pagination
  const [visibleCount, setVisibleCount] = useState(30);
  const observerRef = useRef();

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Group subscriptions by member and select the current/most relevant subscription for each
  const todayStr = new Date().toISOString().split('T')[0];
  const subsByMember = subscriptions.reduce((acc, sub) => {
    const memberKey = sub.member_id || sub.members?.id || sub.id;
    if (!memberKey) return acc;
    if (!acc[memberKey]) acc[memberKey] = [];
    acc[memberKey].push(sub);
    return acc;
  }, {});

  const consolidatedSubscriptions = Object.values(subsByMember)
    .map((memberSubs) => {
      // 1. Try to find currently active subscriptions (covering today)
      const activeSubs = memberSubs.filter(
        (sub) => sub.start_date <= todayStr && sub.expiry_date >= todayStr
      );
      if (activeSubs.length > 0) {
        return activeSubs.sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date))[0];
      }

      // 2. If none active, try to find upcoming/future subscriptions
      const futureSubs = memberSubs.filter((sub) => sub.start_date > todayStr);
      if (futureSubs.length > 0) {
        return futureSubs.sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0];
      }

      // 3. Fallback to past/expired subscriptions (most recently expired first)
      const pastSubs = memberSubs.filter((sub) => sub.expiry_date < todayStr);
      if (pastSubs.length > 0) {
        return pastSubs.sort((a, b) => new Date(b.expiry_date) - new Date(a.expiry_date))[0];
      }

      return memberSubs[0];
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredSubscriptions = consolidatedSubscriptions.filter(sub => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch = !term ||
      Boolean(sub.members?.full_name && sub.members.full_name.toLowerCase().includes(term)) ||
      Boolean(sub.members?.phone_number && sub.members.phone_number.includes(term)) ||
      Boolean(sub.plan_name && sub.plan_name.toLowerCase().includes(term));
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const visibleSubscriptions = filteredSubscriptions.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (loading || visibleCount >= filteredSubscriptions.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, filteredSubscriptions.length));
        }
      },
      { threshold: 0.1 }
    );

    const current = observerRef.current;
    if (current) {
      observer.observe(current);
    }

    return () => {
      if (current) {
        observer.unobserve(current);
      }
    };
  }, [filteredSubscriptions.length, visibleCount, loading]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="p-6 sm:p-8 max-w-7xl mx-auto space-y-10"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Active Plans</h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
              {loading ? 'Verifying plans…' : `${consolidatedSubscriptions.length} active plans tracking`}
            </p>
          </div>
          <button
            onClick={() => navigate('/subscriptions/new')}
            className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-xs transition-all w-full sm:w-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription</span>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
            <input
              type="text"
              placeholder="Search athlete by name, phone, or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/20 transition-all"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['all', 'active', 'expiring_soon', 'expired'].map((filterKey) => {
              const active = statusFilter === filterKey;
              return (
                <button
                  key={filterKey}
                  onClick={() => setStatusFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    active
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {filterKey.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content State */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 p-10 text-center">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-500" />
            </div>
            <p className="text-rose-600 dark:text-rose-400 text-sm font-bold mb-4">{error}</p>
            <button
              onClick={fetchSubscriptions}
              className="px-6 py-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-zinc-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Layers className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto stroke-1" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No active plans found</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'all'
                ? 'Try tweaking your filters or search query to find athlete subscriptions.'
                : 'Get started by creating your first subscription for an athlete.'}
            </p>
            {searchTerm || statusFilter !== 'all' ? (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            ) : null}
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
            {visibleSubscriptions.map((sub) => {
              const memberId = sub.member_id || sub.members?.id;
              return (
                <motion.div
                  variants={itemVariants}
                  key={sub.id}
                  onClick={() => setSelectedSub(sub)}
                  className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 rounded-2xl p-5 transition-colors duration-150 group cursor-pointer relative overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-sm font-bold flex-shrink-0">
                          {sub.members?.full_name?.slice(0, 1) || '?'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors truncate">
                            {sub.members?.full_name || 'Anonymous Athlete'}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium truncate">{sub.members?.phone_number || 'No Phone'}</p>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>

                    <div className="space-y-2 bg-slate-50 dark:bg-zinc-950/60 rounded-xl p-3.5 mb-4 border border-slate-200 dark:border-zinc-800">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Plan</span>
                        <span className="text-slate-900 dark:text-white text-xs font-bold truncate max-w-[150px]">{sub.plan_name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Duration</span>
                        <span className="text-slate-700 dark:text-zinc-300 text-xs font-semibold capitalize">{sub.duration_type}</span>
                      </div>
                      <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-zinc-800">
                        <span className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Amount</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">₹{sub.amount}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs mb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <p className="font-semibold text-[10px] uppercase">Started</p>
                        </div>
                        <p className="text-slate-700 dark:text-zinc-300 font-semibold text-xs">
                          {new Date(sub.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex-1 mx-2"><div className="h-[1px] bg-slate-200 dark:border-zinc-800" /></div>
                      <div className="space-y-0.5 text-right">
                        <div className="flex items-center gap-1 text-slate-400 justify-end">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <p className="font-semibold text-[10px] uppercase">Expires</p>
                        </div>
                        <p className={`font-semibold text-xs ${sub.status === 'expired' ? 'text-red-500' : 'text-slate-700 dark:text-zinc-300'}`}>
                          {new Date(sub.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="pt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-xs font-medium">
                      <History className="w-3.5 h-3.5" />
                      <span>History</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/subscriptions/new?memberId=${memberId}`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Renew</span>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          
          {/* Sentinel observer target for infinite scroll */}
          {visibleCount < filteredSubscriptions.length && (
            <div ref={observerRef} className="h-16 flex items-center justify-center mt-4">
              <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
            </div>
          )}
          </>
        )}
      </motion.div>

      {/* Member Detail Modal */}
      <AnimatePresence>
        {selectedSub && (
          <MemberDetailModal
            sub={selectedSub}
            onClose={() => setSelectedSub(null)}
            onEdit={() => {
              navigate(`/members/${selectedSub.member_id || selectedSub.members?.id}/edit`);
              setSelectedSub(null);
            }}
            onRenew={(memberId) => {
              navigate(`/subscriptions/new?memberId=${memberId}`);
              setSelectedSub(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
