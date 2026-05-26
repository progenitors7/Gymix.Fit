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
  BellRing,
  Printer,
  QrCode
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

  const handlePrintPoster = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    const scanUrl = `${window.location.origin}/signup?gym=${gym?.unique_code}&role=member`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}`
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Poster - ${gymName}</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, sans-serif;
              text-align: center;
              padding: 40px;
              color: #0F1117;
              background-color: #FFFFFF;
            }
            .poster-container {
              border: 10px double #3B82F6;
              border-radius: 30px;
              padding: 60px 40px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 10px 30px rgba(0,0,0,0.05);
            }
            .logo-placeholder {
              font-size: 32px;
              font-weight: 900;
              letter-spacing: 2px;
              color: #3B82F6;
              margin-bottom: 10px;
              text-transform: uppercase;
              font-style: italic;
            }
            .subtitle {
              font-size: 14px;
              font-weight: 800;
              color: #64748B;
              letter-spacing: 4px;
              text-transform: uppercase;
              margin-bottom: 40px;
            }
            .title {
              font-size: 40px;
              font-weight: 900;
              color: #0F1117;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .gym-name {
              font-size: 30px;
              font-weight: 800;
              color: #3B82F6;
              margin-bottom: 40px;
              text-transform: uppercase;
              font-style: italic;
            }
            .qr-code {
              width: 320px;
              height: 320px;
              margin: 0 auto 40px auto;
              border: 4px solid #F1F5F9;
              border-radius: 20px;
              padding: 15px;
              box-shadow: 0 8px 24px rgba(0,0,0,0.04);
            }
            .qr-code img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .instructions {
              font-size: 14px;
              color: #334155;
              line-height: 1.6;
              max-width: 480px;
              margin: 0 auto 30px auto;
              font-weight: 600;
            }
            .code-box {
              display: inline-block;
              background: #F8FAFC;
              border: 2px dashed #E2E8F0;
              padding: 10px 25px;
              border-radius: 12px;
              font-family: monospace;
              font-size: 24px;
              font-weight: 900;
              color: #0F1117;
              letter-spacing: 4px;
            }
            @media print {
              body {
                padding: 0;
              }
              .poster-container {
                border: 8px double #3B82F6;
                box-shadow: none;
                margin-top: 50px;
              }
            }
          </style>
        </head>
        <body>
          <div class="poster-container">
            <div class="logo-placeholder">GYMIX</div>
            <div class="subtitle">Connect Terminal Gateway</div>
            
            <div class="title">SCAN TO CONNECT TO</div>
            <div class="gym-name">${gymName}</div>
            
            <div class="qr-code">
              <img src="${qrUrl}" alt="Scan to Connect" />
            </div>
            
            <div class="instructions">
              Open your mobile camera or any QR scanner to scan and connect instantly. Setup your athlete profile or log in, then tap 'Connect Terminal'!
            </div>
            
            <div style="margin-top: 25px;">
              <p style="font-size: 10px; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 2px;">Manual Code Entry</p>
              <div class="code-box">${gym?.unique_code}</div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

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

  // Handle completely empty state (only if there are no members and no pending connection requests)
  if (stats && stats.membership.total === 0 && stats.pendingRequestsCount === 0) {
    return (
      <div className="p-6 sm:p-10 lg:p-12 max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[85vh] text-center">
        <div className="relative mb-10">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <Logo className="w-24 h-24" />
          </div>
        </div>
        <h2 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-6 tracking-tight">Level Up Your Gym</h2>
        <p className="text-[#94A3B8] text-lg sm:text-xl max-w-xl mb-8 leading-relaxed">
          Welcome to <span className="text-white font-bold">Gymix</span>. Your workspace is ready! Invite your members to download the app and connect using your Gym Code, or add them manually.
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
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
            >
              Copy Code
            </button>
          </div>
          <p className="text-slate-500 text-[11px] font-medium leading-relaxed">
            Members can enter this code in their mobile dashboard or scan to connect to your gym instantly!
          </p>
          <button 
            onClick={handlePrintPoster}
            className="w-full py-3.5 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/20 rounded-2xl text-xs font-black uppercase tracking-wider text-[#60A5FA] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            <Printer className="w-4 h-4" />
            Print Wall QR Poster
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            to="/members" 
            className="group relative flex items-center gap-3 px-8 py-4 bg-white text-[#0F1117] font-bold rounded-2xl border border-white hover:bg-slate-100 transition-all"
          >
            <span className="text-lg">Add Member Manually</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link 
            to="/scanner" 
            className="group relative flex items-center gap-3 px-8 py-4 bg-[#1A1F2B] border border-white/10 text-white font-bold rounded-2xl hover:bg-white/[0.03] transition-all"
          >
            <span className="text-lg">Open Gate Scanner</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      
      {/* ── Top Bar (Search & Actions) ── */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[#3B82F6] font-bold text-xs uppercase tracking-widest">
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
            <button 
              onClick={handlePrintPoster}
              className="ml-2 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/20 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#60A5FA] transition-all cursor-pointer flex items-center gap-1.5"
              title="Print Wall QR Poster"
            >
              <Printer className="w-3 h-3" />
              <span>Print QR Poster</span>
            </button>
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
            <Link to="/members/new" title="Add Member" className="flex-1 sm:flex-none p-3.5 bg-[#1A1F2B] border border-white/5 rounded-2xl text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/10 transition-all flex items-center justify-center">
              <Users className="h-5 w-5" />
            </Link>
            <Link to="/subscriptions/new" title="Add Subscription" className="flex-1 sm:flex-none p-3.5 bg-[#1A1F2B] border border-white/5 rounded-2xl text-[#94A3B8] hover:text-[#F8FAFC] hover:border-white/10 transition-all flex items-center justify-center">
              <CalendarPlus className="h-5 w-5" />
            </Link>
            <Link to="/payments/new" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded-2xl font-bold text-sm transition-all">
              <CircleDollarSign className="h-5 w-5" strokeWidth={2.5} />
              <span className="sm:hidden lg:inline">Collect Payment</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
      </div>

      {/* ── Main Content Split ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Left Column (Charts & Activity) */}
        <div className="xl:col-span-2 space-y-6 sm:space-y-8">
          {/* Chart Widget */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
            
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
          </div>

          {/* Activity Feed Widget */}
          <div>
            <RecentActivityFeed activities={stats.recentActivity} />
          </div>
        </div>

        {/* Right Column (Actionable Widgets) */}
        <div className="space-y-6 sm:space-y-8">
          <div>
            <PendingRequestsWidget gymId={gym?.id} gymCode={gym?.unique_code} onRefreshStats={fetchStats} />
          </div>
          <div>
            <ExpiringWidget members={stats.expiringMembers} onRefresh={fetchStats} />
          </div>
          <div>
            <PendingPaymentsWidget payments={stats.pendingPayments} />
          </div>
        </div>

      </div>
    </div>
  )
}
