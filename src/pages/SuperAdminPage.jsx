import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Building2, 
  IndianRupee, 
  TrendingUp, 
  RefreshCw,
  Zap,
  ShieldCheck, 
  LayoutGrid, 
  Settings2, 
  Megaphone, 
  CreditCard, 
  LifeBuoy, 
  Activity, 
  Ticket, 
  LogOut, 
  SlidersHorizontal, 
  ArrowUpRight, 
  Menu, 
  X, 
  Package, 
  Smartphone 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSuperAdminStats } from '../hooks/useSuperAdminStats';
import GymManagement from '../components/SuperAdmin/GymManagement';
import BroadcastSystem from '../components/SuperAdmin/BroadcastSystem';
import PlanManager from '../components/SuperAdmin/PlanManager';
import SupportCenter from '../components/SuperAdmin/SupportCenter';
import SystemHealth from '../components/SuperAdmin/SystemHealth';
import PromoCodeManager from '../components/SuperAdmin/PromoCodeManager';
import SystemSettings from '../components/SuperAdmin/SystemSettings';
import RevenueLedger from '../components/SuperAdmin/RevenueLedger';
import StoreOrdersManager from '../components/SuperAdmin/StoreOrdersManager';
import PushBroadcaster from '../components/SuperAdmin/PushBroadcaster';
import UserSecurityManager from '../components/SuperAdmin/UserSecurityManager';
import ThemeToggle from '../components/UI/ThemeToggle';
import Toast from '../components/UI/Toast';
import Logo from '../components/UI/Logo';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 320, damping: 25 } }
};

function StatCard({ title, value, icon, trend, subtext }) {
  return (
    <motion.div 
      variants={itemVariants}
      className="bg-white/60 dark:bg-zinc-900/40 backdrop-blur-xs border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5 transition-colors hover:border-slate-300 dark:hover:border-white/[0.12] relative overflow-hidden group"
    >
      <div className="flex items-center justify-between mb-3 relative z-10">
        <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
          <span className="text-violet-600 dark:text-violet-400">{icon}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{title}</span>
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight">
            <TrendingUp className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{value}</p>
      {subtext && <p className="text-slate-500 dark:text-zinc-400 text-[11px] mt-1.5 font-medium leading-relaxed">{subtext}</p>}
    </motion.div>
  );
}

export default function SuperAdminPage() {
  const { user, signOut } = useAuth();
  const { stats, loading, error, refresh } = useSuperAdminStats();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncing, setSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();
  const mainContentRef = useRef(null);

  const handleSync = async () => {
    try {
      setSyncing(true);
      await refresh();
      setToast({ message: 'Platform data synced successfully', type: 'success' });
    } catch (err) {
      setToast({ message: 'Sync failed: ' + err.message, type: 'error' });
    } finally {
      setTimeout(() => setSyncing(false), 800);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch {
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 transition-colors duration-200">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-20 h-20 rounded-full bg-violet-500/10 dark:bg-violet-500/15 blur-xl animate-pulse" />
            <Logo className="w-14 h-14 relative z-10" />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-900 dark:text-white">
              Initializing Master Command Center
            </p>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
              Synchronizing platform telemetry & system metrics...
            </p>
          </div>
          <div className="w-7 h-7 border-2 border-violet-500/20 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin mt-1" />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl space-y-4">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 text-xl mx-auto">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Failed to Connect to Platform</h2>
          <p className="text-slate-600 dark:text-zinc-400 text-xs leading-relaxed">
            {error || 'Unable to retrieve Super Admin telemetry metrics.'}
          </p>
          <div className="space-y-2 pt-2">
            <button
              onClick={handleSync}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
            >
              Go to Gym Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const NAV_SECTIONS = [
    {
      title: 'CORE',
      items: [
        { id: 'dashboard', label: 'Overview', icon: <LayoutGrid className="w-4 h-4" />, subtext: 'Platform analytics & summary' }
      ]
    },
    {
      title: 'FINANCIALS & COMMERCE',
      items: [
        { id: 'financials', label: 'SaaS Financials', icon: <IndianRupee className="w-4 h-4" />, badge: 'REV', subtext: 'Subscription ledger & payments' },
        { id: 'orders', label: 'Hardware & Store Orders', icon: <Package className="w-4 h-4" />, subtext: 'Fulfillment & customer orders' },
        { id: 'plans', label: 'SaaS Plans', icon: <CreditCard className="w-4 h-4" />, subtext: 'Pricing tiers & feature limits' },
        { id: 'promo', label: 'Promo Codes', icon: <Ticket className="w-4 h-4" />, subtext: 'Platform coupon engine' },
      ]
    },
    {
      title: 'TENANTS & USERS',
      items: [
        { id: 'gyms', label: 'Gym Directory', icon: <Building2 className="w-4 h-4" />, badge: stats?.totalGyms ? `${stats.totalGyms}` : null, subtext: 'Gym owners, subs & activations' },
        { id: 'athletes', label: 'Athletes Master', icon: <Users className="w-4 h-4" />, badge: stats?.totalMembers ? `${stats.totalMembers}` : null, subtext: 'Cross-tenant member records' },
        { id: 'users', label: 'User Security & Auth', icon: <ShieldCheck className="w-4 h-4" />, subtext: 'Profile directory & RBAC control' },
      ]
    },
    {
      title: 'OPERATIONS & ENGINE',
      items: [
        { id: 'push', label: 'Push Notifications', icon: <Smartphone className="w-4 h-4" />, subtext: 'Firebase mobile broadcasts' },
        { id: 'broadcast', label: 'In-App Broadcasts', icon: <Megaphone className="w-4 h-4" />, subtext: 'Global announcement banner' },
        { id: 'support', label: 'Support Desk', icon: <LifeBuoy className="w-4 h-4" />, subtext: 'Inquiries & owner assistance' },
        { id: 'health', label: 'Engine Health', icon: <Activity className="w-4 h-4" />, badge: 'LIVE', subtext: 'Database latency & logs' },
        { id: 'settings', label: 'Global Settings', icon: <Settings2 className="w-4 h-4" />, subtext: 'Universal switches & config' },
      ]
    }
  ];

  const allNavItems = NAV_SECTIONS.flatMap(s => s.items);
  const currentItem = allNavItems.find(i => i.id === activeTab) || allNavItems[0];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex selection:bg-violet-500/20 selection:text-violet-800 dark:selection:text-violet-300">
      {/* ── Mobile Drawer Backdrop ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-[110]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Left Sidebar Navigation (Mobile Drawer) ── */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-[120] lg:z-30 h-screen w-72 sm:w-80 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out shrink-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
              <Logo className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-slate-900 dark:text-white text-base tracking-tight leading-none">GYMIX</span>
                <span className="text-[9px] font-black uppercase tracking-wider bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-500/30 px-1.5 py-0.5 rounded-md">
                  Super Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider mt-1">Enterprise Console</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6 hide-scrollbar">
          {NAV_SECTIONS.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2">
                {section.title}
              </p>
              {section.items.map(item => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-150 group cursor-pointer ${
                      isActive
                        ? 'bg-violet-500/10 text-violet-700 dark:text-violet-300 font-extrabold'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`transition-colors ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-zinc-200'}`}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.badge === 'LIVE'
                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 animate-pulse'
                          : isActive
                            ? 'bg-violet-500/20 text-violet-800 dark:text-violet-300 font-extrabold'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer User & Controls */}
        <div className="p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 space-y-2.5">
          {/* Switch to Gym Portal Button */}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              navigate('/dashboard');
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 active:scale-95 border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-violet-600 dark:text-violet-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span>Gym Owner Portal</span>
            </div>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold">Switch &rarr;</span>
          </button>

          {/* Profile Card */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
            <div className="w-8 h-8 rounded-full bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 font-black text-xs shrink-0">
              {user?.email?.slice(0, 2).toUpperCase() || 'SA'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.email}</p>
              <p className="text-[9px] text-violet-600 dark:text-violet-400 font-extrabold uppercase tracking-wider">Root Administrator</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 border border-slate-200 dark:border-zinc-800 rounded-xl text-[11px] font-bold text-slate-700 dark:text-zinc-300 transition-all cursor-pointer disabled:opacity-50"
              title="Sync Platform Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-violet-500' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Data'}</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 border border-rose-500/20 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content Area with Header ── */}
      <div ref={mainContentRef} className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-b border-slate-200 dark:border-zinc-800 px-3 sm:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white cursor-pointer active:scale-95 shrink-0"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {currentItem.label}
                </h2>
                <span className="text-[9px] sm:text-[10px] font-extrabold uppercase px-1.5 sm:px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-400 border border-violet-500/20 shrink-0">
                  Control Center
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium hidden sm:block truncate">
                {currentItem.subtext}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Quick Gym App link */}
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 active:scale-95 border border-slate-200 dark:border-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 hover:text-violet-600 dark:hover:text-violet-400 transition-all cursor-pointer"
              title="Open Gym Owner Portal"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              <span className="hidden xs:inline">Gym App</span>
            </button>

            {/* Theme Toggle */}
            <ThemeToggle variant="segmented" className="hidden sm:inline-flex" />
            <ThemeToggle variant="compact" className="sm:hidden" />

            {/* Live DB Indicator */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 dark:text-zinc-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DB Online</span>
            </div>

            {/* Sync Button */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 sm:px-3 sm:py-1.5 bg-slate-100 dark:bg-zinc-900 hover:bg-slate-200 dark:hover:bg-zinc-800 active:scale-95 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Sync Platform Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-violet-500' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          </div>
        </header>

        {/* Toast Notifications */}
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ message: '', type: 'success' })} 
        />

        {/* ── Main Tab Content ── */}
        <main className="flex-1 p-3.5 sm:p-8 pb-24 lg:pb-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 text-rose-400 text-sm font-bold flex items-center gap-3"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span>{error}</span>
          </motion.div>
        )}

          <div key={activeTab}>
            {/* ── SECTION 1: OVERVIEW DASHBOARD ── */}
            {activeTab === 'dashboard' && (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-8"
              >
                {/* Platform Summary KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  <StatCard 
                    title="Total Registered Gyms"
                    value={stats?.totalGyms || 0}
                    icon={<Building2 className="w-5 h-5" />}
                    trend={stats?.growthRate >= 0 ? `+${stats.growthRate}% MoM` : `${stats.growthRate}% MoM`}
                    subtext={`Active: ${stats?.activeGyms || 0} | Expired: ${stats?.expiredGyms || 0} | Pending: ${stats?.pendingGyms || 0}`}
                  />
                  <StatCard 
                    title="Platform Athlete Base"
                    value={stats?.totalMembers || 0}
                    icon={<Users className="w-5 h-5" />}
                    subtext="Aggregated across all verified gyms"
                  />
                  <StatCard 
                    title="Aggregated SaaS Revenue"
                    value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`}
                    icon={<IndianRupee className="w-5 h-5" />}
                    subtext="Completed SaaS plan collections"
                  />
                  <StatCard 
                    title="Attention Required"
                    value={stats?.expiredGyms || 0}
                    icon={<Activity className="w-5 h-5" />}
                    trend={stats?.expiredGyms > 0 ? "Expired Plans" : "Clean State"}
                    subtext={`${stats?.pendingGyms || 0} gym accounts awaiting activation`}
                  />
                </div>

                {/* Quick Launch Control Hub */}
                <motion.div 
                  variants={itemVariants}
                  className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-zinc-800">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Zap className="w-5 h-5 text-emerald-500" />
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Master Control Station</h2>
                      </div>
                      <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium max-w-xl">
                        Direct access to core administrative engines. Configure plans, manage tenants, broadcast announcements, and audit database health.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button 
                        onClick={() => setActiveTab('gyms')}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
                      >
                        <Building2 className="w-4 h-4" />
                        Open Gym Directory
                      </button>
                    </div>
                  </div>

                  {/* Quick Section Shortcuts */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 pt-6">
                    <button
                      onClick={() => setActiveTab('financials')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <IndianRupee className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">SaaS Financials</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Razorpay ledger & MRR</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('orders')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Package className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Hardware Orders</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Fulfillment & WhatsApp</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('users')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <ShieldCheck className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">User Security</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">RBAC & Password resets</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('push')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Push Notifications</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Firebase mobile alerts</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('gyms')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Gym Directory</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Activate plans & toggles</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('athletes')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Athletes Master</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Cross-gym user directory</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('plans')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">SaaS Plans</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Tiers, pricing & limits</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('promo')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Ticket className="w-5 h-5 text-pink-600 dark:text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Promo Codes</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Discounts & Free trials</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('broadcast')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Megaphone className="w-5 h-5 text-amber-600 dark:text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">In-App Broadcasts</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Platform announcements</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('support')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <LifeBuoy className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Support Tickets</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Resolve owner issues</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('health')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">Engine Diagnostics</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Database & Latency</p>
                    </button>

                    <button
                      onClick={() => setActiveTab('settings')}
                      className="bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 p-4 rounded-2xl border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-left transition-all group cursor-pointer"
                    >
                      <Settings2 className="w-5 h-5 text-slate-600 dark:text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-slate-900 dark:text-white text-xs font-bold">System Config</p>
                      <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-medium mt-0.5">Maintenance & Defaults</p>
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
            
            {/* ── SECTION: SAAS FINANCIALS & LEDGER ── */}
            {activeTab === 'financials' && <RevenueLedger />}

            {/* ── SECTION: HARDWARE & STORE ORDERS ── */}
            {activeTab === 'orders' && <StoreOrdersManager />}

            {/* ── SECTION: GYM DIRECTORY & SUBSCRIPTIONS ── */}
            {activeTab === 'gyms' && <GymManagement mode="owners" />}

            {/* ── SECTION: ATHLETES MASTER DIRECTORY ── */}
            {activeTab === 'athletes' && <GymManagement mode="members" />}

            {/* ── SECTION: USER SECURITY & AUTH GOVERNANCE ── */}
            {activeTab === 'users' && <UserSecurityManager />}

            {/* ── SECTION: SAAS PLANS & PRICING ENGINE ── */}
            {activeTab === 'plans' && <PlanManager />}

            {/* ── SECTION: PROMO CODES ENGINE ── */}
            {activeTab === 'promo' && <PromoCodeManager />}

            {/* ── SECTION: MOBILE PUSH NOTIFICATIONS (FIREBASE) ── */}
            {activeTab === 'push' && <PushBroadcaster />}

            {/* ── SECTION: GLOBAL BROADCAST ANNOUNCEMENTS ── */}
            {activeTab === 'broadcast' && <BroadcastSystem />}

            {/* ── SECTION: SUPPORT & HELP DESK ── */}
            {activeTab === 'support' && <SupportCenter />}

            {/* ── SECTION: SYSTEM HEALTH & ENGINE DIAGNOSTICS ── */}
            {activeTab === 'health' && <SystemHealth />}

            {/* ── SECTION: GLOBAL PLATFORM SETTINGS ── */}
            {activeTab === 'settings' && <SystemSettings />}
          </div>
        </main>
      </div>

      {/* ── Fixed Mobile Bottom Navigation Bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 pb-safe">
        <div className="flex items-center justify-around h-16 px-1.5 max-w-md mx-auto">
          {[
            { id: 'dashboard', label: 'Overview', icon: LayoutGrid },
            { id: 'gyms', label: 'Gyms', icon: Building2, badge: stats?.totalGyms },
            { id: 'financials', label: 'Finance', icon: IndianRupee },
            { id: 'athletes', label: 'Athletes', icon: Users, badge: stats?.totalMembers },
            { id: '__more__', label: 'Menu', icon: SlidersHorizontal, isAction: true },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.isAction) {
                    setMobileMenuOpen(true);
                  } else {
                    setActiveTab(tab.id);
                    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`relative flex flex-col items-center justify-center flex-1 py-1.5 px-1 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                  isActive
                    ? 'text-violet-600 dark:text-violet-400 font-extrabold'
                    : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 font-semibold'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  {tab.badge ? (
                    <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-1 rounded-full bg-violet-600 text-white text-[9px] font-black flex items-center justify-center border-2 border-white dark:border-zinc-950">
                      {typeof tab.badge === 'number' && tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10px] mt-1 leading-none tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

