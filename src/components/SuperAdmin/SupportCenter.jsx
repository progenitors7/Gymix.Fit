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
  Inbox
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
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open' | 'in_progress' | 'resolved' | 'closed'
  const [priorityFilter, setPriorityFilter] = useState('all'); // 'all' | 'high' | 'medium' | 'low'
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
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
        setSelectedTicket(data[0]); // auto-select the first ticket
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
      
      // Auto-set status to resolved when responding
      if (updates.admin_response?.trim()) {
        finalUpdates.status = 'resolved';
        finalUpdates.resolved_at = new Date().toISOString();
      }

      await superAdminService.updateTicket(ticketId, finalUpdates);
      
      // Sync local state
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...finalUpdates } : t));
      
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, ...finalUpdates }));
      }
      
      if (updates.admin_response) {
        setAdminNote('');
        showToast('Reply dispatched and ticket resolved! 🚀');
      } else {
        showToast(`Ticket status updated to ${finalUpdates.status.replace(/_/g, ' ').toUpperCase()}`);
      }
    } catch (err) {
      console.error(err);
      showToast('Action failed', 'error');
    }
  }

  // Double Filter layer: Search + Status + Priority
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

  if (loading && tickets.length === 0) {
    return <div className="py-20 text-center text-gray-500 font-medium italic animate-pulse">Loading Support Desk...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {/* TICKET QUEUE COLUMN */}
      <div className="lg:col-span-1 space-y-4">
        {/* Support Search and Mini Controls */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 text-gray-400">
              <LifeBuoy className="w-4 h-4 text-[#3390ec]" />
              <h3 className="font-bold text-xs uppercase tracking-widest leading-none">Support Desk</h3>
            </div>
            <span className="text-[10px] font-black uppercase bg-[#3390ec]/15 border border-[#3390ec]/20 text-[#3390ec] px-2.5 py-0.5 rounded-md">
              {tickets.filter(t => t.status === 'open').length} Open
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <input 
              type="text" 
              placeholder="Search by ticket keyword, gym..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#1c1c1c] border border-white/5 rounded-xl text-xs font-bold text-white placeholder-gray-600 focus:outline-none focus:border-[#3390ec]/50 transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-[#1c1c1c] border border-white/5 rounded-xl px-3 py-2.5 text-[10px] font-black text-gray-400 focus:outline-none hover:text-white uppercase tracking-wider"
            >
              <option value="all">All Status</option>
              <option value="open_pending">Pending Actions</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex-1 bg-[#1c1c1c] border border-white/5 rounded-xl px-3 py-2.5 text-[10px] font-black text-gray-400 focus:outline-none hover:text-white uppercase tracking-wider"
            >
              <option value="all">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Scrollable list of tickets */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1.5 custom-scrollbar">
          {filteredTickets.map((ticket) => {
            const isSelected = selectedTicket?.id === ticket.id;
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full text-left p-5 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${
                  isSelected 
                    ? 'bg-[#3390ec]/10 border-[#3390ec]/30 shadow-lg' 
                    : 'bg-[#212121] border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                }`}
              >
                {/* Visual side indicator */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#3390ec]" />
                )}

                <div className="flex items-center justify-between mb-2.5">
                  <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border ${
                    ticket.priority === 'high' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                    ticket.priority === 'medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                    'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    {ticket.priority} Priority
                  </span>
                  <span className="text-gray-600 text-[9px] font-bold">
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>

                <h4 className="text-white font-black text-xs leading-snug tracking-tight truncate group-hover:text-[#3390ec] transition-colors mb-1">
                  {ticket.subject}
                </h4>
                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-3 flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {ticket.gyms?.gym_name || 'System Operator'}
                </p>

                <div className="flex items-center justify-between pt-2.5 border-t border-white/5">
                  <span className={`inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest ${
                    ticket.status === 'open' ? 'text-amber-400' : 
                    ticket.status === 'in_progress' ? 'text-[#3390ec]' : 
                    ticket.status === 'resolved' ? 'text-emerald-400' : 
                    'text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      ticket.status === 'open' ? 'bg-amber-400 animate-pulse' : 
                      ticket.status === 'in_progress' ? 'bg-[#3390ec] animate-pulse' : 
                      ticket.status === 'resolved' ? 'bg-emerald-400' : 
                      'bg-gray-500'
                    }`} />
                    {ticket.status.replace('_', ' ')}
                  </span>
                  <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'translate-x-1 text-[#3390ec]' : 'text-gray-800 group-hover:text-gray-400'}`} />
                </div>
              </button>
            );
          })}

          {filteredTickets.length === 0 && (
            <div className="py-20 text-center bg-[#212121] border border-white/5 border-dashed rounded-3xl">
              <Inbox className="w-8 h-8 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-600 text-xs font-bold uppercase tracking-widest">Platform queue is clear</p>
            </div>
          )}
        </div>
      </div>

      {/* TICKET RESPONSE CORE SECTION */}
      <div className="lg:col-span-2">
        {selectedTicket ? (
          <div className="bg-[#212121] border border-white/5 rounded-3xl h-full flex flex-col shadow-2xl relative overflow-hidden animate-in slide-in-from-right-4">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3390ec]/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Response Card Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between relative z-10 bg-[#1c1c1c]/25 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-[#3390ec] shadow-inner">
                  <LifeBuoy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-black text-base tracking-tight uppercase leading-none">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-3.5 mt-2">
                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest font-mono">
                      Ticket ID: {selectedTicket.id.slice(0, 8)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <span className="text-[#3390ec] text-[10px] font-black uppercase tracking-widest">
                      Category: {selectedTicket.category.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Action Selector */}
              <div className="flex items-center gap-2">
                <select 
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateTicket(selectedTicket.id, { status: e.target.value })}
                  className="bg-[#1c1c1c] border border-white/10 rounded-xl px-4 py-2.5 text-[10px] font-black text-white hover:border-white/20 focus:outline-none uppercase tracking-widest cursor-pointer shadow-md"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Conversation Timeline */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar relative z-10 max-h-[450px]">
              
              {/* Ticket Submitter Bubble */}
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 border border-white/5 shadow-inner shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="bg-[#1c1c1c] p-5 rounded-3xl rounded-tl-none border border-white/5 shadow-md">
                    <p className="text-gray-300 text-xs leading-relaxed font-medium">{selectedTicket.description}</p>
                  </div>
                  <span className="text-[9px] text-gray-600 font-bold uppercase mt-2.5 tracking-wider block">
                    Dispatched by {selectedTicket.gyms?.gym_name || 'Owner'} • {new Date(selectedTicket.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Support Response Bubble */}
              {selectedTicket.admin_response && (
                <div className="flex items-start gap-4 flex-row-reverse">
                  <div className="w-9 h-9 rounded-xl bg-[#3390ec]/15 border border-[#3390ec]/30 flex items-center justify-center text-[#3390ec] shadow-inner shrink-0 animate-pulse">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="flex-1 text-right">
                    <div className="bg-[#3390ec]/10 p-5 rounded-3xl rounded-tr-none border border-[#3390ec]/25 inline-block text-left max-w-[85%] shadow-md">
                      <p className="text-white text-xs leading-relaxed font-bold">{selectedTicket.admin_response}</p>
                    </div>
                    <span className="text-[9px] text-[#3390ec] font-bold uppercase mt-2.5 tracking-wider block">
                      Admin Operator Answered • {selectedTicket.resolved_at ? new Date(selectedTicket.resolved_at).toLocaleString('en-IN') : 'Just Now'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Reply Input Box */}
            <div className="p-6 border-t border-white/5 bg-[#1c1c1c]/30 relative z-10">
              <div className="relative">
                <textarea 
                  rows={3}
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Draft resolution reply details for the gym owner..."
                  className="w-full bg-[#1c1c1c] border border-white/5 rounded-2xl p-4 pr-16 text-xs font-bold leading-relaxed text-white placeholder-slate-600 focus:outline-none focus:border-[#3390ec]/50 focus:bg-white/[0.02] transition-all resize-none shadow-inner"
                />
                <button 
                  onClick={() => handleUpdateTicket(selectedTicket.id, { 
                    admin_response: adminNote, 
                    status: 'resolved',
                    resolved_at: new Date().toISOString()
                  })}
                  disabled={!adminNote.trim()}
                  className="absolute right-3.5 bottom-3.5 p-3 bg-[#3390ec] text-white rounded-xl hover:bg-[#2b83d6] disabled:bg-gray-800/40 disabled:text-slate-600 disabled:shadow-none transition-all shadow-lg shadow-[#3390ec]/20 active:scale-95 cursor-pointer flex"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[9px] text-gray-600 mt-2.5 font-bold uppercase tracking-widest text-center">
                Dispatches custom notifications directly to owner. Updates status to RESOLVED.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#212121] border border-white/5 rounded-[2.5rem] h-full flex flex-col items-center justify-center text-center p-12 border-dashed min-h-[400px]">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-gray-700 mb-5 border border-white/5 shadow-inner">
              <MessageSquare className="w-8 h-8 text-slate-500" />
            </div>
            <h3 className="text-white font-black uppercase italic tracking-tight text-lg mb-2">Support Workspace</h3>
            <p className="text-gray-500 text-xs max-w-xs leading-relaxed font-semibold">
              Select an open support ticket query on the left pane to draft answers, updates priority, or resolve operational questions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
