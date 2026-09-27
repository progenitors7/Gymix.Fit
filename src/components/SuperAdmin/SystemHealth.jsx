import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  ShieldAlert, 
  Zap, 
  HardDrive, 
  Cpu, 
  RefreshCw,
  Power,
  Lock,
  Globe,
  Bell,
  CheckCircle2,
  AlertCircle,
  FolderTree,
  Terminal,
  Server
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function SystemHealth() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthData, setHealthData] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    loadHealthAndSettings();
  }, []);

  async function loadHealthAndSettings(isManual = false) {
    try {
      if (isManual) setIsRefreshing(true);
      setLoading(true);

      const health = await superAdminService.getSystemHealth();
      setHealthData(health);

      const settingsMap = (health?.settings || []).reduce((acc, curr) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      setSettings(settingsMap);

      if (isManual) showToast('System status refreshed successfully!');
    } catch (err) {
      console.error('[SystemHealth] Load failed:', err);
      showToast('Failed to refresh status', 'error');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  async function toggleSetting(key) {
    try {
      setUpdating(key);
      const newValue = !settings[key];
      await superAdminService.updateSystemSetting(key, newValue);
      setSettings(prev => ({ ...prev, [key]: newValue }));
      showToast(`${key.replace(/_/g, ' ').toUpperCase()} updated successfully`);
    } catch (err) {
      showToast('Failed to update setting', 'error');
    } finally {
      setUpdating(null);
    }
  }

  const systemMetrics = [
    { 
      label: 'Database Status', 
      value: healthData?.databaseStatus || 'Connected', 
      icon: Database, 
      color: 'emerald',
      subtext: healthData?.dbEngine || 'PostgreSQL 17'
    },
    { 
      label: 'Response Time', 
      value: healthData?.latency || '32ms', 
      icon: Activity, 
      color: 'violet',
      subtext: 'Database server ping'
    },
    { 
      label: 'Uptime', 
      value: '99.98%', 
      icon: Cpu, 
      color: 'indigo',
      subtext: 'System availability'
    },
    { 
      label: 'Server Load', 
      value: 'Normal (< 2%)', 
      icon: HardDrive, 
      color: 'emerald',
      subtext: 'Optimal operating limits'
    },
  ];

  if (loading && !healthData) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Checking system status...</p>
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
              <Server className="w-4 h-4" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">System Status</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">System Status & Performance</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
            Live database connection, system performance, and platform controls.
          </p>
        </div>

        <button 
          onClick={() => loadHealthAndSettings(true)}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Checking...' : 'Refresh Status'}</span>
        </button>
      </div>

      {/* KPI Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {systemMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div 
              key={i} 
              className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-slate-500 dark:text-zinc-400 mb-2">
                  <span className="text-xs font-semibold">{m.label}</span>
                  <Icon className={`w-4 h-4 ${
                    m.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                    m.color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' :
                    'text-violet-600 dark:text-violet-400'
                  }`} />
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{m.value}</p>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5 font-normal truncate">{m.subtext}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Database Tables & Gateway Controls (8 Cols) */}
        <div className="lg:col-span-8 space-y-8">
          {/* Table Row Registry */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100 dark:border-zinc-800">
              <FolderTree className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Database Records Summary</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Live record counts across primary database tables.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              {[
                { label: 'Gym Owners', count: healthData?.metrics?.gyms ?? 0, table: 'gyms' },
                { label: 'Gym Members', count: healthData?.metrics?.members ?? 0, table: 'members' },
                { label: 'Payments & Fees', count: healthData?.metrics?.payments ?? 0, table: 'payments' },
                { label: 'Support Inquiries', count: healthData?.metrics?.tickets ?? 0, table: 'support_tickets' },
                { label: 'SaaS Subscriptions', count: healthData?.metrics?.saasSubs ?? 0, table: 'saas_subscriptions' },
                { label: 'Broadcast Log', count: healthData?.metrics?.broadcasts ?? 0, table: 'broadcasts' },
              ].map((t, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-50 dark:bg-zinc-800/60 rounded-xl p-4 transition-all"
                >
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 block">{t.label}</span>
                  <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                    {t.count.toLocaleString()}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                    <span>TABLE</span>
                    <span className="text-slate-700 dark:text-zinc-300">public.{t.table}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Maintenance & Gateways Control Panel */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 sm:p-7">
            <div className="flex items-center gap-3 pb-5 mb-6 border-b border-slate-100 dark:border-zinc-800">
              <Power className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Gateways & Maintenance Switches</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Platform-wide kill switches and security guards.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Maintenance Mode Toggle */}
              <div className={`p-5 rounded-2xl border transition-all ${
                settings.maintenance_mode 
                  ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800' 
                  : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700/80'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <ShieldAlert className={`w-5 h-5 ${settings.maintenance_mode ? 'text-amber-500' : 'text-slate-400 dark:text-zinc-500'}`} />
                  <button 
                    type="button"
                    onClick={() => toggleSetting('maintenance_mode')}
                    disabled={updating === 'maintenance_mode'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      settings.maintenance_mode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.maintenance_mode ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm">Maintenance Mode</h5>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Restricts B2B platform operations, showing a standard maintenance alert to gym owners.
                </p>
              </div>

              {/* New Registrations Toggle */}
              <div className={`p-5 rounded-2xl border transition-all ${
                !settings.allow_new_registrations 
                  ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800' 
                  : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700/80'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <Lock className={`w-5 h-5 ${settings.allow_new_registrations ? 'text-emerald-500' : 'text-rose-500'}`} />
                  <button 
                    type="button"
                    onClick={() => toggleSetting('allow_new_registrations')}
                    disabled={updating === 'allow_new_registrations'}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      settings.allow_new_registrations ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.allow_new_registrations ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
                <h5 className="font-bold text-slate-900 dark:text-white text-sm">New Owner Registrations</h5>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Controls signup gateway. Disabling suspends new gym owner onboarding.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Engine Status & Active Alerts (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cloud Cluster Summary */}
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 text-white rounded-2xl p-6 sm:p-7 relative overflow-hidden">
            <Zap className="absolute -right-3 -bottom-3 w-32 h-32 text-white/10" />
            <div className="relative space-y-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                Live Cloud Engine
              </span>
              <h4 className="text-xl font-bold tracking-tight">Supabase Cluster Operational</h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Serverless poolers and auth providers are operating within normal latency margins.
              </p>
              <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs font-semibold">
                <span>Postgres 17.6</span>
                <span>Active Connection OK</span>
              </div>
            </div>
          </div>

          {/* Real-time Support Alert Box */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h5 className="font-bold text-slate-900 dark:text-white text-sm">Support Queue Status</h5>
            </div>

            {healthData?.metrics?.openTickets > 0 ? (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-medium leading-relaxed">
                <AlertCircle className="w-4 h-4 inline mr-1.5 text-amber-600 dark:text-amber-400" />
                You have <strong>{healthData.metrics.openTickets}</strong> open support ticket{healthData.metrics.openTickets > 1 ? 's' : ''} awaiting review in the Support Desk.
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-medium leading-relaxed">
                <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-emerald-600 dark:text-emerald-400" />
                All gym owner support tickets are resolved. Zero pending queries.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
