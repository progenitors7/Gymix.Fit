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
  Fingerprint
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
    if (gym?.id) {
      try {
        const saved = localStorage.getItem(`gym_settings_${gym.id}`);
        if (saved) {
          template = JSON.parse(saved).waTemplate || template;
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
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
                      <div className="flex items-center gap-4">
                        {member.avatar_url ? (
                          <img 
                            src={member.avatar_url} 
                            alt={member.full_name} 
                            className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-inner"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#F8FAFC] text-[16px] font-extrabold uppercase shadow-inner">
                            {member.full_name?.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-[#F8FAFC] font-extrabold text-[15px] tracking-tight">{member.full_name}</p>
                            {gym?.biometric_enabled && (
                              member.biometric_user_id ? (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[#10B981] text-[8px] font-black uppercase tracking-wider">
                                  <Fingerprint className="w-2.5 h-2.5" />
                                  Linked
                                </span>
                              ) : (
                                <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-wider">
                                  <Fingerprint className="w-2.5 h-2.5" />
                                  No Sync
                                </span>
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 text-[#64748B]">
                            <Phone className="w-3.5 h-3.5" />
                            <p className="text-[12px] font-bold">{member.phone_number || 'No Phone'}</p>
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

