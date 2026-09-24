import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Power, 
  UserPlus, 
  MessageCircle, 
  Save,
  Loader2,
  ShieldAlert,
  Sliders,
  CheckCircle2
} from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';
import Toast from '../UI/Toast';

export default function SystemSettings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings(quiet = false) {
    try {
      if (!quiet) setLoading(true);
      const data = await superAdminService.getSystemSettings();
      setSettings(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load system settings', 'error');
    } finally {
      if (!quiet) setLoading(false);
    }
  }

  async function handleUpdate(key, value) {
    try {
      setSaving(key);
      await superAdminService.updateSystemSetting(key, value);
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
      showToast(`${key.replace(/_/g, ' ').toUpperCase()} updated successfully`);
    } catch (err) {
      await fetchSettings(true);
      showToast('Failed to update setting', 'error');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-10 h-10 border-3 border-blue-500/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">Loading global configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300 max-w-4xl mx-auto">
      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {/* Header Section */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center justify-center p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <Sliders className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Platform Governance</span>
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global System Configuration</h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-0.5">
          Master switches and operational flags governing the entire multi-tenant SaaS fleet.
        </p>
      </div>

      {/* Settings Cards List */}
      <div className="space-y-4">
        {settings.map((setting) => {
          const isMaintenance = setting.key === 'maintenance_mode';
          const isRegistration = setting.key === 'allow_new_registrations';

          return (
            <div 
              key={setting.key}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  isMaintenance 
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' 
                    : isRegistration 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                }`}>
                  {isMaintenance ? <Power className="w-5 h-5" /> :
                   isRegistration ? <UserPlus className="w-5 h-5" /> :
                   <MessageCircle className="w-5 h-5" />}
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                    {setting.key.replace(/_/g, ' ').toUpperCase()}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-lg mt-0.5 leading-relaxed">
                    {isMaintenance 
                      ? 'Lock the entire platform for maintenance. Non-super admin sessions will be blocked with a system notice.' 
                      : isRegistration 
                      ? 'Enable or pause new gym owner registration on the onboarding gateway.' 
                      : 'Define global configuration parameters across platform instances.'}
                  </p>
                </div>
              </div>

              {/* Action Control */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                {typeof setting.value === 'boolean' ? (
                  <button
                    type="button"
                    onClick={() => handleUpdate(setting.key, !setting.value)}
                    disabled={saving === setting.key}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      setting.value 
                        ? (isMaintenance ? 'bg-rose-500' : 'bg-violet-600') 
                        : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        setting.value ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                    {saving === setting.key && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                        <Loader2 className="w-3 h-3 text-white animate-spin" />
                      </div>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      value={typeof setting.value === 'object' ? JSON.stringify(setting.value) : (setting.value ?? '')}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (typeof setting.value === 'object') {
                          try { val = JSON.parse(e.target.value); } catch (_) {}
                        }
                        setSettings(prev => prev.map(s => s.key === setting.key ? { ...s, value: val } : s));
                      }}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-48 sm:w-60"
                    />
                    <button 
                      onClick={() => handleUpdate(setting.key, setting.value)}
                      disabled={saving === setting.key}
                      className="p-2 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl transition-all disabled:opacity-50 cursor-pointer"
                      title="Save Setting"
                    >
                      {saving === setting.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Production Warning Notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-5 flex items-start gap-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h5 className="font-bold text-amber-900 dark:text-amber-300 text-xs uppercase tracking-wider mb-0.5">
            Production Environment Warning
          </h5>
          <p className="text-xs text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
            Settings committed here take effect immediately across all connected gym dashboards and mobile athlete clients. Enabling Maintenance Mode will pause active owner workflows until restored.
          </p>
        </div>
      </div>
    </div>
  );
}
