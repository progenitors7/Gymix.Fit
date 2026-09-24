import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Truck, 
  Search, 
  Filter, 
  Eye, 
  Phone, 
  Mail, 
  ExternalLink, 
  Building2, 
  AlertCircle, 
  IndianRupee, 
  RefreshCw,
  X,
  Send,
  MessageCircle,
  FileText
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function StoreOrdersManager() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [trackingNote, setTrackingNote] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const data = await superAdminService.getStoreOrders();
      setOrders(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load store orders', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(orderId, newStatus, note = null) {
    try {
      setStatusUpdatingId(orderId);
      await superAdminService.updateStoreOrderStatus(orderId, newStatus, note);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, notes: note || o.notes } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus, notes: note || prev.notes }));
      }
      showToast(`Order #${orderId.slice(0, 6)} updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      showToast('Failed to update order status', 'error');
    } finally {
      setStatusUpdatingId(null);
    }
  }

  // Filter Orders
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const customer = o.members?.full_name || '';
      const phone = o.members?.phone_number || '';
      const gymName = o.gyms?.gym_name || '';
      const id = o.id || '';

      const matchesSearch = 
        customer.toLowerCase().includes(search.toLowerCase()) ||
        phone.toLowerCase().includes(search.toLowerCase()) ||
        gymName.toLowerCase().includes(search.toLowerCase()) ||
        id.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, search, statusFilter]);

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, perPage]);

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const paginated = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page, perPage]);

  // Metrics
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const totalGMV = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);

    return { totalCount, pendingCount, completedCount, totalGMV };
  }, [orders]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25';
      case 'pending':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25';
      case 'shipped':
        return 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/25';
      case 'cancelled':
        return 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/25';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── Order Metrics Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              Store Velocity
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Total Orders Placed</p>
          <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.totalCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">Store & hardware checkout requests</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              Action Required
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Pending Orders</p>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.pendingCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">Awaiting packaging or dispatch</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Fulfillment
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Completed Orders</p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.completedCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">Delivered & verified purchases</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <IndianRupee className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Store GMV
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Gross Merchandise Value</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">₹{stats.totalGMV.toLocaleString('en-IN')}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 font-medium">Aggregate value of all orders</p>
        </div>
      </div>

      {/* ── Search & Filter Controls - Direct Floating on Canvas ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer, phone, gym..."
            className="w-full pl-10 pr-9 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar w-full sm:w-auto">
          {[
            { key: 'all', label: 'All Orders', count: orders.length },
            { key: 'pending', label: 'Pending', count: orders.filter(o => o.status === 'pending').length },
            { key: 'processing', label: 'Processing', count: orders.filter(o => o.status === 'processing').length },
            { key: 'shipped', label: 'Shipped', count: orders.filter(o => o.status === 'shipped').length },
            { key: 'completed', label: 'Completed', count: orders.filter(o => o.status === 'completed').length },
            { key: 'cancelled', label: 'Cancelled', count: orders.filter(o => o.status === 'cancelled').length },
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
            onClick={fetchOrders}
            title="Reload orders"
            className="p-2.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-600 dark:text-zinc-300 transition-all cursor-pointer shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Order List: Responsive Desktop Table & Mobile Cards ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-bold uppercase tracking-widest">Loading store orders...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                    <th className="px-5 py-3.5">Customer Details</th>
                    <th className="px-5 py-3.5">Gym Client</th>
                    <th className="px-5 py-3.5">Items Ordered</th>
                    <th className="px-5 py-3.5">Total Amount</th>
                    <th className="px-5 py-3.5">Order Status</th>
                    <th className="px-5 py-3.5">Date Placed</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs font-medium">
                  {paginated.map((order) => {
                    const items = Array.isArray(order.items) ? order.items : [];
                    const firstItem = items[0]?.name || 'Custom Product';
                    const moreItemsCount = items.length > 1 ? `+${items.length - 1} more` : '';

                    return (
                      <tr key={order.id} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors group">
                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-slate-900 dark:text-white font-bold">{order.members?.full_name || 'Walk-in Customer'}</p>
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 text-[11px]">
                              <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              <span>{order.members?.phone_number || 'No phone'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="space-y-0.5">
                            <p className="text-slate-900 dark:text-white font-bold">{order.gyms?.gym_name || 'Standard Gym'}</p>
                            <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">Code: {order.gyms?.unique_code || '—'}</p>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="max-w-[200px]">
                            <p className="text-slate-700 dark:text-zinc-300 font-semibold truncate">{firstItem}</p>
                            {moreItemsCount && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{moreItemsCount}</span>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                            ₹{Number(order.total_amount || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {order.status || 'pending'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 dark:text-zinc-400 text-[11px]">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-emerald-500/15 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-600 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
                              title="Inspect Order Details & Fulfill"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Cards View */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
              {paginated.map((order) => {
                const items = Array.isArray(order.items) ? order.items : [];
                return (
                  <div key={order.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-slate-900 dark:text-white font-bold text-sm leading-tight">{order.members?.full_name || 'Customer'}</p>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">{order.gyms?.gym_name || 'Gym'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                        {order.status || 'pending'}
                      </span>
                    </div>

                    <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-3 space-y-1.5 text-xs">
                      {items.map((it, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700 dark:text-zinc-300">
                          <span className="truncate pr-2">{it.name} (x{it.quantity || 1})</span>
                          <span className="font-bold text-slate-900 dark:text-white shrink-0">₹{(it.price * (it.quantity || 1)).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <div>
                        <p className="text-[10px] text-slate-500 dark:text-zinc-400">Total Bill</p>
                        <p className="text-base font-black text-emerald-600 dark:text-emerald-400">₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {order.members?.phone_number && (
                          <a
                            href={`https://wa.me/91${order.members.phone_number.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-xl"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="px-3 py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white font-bold rounded-xl text-xs cursor-pointer transition-colors"
                        >
                          Fulfill
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center">
                <AlertCircle className="w-10 h-10 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-slate-600 dark:text-zinc-400 font-bold text-xs">No orders found matching your search.</p>
              </div>
            )}

            {/* ── Pagination Controls ── */}
            {filtered.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 dark:bg-zinc-950/60 border-t border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
                <div className="flex items-center gap-3">
                  <span>
                    Showing <strong className="text-slate-900 dark:text-white">{(page - 1) * perPage + 1}</strong> to <strong className="text-slate-900 dark:text-white">{Math.min(page * perPage, filtered.length)}</strong> of <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{filtered.length}</strong> orders
                  </span>
                  <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 dark:border-zinc-800 pl-3">
                    <span>Rows:</span>
                    <select
                      value={perPage}
                      onChange={(e) => setPerPage(Number(e.target.value))}
                      className="bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all font-bold"
                  >
                    Previous
                  </button>

                  <span className="px-3 text-xs font-bold text-slate-900 dark:text-white">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Order Inspection & Fulfillment Modal ── */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 w-full max-w-lg relative max-h-[90vh] overflow-y-auto hide-scrollbar">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <Package className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Order Details & Fulfillment</h3>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">Order #{selectedOrder.id.slice(0, 8)}</p>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Customer Card */}
              <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Customer & Gym</p>
                <div className="flex items-center justify-between">
                  <span className="text-slate-900 dark:text-white font-bold text-sm">{selectedOrder.members?.full_name || 'Walk-in Customer'}</span>
                  <span className="text-slate-500 dark:text-zinc-400">{selectedOrder.gyms?.gym_name}</span>
                </div>
                {selectedOrder.members?.phone_number && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/80 dark:border-zinc-700/60">
                    <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {selectedOrder.members.phone_number}
                    </span>
                    <a
                      href={`https://wa.me/91${selectedOrder.members.phone_number.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 hover:underline"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Chat WhatsApp
                    </a>
                  </div>
                )}
              </div>

              {/* Items Breakdown */}
              <div className="bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 space-y-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500">Items Ordered</p>
                {(Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-slate-700 dark:text-zinc-300 pb-2 border-b border-slate-200/60 dark:border-zinc-800 last:border-0 last:pb-0">
                    <div>
                      <p className="text-slate-900 dark:text-white font-bold">{it.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-zinc-500">Qty: {it.quantity || 1} • Unit: ₹{Number(it.price || 0).toLocaleString('en-IN')}</p>
                    </div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-sm">
                      ₹{((it.price || 0) * (it.quantity || 1)).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-zinc-700 text-sm font-black">
                  <span className="text-slate-900 dark:text-white">Total Order Value</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base">₹{Number(selectedOrder.total_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Customer Notes */}
              {selectedOrder.notes && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-xs">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Customer / Delivery Note</p>
                  <p className="text-slate-700 dark:text-zinc-300 italic">"{selectedOrder.notes}"</p>
                </div>
              )}

              {/* Status Update Quick Action */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-zinc-400 block">
                  Change Fulfillment Status
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {['pending', 'processing', 'shipped', 'completed', 'cancelled'].map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(selectedOrder.id, st)}
                      disabled={statusUpdatingId === selectedOrder.id || selectedOrder.status === st}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                        selectedOrder.status === st
                          ? 'bg-emerald-500 text-white dark:text-black border-emerald-500 font-black'
                          : 'bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-700'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
