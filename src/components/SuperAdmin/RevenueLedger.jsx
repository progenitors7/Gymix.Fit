import React, { useState, useEffect, useMemo } from 'react';
import { 
  IndianRupee, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  CreditCard, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  ArrowUpRight,
  TrendingUp,
  Receipt,
  X,
  FileText,
  Building2,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function RevenueLedger() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedTx, setSelectedTx] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      setLoading(true);
      const data = await superAdminService.getSaaSTransactions();
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load transaction ledger', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Filter Transactions
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const gymName = t.gyms?.gym_name || '';
      const planName = t.saas_plans?.name || '';
      const payId = t.razorpay_payment_id || '';
      const orderId = t.razorpay_order_id || '';
      const matchesSearch = 
        gymName.toLowerCase().includes(search.toLowerCase()) ||
        planName.toLowerCase().includes(search.toLowerCase()) ||
        payId.toLowerCase().includes(search.toLowerCase()) ||
        orderId.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || 
        t.payment_status === statusFilter || 
        t.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, search, statusFilter]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, perPage]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Financial KPI calculations
  const stats = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const completedTx = transactions.filter(t => t.payment_status === 'captured' || t.payment_status === 'completed');
    const completedRevenue = completedTx.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const activeSubs = transactions.filter(t => t.status === 'active').length;
    const aov = completedTx.length > 0 ? Math.round(completedRevenue / completedTx.length) : 0;

    return {
      totalRevenue,
      completedRevenue,
      totalCount: transactions.length,
      activeSubs,
      aov
    };
  }, [transactions]);

  const exportCSV = () => {
    if (!filtered.length) return showToast('No transactions to export', 'error');

    const headers = ['Transaction ID', 'Gym Name', 'Plan', 'Amount (INR)', 'Payment Status', 'Sub Status', 'Razorpay Payment ID', 'Razorpay Order ID', 'Period Start', 'Period End', 'Created At'];
    const rows = filtered.map(t => [
      t.id,
      `"${(t.gyms?.gym_name || '').replace(/"/g, '""')}"`,
      `"${(t.saas_plans?.name || 'Pro Plan').replace(/"/g, '""')}"`,
      t.amount || 0,
      t.payment_status || 'completed',
      t.status || 'active',
      t.razorpay_payment_id || 'MANUAL_ACTIVATION',
      t.razorpay_order_id || 'DIRECT_OVERRIDE',
      t.current_period_start || '',
      t.current_period_end || '',
      t.created_at
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `gymix_saas_financials_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    showToast('Financial ledger CSV exported successfully!');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── Financial KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold">Total Collections</span>
              <IndianRupee className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 font-normal">Completed payment receipts</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold">Active Subscriptions</span>
              <Building2 className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.activeSubs}</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 font-normal">Active gym licenses</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold">Ledger Entries</span>
              <Receipt className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{stats.totalCount}</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 font-normal">Payment events recorded</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
              <span className="text-xs font-semibold">Average Plan Value</span>
              <TrendingUp className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">₹{stats.aov.toLocaleString('en-IN')}</p>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 font-normal">Per payment average</p>
        </div>
      </div>

      {/* ── Filter & Search Toolbar - Floating on Canvas ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Gym, Payment ID, Plan..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Floating Pills & CSV */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-[calc(100%+1.75rem)] sm:w-auto -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {[
            { key: 'all', label: 'All Payments', count: transactions.length },
            { key: 'captured', label: 'Captured', count: transactions.filter(t => t.payment_status === 'captured' || t.payment_status === 'completed').length },
            { key: 'active', label: 'Active', count: transactions.filter(t => t.status === 'active').length },
            { key: 'pending', label: 'Pending', count: transactions.filter(t => t.status === 'pending' || t.payment_status === 'pending').length },
            { key: 'failed', label: 'Failed', count: transactions.filter(t => t.payment_status === 'failed').length },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                    isActive
                      ? 'bg-violet-700/80 text-white'
                      : 'bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}

          <button
            onClick={loadTransactions}
            title="Reload ledger"
            className="p-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-300 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-500' : ''}`} />
          </button>

          <button
            onClick={exportCSV}
            title="Export CSV"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <div className="shrink-0 w-3.5 sm:hidden" aria-hidden="true" />
        </div>
      </div>

      {/* ── Transaction Ledger Table (Desktop) & Cards (Mobile) ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {loading && transactions.length === 0 ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">Loading financial ledger...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Gym Client</th>
                    <th className="px-6 py-4">SaaS Tier</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Payment & Order ID</th>
                    <th className="px-6 py-4">Billing Window</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs font-medium">
                  {paginated.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs shrink-0">
                            {tx.gyms?.gym_name?.charAt(0).toUpperCase() || 'G'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-slate-900 dark:text-white font-bold truncate">{tx.gyms?.gym_name || 'Manual Gym'}</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">Code: {tx.gyms?.unique_code || '—'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-block bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-[11px] font-medium px-2 py-0.5 rounded-md">
                          {tx.saas_plans?.name || 'Pro Tier'}
                        </span>
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-black text-sm">
                          <span>₹</span>
                          <span>{Number(tx.amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold">{tx.currency || 'INR'}</span>
                      </td>

                      <td className="px-6 py-4 font-mono text-[10px] space-y-0.5">
                        <p className="text-slate-700 dark:text-zinc-300 truncate max-w-[160px]" title={tx.razorpay_payment_id || 'DIRECT_OVERRIDE'}>
                          Pay: <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{tx.razorpay_payment_id || 'DIRECT_OVERRIDE'}</span>
                        </p>
                        <p className="text-slate-500 dark:text-zinc-400 truncate max-w-[160px]" title={tx.razorpay_order_id || 'ADMIN_CONSOLE'}>
                          Ord: {tx.razorpay_order_id || 'ADMIN_CONSOLE'}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-[11px] text-slate-700 dark:text-zinc-300">
                        <div className="space-y-0.5">
                          <p className="flex items-center gap-1 text-slate-600 dark:text-zinc-400">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{tx.current_period_start ? new Date(tx.current_period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</span>
                            <span>➔</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{tx.current_period_end ? new Date(tx.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span>
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-500">{tx.duration_months || 1} Month Plan</p>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                          (tx.payment_status === 'captured' || tx.payment_status === 'completed' || tx.status === 'active')
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : tx.status === 'expired'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            (tx.payment_status === 'captured' || tx.payment_status === 'completed' || tx.status === 'active')
                              ? 'bg-emerald-500'
                              : tx.status === 'expired' ? 'bg-rose-500' : 'bg-amber-500'
                          }`} />
                          {tx.payment_status || tx.status || 'active'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => setSelectedTx(tx)}
                          className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-lg transition-all cursor-pointer"
                          title="View Transaction Receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
              {paginated.map((tx) => (
                <div key={tx.id} className="p-4 space-y-3 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">
                        {tx.gyms?.gym_name?.charAt(0).toUpperCase() || 'G'}
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{tx.gyms?.gym_name || 'Manual Gym'}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono mt-0.5">{tx.saas_plans?.name || 'Pro Plan'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                      (tx.payment_status === 'captured' || tx.payment_status === 'completed' || tx.status === 'active')
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                    }`}>
                      {tx.payment_status || tx.status || 'active'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Amount Paid</p>
                      <p className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{Number(tx.amount || 0).toLocaleString('en-IN')}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400">Valid Until</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        {tx.current_period_end ? new Date(tx.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>

                    <button
                      onClick={() => setSelectedTx(tx)}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="py-20 text-center">
                <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-zinc-400 font-bold">No transactions found matching your criteria.</p>
              </div>
            )}

            {/* ── Pagination Controls ── */}
            {filtered.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 px-3.5 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-zinc-800/50 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
                <div className="flex items-center justify-between w-full sm:w-auto gap-2">
                  <span className="text-[11px] sm:text-xs">
                    Showing <strong className="text-slate-900 dark:text-white font-bold">{(page - 1) * perPage + 1}</strong> to <strong className="text-slate-900 dark:text-white font-bold">{Math.min(page * perPage, filtered.length)}</strong> of <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{filtered.length}</strong> transactions
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0 pl-2.5 sm:pl-3 border-l border-slate-200 dark:border-zinc-700">
                    <span className="text-[11px] sm:text-xs">Rows:</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      aria-label="Rows per page"
                      className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2 pt-1 sm:pt-0 border-t border-slate-200/60 dark:border-zinc-800/60 sm:border-0">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all font-bold text-xs shadow-2xs active:scale-95"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </button>

                  <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-lg px-2.5 py-1 text-xs font-semibold shadow-2xs">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px]">Page</span>
                    <select
                      value={page}
                      onChange={(e) => setPage(Number(e.target.value))}
                      aria-label="Select page"
                      className="bg-transparent text-slate-900 dark:text-white font-extrabold focus:outline-none cursor-pointer py-0.5 text-xs text-center"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <option key={p} value={p} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                          {p}
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-400 dark:text-zinc-600">/</span>
                    <span className="text-slate-700 dark:text-zinc-300 font-extrabold text-xs">{totalPages}</span>
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all font-bold text-xs shadow-2xs active:scale-95"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Transaction Receipt Modal ── */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 w-full max-w-lg relative">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <Receipt className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">SaaS Payment Receipt</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">ID: {selectedTx.id}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Gym Organization</span>
                <span className="text-slate-900 dark:text-white font-bold">{selectedTx.gyms?.gym_name || 'Standard Gym'}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Plan Assigned</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedTx.saas_plans?.name || 'Pro Tier'}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Amount Charged</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">₹{Number(selectedTx.amount || 0).toLocaleString('en-IN')}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Payment Status</span>
                <span className="text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-wider text-[10px] bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                  {selectedTx.payment_status || selectedTx.status || 'COMPLETED'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Razorpay Payment ID</span>
                <span className="font-mono text-slate-700 dark:text-zinc-300 truncate max-w-[200px]" title={selectedTx.razorpay_payment_id || 'DIRECT_OVERRIDE'}>
                  {selectedTx.razorpay_payment_id || 'DIRECT_OVERRIDE'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
                <span className="text-slate-500 dark:text-zinc-400">Razorpay Order ID</span>
                <span className="font-mono text-slate-700 dark:text-zinc-300 truncate max-w-[200px]" title={selectedTx.razorpay_order_id || 'DIRECT_ADMIN'}>
                  {selectedTx.razorpay_order_id || 'DIRECT_ADMIN'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-zinc-400">Billing Coverage</span>
                <span className="text-slate-700 dark:text-zinc-300 font-bold">
                  {selectedTx.current_period_start ? new Date(selectedTx.current_period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  {' ➔ '}
                  {selectedTx.current_period_end ? new Date(selectedTx.current_period_end).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setSelectedTx(null)}
                className="flex-1 py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs transition-all cursor-pointer active:scale-95"
              >
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

