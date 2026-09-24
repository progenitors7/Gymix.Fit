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
  TrendingUp,
  Store
} from 'lucide-react';
import { usePayments } from '../../hooks/usePayments';
import StatusBadge from '../UI/StatusBadge';
import { isNativeCapacitorApp } from '../../utils/platform';
import PullToRefresh from '../UI/PullToRefresh';

const isNativeApp = isNativeCapacitorApp() || window.matchMedia('(display-mode: standalone)').matches;

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
  const { payments, storeOrders, loading, error, fetchPayments } = usePayments();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('subscriptions'); // 'subscriptions' or 'store'

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

  const getLocalDateString = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLocalDateFromISO = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const filteredPayments = payments.filter(payment => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = (payment.members?.full_name && payment.members.full_name.toLowerCase().includes(q)) ||
                          (payment.members?.phone_number && payment.members.phone_number.includes(searchTerm)) ||
                          (payment.subscriptions?.plan_name && payment.subscriptions.plan_name.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'all' || payment.payment_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredStoreOrders = storeOrders.filter(order => {
    const buyerName = order.members?.full_name || 'Guest / Walk-in';
    const matchesSearch = buyerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          order.items?.some(item => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || statusFilter === 'paid'; // Store orders are completed (paid)
    return matchesSearch && matchesStatus;
  });

  const visiblePayments = filteredPayments.slice(0, visibleCount);
  const visibleStoreOrders = filteredStoreOrders.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(30);
  }, [searchTerm, statusFilter, activeTab]);

  useEffect(() => {
    const totalLength = activeTab === 'subscriptions' ? filteredPayments.length : filteredStoreOrders.length;
    if (loading || visibleCount >= totalLength) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, totalLength));
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
  }, [filteredPayments.length, filteredStoreOrders.length, visibleCount, loading, activeTab]);

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
    <PullToRefresh onRefresh={fetchPayments} className="min-h-screen">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="p-6 sm:p-8 max-w-7xl mx-auto space-y-10"
      >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Revenue History</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1 font-medium">
            {loading ? 'Updating transactions…' : `${payments.length} Transactions Logged`}
          </p>
        </div>
        <button
          onClick={() => navigate('/payments/new')}
          className="group flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-xs transition-all w-full sm:w-auto cursor-pointer"
        >
          <DollarSign className="w-4 h-4" />
          <span>Manual Entry</span>
        </button>
      </div>

      {/* Analytics Dashboard */}
      {!loading && !error && (payments.length > 0 || storeOrders.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {(() => {
            const today = new Date();
            const todayStr = getLocalDateString(today);
            const thisMonthStr = todayStr.slice(0, 7); // "YYYY-MM"
            
            // Subscriptions paid
            const todaySubRevenue = payments
              .filter(p => p.payment_status === 'paid' && getLocalDateFromISO(p.payment_date || p.created_at) === todayStr)
              .reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);
              
            const monthSubRevenue = payments
              .filter(p => p.payment_status === 'paid' && getLocalDateFromISO(p.payment_date || p.created_at).startsWith(thisMonthStr))
              .reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);

            // FIX: Count BOTH 'pending' AND 'overdue' payment statuses to match Dashboard statistics
            const pendingSubRevenue = payments
              .filter(p => p.payment_status === 'pending' || p.payment_status === 'overdue')
              .reduce((sum, p) => sum + (parseFloat(p.amount_paid) || 0), 0);

            // Store Sales completed
            const todayStoreRevenue = storeOrders
              .filter(o => getLocalDateFromISO(o.created_at) === todayStr)
              .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
              
            const monthStoreRevenue = storeOrders
              .filter(o => getLocalDateFromISO(o.created_at).startsWith(thisMonthStr))
              .reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

            // Combined
            const todayRevenue = todaySubRevenue + todayStoreRevenue;
            const monthRevenue = monthSubRevenue + monthStoreRevenue;
            const pendingRevenue = pendingSubRevenue;

            return (
              <>
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Today's Revenue</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{todayRevenue.toLocaleString()}</p>
                  </div>
                  <DollarSign className="w-5 h-5 text-slate-400 dark:text-zinc-500 stroke-[1.5]" />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">This Month</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{monthRevenue.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="w-5 h-5 text-slate-400 dark:text-zinc-500 stroke-[1.5]" />
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Pending Dues</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">₹{pendingRevenue.toLocaleString()}</p>
                  </div>
                  <Clock className="w-5 h-5 text-slate-400 dark:text-zinc-500 stroke-[1.5]" />
                </div>
              </>
            );
          })()}
        </motion.div>
      )}

      {/* Tabs and Filters Panel */}
      <div className="space-y-4">
        {/* Tab Switcher - Clean Floating Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => { setActiveTab('subscriptions'); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              activeTab === 'subscriptions'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Subscription Collections</span>
          </button>
          <button
            onClick={() => { setActiveTab('store'); setStatusFilter('all'); }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
              activeTab === 'store'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Store Sales</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative group max-w-2xl">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
          <input
            type="text"
            placeholder={activeTab === 'subscriptions' ? "Search by athlete name or plan…" : "Search by buyer name or product…"}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-all"
          />
        </div>

        {/* Status Filters - Clean Floating Pills */}
        {activeTab === 'subscriptions' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['all', 'paid', 'pending', 'overdue'].map((status) => {
              const isActive = statusFilter === status;
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {status === 'all' ? 'All Payments' : status}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white/[0.03] border border-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-50/50 dark:bg-rose-500/5 p-10 text-center relative overflow-hidden">
          <div className="relative w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <p className="text-rose-600 dark:text-rose-400 text-sm font-bold mb-4">{error}</p>
          <button 
            onClick={fetchPayments}
            className="px-6 py-2.5 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-zinc-700 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : (activeTab === 'subscriptions' ? filteredPayments.length : filteredStoreOrders.length) === 0 ? (
        <div className="py-24 text-center space-y-3">
          <Receipt className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto stroke-1" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No transactions found</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mx-auto">
            {searchTerm || statusFilter !== 'all' 
              ? "Try tweaking your filters or search query to find transactions."
              : "No transaction history recorded yet."}
          </p>
          {(searchTerm || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subscription Payments List */}
          {activeTab === 'subscriptions' && (
            <>
              {/* Desktop Table */}
              {!isMobile && (
                <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60">
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Athlete</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Subscription</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Amount</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Date</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Method</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <motion.tbody 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="divide-y divide-slate-100 dark:divide-zinc-800"
                    >
                      {visiblePayments.map((payment) => (
                        <motion.tr 
                          variants={itemVariants}
                          key={payment.id} 
                          className="group hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-xs font-bold uppercase">
                                {payment.members?.full_name?.slice(0, 1) || '?'}
                              </div>
                              <div>
                                <p className="text-slate-900 dark:text-white font-semibold text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{payment.members?.full_name || 'Unknown Member'}</p>
                                <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium tracking-wider mt-0.5">{payment.members?.phone_number || 'No Phone'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-700 dark:text-zinc-300 font-semibold text-xs">{payment.subscriptions?.plan_name || 'One-time Entry'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">₹{payment.amount_paid}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-[10px] font-semibold uppercase tracking-wider">
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
                      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-sm font-bold">
                            {payment.members?.full_name?.slice(0, 1) || '?'}
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">{payment.members?.full_name || 'Unknown'}</p>
                            <p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5">
                              {payment.subscriptions?.plan_name || 'One-time'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={payment.payment_status} />
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-slate-500 dark:text-zinc-400 text-xs">
                            {new Date(payment.payment_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base">₹{payment.amount_paid}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          )}

          {/* Store Sales List */}
          {activeTab === 'store' && (
            <>
              {/* Desktop Table */}
              {!isMobile && (
                <div className="hidden lg:block overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950/60">
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Customer</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Items</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Total Amount</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Date</th>
                        <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Status</th>
                      </tr>
                    </thead>
                    <motion.tbody 
                      variants={containerVariants}
                      initial="hidden"
                      animate="show"
                      className="divide-y divide-slate-100 dark:divide-zinc-800"
                    >
                      {visibleStoreOrders.map((order) => (
                        <motion.tr 
                          variants={itemVariants}
                          key={order.id} 
                          className="group hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors duration-150"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-xs font-bold uppercase">
                                {(order.members?.full_name || 'Guest').slice(0, 1)}
                              </div>
                              <div>
                                <p className="text-slate-900 dark:text-white font-semibold text-xs group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {order.members?.full_name || 'Guest / Walk-in'}
                                </p>
                                <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium tracking-wider mt-0.5">
                                  {order.members?.phone_number || 'Cash Order'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 max-w-xs">
                            <p className="text-slate-600 dark:text-zinc-300 font-medium text-xs truncate" title={order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ')}>
                              {order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'No Items'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">₹{order.total_amount}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400 text-xs font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <StatusBadge status="paid" />
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
                  {visibleStoreOrders.map((order) => (
                    <motion.div 
                      variants={itemVariants}
                      key={order.id} 
                      className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-sm font-bold">
                            {(order.members?.full_name || 'Guest').slice(0, 1)}
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight">{order.members?.full_name || 'Guest / Walk-in'}</p>
                            <p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5 truncate max-w-[180px]">
                              {order.items?.map(i => `${i.name} (x${i.quantity})`).join(', ') || 'Store Order'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status="paid" />
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <p className="text-slate-500 dark:text-zinc-400 text-xs">
                            {new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-emerald-600 dark:text-emerald-400 font-bold text-base">₹{order.total_amount}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </>
          )}

          {/* Sentinel observer target for infinite scroll */}
          {visibleCount < (activeTab === 'subscriptions' ? filteredPayments.length : filteredStoreOrders.length) && (
            <div ref={observerRef} className="h-16 flex items-center justify-center mt-4">
              <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}
      </motion.div>
    </PullToRefresh>
  );
}
