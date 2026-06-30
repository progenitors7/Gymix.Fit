import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Search, 
  Receipt, 
  DollarSign, 
  Calendar, 
  Wallet, 
  CreditCard, 
  Smartphone, 
  Building2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  User,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import StatusBadge from '../UI/StatusBadge';

const isNativeApp = window.Capacitor !== undefined || window.matchMedia('(display-mode: standalone)').matches;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
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
    : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function PaymentsPage() {
  const navigate = useNavigate();
  const { payments, loading, error, fetchPayments } = usePayments();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Responsive state & infinite scroll pagination
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [visibleCount, setVisibleCount] = useState(30);
  const observerRef = useRef();

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.members?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          payment.subscriptions?.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const visiblePayments = filteredPayments.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (loading || visibleCount >= filteredPayments.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, filteredPayments.length));
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
  }, [filteredPayments.length, visibleCount, loading]);

  const getMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <Wallet className="w-3 h-3" />;
      case 'upi': return <Smartphone className="w-3 h-3" />;
      case 'card': return <CreditCard className="w-3 h-3" />;
      case 'bank_transfer': return <Building2 className="w-3 h-3" />;
      default: return <DollarSign className="w-3 h-3" />;
    }
  };

  const getMethodText = (method) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'bank_transfer': return 'Bank';
      default: return method;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 sm:p-8 max-w-7xl mx-auto space-y-10"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-[#3390ec]/10 flex items-center justify-center border border-[#3390ec]/10">
              <TrendingUp className="w-3.5 h-3.5 text-[#3390ec]" />
            </div>
            <p className="text-[#3390ec] font-bold text-[10px] uppercase tracking-wider">Finance</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Revenue History</h1>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">
            {loading ? 'Updating transactions…' : `${payments.length} Transactions Logged`}
          </p>
        </div>
        <button
          onClick={() => navigate('/payments/new')}
          className="group flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#3390ec] hover:bg-[#2b5278] text-white font-bold text-sm transition-all shadow-lg shadow-[#3390ec]/10 active:scale-95 w-full md:w-auto"
        >
          <DollarSign className="w-4 h-4" />
          <span>Manual Entry</span>
        </button>
      </div>

      {/* Analytics Dashboard */}
      {!loading && !error && payments.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const thisMonth = new Date().toISOString().slice(0, 7);
            
            const todayRevenue = payments
              .filter(p => p.payment_status === 'paid' && p.payment_date.startsWith(today))
              .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);
              
            const monthRevenue = payments
              .filter(p => p.payment_status === 'paid' && p.payment_date.startsWith(thisMonth))
              .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

            const pendingRevenue = payments
              .filter(p => p.payment_status === 'pending')
              .reduce((sum, p) => sum + parseFloat(p.amount_paid), 0);

            return (
              <>
                <div className="glass-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Today's Revenue</p>
                    <p className="text-2xl font-black text-white">₹{todayRevenue}</p>
                  </div>
                </div>
                <div className="glass-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#3390ec]/10 flex items-center justify-center border border-[#3390ec]/20">
                    <TrendingUp className="w-6 h-6 text-[#3390ec]" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">This Month</p>
                    <p className="text-2xl font-black text-white">₹{monthRevenue}</p>
                  </div>
                </div>
                <div className="glass-card border border-white/5 rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Pending Dues</p>
                    <p className="text-2xl font-black text-white">₹{pendingRevenue}</p>
                  </div>
                </div>
              </>
            );
          })()}
        </motion.div>
      )}

      {/* Filters and Search */}
      <div className="space-y-6">
        <div className="relative group max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3390ec] transition-colors" />
          <input
            type="text"
            placeholder="Search by name or plan…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:border-[#3390ec]/50 focus:bg-[#3390ec]/[0.02] transition-all"
          />
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
          {['all', 'paid', 'pending', 'overdue'].map((status) => {
            const isActive = statusFilter === status
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
                {status === 'all' ? 'All Payments' : status}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.03] border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card border border-rose-500/10 rounded-xl p-10 text-center relative overflow-hidden">
          <div className="relative w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-rose-400" />
          </div>
          <p className="text-rose-400 text-sm font-bold mb-4">{error}</p>
          <button 
            onClick={fetchPayments}
            className="px-6 py-2.5 bg-white/[0.05] hover:bg-white/[0.1] text-white rounded-xl text-xs font-bold transition-all border border-white/5"
          >
            Try Again
          </button>
        </div>
      ) : filteredPayments.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card border border-white/5 rounded-xl p-20 text-center relative overflow-hidden"
        >
          <div className="relative w-16 h-16 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1 tracking-tight">No match found</h3>
          <p className="text-slate-500 text-xs max-w-sm mx-auto mb-6 font-medium leading-relaxed">
            {searchTerm || statusFilter !== 'all' 
              ? "We couldn't find any transactions matching your filters."
              : "No transaction history found. Start by recording a payment."}
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
        <div className="space-y-6">
          {/* Desktop Table */}
          {!isMobile && (
            <div className="hidden lg:block overflow-hidden rounded-xl border border-white/5 glass-card">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Athlete</th>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Subscription</th>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Amount</th>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Date</th>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Method</th>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-wider text-[10px]">Status</th>
                  </tr>
                </thead>
                <motion.tbody 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-white/[0.02]"
                >
                  {visiblePayments.map((payment) => (
                    <motion.tr 
                      variants={itemVariants}
                      key={payment.id} 
                      className="group hover:bg-white/[0.03] transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-white text-[13px] font-bold uppercase shadow-sm">
                            {payment.members?.full_name?.slice(0, 1) || '?'}
                          </div>
                          <div>
                            <p className="text-white font-bold text-[14px] group-hover:text-[#3390ec] transition-colors">{payment.members?.full_name || 'Unknown Member'}</p>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">{payment.members?.phone_number || 'No Phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-300 font-bold text-[12px]">{payment.subscriptions?.plan_name || 'One-time Entry'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-emerald-400 font-bold text-[13px]">₹{payment.amount_paid}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-400 text-[12px] font-bold">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {getMethodIcon(payment.payment_method)}
                          {getMethodText(payment.payment_method)}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={payment.payment_status} />
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}

          {/* Mobile Cards */}
          {isMobile && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="lg:hidden space-y-3"
            >
              {visiblePayments.map((payment) => (
                <motion.div 
                  variants={itemVariants}
                  key={payment.id} 
                  className="bg-white/[0.03] border border-white/5 rounded-xl p-5 active:scale-[0.98] transition-all relative overflow-hidden glass-card"
                >
                  <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-white text-[14px] font-bold shadow-sm">
                        {payment.members?.full_name?.slice(0, 1) || '?'}
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm tracking-tight">{payment.members?.full_name || 'Unknown'}</p>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                          {payment.subscriptions?.plan_name || 'One-time'}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={payment.payment_status} />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/5 relative z-10">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <p className="text-slate-400 text-[11px] font-bold">
                          {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500">{getMethodIcon(payment.payment_method)}</span>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          {getMethodText(payment.payment_method)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-0.5">Paid</p>
                      <p className="text-lg font-bold text-emerald-400 tracking-tight">₹{payment.amount_paid}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Sentinel observer target for infinite scroll */}
          {visibleCount < filteredPayments.length && (
            <div ref={observerRef} className="h-16 flex items-center justify-center mt-4">
              <div className="w-6 h-6 border-2 border-[#3390ec]/20 border-t-[#3390ec] rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

