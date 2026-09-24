import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Smartphone, 
  Users, 
  Radio,
  RefreshCw,
  Clock,
  Info,
  ShieldCheck,
  Volume2
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function PushBroadcaster() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [dispatchHistory, setDispatchHistory] = useState([]);

  const [form, setForm] = useState({
    title: '',
    body: '',
    audience: 'all', // 'all' | 'owners' | 'members'
    route: '/dashboard',
    priority: 'high',
    playSound: true
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  async function fetchTokens() {
    try {
      setLoading(true);
      const data = await superAdminService.getPushTokens();
      setTokens(data || []);
    } catch (err) {
      console.error(err);
      showToast('Notice: Could not load device fleet list', 'info');
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      return showToast('Title and Message Body are required', 'error');
    }

    try {
      setSending(true);
      const result = await superAdminService.dispatchPushNotification({
        title: form.title,
        body: form.body,
        audience: form.audience,
        route: form.route,
        customData: {
          priority: form.priority,
          sound: form.playSound ? 'default' : 'silent',
          dispatched_at: new Date().toISOString()
        }
      });

      const newHistoryItem = {
        id: Date.now(),
        title: form.title,
        body: form.body,
        audience: form.audience,
        route: form.route,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        tokenCount: tokens.length
      };

      setDispatchHistory(prev => [newHistoryItem, ...prev]);
      
      if (result?.edgeSuccess) {
        showToast(`Dispatched to mobile push devices and in-app feed!`);
      } else {
        showToast(`Broadcast delivered to in-app notification feed!`);
      }
      
      setForm(prev => ({ ...prev, title: '', body: '' }));
    } catch (err) {
      console.error(err);
      showToast('Dispatch error: ' + (err.message || 'Check connection'), 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />

      {/* ── Push Fleet Status KPI Cards (90% Neutral Canvas) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <Smartphone className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <span className="text-[10px] font-black uppercase text-violet-700 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-md border border-violet-500/20">
              Fleet
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Registered Handsets</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">{tokens.length}</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Capacitor Android & PWA devices</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <Radio className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Delivery Mode</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">Dual Relay</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Native FCM push + In-app notification fallback</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-slate-500 dark:text-zinc-400" />
            <span className="text-[10px] font-black uppercase text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-zinc-700">
              Audience
            </span>
          </div>
          <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Target Reach</p>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">Gym Owners & Members</p>
          <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1 font-medium">Segmentable by role or platform-wide</p>
        </div>
      </div>

      {/* ── Main Composer & Device Breakdown Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Notification Composer */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
            <Send className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Compose Push Notification</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Delivered directly to user mobile lockscreens & in-app alerts</p>
            </div>
          </div>

          <form onSubmit={handleSend} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                Headline / Title <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                value={form.title}
                onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Gymix Update: New automated check-in live"
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium transition-all"
                required
              />
            </div>

            {/* Message Body */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                Message Body <span className="text-rose-500">*</span>
              </label>
              <textarea 
                value={form.body}
                onChange={(e) => setForm(prev => ({ ...prev, body: e.target.value }))}
                placeholder="Write clear, engaging notification copy for gym owners or athletes..."
                rows={3}
                className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 font-medium resize-none transition-all"
                required
              />
            </div>

            {/* Audience & Deep Link Route */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                  Target Audience
                </label>
                <select
                  value={form.audience}
                  onChange={(e) => setForm(prev => ({ ...prev, audience: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-violet-500 font-semibold cursor-pointer"
                >
                  <option value="all">All Platform Users ({tokens.length} Devices)</option>
                  <option value="owners">Gym Owners Only</option>
                  <option value="members">Athletes & Members Only</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block mb-1.5">
                  Tap Action / Deep Link Route
                </label>
                <select
                  value={form.route}
                  onChange={(e) => setForm(prev => ({ ...prev, route: e.target.value }))}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-zinc-200 focus:outline-none focus:border-violet-500 font-semibold cursor-pointer"
                >
                  <option value="/dashboard">Open Dashboard (/dashboard)</option>
                  <option value="/notifications">Open Notifications (/notifications)</option>
                  <option value="/billing">Open SaaS Billing (/billing)</option>
                  <option value="/store">Open Hardware Store (/store)</option>
                  <option value="/scanner">Open QR Scanner (/scanner)</option>
                  <option value="/leaderboard">Open Leaderboard (/leaderboard)</option>
                </select>
              </div>
            </div>

            {/* Sound & Priority */}
            <div className="flex flex-wrap items-center gap-6 pt-1 pb-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <input 
                  type="checkbox"
                  checked={form.playSound}
                  onChange={(e) => setForm(prev => ({ ...prev, playSound: e.target.checked }))}
                  className="w-4 h-4 rounded text-violet-600 bg-slate-100 dark:bg-zinc-800 border-slate-300 dark:border-zinc-700 focus:ring-0"
                />
                <Volume2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Play Device Notification Sound
              </label>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold tracking-wide text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Broadcasting Notification...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dispatch Push Notification</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Col: Mobile Preview Mockup */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">Lockscreen Preview</p>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Real-time</span>
            </div>

            {/* Handset Frame */}
            <div className="bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-zinc-400 font-bold mb-2 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                <span>GYMIX NOTIFICATION</span>
                <span>Just Now</span>
              </div>

              {/* Notification Banner */}
              <div className="bg-white dark:bg-zinc-900 border border-violet-500/30 rounded-lg p-3 space-y-1 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded bg-violet-500/15 flex items-center justify-center text-violet-600 dark:text-violet-400 text-[10px] font-black">
                    GX
                  </div>
                  <p className="text-slate-900 dark:text-white font-bold text-xs truncate">
                    {form.title || 'Gymix Notification Title'}
                  </p>
                </div>
                <p className="text-slate-600 dark:text-zinc-300 text-[11px] leading-relaxed line-clamp-3">
                  {form.body || 'This is how your broadcast appears on mobile devices.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 rounded-xl p-4 text-xs text-slate-600 dark:text-zinc-400 space-y-1">
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold">
              <Info className="w-4 h-4" />
              <span>Reliable Notification Protocol</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-500 dark:text-zinc-400">
              Dispatches via native Android Firebase relay while synchronously mirroring to the user in-app notification center.
            </p>
          </div>
        </div>
      </div>

      {/* ── Registered Tokens Fleet Table ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Registered Device Fleet ({tokens.length})</h4>
            <p className="text-[10px] text-slate-500 dark:text-zinc-400">Active handsets registered with push permissions</p>
          </div>
          <button
            onClick={fetchTokens}
            className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 rounded-xl text-slate-600 dark:text-zinc-300 transition-all cursor-pointer active:scale-95"
            title="Refresh Tokens"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-600' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-200 dark:border-zinc-800 text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
                <th className="px-5 py-3.5">User Profile</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Platform</th>
                <th className="px-5 py-3.5">Device / Token</th>
                <th className="px-5 py-3.5">Last Synced</th>
                <th className="px-5 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-xs font-medium">
              {tokens.map((tk, idx) => {
                const tokenStr = tk.fcm_token || tk.token || '';
                const timeStr = tk.updated_at || tk.created_at;
                return (
                  <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white">
                      {tk.profiles?.full_name || tk.profiles?.email || 'Registered User'}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {tk.profiles?.role || 'member'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 dark:text-zinc-400 uppercase text-[10px] font-bold">
                      {tk.platform || 'Android'}
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500 dark:text-zinc-400 max-w-[220px] truncate" title={tokenStr}>
                      {tokenStr ? `${tokenStr.slice(0, 14)}...${tokenStr.slice(-10)}` : 'Active'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-zinc-400 text-[11px]">
                      {timeStr ? new Date(timeStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Online
                      </span>
                    </td>
                  </tr>
                );
              })}
              {tokens.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-zinc-400">
                    No push devices currently registered in this session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
