/**
 * MembersPage.jsx
 * Main members list with search, status filter tabs, table (desktop) + cards (mobile),
 * and quick-access delete confirm modal.
 */
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  CheckCircle2,
  AlertTriangle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../../lib/supabaseClient';
import { waFetch } from '../../lib/waFetch';
import { useMembers } from '../../hooks/useMembers';
import { useCurrentGym } from '../../hooks/useCurrentGym';
import StatusBadge from '../UI/StatusBadge';
import ConfirmModal from '../UI/ConfirmModal';
import { DEFAULT_EXPIRY_SOON_TEMPLATE, DEFAULT_EXPIRED_TEMPLATE } from '../../config/whatsappTemplates';
import { isNativeCapacitorApp } from '../../utils/platform';
import PullToRefresh from '../UI/PullToRefresh';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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

function EmptyState({ hasSearch, onReset }) {
  return (
    <div className="py-24 text-center space-y-3">
      <Users className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto stroke-1" />
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
        {hasSearch ? 'No matching athletes found' : 'No athletes registered yet'}
      </h3>
      <p className="text-xs text-slate-500 dark:text-zinc-500 max-w-sm mx-auto">
        {hasSearch
          ? 'Try tweaking your filters or search query to find athletes.'
          : 'Ready to build your gym roster? Start by adding your first athlete.'}
      </p>
      {hasSearch ? (
        <button
          onClick={onReset}
          className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
        >
          Reset Filters
        </button>
      ) : (
        <Link
          to="/members/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add First Member</span>
        </Link>
      )}
    </div>
  );
}

export default function MembersPage() {
  const navigate = useNavigate();
  const { gym } = useCurrentGym();
  const [searchParams] = useSearchParams();
  const {
    filteredMembers,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    removeMember,
    fetchMembers,
  } = useMembers();

  const [localSearch, setLocalSearch] = useState(() => searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sync search query from URL if changed
  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    setLocalSearch(urlQuery);
  }, [searchParams]);

  // Debounce search query to prevent rendering lag while typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(localSearch);
    }, 200);
    return () => clearTimeout(timer);
  }, [localSearch, setSearchQuery]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [waSendingInfo, setWaSendingInfo] = useState(null);

  // Responsive layout state & infinite scroll state
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [visibleCount, setVisibleCount] = useState(30);
  const observerRef = useRef();

  // Screen size detection for conditional rendering
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter members list based on selected status tab (memoized)
  const displayed = useMemo(() => {
    return statusFilter === 'all'
      ? filteredMembers.filter((m) => m.status !== 'left')
      : filteredMembers.filter((m) => m.status === statusFilter);
  }, [filteredMembers, statusFilter]);

  // Paginated members list (memoized)
  const visibleMembers = useMemo(() => {
    return displayed.slice(0, visibleCount);
  }, [displayed, visibleCount]);

  // Reset pagination when searching or changing filters
  useEffect(() => {
    setVisibleCount(30);
  }, [searchQuery, statusFilter]);

  // Intersection observer trigger to load more members on scroll
  useEffect(() => {
    if (loading || visibleCount >= displayed.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 30, displayed.length));
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
  }, [displayed.length, visibleCount, loading]);

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
    
    // Get custom template or use default based on status
    let template = '';
    let autopilotEnabled = false;
    let autopilotConnected = false;

    if (gym?.id) {
      try {
        const saved = localStorage.getItem(`gym_settings_${gym.id}`);
        const parsed = saved ? JSON.parse(saved) : {};
        autopilotEnabled = gym.wa_autopilot_enabled ?? parsed.waAutopilotEnabled ?? false;
        autopilotConnected = parsed.waConnected || false;
        
        if (member.status === 'expired') {
          template = gym.wa_template_expired || parsed.waTemplateExpired || DEFAULT_EXPIRED_TEMPLATE;
        } else if (member.status === 'expiring_soon') {
          template = gym.wa_template_expiry_soon || parsed.waTemplateExpirySoon || DEFAULT_EXPIRY_SOON_TEMPLATE;
        } else {
          template = 'Hello {{name}}, your plan expires on {{date}}.';
        }
      } catch (e) {
        console.error(e);
      }
    }

    if (!template) {
      if (member.status === 'expired') {
        template = DEFAULT_EXPIRED_TEMPLATE;
      } else if (member.status === 'expiring_soon') {
        template = DEFAULT_EXPIRY_SOON_TEMPLATE;
      } else {
        template = 'Hello {{name}}, your plan expires on {{date}}.';
      }
    }

    const expiry = member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'soon';
    
    // Default dynamic texts based on status
    let text = template
      .replace(/{{name}}/g, member.full_name)
      .replace(/{{gymName}}/g, gym?.gym_name || 'Gym')
      .replace(/{{date}}/g, expiry)
      .replace(/{{plan}}/g, member.membership_plan || 'plan');
    
    if (autopilotEnabled && autopilotConnected) {
      // Autopilot dispatch
      setWaSendingInfo({
        memberName: member.full_name,
        phoneNumber: member.phone_number,
        messageText: text,
        state: 'sending'
      });

      const WA_BACKEND_URL = import.meta.env.VITE_WA_BACKEND_URL || 'http://localhost:5000';
      
      const sendPromise = async () => {
        try {
          const res = await waFetch('/api/whatsapp/send', {
            method: 'POST',
            body: JSON.stringify({
              gymId: gym.id,
              phone: member.phone_number,
              message: text
            })
          });
          if (res.ok) {
            setWaSendingInfo(prev => prev ? { ...prev, state: 'sent' } : null);
            // After 3.5s, close successful popup
            setTimeout(() => {
              setWaSendingInfo(null);
            }, 3500);
          } else {
            throw new Error('Server dispatch failed');
          }
        } catch (e) {
          console.warn('[Gymix WA] Central server offline or dispatch failed:', e.message);
          setWaSendingInfo(prev => prev ? { ...prev, state: 'failed' } : null);
        }
      };

      sendPromise();
    } else {
      // Fall back to direct WhatsApp Click-to-Chat
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      const target = isNativeCapacitorApp() ? '_system' : '_blank';
      window.open(url, target);
    }
  };

  const counts = useMemo(() => {
    let all = 0;
    let active = 0;
    let expiring_soon = 0;
    let expired = 0;
    let left = 0;
    
    for (let i = 0; i < filteredMembers.length; i++) {
      const m = filteredMembers[i];
      if (m.status === 'left') {
        left++;
      } else {
        all++;
        if (m.status === 'active') active++;
        else if (m.status === 'expiring_soon') expiring_soon++;
        else if (m.status === 'expired') expired++;
      }
    }
    
    return { all, active, expiring_soon, expired, left };
  }, [filteredMembers]);

  const isNativeApp = isNativeCapacitorApp() || window.matchMedia('(display-mode: standalone)').matches;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: isNativeApp ? { duration: 0.1 } : { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: isNativeApp ? { opacity: 0 } : { opacity: 0, y: 10 },
    show: isNativeApp 
      ? { opacity: 1, transition: { duration: 0.1 } } 
      : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <PullToRefresh onRefresh={fetchMembers} className="min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto min-h-screen">
        {/* ── Page Header ── */}
        <motion.div 
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Members Directory</h1>
            <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1 font-medium">
              {loading ? 'Crunching numbers…' : `${counts.all} total athletes registered`}
            </p>
          </div>
          <Link
            id="add-member-btn"
            to="/members/new"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-xs transition-all w-full sm:w-auto cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Member</span>
          </Link>
        </motion.div>

        {/* ── Search Bar ── */}
        <motion.div 
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative group mb-4"
        >
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
          <input
            id="member-search"
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by member name, phone number, or plan…"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-sm font-medium focus:outline-none focus:border-violet-500 dark:focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all"
          />
        </motion.div>

        {/* ── Status Tabs (Clean Floating Pills - matching Subscriptions) ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar mb-6">
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                id={`tab-${tab.key}`}
                onClick={() => setStatusFilter(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors duration-150 cursor-pointer",
                  isActive
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
                  isActive 
                    ? "bg-violet-700/80 text-white" 
                    : "bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400"
                )}>
                  {counts[tab.key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium">
            Failed to load members: {error}
          </div>
        )}

        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-100 dark:bg-zinc-800/60 rounded-xl border border-slate-200/60 dark:border-zinc-800/60" />
            ))}
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !error && (
          <AnimatePresence mode="wait">
            {displayed.length === 0 ? (
              <EmptyState 
                key="empty" 
                hasSearch={!!searchQuery} 
                onReset={() => { setLocalSearch(''); setStatusFilter('all'); }} 
              />
            ) : (
              <motion.div 
                key="content"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                {/* Desktop table */}
                {!isMobile && (
                  <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60">
                          <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Athlete</th>
                          <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Contact</th>
                          <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Plan</th>
                          <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Expiry</th>
                          <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Status</th>
                          <th className="px-6 py-3.5 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                        {visibleMembers.map((member) => (
                          <tr 
                            key={member.id} 
                            className="group hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors duration-150"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                {member.avatar_url ? (
                                  <img 
                                    src={member.avatar_url} 
                                    alt={member.full_name} 
                                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-zinc-700"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 text-xs font-bold uppercase">
                                    {member.full_name?.slice(0, 1)}
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-slate-900 dark:text-white font-semibold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{member.full_name}</p>
                                    {gym?.biometric_enabled && (
                                      member.biometric_user_id ? (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wider" title={`Biometric Linked (User ID: #${member.biometric_user_id})`}>
                                          <Fingerprint className="w-2.5 h-2.5" />
                                          Linked
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[8px] font-bold uppercase tracking-wider" title="Biometric User ID Not Mapped">
                                          <Fingerprint className="w-2.5 h-2.5" />
                                          No Sync
                                        </span>
                                      )
                                    )}
                                  </div>
                                  <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-medium uppercase tracking-wider mt-0.5">{member.gender || 'Not Specified'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300">
                                <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                                <span className="font-medium text-xs">{member.phone_number || '—'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 text-xs font-medium">
                                <Layers className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                                <span>{member.membership_plan}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-600 dark:text-zinc-300 text-xs font-medium">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
                                {formatDate(member.expiry_date)}
                              </div>
                            </td>
                            <td className="px-6 py-4"><StatusBadge status={member.status} /></td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                {(member.status === 'expired' || member.status === 'expiring_soon') && (
                                  <button
                                    onClick={() => handleWhatsApp(member)}
                                    className="p-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer"
                                    title="Send WhatsApp Reminder"
                                  >
                                    <svg viewBox="0 0 175.216 175.552" className="w-4 h-4 flex-shrink-0">
                                      <path fill="#FFF" d="M90.134 162.138c-12.084 0-23.941-3.142-34.404-9.083L14.316 163.66l10.829-39.517c-6.523-11.309-9.957-24.15-9.953-37.309C15.209 46.262 48.7 12.766 89.28 12.766c19.664 0 38.15 7.66 52.039 21.558 13.889 13.896 21.539 32.388 21.531 52.046-.017 40.579-33.518 73.768-72.716 75.768z" />
                                      <path fill="#25D366" d="M90.134 23.99c-33.82 0-61.341 27.525-61.353 61.347a61.1 61.1 0 0 0 9.37 32.61l1.458 2.318-6.195 22.61 23.136-6.068 2.241 1.33A61.05 61.05 0 0 0 89.92 146.47h.023c33.81 0 61.332-27.524 61.348-61.348a61.13 61.13 0 0 0-17.951-43.375C121.849 30.197 106.524 23.99 90.134 23.99z" />
                                      <path fill="#FFF" d="M118.91 103.88c-1.58-.79-9.35-4.61-10.79-5.14-1.44-.53-2.5-.79-3.56.79-1.06 1.58-4.09 5.14-5.01 6.2-.92 1.06-1.84 1.18-3.42.39-1.58-.79-6.67-2.46-12.71-7.85-4.7-4.19-7.87-9.37-8.79-10.95-.92-1.58-.1-2.44.69-3.22.71-.7 1.58-1.84 2.37-2.76.79-.92 1.06-1.58 1.58-2.63.53-1.06.26-1.97-.13-2.76-.39-.79-3.56-8.58-4.88-11.77-1.28-3.11-2.59-2.69-3.56-2.74-.92-.05-1.97-.05-3.03-.05-1.06 0-2.77.39-4.22 1.97-1.45 1.58-5.54 5.41-5.54 13.19s5.67 15.29 6.46 16.34c.79 1.06 11.16 17.04 27.04 23.9 3.78 1.63 6.72 2.61 9.02 3.35 3.8 1.21 7.26 1.04 10 0.63 3.05-.46 9.35-3.82 10.66-7.51 1.32-3.69 1.32-6.85 0.92-7.51-.39-.66-1.44-1.06-3.03-1.85z" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => navigate(`/members/${member.id}/edit`)}
                                  className="p-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
                                  title="Edit member"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget({ id: member.id, name: member.full_name })}
                                  className="p-2 rounded-lg text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
                                  title="Delete member"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile cards */}
                {isMobile && (
                  <div className="md:hidden space-y-3">
                    {visibleMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 active:scale-[0.99] transition-all space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {member.avatar_url ? (
                              <img 
                                src={member.avatar_url} 
                                alt={member.full_name} 
                                className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-zinc-700 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 text-sm font-bold uppercase flex-shrink-0">
                                {member.full_name?.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">{member.full_name}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                <div className="flex items-center gap-1 text-slate-500 dark:text-zinc-400">
                                  <Phone className="w-3 h-3 flex-shrink-0" />
                                  <span className="text-xs font-medium">{member.phone_number || '—'}</span>
                                </div>
                                {gym?.biometric_enabled && (
                                  member.biometric_user_id ? (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[8px] font-bold uppercase tracking-wider">
                                      <Fingerprint className="w-2.5 h-2.5" />
                                      Linked
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[8px] font-bold uppercase tracking-wider">
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

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-zinc-800/80">
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-[10px] font-medium border border-slate-200 dark:border-zinc-700">
                              <Layers className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                              <span>{member.membership_plan}</span>
                            </div>
                            <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-medium ml-0.5">
                              Exp: {formatDate(member.expiry_date)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            {(member.status === 'expired' || member.status === 'expiring_soon') && (
                              <button
                                onClick={() => handleWhatsApp(member)}
                                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-emerald-600 dark:text-emerald-400 border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer"
                                title="Send WhatsApp Reminder"
                              >
                                <svg viewBox="0 0 175.216 175.552" className="w-4 h-4 flex-shrink-0">
                                  <path fill="#FFF" d="M90.134 162.138c-12.084 0-23.941-3.142-34.404-9.083L14.316 163.66l10.829-39.517c-6.523-11.309-9.957-24.15-9.953-37.309C15.209 46.262 48.7 12.766 89.28 12.766c19.664 0 38.15 7.66 52.039 21.558 13.889 13.896 21.539 32.388 21.531 52.046-.017 40.579-33.518 73.768-72.716 75.768z" />
                                  <path fill="#25D366" d="M90.134 23.99c-33.82 0-61.341 27.525-61.353 61.347a61.1 61.1 0 0 0 9.37 32.61l1.458 2.318-6.195 22.61 23.136-6.068 2.241 1.33A61.05 61.05 0 0 0 89.92 146.47h.023c33.81 0 61.332-27.524 61.348-61.348a61.13 61.13 0 0 0-17.951-43.375C121.849 30.197 106.524 23.99 90.134 23.99z" />
                                  <path fill="#FFF" d="M118.91 103.88c-1.58-.79-9.35-4.61-10.79-5.14-1.44-.53-2.5-.79-3.56.79-1.06 1.58-4.09 5.14-5.01 6.2-.92 1.06-1.84 1.18-3.42.39-1.58-.79-6.67-2.46-12.71-7.85-4.7-4.19-7.87-9.37-8.79-10.95-.92-1.58-.1-2.44.69-3.22.71-.7 1.58-1.84 2.37-2.76.79-.92 1.06-1.58 1.58-2.63.53-1.06.26-1.97-.13-2.76-.39-.79-3.56-8.58-4.88-11.77-1.28-3.11-2.59-2.69-3.56-2.74-.92-.05-1.97-.05-3.03-.05-1.06 0-2.77.39-4.22 1.97-1.45 1.58-5.54 5.41-5.54 13.19s5.67 15.29 6.46 16.34c.79 1.06 11.16 17.04 27.04 23.9 3.78 1.63 6.72 2.61 9.02 3.35 3.8 1.21 7.26 1.04 10 0.63 3.05-.46 9.35-3.82 10.66-7.51 1.32-3.69 1.32-6.85 0.92-7.51-.39-.66-1.44-1.06-3.03-1.85z" />
                                </svg>
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/members/${member.id}/edit`)}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer"
                              title="Edit member"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget({ id: member.id, name: member.full_name })}
                              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-zinc-700 active:scale-95 transition-all cursor-pointer"
                              title="Delete member"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Sentinel observer target for infinite scroll */}
                {visibleCount < displayed.length && (
                  <div ref={observerRef} className="h-14 flex items-center justify-center mt-4">
                    <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                  </div>
                )}

                <p 
                  className="text-slate-400 dark:text-zinc-500 text-[11px] font-semibold text-center mt-8"
                >
                  Showing {visibleMembers.length} of {displayed.length} athletes
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        )}

      {/* ── Autopilot WhatsApp Dispatch Overlay ── */}
      {waSendingInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in animate-duration-150">
          <div className={`bg-white dark:bg-zinc-900 border ${waSendingInfo.state === 'failed' ? 'border-red-200 dark:border-red-900/50' : 'border-slate-200 dark:border-zinc-800'} rounded-2xl w-full max-w-sm p-6 animate-in zoom-in-95 relative overflow-hidden text-center space-y-4`}>
            
            {/* Close button */}
            <button
              type="button"
              onClick={() => setWaSendingInfo(null)}
              className="absolute top-4.5 right-4.5 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Icon & Status */}
            <div className="flex flex-col items-center">
              {waSendingInfo.state === 'sending' ? (
                <div className="relative mb-3">
                  <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin flex items-center justify-center" />
                  <svg viewBox="0 0 175.216 175.552" className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex-shrink-0">
                    <path fill="#25D366" d="M90.134 162.138c-12.084 0-23.941-3.142-34.404-9.083L14.316 163.66l10.829-39.517c-6.523-11.309-9.957-24.15-9.953-37.309C15.209 46.262 48.7 12.766 89.28 12.766c19.664 0 38.15 7.66 52.039 21.558 13.889 13.896 21.539 32.388 21.531 52.046-.017 40.579-33.518 73.768-72.716 75.768z" />
                    <path fill="#FFF" d="M90.134 23.99c-33.82 0-61.341 27.525-61.353 61.347a61.1 61.1 0 0 0 9.37 32.61l1.458 2.318-6.195 22.61 23.136-6.068 2.241 1.33A61.05 61.05 0 0 0 89.92 146.47h.023c33.81 0 61.332-27.524 61.348-61.348a61.13 61.13 0 0 0-17.951-43.375C121.849 30.197 106.524 23.99 90.134 23.99z" />
                    <path fill="#25D366" d="M118.91 103.88c-1.58-.79-9.35-4.61-10.79-5.14-1.44-.53-2.5-.79-3.56.79-1.06 1.58-4.09 5.14-5.01 6.2-.92 1.06-1.84 1.18-3.42.39-1.58-.79-6.67-2.46-12.71-7.85-4.7-4.19-7.87-9.37-8.79-10.95-.92-1.58-.1-2.44.69-3.22.71-.7 1.58-1.84 2.37-2.76.79-.92 1.06-1.58 1.58-2.63.53-1.06.26-1.97-.13-2.76-.39-.79-3.56-8.58-4.88-11.77-1.28-3.11-2.59-2.69-3.56-2.74-.92-.05-1.97-.05-3.03-.05-1.06 0-2.77.39-4.22 1.97-1.45 1.58-5.54 5.41-5.54 13.19s5.67 15.29 6.46 16.34c.79 1.06 11.16 17.04 27.04 23.9 3.78 1.63 6.72 2.61 9.02 3.35 3.8 1.21 7.26 1.04 10 0.63 3.05-.46 9.35-3.82 10.66-7.51 1.32-3.69 1.32-6.85 0.92-7.51-.39-.66-1.44-1.06-3.03-1.85z" />
                  </svg>
                </div>
              ) : waSendingInfo.state === 'failed' ? (
                <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-3">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              )}
              
              <h4 className={`text-sm font-bold ${waSendingInfo.state === 'failed' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                {waSendingInfo.state === 'sending' ? 'Autopilot Dispatching...' : waSendingInfo.state === 'failed' ? 'Autopilot Failed' : 'Reminder Delivered!'}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold tracking-wider uppercase mt-0.5">
                {waSendingInfo.state === 'sending' ? 'VIA LINKED WHATSAPP DEVICE' : waSendingInfo.state === 'failed' ? 'GATEWAY OFFLINE OR DISCONNECTED' : 'SENT SILENTLY IN BACKGROUND'}
              </p>
            </div>

            {/* Recipient Card */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 rounded-xl text-left space-y-1">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Recipient</p>
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{waSendingInfo.memberName}</p>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{waSendingInfo.phoneNumber}</p>
              </div>
            </div>

            {/* WhatsApp Message Bubble Mockup / Error Explanation */}
            {waSendingInfo.state === 'failed' ? (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 text-left space-y-1.5">
                <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed font-semibold">
                  Failed to deliver autopilot message.
                </p>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 font-medium">
                  Ensure your WhatsApp server is online and your device remains linked in settings, or use manual fallback.
                </p>
              </div>
            ) : (
              <div className="relative p-3.5 bg-slate-100 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800 text-left max-h-[140px] overflow-y-auto custom-scrollbar">
                <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-bold text-slate-400">
                  <span>{new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  {waSendingInfo.state === 'sent' && <span className="text-emerald-600 dark:text-emerald-400">✓✓</span>}
                </div>
                <p className="text-xs text-slate-700 dark:text-zinc-300 pr-10 leading-relaxed whitespace-pre-wrap font-medium">{waSendingInfo.messageText}</p>
              </div>
            )}

            {/* Actions for Failed state */}
            {waSendingInfo.state === 'failed' && (
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const phone = waSendingInfo.phoneNumber.replace(/\D/g, '');
                    const url = `https://wa.me/${phone}?text=${encodeURIComponent(waSendingInfo.messageText)}`;
                    const target = isNativeCapacitorApp() ? '_system' : '_blank';
                    window.open(url, target);
                    setWaSendingInfo(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer text-center"
                >
                  Send Manually
                </button>
                <button
                  type="button"
                  onClick={() => setWaSendingInfo(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Member"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All their data including payments, attendance, and subscriptions will be removed.`}
        confirmLabel="Delete Permanently"
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />


      </div>
    </PullToRefresh>
  );
}

