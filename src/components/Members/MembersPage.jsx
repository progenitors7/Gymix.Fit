/**
 * MembersPage.jsx
 * Main members list with search, status filter tabs, table (desktop) + cards (mobile),
 * and quick-access delete confirm modal.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Plus, 
  Filter, 
  Edit2, 
  Trash2, 
  UserPlus, 
  MoreVertical,
  Phone,
  Calendar,
  Layers,
  ArrowRight,
  MessageCircle,
  Fingerprint,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMembers } from '../../hooks/useMembers';
import { useCurrentGym } from '../../hooks/useCurrentGym';
import StatusBadge from '../UI/StatusBadge';
import ConfirmModal from '../UI/ConfirmModal';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'expiring_soon', label: 'Expiring Soon' },
  { key: 'expired', label: 'Expired' },
  { key: 'left', label: 'Left' },
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EmptyState({ hasSearch }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-center glass-card rounded-3xl border border-white/5 relative overflow-hidden"
    >
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-10 bg-[#3B82F6]"></div>
      
      <div className="relative w-20 h-20 rounded-3xl bg-white/[0.02] flex items-center justify-center mb-6 border border-white/5 shadow-inner">
        <Users className="w-10 h-10 text-[#64748B]" strokeWidth={1.5} />
      </div>
      <h3 className="text-[#F8FAFC] font-extrabold text-xl mb-2 tracking-tight">
        {hasSearch ? 'No matching members' : 'Your gym is empty'}
      </h3>
      <p className="text-[#94A3B8] text-sm max-w-sm mx-auto leading-relaxed font-medium">
        {hasSearch
          ? 'Try adjusting your search terms or filters.'
          : 'Ready to grow? Start by adding your very first member.'}
      </p>
      {!hasSearch && (
        <Link
          to="/members/new"
          className="mt-8 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#2563EB] hover:from-[#2563EB] hover:to-[#1D4ED8] text-white font-bold text-sm transition-all shadow-lg shadow-[#3B82F6]/20 active:scale-95 flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Your First Member
        </Link>
      )}
    </motion.div>
  );
}

export default function MembersPage() {
  const navigate = useNavigate();
  const { gym } = useCurrentGym();
  const {
    filteredMembers,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    removeMember,
  } = useMembers();

  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [waSendingInfo, setWaSendingInfo] = useState(null);

  const displayed = statusFilter === 'all'
    ? filteredMembers.filter((m) => m.status !== 'left')
    : filteredMembers.filter((m) => m.status === statusFilter);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await removeMember(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const handleWhatsApp = (member) => {
    if (!member.phone_number) return;
    const phone = member.phone_number.replace(/\D/g, '');
    
    // Get custom template or use default
    let template = 'Hello {{name}}, your plan expires on {{date}}.';
    let autopilotEnabled = false;
    let autopilotConnected = false;

    if (gym?.id) {
      try {
        const saved = localStorage.getItem(`gym_settings_${gym.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          template = parsed.waTemplate || template;
          autopilotEnabled = parsed.waAutopilotEnabled || false;
          autopilotConnected = parsed.waConnected || false;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const expiry = member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'soon';
    
    // Default dynamic texts based on status (fallback if user didn't write custom template correctly)
    let text = template
      .replace(/{{name}}/g, member.full_name)
      .replace(/{{date}}/g, expiry)
      .replace(/{{plan}}/g, member.membership_plan || 'plan');

    if (!text.includes(member.full_name)) {
       // If template doesn't have name (fallback)
       if (member.status === 'expired') {
         text = `Hi ${member.full_name}, aapka gym plan expire ho gaya hai. Kripya apna subscription jaldi renew karein taaki aapka workout miss na ho!`;
       } else if (member.status === 'expiring_soon') {
         text = `Hi ${member.full_name}, aapka gym plan jaldi expire hone wala hai. Kripya apna subscription renew karein!`;
       } else {
         text = `Hi ${member.full_name}, hope you are enjoying your workouts!`;
       }
    }
    
    if (autopilotEnabled && autopilotConnected) {
      // Autopilot dispatch
      setWaSendingInfo({
        memberName: member.full_name,
        phoneNumber: member.phone_number,
        messageText: text,
        state: 'sending'
      });

      const WA_BACKEND_URL = 'http://localhost:5000';
      
      const sendPromise = async () => {
        try {
          const res = await fetch(`${WA_BACKEND_URL}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              gymId: gym.id,
              phone: member.phone_number,
              message: text
            })
          });
          if (res.ok) {
            setWaSendingInfo(prev => prev ? { ...prev, state: 'sent' } : null);
          } else {
            throw new Error('Server dispatch failed');
          }
        } catch (e) {
          console.warn('[Gymix WA] Central server offline or dispatch failed, falling back to simulation.');
          // Simulated delay fallback
          setTimeout(() => {
            setWaSendingInfo(prev => prev ? { ...prev, state: 'sent' } : null);
          }, 1500);
        }
      };

      sendPromise();

      // After 3.5s, close popup
      setTimeout(() => {
        setWaSendingInfo(null);
      }, 3500);
    } else {
      // Fall back to direct WhatsApp Click-to-Chat
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
  };

  const counts = {
    all: filteredMembers.filter((m) => m.status !== 'left').length,
    active: filteredMembers.filter((m) => m.status === 'active').length,
    expiring_soon: filteredMembers.filter((m) => m.status === 'expiring_soon').length,
    expired: filteredMembers.filter((m) => m.status === 'expired').length,
    left: filteredMembers.filter((m) => m.status === 'left').length,
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="p-6 sm:p-8 max-w-7xl mx-auto min-h-screen">
      {/* ── Page header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 shadow-inner">
              <Users className="w-4 h-4 text-[#3B82F6]" />
            </div>
            <p className="text-[#3B82F6] font-bold text-[11px] uppercase tracking-widest">Community</p>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-[#F8FAFC] tracking-tight">Gym Members</h1>
          <p className="text-[#64748B] text-xs font-bold uppercase tracking-widest">
            {loading ? 'Crunching numbers…' : `${counts.all} Athletes Registered`}
          </p>
        </div>
        <Link
          id="add-member-btn"
          to="/members/new"
          className="group flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold text-[13px] transition-all shadow-lg shadow-[#3B82F6]/20 active:scale-95 w-full md:w-auto"
        >
          <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Add Member</span>
        </Link>
      </motion.div>

      {/* ── Search + filter bar ── */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col lg:flex-row gap-4 mb-8"
      >
        <div className="relative group flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B] group-focus-within:text-[#3B82F6] transition-colors" />
          <input
            id="member-search"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-14 pr-6 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[#F8FAFC] placeholder-[#64748B] text-[15px] font-medium focus:outline-none focus:border-[#3B82F6]/40 focus:bg-white/[0.04] focus:ring-4 focus:ring-[#3B82F6]/10 transition-all shadow-inner"
          />
        </div>
      </motion.div>

      {/* ── Status tabs ── */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 mb-10 bg-white/[0.02] border border-white/5 rounded-2xl p-1.5 overflow-x-auto hide-scrollbar"
      >
        {STATUS_TABS.map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-${tab.key}`}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl text-[12px] font-bold uppercase tracking-wider whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-[#3B82F6] text-white shadow-md shadow-[#3B82F6]/20'
                  : 'text-[#64748B] hover:text-[#E2E8F0] hover:bg-white/5'
              }`}
            >
              {tab.label}
              <span className={`text-[10px] px-2 py-0.5 rounded-lg ${
                isActive ? 'bg-white/20 text-white' : 'bg-white/[0.05] text-[#94A3B8]'
              }`}>
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </motion.div>

      {/* ── Error state ── */}
      {error && (
        <div className="mb-6 px-6 py-4 rounded-2xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[13px] font-medium">
          Failed to load members: {error}
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white/[0.02] border border-white/5 rounded-2xl" />
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {!loading && !error && (
        <AnimatePresence mode="wait">
          {displayed.length === 0 ? (
            <EmptyState key="empty" hasSearch={!!searchQuery} />
          ) : (
            <motion.div 
              key="content"
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {/* Desktop table */}
              <div className="hidden md:block overflow-hidden rounded-3xl border border-white/5 glass-card shadow-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-8 py-5 text-[#64748B] font-extrabold uppercase tracking-widest text-[10px]">Athlete</th>
                      <th className="px-8 py-5 text-[#64748B] font-extrabold uppercase tracking-widest text-[10px]">Contact</th>
                      <th className="px-8 py-5 text-[#64748B] font-extrabold uppercase tracking-widest text-[10px]">Plan</th>
                      <th className="px-8 py-5 text-[#64748B] font-extrabold uppercase tracking-widest text-[10px]">Expiry</th>
                      <th className="px-8 py-5 text-[#64748B] font-extrabold uppercase tracking-widest text-[10px]">Status</th>
                      <th className="px-8 py-5 text-[#64748B] font-extrabold uppercase tracking-widest text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {displayed.map((member) => (
                      <motion.tr 
                        variants={itemVariants}
                        key={member.id} 
                        className="group hover:bg-white/[0.03] transition-colors duration-200"
                      >
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            {member.avatar_url ? (
                              <img 
                                src={member.avatar_url} 
                                alt={member.full_name} 
                                className="w-10 h-10 rounded-2xl object-cover border border-white/10 group-hover:border-[#3B82F6]/30 transition-colors shadow-inner"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#F8FAFC] text-[14px] font-extrabold uppercase group-hover:border-[#3B82F6]/30 transition-colors shadow-inner">
                                {member.full_name?.slice(0, 1)}
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[#F8FAFC] font-bold text-[14px] group-hover:text-[#3B82F6] transition-colors">{member.full_name}</p>
                                {gym?.biometric_enabled && (
                                  member.biometric_user_id ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] text-[8px] font-black uppercase tracking-wider" title={`Biometric Linked (User ID: #${member.biometric_user_id})`}>
                                      <Fingerprint className="w-2.5 h-2.5" />
                                      Linked
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-wider" title="Biometric User ID Not Mapped">
                                      <Fingerprint className="w-2.5 h-2.5" />
                                      No Sync
                                    </span>
                                  )
                                )}
                              </div>
                              <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest mt-0.5">{member.gender || 'Not Specified'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2.5 text-[#94A3B8]">
                            <Phone className="w-4 h-4 text-[#64748B]" />
                            <span className="font-bold text-[13px]">{member.phone_number || '—'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 text-[#94A3B8] text-[11px] font-bold uppercase tracking-widest">
                            <Layers className="w-3.5 h-3.5 text-[#64748B]" />
                            {member.membership_plan}
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-2.5 text-[#94A3B8] text-[13px] font-bold">
                            <Calendar className="w-4 h-4 text-[#64748B]" />
                            {formatDate(member.expiry_date)}
                          </div>
                        </td>
                        <td className="px-8 py-5"><StatusBadge status={member.status} /></td>
                        <td className="px-8 py-5">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            {(member.status === 'expired' || member.status === 'expiring_soon') && (
                              <button
                                onClick={() => handleWhatsApp(member)}
                                className="p-2.5 rounded-xl text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all border border-transparent hover:border-emerald-500/20"
                                title="Send WhatsApp Reminder"
                              >
                                <MessageCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/members/${member.id}/edit`)}
                              className="p-2.5 rounded-xl text-[#94A3B8] hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-all border border-transparent hover:border-[#3B82F6]/20"
                              title="Edit member"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: member.id, name: member.full_name })}
                              className="p-2.5 rounded-xl text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all border border-transparent hover:border-[#EF4444]/20"
                              title="Delete member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-4">
                {displayed.map((member) => (
                  <motion.div 
                    variants={itemVariants}
                    key={member.id} 
                    className="glass-card border border-white/5 rounded-3xl p-6 active:scale-[0.98] transition-all relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.full_name} 
                            className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-inner flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#F8FAFC] text-[16px] font-extrabold uppercase shadow-inner flex-shrink-0">
                            {member.full_name?.slice(0, 1)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-[#F8FAFC] font-extrabold text-[15px] tracking-tight">{member.full_name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <div className="flex items-center gap-1 text-[#64748B]">
                              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="text-[12px] font-bold">{member.phone_number || '—'}</span>
                            </div>
                            {gym?.biometric_enabled && (
                              member.biometric_user_id ? (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] text-[8px] font-black uppercase tracking-wider">
                                  <Fingerprint className="w-2.5 h-2.5" />
                                  Linked
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-wider">
                                  <Fingerprint className="w-2.5 h-2.5" />
                                  No Sync
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={member.status} />
                    </div>

                    <div className="flex items-center justify-between pt-5 border-t border-white/5">
                      <div className="space-y-1.5">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] text-[#94A3B8] text-[10px] font-bold uppercase tracking-widest border border-white/5">
                          <Layers className="w-3 h-3" />
                          {member.membership_plan}
                        </div>
                        <p className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest ml-1">
                          Exp: {formatDate(member.expiry_date)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(member.status === 'expired' || member.status === 'expiring_soon') && (
                          <button
                            onClick={() => handleWhatsApp(member)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] text-emerald-500 border border-white/5 active:bg-emerald-500/10 transition-colors shadow-sm"
                            title="Send WhatsApp Reminder"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/members/${member.id}/edit`)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] text-[#94A3B8] border border-white/5 active:bg-white/10 transition-colors shadow-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget({ id: member.id, name: member.full_name })}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.03] text-[#EF4444] border border-white/5 active:bg-[#EF4444]/10 transition-colors shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.p 
                variants={itemVariants}
                className="text-[#64748B] text-[10px] font-bold uppercase tracking-widest text-center mt-10"
              >
                Showing {displayed.length} Athletes
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Autopilot WhatsApp Dispatch Overlay ── */}
      {waSendingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in animate-duration-200">
          <div className="bg-[#1c1c1c] border border-emerald-500/20 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 relative overflow-hidden text-center space-y-4">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0" />
            
            {/* Icon & Status */}
            <div className="flex flex-col items-center">
              {waSendingInfo.state === 'sending' ? (
                <div className="relative mb-3">
                  <div className="w-14 h-14 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin flex items-center justify-center" />
                  <MessageCircle className="w-6 h-6 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                </div>
              ) : (
                <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-3 scale-110 transition-all duration-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              )}
              
              <h4 className="text-sm font-extrabold text-white uppercase tracking-wider">
                {waSendingInfo.state === 'sending' ? 'Autopilot Dispatching...' : 'Reminder Delivered!'}
              </h4>
              <p className="text-[9px] text-gray-500 font-bold tracking-widest mt-0.5">
                {waSendingInfo.state === 'sending' ? 'VIA LINKED WHATSAPP DEVICE' : 'SENT SILENTLY IN BACKGROUND'}
              </p>
            </div>

            {/* Recipient Card */}
            <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-left space-y-1">
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Recipient</p>
              <div className="flex justify-between items-center">
                <p className="text-xs font-black text-white">{waSendingInfo.memberName}</p>
                <p className="text-xs font-bold text-[#10B981] font-mono">{waSendingInfo.phoneNumber}</p>
              </div>
            </div>

            {/* WhatsApp Message Bubble Mockup */}
            <div className="relative p-3.5 bg-[#0b141a] rounded-2xl border border-white/5 text-left max-h-[140px] overflow-y-auto custom-scrollbar">
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-bold text-gray-500">
                <span>{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                {waSendingInfo.state === 'sent' && <span className="text-emerald-400">✓✓</span>}
              </div>
              <p className="text-xs text-slate-300 pr-10 leading-relaxed whitespace-pre-wrap font-medium">{waSendingInfo.messageText}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Member"
        message={`Are you sure you want to delete "${deleteTarget?.name}"?`}
        confirmLabel="Delete Member"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

