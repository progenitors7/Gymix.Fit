import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Calendar, Clock, CheckCircle2, AlertCircle, XCircle,
  Phone, ArrowRight, User, Target, ShieldCheck, X, History, Edit3,
  ChevronRight, TrendingUp, Layers
} from 'lucide-react';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { subscriptionService } from '../../services/subscriptionService';
import StatusBadge from '../UI/StatusBadge';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

const statusConfig = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/20', dot: 'bg-emerald-400' },
  expiring_soon: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', dot: 'bg-amber-400' },
  expired: { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' },
};

function MemberDetailModal({ sub, allSubs, onClose, onEdit }) {
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
  }, [memberId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const joinDate = sub.members?.join_date;
  const name = sub.members?.full_name || 'Unknown';
  const phone = sub.members?.phone_number || '—';
  const initial = name.slice(0, 1).toUpperCase();

  const totalSpent = history.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Modal — sits above bottom nav bar (70px) on mobile */}
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full sm:max-w-lg bg-[#0f1117] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col"
          style={{ maxHeight: 'calc(85vh - 70px)', marginBottom: '70px' }}
        >
          {/* Drag handle for mobile */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-4 pb-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#3390ec]/10 border border-[#3390ec]/20 flex items-center justify-center text-white text-lg font-bold">
                {initial}
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">{name}</h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-[11px] font-bold tracking-wider">{phone}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3390ec]/10 hover:bg-[#3390ec]/20 text-[#3390ec] text-[11px] font-bold transition-all"
              >
                <Edit3 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Unified scrollable body — everything below the header scrolls together */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Joined</p>
                <p className="text-white text-xs font-bold">
                  {joinDate
                    ? new Date(joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                    : '—'}
                </p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Plans</p>
                <p className="text-white text-xs font-bold">{loadingHistory ? '…' : history.length}</p>
              </div>
              <div className="px-4 py-4 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Spent</p>
                <p className="text-emerald-400 text-xs font-bold">{loadingHistory ? '…' : `₹${totalSpent.toLocaleString('en-IN')}`}</p>
              </div>
            </div>

            {/* Current plan highlight */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-3.5 h-3.5 text-[#3390ec]" />
                <p className="text-[10px] text-[#3390ec] font-bold uppercase tracking-wider">Current Plan</p>
              </div>
              <div className="bg-[#3390ec]/5 border border-[#3390ec]/15 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">{sub.plan_name}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5 font-medium capitalize">{sub.duration_type}</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-base">₹{sub.amount}</p>
                  <StatusBadge status={sub.status} />
                </div>
              </div>
              <div className="flex justify-between mt-2.5 px-1">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-500 text-[10px] font-bold">
                    {new Date(sub.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span className={`text-[10px] font-bold ${sub.status === 'expired' ? 'text-rose-400' : 'text-slate-500'}`}>
                    {new Date(sub.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Plan History label */}
            <div className="px-6 pb-2 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Plan History</p>
            </div>

            {/* Plan History list */}
            <div className="px-6 pb-6">
              {loadingHistory ? (
                <div className="space-y-3 pt-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : history.length === 0 ? (
                <p className="text-slate-600 text-xs text-center py-6">No history found.</p>
              ) : (
                <div className="relative pt-2">
                  {/* Timeline line */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-white/5" />
                  <div className="space-y-3">
                    {history.map((h) => {
                      const cfg = statusConfig[h.status] || statusConfig.expired;
                      const isCurrent = h.id === sub.id;
                      return (
                        <div key={h.id} className="flex items-start gap-4">
                          {/* Dot */}
                          <div className="relative z-10 w-[30px] flex-shrink-0 flex items-center justify-center pt-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-[#0f1117] ring-current' : ''}`} />
                          </div>
                          {/* Content */}
                          <div className={`flex-1 rounded-xl p-3.5 border ${isCurrent ? 'bg-[#3390ec]/5 border-[#3390ec]/15' : 'bg-white/[0.02] border-white/5'}`}>
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-white text-xs font-bold">{h.plan_name}</p>
                              <p className="text-emerald-400 text-xs font-bold">₹{h.amount}</p>
                            </div>
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              <p className="text-slate-500 text-[10px] font-medium capitalize">{h.duration_type}</p>
                              <p className="text-slate-600 text-[10px] font-medium">
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
      </motion.div>
    </AnimatePresence>
  );
}

export default function SubscriptionsPage() {
  const navigate = useNavigate();
  const { subscriptions, loading, error, fetchSubscriptions } = useSubscriptions();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSub, setSelectedSub] = useState(null);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const consolidatedSubscriptions = Object.values(
    subscriptions.reduce((acc, sub) => {
      const memberId = sub.member_id || sub.members?.id;
      if (!memberId) return acc;
      if (!acc[memberId]) {
        acc[memberId] = sub;
      } else {
        const currentExpiry = new Date(acc[memberId].expiry_date).getTime();
        const newExpiry = new Date(sub.expiry_date).getTime();
        if (newExpiry > currentExpiry) acc[memberId] = sub;
      }
      return acc;
    }, {})
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const filteredSubscriptions = consolidatedSubscriptions.filter(sub => {
    const matchesSearch =
      sub.members?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-lg bg-[#3390ec]/10 flex items-center justify-center border border-[#3390ec]/10">
                <ShieldCheck className="w-3.5 h-3.5 text-[#3390ec]" />
              </div>
              <p className="text-[#3390ec] font-bold text-[10px] uppercase tracking-wider">Access Control</p>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Active Plans</h1>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
              {loading ? 'Verifying plans…' : `${consolidatedSubscriptions.length} active plans tracking`}
            </p>
          </div>
          <button
            onClick={() => navigate('/subscriptions/new')}
            className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3390ec] hover:bg-[#2b5278] text-white font-bold text-sm transition-all shadow-lg shadow-[#3390ec]/10 active:scale-95 w-full md:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Subscription</span>
          </button>
        </div>

        {/* Filters */}
        <div className="space-y-6">
          <div className="relative group max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3390ec] transition-colors" />
            <input
              type="text"
              placeholder="Search athlete or plan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-[#3390ec]/50 focus:bg-[#3390ec]/[0.02] transition-all"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
            {['all', 'active', 'expiring_soon', 'expired'].map((status) => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? 'bg-[#3390ec] text-white shadow-lg shadow-[#3390ec]/10'
                      : 'bg-white/[0.02] border border-white/5 text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  {status === 'all' ? 'All Plans' : status.replace('_', ' ')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-white/[0.03] border border-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <div className="glass-card border border-rose-500/10 rounded-xl p-10 text-center">
            <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-rose-400 text-sm font-bold mb-4">{error}</p>
            <button
              onClick={fetchSubscriptions}
              className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl text-xs font-bold transition-all border border-white/5"
            >
              Try Again
            </button>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card border border-white/5 rounded-xl p-20 text-center"
          >
            <div className="w-16 h-16 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Target className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">No results found</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6 font-medium leading-relaxed">
              {searchTerm || statusFilter !== 'all'
                ? 'No subscriptions match your current search criteria.'
                : 'There are no active subscriptions in the system yet.'}
            </p>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                className="text-[#3390ec] hover:text-[#2b5278] font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                Reset Filters
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredSubscriptions.map((sub) => (
              <motion.div
                variants={itemVariants}
                key={sub.id}
                onClick={() => setSelectedSub(sub)}
                className="glass-card bg-white/[0.02] border border-white/5 rounded-xl p-5 hover:bg-white/[0.04] hover:border-[#3390ec]/20 transition-all duration-300 group cursor-pointer relative overflow-hidden"
              >
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-br from-[#3390ec]/[0.03] to-transparent rounded-xl" />

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-white text-[14px] font-bold shadow-sm group-hover:border-[#3390ec]/20 transition-colors">
                      {sub.members?.full_name?.slice(0, 1) || '?'}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-[#3390ec] transition-colors line-clamp-1">
                        {sub.members?.full_name || 'Anonymous Athlete'}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-2.5 h-2.5 text-slate-500" />
                        <p className="text-slate-500 text-[10px] font-bold tracking-wider">{sub.members?.phone_number || 'No Phone'}</p>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={sub.status} />
                </div>

                <div className="space-y-3 bg-slate-900/50 rounded-xl p-4 mb-5 border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Plan</span>
                    <span className="text-white text-xs font-bold">{sub.plan_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Duration</span>
                    <span className="text-slate-300 text-xs font-bold capitalize">{sub.duration_type}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Amount</span>
                    <span className="text-[14px] font-bold text-emerald-400">₹{sub.amount}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Calendar className="w-3 h-3 flex-shrink-0" />
                      <p className="uppercase tracking-wider font-bold">Started</p>
                    </div>
                    <p className="text-slate-300 font-bold">
                      {new Date(sub.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex-1 mx-2"><div className="h-[1px] bg-white/5" /></div>
                  <div className="space-y-0.5 text-right">
                    <div className="flex items-center gap-1.5 text-slate-500 justify-end">
                      <Clock className="w-3 h-3 flex-shrink-0" />
                      <p className="uppercase tracking-wider font-bold">Expires</p>
                    </div>
                    <p className={`font-bold ${sub.status === 'expired' ? 'text-rose-400' : 'text-slate-300'}`}>
                      {new Date(sub.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </p>
                  </div>
                </div>

                {/* Tap hint */}
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <History className="w-3 h-3 text-slate-500" />
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Tap to view history</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
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
          />
        )}
      </AnimatePresence>
    </>
  );
}
