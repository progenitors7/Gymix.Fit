import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Filter,
  Search,
  ChevronRight,
  Send,
  MoreVertical,
  LifeBuoy,
  ShieldAlert,
  Archive,
  Star,
  Activity,
  Inbox,
  ArrowLeft
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function SupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [search, setSearch] = useState('');
  
  // Real-time support filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    try {
      setLoading(true);
      const data = await superAdminService.getTickets();
      setTickets(data || []);
      if (data && data.length > 0 && !selectedTicket) {
        setSelectedTicket(data[0]);
      }
    } catch (err) {
      console.error('[SupportCenter] Failed to fetch tickets:', err);
      showToast('Failed to load support tickets', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTicket(ticketId, updates) {
    try {
      const finalUpdates = { ...updates };
      
      if (updates.admin_response?.trim()) {
        finalUpdates.status = 'resolved';
        finalUpdates.resolved_at = new Date().toISOString();
      }

      await superAdminService.updateTicket(ticketId, finalUpdates);
      
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...finalUpdates } : t));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, ...finalUpdates }));
      }
      
      if (updates.admin_response) {
        setAdminNote('');
        showToast('Resolution sent to gym owner!');
      } else {
        showToast(`Ticket status updated to ${finalUpdates.status.replace(/_/g, ' ').toUpperCase()}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed', 'error');
    }
  }

  const filteredTickets = tickets.filter(t => {
    const subject = t.subject || '';
    const desc = t.description || '';
    const gymName = t.gyms?.gym_name || '';
    const matchesSearch = subject.toLowerCase().includes(search.toLowerCase()) || 
                          desc.toLowerCase().includes(search.toLowerCase()) || 
                          gymName.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'open_pending') {
      matchesStatus = t.status === 'open' || t.status === 'in_progress';
    } else if (statusFilter !== 'all') {
      matchesStatus = t.status === statusFilter;
    }

    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const openCount = tickets.filter(t => t.status === 'open').length;

  if (loading && tickets.length === 0) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Loading Support Desk...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <LifeBuoy className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Customer Success</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Support Desk & Inquiries</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Resolve incoming tickets, billing questions, and operational inquiries from gym partners.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${
            openCount > 0 
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' 
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
          }`}>
            <span className={`w-2 h-2 rounded-full ${openCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            {openCount > 0 ? `${openCount} Open Inquiries` : 'All Caught Up'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* TICKET QUEUE COLUMN (5 Cols on large, full on mobile when detail closed) */}
        <div className={`lg:col-span-5 space-y-4 ${isMobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search ticket subject, body, or gym..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Quick Filter Selectors */}
            <div className="grid grid-cols-2 gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">All Status</option>
                <option value="open_pending">Pending Action</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">All Priorities</option>
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          {/* Ticket List Cards */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
            {filteredTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              const isHigh = ticket.priority === 'high';
              const isMedium = ticket.priority === 'medium';

              return (
                <div
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setIsMobileDetailOpen(true);
                  }}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected 
                      ? 'bg-violet-50/60 dark:bg-violet-950/20 border-violet-300 dark:border-violet-700/60 ring-1 ring-violet-500/20' 
                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
                      isHigh 
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50' 
                        : isMedium 
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50' 
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}>
                      {ticket.priority || 'Normal'}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                      {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug line-clamp-1 mb-1">
                    {ticket.subject || 'Support Inquiry'}
                  </h4>

                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-slate-400" />
                    <span>{ticket.gyms?.gym_name || 'System Operator'}</span>
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-zinc-800/70 text-[11px]">
                    <span className={`inline-flex items-center gap-1 font-semibold ${
                      ticket.status === 'open' ? 'text-amber-600 dark:text-amber-400' :
                      ticket.status === 'in_progress' ? 'text-violet-600 dark:text-violet-400' :
                      ticket.status === 'resolved' ? 'text-emerald-600 dark:text-emerald-400' :
                      'text-slate-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        ticket.status === 'open' ? 'bg-amber-500' :
                        ticket.status === 'in_progress' ? 'bg-violet-500' :
                        ticket.status === 'resolved' ? 'bg-emerald-500' :
                        'bg-slate-400'
                      }`} />
                      {ticket.status ? ticket.status.replace('_', ' ').toUpperCase() : 'OPEN'}
                    </span>

                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
                <Inbox className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-900 dark:text-white">No tickets found</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Support queue is clear.</p>
              </div>
            )}
          </div>
        </div>

        {/* TICKET RESPONSE DETAIL (7 Cols on large, full on mobile when detail open) */}
        <div className={`lg:col-span-7 ${!isMobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
          {selectedTicket ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col min-h-[580px]">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsMobileDetailOpen(false)}
                    className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-zinc-800"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-base leading-snug">
                      {selectedTicket.subject}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-zinc-400">
                      <span>ID: {selectedTicket.id?.substring(0, 8)}</span>
                      <span>•</span>
                      <span className="font-medium text-violet-600 dark:text-violet-400">
                        {selectedTicket.category ? selectedTicket.category.replace('_', ' ') : 'General'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Selector */}
                <select 
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-zinc-200 focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Message Thread */}
              <div className="flex-1 p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[400px]">
                {/* User Message Bubble */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-slate-50 dark:bg-zinc-800/60 p-4 rounded-2xl rounded-tl-none border border-slate-200 dark:border-zinc-700">
                      <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap">
                        {selectedTicket.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 block">
                      Submitted by {selectedTicket.gyms?.gym_name || 'Gym Owner'} • {new Date(selectedTicket.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Admin Reply Bubble */}
                {selectedTicket.admin_response && (
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="w-8 h-8 rounded-xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="bg-violet-50 dark:bg-violet-950/30 p-4 rounded-2xl rounded-tr-none border border-violet-200 dark:border-violet-900/50 inline-block text-left max-w-[85%]">
                        <p className="text-xs font-medium text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                          {selectedTicket.admin_response}
                        </p>
                      </div>
                      <span className="text-[10px] text-violet-600 dark:text-violet-400 mt-1 block">
                        Super Admin Responded • {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at).toLocaleString('en-IN') : 'Just now'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Resolution Input */}
              <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/20">
                <div className="relative">
                  <textarea 
                    rows={3}
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Type official reply or resolution for the gym owner..."
                    className="w-full bg-white dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl p-3 pr-14 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
                  />
                  <button 
                    onClick={() => handleUpdateTicket(selectedTicket.id, { 
                      admin_response: adminNote, 
                      status: 'resolved',
                      resolved_at: new Date().toISOString()
                    })}
                    disabled={!adminNote.trim()}
                    className="absolute right-2.5 bottom-3.5 p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                    title="Send Reply & Mark Resolved"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 text-center">
                  Sending a response will automatically resolve this ticket and notify the gym owner.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-zinc-600 mb-3" />
              <h4 className="text-base font-bold text-slate-900 dark:text-white">Select a Ticket</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1">
                Choose an inquiry from the queue on the left to review details and draft resolution replies.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
