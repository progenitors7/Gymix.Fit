import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  Send, 
  History, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  Zap,
  Trash2, 
  Clock,
  Radio,
  Building2,
  Bell,
  Eye
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import { useAuth } from '../../hooks/useAuth';
import Toast from '../UI/Toast';
import ConfirmModal from '../UI/ConfirmModal';

export default function BroadcastSystem() {
  const { user } = useAuth();
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'info'
  });

  const [gyms, setGyms] = useState([]);
  const [targetGymId, setTargetGymId] = useState('all');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    try {
      setLoading(true);
      const [broadcastData, gymData] = await Promise.all([
        superAdminService.getBroadcasts(),
        superAdminService.getAllGyms()
      ]);
      setBroadcasts(broadcastData || []);
      setGyms(gymData || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load broadcasts', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      showToast('Please provide both a title and message content', 'error');
      return;
    }

    try {
      setSending(true);
      if (targetGymId === 'all') {
        await superAdminService.createBroadcast({
          ...formData,
          created_by: user?.id
        });
        showToast('Broadcast announced to all gym owners!');
      } else {
        await superAdminService.sendDirectMessage(targetGymId, formData);
        showToast('Direct communication delivered!');
      }
      setFormData({ title: '', message: '', type: 'info' });
      setTargetGymId('all');
      fetchInitialData();
    } catch (err) {
      console.error('Messaging failed:', err);
      showToast(err.message || 'Failed to dispatch message', 'error');
    } finally {
      setSending(false);
    }
  }

  function handleDeleteClick(id) {
    setDeleteTargetId(id);
  }

  async function executeDelete() {
    if (!deleteTargetId) return;
    setDeletingId(deleteTargetId);
    try {
      await superAdminService.deleteBroadcast(deleteTargetId);
      setBroadcasts(prev => prev.filter(b => b.id !== deleteTargetId));
      showToast('Announcement removed from feed');
      setDeleteTargetId(null);
    } catch (err) {
      console.error('Failed to delete broadcast:', err);
      showToast(err.message || 'Failed to delete announcement', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  const broadcastTypes = [
    { id: 'info', label: 'General Info', icon: Info, color: 'blue' },
    { id: 'update', label: 'Feature Release', icon: Zap, color: 'indigo' },
    { id: 'warning', label: 'System Alert', icon: AlertTriangle, color: 'amber' },
    { id: 'success', label: 'Success / Promo', icon: CheckCircle2, color: 'emerald' },
  ];

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
              <Radio className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Live Feeds & Dispatch</span>
          </div>
          <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Broadcast Hub</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Deliver synchronous platform banners and critical updates directly to gym owner dashboards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Delivery Network
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Broadcast Composer (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100 dark:border-zinc-800">
              <Megaphone className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Compose Announcement</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Target specific gyms or dispatch network-wide alerts.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Target Audience
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <select
                    value={targetGymId}
                    onChange={(e) => setTargetGymId(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 cursor-pointer"
                  >
                    <option value="all">Network-wide (All Active Gym Facilities)</option>
                    {gyms.map(gym => (
                      <option key={gym.id} value={gym.id}>Targeted Gym: {gym.gym_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Classification
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {broadcastTypes.map((t) => {
                    const Icon = t.icon;
                    const isSelected = formData.type === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, type: t.id })}
                        className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          isSelected 
                            ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700' 
                            : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:border-slate-300'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Announcement Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Scheduled Maintenance Notice on Sunday 2:00 AM"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-zinc-300 mb-1.5">
                  Detailed Content <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Explain the update, impact on gyms, or special instructions..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 resize-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer"
                >
                  {sending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      <span>Broadcasting to Fleet...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Dispatch Broadcast Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Live Preview Card */}
          {(formData.title || formData.message) && (
            <div className="bg-white dark:bg-zinc-900 border border-violet-200 dark:border-violet-900/40 rounded-2xl p-5 space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-violet-600 dark:text-violet-400">
                <Eye className="w-4 h-4" />
                <span>Live Owner Preview</span>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700">
                <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                  {formData.title || 'Untitled Notification'}
                </h5>
                <p className="text-xs text-slate-600 dark:text-zinc-300 mt-1 whitespace-pre-wrap">
                  {formData.message || 'Notification content will appear here...'}
                </p>
                <span className="inline-block mt-3 text-[10px] text-slate-400 dark:text-zinc-500">
                  Target: {targetGymId === 'all' ? 'All Gym Owners' : 'Targeted Partner'} • Just now
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Broadcast Delivery History (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Broadcast Ledger</h4>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300">
              {broadcasts.length} Messages Dispatched
            </span>
          </div>

          <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-20 text-center text-slate-500 dark:text-zinc-400 text-xs">
                <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin mx-auto mb-2" />
                Loading dispatch records...
              </div>
            ) : broadcasts.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-10 text-center">
                <Bell className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-900 dark:text-white">No broadcast history</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Dispatched alerts will appear here in chronological order.</p>
              </div>
            ) : (
              broadcasts.map((b) => {
                const isWarning = b.type === 'warning';
                const isUpdate = b.type === 'update';
                const isSuccess = b.type === 'success';

                return (
                  <div 
                    key={b.id} 
                    className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 transition-all group relative"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="shrink-0 mt-0.5">
                          {isWarning ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> :
                           isUpdate ? <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" /> :
                           isSuccess ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> :
                           <Info className="w-4 h-4 text-slate-500 dark:text-zinc-400" />}
                        </span>
                        <div className="min-w-0">
                          <h5 className="font-bold text-slate-900 dark:text-white text-xs leading-snug">
                            {b.title}
                          </h5>
                          <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(b.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleDeleteClick(b.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors shrink-0"
                        title="Delete announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-300 mt-2.5 leading-relaxed">
                      {b.message}
                    </p>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between text-[11px]">
                      <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Dispatched to Portal
                      </span>
                      <span className="text-slate-400 dark:text-zinc-500 font-medium">
                        {b.target_gym_id ? 'Targeted' : 'Network Wide'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!deleteTargetId}
        title="Delete Announcement"
        message="Are you sure you want to remove this announcement from the platform feed? It will immediately disappear from gym dashboards."
        confirmLabel="Remove Announcement"
        loading={deletingId === deleteTargetId}
        onConfirm={executeDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
