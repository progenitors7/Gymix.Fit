import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  Users, 
  Building2, 
  IndianRupee, 
  TrendingUp, 
  ArrowLeft, 
  RefreshCw,
  Zap,
  ChevronRight,
  ShieldCheck,
  LayoutGrid,
  Settings2,
  Megaphone,
  CreditCard,
  LifeBuoy,
  Activity,
  Ticket
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSuperAdminStats } from '../hooks/useSuperAdminStats';
import GymManagement from '../components/SuperAdmin/GymManagement';
import BroadcastSystem from '../components/SuperAdmin/BroadcastSystem';
import PlanManager from '../components/SuperAdmin/PlanManager';
import SupportCenter from '../components/SuperAdmin/SupportCenter';
import SystemHealth from '../components/SuperAdmin/SystemHealth';
import PromoCodeManager from '../components/SuperAdmin/PromoCodeManager';
import SystemSettings from '../components/SuperAdmin/SystemSettings';
import Toast from '../components/UI/Toast';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function StatCard({ title, value, icon, trend, subtext }) {
  return (
    <motion.div 
      variants={itemVariants}
      className="bg-[#161b22] border border-white/10 rounded-2xl p-6 transition-all hover:border-white/20 group"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-300 transition-all">
          {icon}
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-3xl font-black text-white tracking-tight">{value}</p>
      {subtext && <p className="text-slate-600 text-[10px] mt-2 font-bold uppercase tracking-wider">{subtext}</p>}
    </motion.div>
  );
}

export default function SuperAdminPage() {
  const { stats, loading, error, refresh } = useSuperAdminStats();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  const handleSync = async () => {
    try {
      setSyncing(true);
      await refresh();
      setToast({ message: 'Platform data synced successfully', type: 'success' });
    } catch (err) {
      setToast({ message: 'Sync failed: ' + err.message, type: 'error' });
    } finally {
      setTimeout(() => setSyncing(false), 1000);
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#3390ec]/20 border-t-[#3390ec] rounded-full animate-spin" />
          <p className="text-slate-500 text-[10px] font-bold tracking-widest uppercase">Loading Core OS...</p>
        </div>
      </div>
    );
  }

  const TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'gyms', label: 'Directory', icon: <Building2 className="w-4 h-4" /> },
    { id: 'broadcast', label: 'Broadcast', icon: <Megaphone className="w-4 h-4" /> },
    { id: 'plans', label: 'Plans', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'promo', label: 'Promo', icon: <Ticket className="w-4 h-4" /> },
    { id: 'support', label: 'Support', icon: <LifeBuoy className="w-4 h-4" /> },
    { id: 'health', label: 'Health', icon: <Activity className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings2 className="w-4 h-4" /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="p-6 sm:p-8 max-w-7xl mx-auto space-y-10"
    >
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-3 rounded-xl bg-[#161b22] border border-white/10 text-slate-400 hover:text-white transition-all active:scale-95 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-6 h-6 text-white shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight truncate">Super Admin</h1>
            </div>
            <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Enterprise Management Layer</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex overflow-x-auto hide-scrollbar bg-[#161b22] p-1.5 rounded-xl border border-white/10 w-full xl:w-auto justify-start xl:justify-end gap-1.5 scroll-smooth">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 whitespace-nowrap shrink-0 ${
                activeTab === tab.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <Toast 
        message={toast.message} 
        type={toast.type} 
        onClose={() => setToast({ message: '', type: 'success' })} 
      />

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm font-bold flex items-center gap-3 glass-card"
        >
          <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          {error}
        </motion.div>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="space-y-8"
            >
              {/* Platform Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Total Gym Accounts"
                  value={stats?.totalGyms || 0}
                  icon={<Building2 className="w-5 h-5" />}
                  trend={stats?.growthRate >= 0 ? `+${stats.growthRate}%` : `${stats.growthRate}%`}
                  subtext={`Active: ${stats?.activeGyms || 0} | Pending: ${stats?.pendingGyms || 0}`}
                />
                <StatCard 
                  title="Expired SaaS Plans"
                  value={stats?.expiredGyms || 0}
                  icon={<Building2 className="w-5 h-5 text-rose-400" />}
                  trend={stats?.expiredGyms > 0 ? "Action Required" : "All Good"}
                  subtext="Gyms needing plan renewal"
                />
                <StatCard 
                  title="Active Athletes / Members"
                  value={stats?.totalMembers || 0}
                  icon={<Users className="w-5 h-5" />}
                  subtext="Aggregated across platform"
                />
                <StatCard 
                  title="Aggregated Revenue"
                  value={`₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                  icon={<IndianRupee className="w-5 h-5" />}
                  subtext="Total SaaS Earnings"
                />
              </div>

              {/* Quick Actions */}
              <motion.div 
                variants={itemVariants}
                className="bg-[#161b22] border border-white/10 rounded-2xl p-8 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 text-white/[0.02]">
                  <Zap className="w-48 h-48 -mr-12 -mt-12 transform rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <ShieldCheck className="w-5 h-5 text-white" />
                    <h2 className="text-lg font-semibold text-white tracking-tight">Platform Controls</h2>
                  </div>
                  <p className="text-slate-500 text-sm max-w-lg mb-8 leading-relaxed font-medium">
                    You are currently in the Super Admin interface. All actions here affect the global SaaS state. Please handle moderation and broadcasts with care.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button 
                      onClick={handleSync}
                      disabled={syncing}
                      className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:bg-slate-200 active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                      {syncing ? 'Syncing...' : 'Sync Data'}
                    </button>
                    <button 
                      onClick={() => setActiveTab('settings')}
                      className="flex items-center gap-2 bg-transparent text-slate-300 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all hover:text-white hover:bg-white/10 active:scale-95 border border-white/10"
                    >
                      <Settings2 className="w-4 h-4" />
                      Global Config
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
          
          {activeTab === 'gyms' && <GymManagement />}
          {activeTab === 'broadcast' && <BroadcastSystem />}
          {activeTab === 'plans' && <PlanManager />}
          {activeTab === 'promo' && <PromoCodeManager />}
          {activeTab === 'support' && <SupportCenter />}
          {activeTab === 'health' && <SystemHealth />}
          {activeTab === 'settings' && <SystemSettings />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
