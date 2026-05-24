import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentGym } from '../../hooks/useCurrentGym';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import DashboardSkeleton from './DashboardSkeleton';
import GymNameEditor from './GymNameEditor';
import StatCard from './StatCard';
import LightweightChart from './LightweightChart';
import RecentActivityFeed from './RecentActivityFeed';
import ExpiringWidget from './ExpiringWidget';
import PendingPaymentsWidget from './PendingPaymentsWidget';
import { motion } from 'framer-motion';
import { useAuth } from '../../hooks/useAuth';
import MemberDashboard from './MemberDashboard';
import PendingRequestsWidget from './PendingRequestsWidget';

import { 
  Users, 
  CheckCircle2, 
  Clock, 
  CircleDollarSign, 
  Search, 
  Plus, 
  CalendarPlus, 
  History,
  TrendingUp,
  ArrowRight,
  BellRing
} from 'lucide-react'
import Logo from '../UI/Logo'

// Animation variants for staggered load
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

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { profile } = useAuth()

  // B2B2C Redirect: Member logs in to dynamic portal, owner logs in to core OS
  if (profile?.role === 'member') {
    return <MemberDashboard />
  }

  const { gym, gymLoading, gymError, gymName, updateGymName } = useCurrentGym()
  const { stats, loading: statsLoading, error: statsError, fetchStats } = useDashboardStats();
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  const handleSearch = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      navigate(`/members?search=${encodeURIComponent(e.target.value.trim())}`);
    }
  };

  if (!gym && !gymLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-xl">!</div>
        <p className="text-white font-semibold">Gym account not found</p>
        <p className="text-slate-400 text-sm max-w-sm">We couldn't retrieve your gym record. Please refresh the page.</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">Reload Page</button>
      </div>
    )
  }

  if (gymError || statsError) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xl">⚠</div>
        <p className="text-white font-semibold">Could not load your dashboard</p>
        <p className="text-slate-400 text-sm max-w-sm">{gymError || statsError}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors">Reload Page</button>
      </div>
    )
  }

  if (gymLoading || statsLoading || (!stats && !gymError && !statsError)) return <DashboardSkeleton />

  // Handle completely empty state
  if (stats && stats.membership.total === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="p-6 sm:p-10 lg:p-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[85vh] text-center"
      >
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-[#3B82F6] blur-[60px] opacity-20 rounded-full"></div>
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Logo className="w-24 h-24 drop-shadow-[0_0_25px_rgba(134,59,255,0.4)]" />
          </div>
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 tracking-tight">Level Up Your Gym</h2>
        <p className="text-[#94A3B8] text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
          Welcome to <span className="text-white font-bold">Gym Revenue OS</span>. Your workspace is ready! Invite your members to download the app and connect using your Gym Code, or add them manually.
        </p>

        {/* Gym connection code display */}
        <div className="bg-[#1A1F2B] border border-white/5 p-6 rounded-3xl max-w-md w-full mb-10 flex flex-col items-center gap-4">
          <p className="text-[#94A3B8] text-xs font-bold uppercase tracking-widest">Your Gym Connection Code</p>
          <div className="bg-[#0F1117] px-6 py-4 rounded-2xl border border-white/10 flex items-center justify-between w-full group">
            <span className="text-[#3B82F6] font-mono text-3xl font-black tracking-widest select-all">{gym?.unique_code}</span>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(gym?.unique_code);
                alert('Copied Gym Code to clipboard!');
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all active:scale-95 cursor-pointer"
            >
              Copy Code
            </button>
          </div>
          <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
            Members can enter this code in their mobile dashboard or scan to connect to your gym instantly!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            to="/members" 
            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-[#0F1117] font-bold rounded-2xl shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">Add Member Manually</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/scanner" 
            className="group relative flex items-center gap-3 px-8 py-4 bg-[#1A1F2B] border border-white/10 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <span className="text-lg">Open Gate Scanner</span>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8"
    >
      
      {/* ── Top Bar (Search & Actions) ── */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#863BFF] font-bold text-xs uppercase tracking-widest">
            <Logo className="w-4 h-4" />
            {greeting}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <GymNameEditor gymName={gymName} onSave={updateGymName} />
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
            <span>Gym Code:</span>
            <span 
              onClick={() => {
                navigator.clipboard.writeText(gym?.unique_code);
                alert("Gym code copied to clipboard!");
              }} 
              className="bg-[#1A1F2B] border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg text-emerald-400 font-mono font-black tracking-widest cursor-pointer select-all select-none hover:bg-white/[0.03] transition-all"
              title="Click to copy gym code"
            >
              {gym?.unique_code}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative group flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] group-focus-within:text-[#3B82F6] transition-colors" />
            <input 
              type="text" 
              placeholder="Search members..." 
              onKeyDown={handleSearch}
              className="w-full bg-[#1A1F2B] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-2">
            <Link to="/members/new" title="Add Member" className="flex-1 sm:flex-none p-3.5 bg-[#1A1F2B] border border-white/5 rounded-2xl text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/10 transition-all active:scale-95 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </Link>
            <Link to="/subscriptions/new" title="Add Subscription" className="flex-1 sm:flex-none p-3.5 bg-[#1A1F2B] border border-white/5 rounded-2xl text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/10 transition-all active:scale-95 flex items-center justify-center">
              <CalendarPlus className="h-5 w-5" />
            </Link>
            <Link to="/payments/new" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#3B82F6]/20 transition-all active:scale-95">
              <CircleDollarSign className="h-5 w-5" strokeWidth={2.5} />
              <span className="sm:hidden lg:inline">Collect Payment</span>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Grid ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Revenue" 
          value={`₹${stats.revenue.total.toLocaleString()}`} 
          subtitle={`₹${stats.revenue.monthly.toLocaleString()} this month`}
          icon={<CircleDollarSign className="w-5 h-5" />} 
          colorClass="emerald" 
          trend="+12.5%"
        />
        <StatCard 
          title="Active Members" 
          value={stats.membership.active} 
          subtitle={`Out of ${stats.membership.total} total`}
          icon={<CheckCircle2 className="w-5 h-5" />} 
          colorClass="sky" 
          trend="Stable"
        />
        <StatCard 
          title="Pending Payments" 
          value={`₹${stats.revenue.pending.toLocaleString()}`} 
          subtitle="Awaiting clearance"
          icon={<Clock className="w-5 h-5" />} 
          colorClass="amber" 
          trend="Action Needed"
        />
        <StatCard 
          title="Growth Rate" 
          value={`${((stats.membership.active / stats.membership.total || 0) * 100).toFixed(1)}%`} 
          subtitle="Retention score"
          icon={<TrendingUp className="w-5 h-5" />} 
          colorClass="indigo" 
          trend="+2.1%"
        />
      </motion.div>

      {/* ── Main Content Split ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column (Charts & Activity) */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          {/* Chart Widget */}
          <motion.div variants={itemVariants} className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            {/* Soft background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#3B82F6]/5 rounded-full blur-3xl -z-10 transition-all duration-500 group-hover:bg-[#3B82F6]/10"></div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 relative z-10 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 text-[#3B82F6] shadow-inner">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-[#F8FAFC] font-bold text-lg">Revenue Analytics</h3>
                  <p className="text-[#94A3B8] text-xs font-medium mt-1">Last 7 days performance</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#0F1117]/50 border border-white/5 backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]"></span>
                </span>
                <span className="text-xs font-bold text-[#F8FAFC]">₹{stats.revenue.today.toLocaleString()} Today</span>
              </div>
            </div>
            
            <div className="h-[320px] relative z-10 -ml-2 sm:ml-0">
              <LightweightChart data={stats.revenueChartData} />
            </div>
          </motion.div>

          {/* Activity Feed Widget */}
          <motion.div variants={itemVariants}>
            <RecentActivityFeed activities={stats.recentActivity} />
          </motion.div>
        </div>

        {/* Right Column (Actionable Widgets) */}
        <div className="space-y-6 sm:space-y-8">
          <motion.div variants={itemVariants}>
            <PendingRequestsWidget gymId={gym?.id} onRefreshStats={fetchStats} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ExpiringWidget members={stats.expiringMembers} onRefresh={fetchStats} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <PendingPaymentsWidget payments={stats.pendingPayments} />
          </motion.div>
        </div>

      </div>

    </motion.div>
  )
}

