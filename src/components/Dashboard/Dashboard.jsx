import { useState, useEffect } from 'react';
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
import { useAuth } from '../../hooks/useAuth';
import MemberDashboard from './MemberDashboard';
import PendingRequestsWidget from './PendingRequestsWidget';
import OnboardingChecklist from './OnboardingChecklist';
import { toast } from 'react-hot-toast';

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
  QrCode,
  Target,
  UserPlus,
  SlidersHorizontal,
  Store
} from 'lucide-react'
import Logo from '../UI/Logo'

const isNativeApp = window.Capacitor !== undefined || window.matchMedia('(display-mode: standalone)').matches;

// Animation variants for staggered load
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: isNativeApp ? { duration: 0.05 } : {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: isNativeApp ? { opacity: 0 } : { opacity: 0, y: 20 },
  show: isNativeApp 
    ? { opacity: 1, transition: { duration: 0.1 } } 
    : { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { profile } = useAuth()
  const [analyticsTab, setAnalyticsTab] = useState('revenue');
  const { gym, gymLoading, gymError, gymName, updateGymName } = useCurrentGym()
  const { stats, loading: statsLoading, error: statsError, fetchStats } = useDashboardStats();
  const navigate = useNavigate();

  const isPlaystoreApp = localStorage.getItem('is_playstore_app') === 'true' || window.Capacitor !== undefined;
  const daysLeft = gym?.billing_days_left;
  const isExpiringSoon = Number.isFinite(daysLeft) && daysLeft >= 0 && daysLeft <= 7;

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // B2B2C Redirect: Member logs in to dynamic portal, owner logs in to core OS
  if (profile?.role === 'member') {
    return <MemberDashboard />
  }

  const [showPosterModal, setShowPosterModal] = useState(false)

  useEffect(() => {
    const handleHardwareBack = (e) => {
      if (showPosterModal) {
        e.preventDefault();
        setShowPosterModal(false);
      }
    };
    window.addEventListener('hardwareBack', handleHardwareBack);
    return () => {
      window.removeEventListener('hardwareBack', handleHardwareBack);
    };
  }, [showPosterModal]);

  const handlePrintPoster = () => {
    setShowPosterModal(true)
  }

  const triggerWebPrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    const originFallback = (window.location.origin && !window.location.origin.includes('localhost')) 
      ? window.location.origin 
      : 'https://gymix.fit'
    const scanUrl = `${originFallback}/signup?gym=${gym?.unique_code}&role=member`
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

  const renderPosterModal = () => {
    if (!showPosterModal) return null
    const originFallback = (window.location.origin && !window.location.origin.includes('localhost')) 
      ? window.location.origin 
      : 'https://gymix.fit'
    const scanUrl = `${originFallback}/signup?gym=${gym?.unique_code}&role=member`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}`
    const isPlaystoreApp = localStorage.getItem('is_playstore_app') === 'true' || window.Capacitor !== undefined

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
        <div className="bg-[#1c1c1c] border border-white/5 rounded-[2.5rem] p-5 sm:p-8 max-w-md w-full text-center space-y-4 relative overflow-y-auto max-h-[92vh] hide-scrollbar shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3b82f6]/5 blur-[50px] rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between pb-2 border-b border-white/5 relative z-10">
            <span className="text-[#3b82f6] font-black uppercase tracking-wider text-[10px] sm:text-xs italic">Gymix Connection Portal</span>
            <button 
              onClick={() => setShowPosterModal(false)}
              className="text-slate-400 hover:text-white font-black text-[10px] sm:text-xs uppercase tracking-wider cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-0.5 pt-1 relative z-10">
            <h2 className="text-lg sm:text-2xl font-black text-white uppercase italic tracking-tight">SCAN TO CONNECT TO</h2>
            <h3 className="text-base sm:text-xl font-bold text-[#3b82f6] uppercase tracking-wide italic">{gymName}</h3>
          </div>

          {/* QR Code Container */}
          <div className="relative w-44 h-44 sm:w-60 sm:h-60 mx-auto bg-white p-4 rounded-3xl border-4 border-slate-900 shadow-xl flex items-center justify-center relative z-10">
            <img src={qrUrl} alt="Gym QR Code" className="w-full h-full object-contain" />
          </div>

          <p className="text-slate-400 text-[10px] sm:text-xs font-semibold leading-relaxed max-w-xs mx-auto uppercase tracking-wide relative z-10">
            Open your mobile camera or any QR scanner to scan and connect instantly. Setup your athlete profile or log in, then tap 'Connect Terminal'!
          </p>

          <div className="space-y-1 relative z-10">
            <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">Manual Code Entry</p>
            <div className="inline-block bg-[#0F1117] border border-white/10 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl font-mono text-lg sm:text-2xl font-black tracking-[0.2em] text-white">
              {gym?.unique_code}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-1 relative z-10">
            {!isPlaystoreApp && (
              <button
                onClick={triggerWebPrint}
                className="w-full py-3.5 bg-[#3b82f6] hover:bg-[#287cd0] text-white font-bold rounded-2xl transition-all uppercase text-[10px] sm:text-xs tracking-wider shadow-lg shadow-[#3b82f6]/10 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print Wall Poster
              </button>
            )}
            
            <button
              onClick={() => setShowPosterModal(false)}
              className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all border border-white/5 uppercase text-[10px] sm:text-xs tracking-wider cursor-pointer"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
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
                toast.success('Copied Gym Code to clipboard!');
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
        {renderPosterModal()}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">
      
      {/* Play Store Subscription Reminder Banner */}
      {isPlaystoreApp && isExpiringSoon && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <p className="text-amber-200 text-xs font-bold">Subscription Expiring Soon</p>
              <p className="text-slate-400 text-[11px] font-medium mt-0.5">
                Your Gymix membership will expire in {daysLeft} day{daysLeft === 1 ? '' : 's'}. Visit <span className="text-white select-all">https://gymix.fit</span> on a web browser to renew.
              </p>
            </div>
          </div>
          <Link
            to="/subscription-status"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-amber-500/10 transition-all active:scale-95 whitespace-nowrap"
          >
            Manage Plan
          </Link>
        </div>
      )}

      {/* ── Top Bar (Search & Header) ── */}
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
                toast.success("Gym code copied to clipboard!");
              }} 
              className="bg-[#1A1F2B] border border-white/10 hover:border-white/20 px-2.5 py-1 rounded-lg text-emerald-400 font-mono font-black tracking-widest cursor-pointer select-all select-none hover:bg-white/[0.03] transition-all"
              title="Click to copy gym code"
            >
              {gym?.unique_code}
            </span>
          </div>
        </div>
        
        {/* Real-time search bar */}
        <div className="relative group w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] group-focus-within:text-[#3B82F6] transition-colors" />
          <input 
            type="text" 
            placeholder="Quick search members..." 
            onKeyDown={handleSearch}
            className="w-full bg-[#1A1F2B] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Onboarding Checklist Widget */}
      {profile?.role === 'owner' && (
        <OnboardingChecklist profile={profile} gym={gym} stats={stats} />
      )}

      {/* ── KPI Grid (2-column grid on mobile, 3-column grid on md, 6-column grid on desktop) ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6">
        <StatCard 
          title="Monthly Recurring Revenue (MRR)" 
          value={`₹${stats.revenue.monthly.toLocaleString()}`} 
          subtitle={`₹${stats.revenue.total.toLocaleString()} lifetime`}
          icon={<CircleDollarSign className="w-5 h-5" />} 
          colorClass="emerald" 
          trend={stats.trends?.revenue || "+0.0% MoM"}
        />
        <StatCard 
          title="Active Members" 
          value={`${stats.membership.active}`} 
          subtitle={`Out of ${stats.membership.total} total`}
          icon={<CheckCircle2 className="w-5 h-5" />} 
          colorClass="sky" 
          trend={stats.trends?.membership || "Stable"}
        />
        <StatCard 
          title="Today's Attendance" 
          value={`${stats.todayCheckIns} In`} 
          subtitle={`${stats.attendanceRate}% active rate`}
          icon={<Clock className="w-5 h-5" />} 
          colorClass="indigo" 
          trend={`${stats.attendanceRate}%`}
        />
        <StatCard 
          title="Pending Payments" 
          value={`₹${stats.revenue.pending.toLocaleString()}`} 
          subtitle="Outstanding dues"
          icon={<Clock className="w-5 h-5" />} 
          colorClass="rose" 
          trend={stats.trends?.pending || "No dues"}
        />
        <StatCard 
          title="Yearly Collections" 
          value={`₹${(stats.revenue.yearly || 0).toLocaleString()}`} 
          subtitle="Last 365 days"
          icon={<TrendingUp className="w-5 h-5" />} 
          colorClass="primary" 
          trend={null}
        />
        <StatCard 
          title="Gym Store Sales" 
          value={`₹${(stats.revenue.store || 0).toLocaleString()}`} 
          subtitle="Supplement & shop sales"
          icon={<Store className="w-5 h-5" />} 
          colorClass="amber" 
          trend={null}
        />
      </div>

      {/* ── Main Layout Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        
        {/* Left Column (2/3 Width): Deep Analytics & Activity */}
        <div className="lg:col-span-2 space-y-6 sm:space-y-8">
          
          {/* Deep Analytics Console */}
          <div className="bg-[#1A1F2B] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-white/5 pb-5">
              <div className="space-y-1">
                <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-[#3B82F6]" />
                  Analytics Command Center
                </h3>
                <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">Gym Performance & Distribution Metrics</p>
              </div>
              
              {/* Tabs Switcher */}
              <div className="flex bg-[#0F1117]/80 p-1 rounded-xl border border-white/5 self-start overflow-x-auto max-w-full hide-scrollbar">
                {[
                  { id: 'revenue', label: 'Revenue' },
                  { id: 'plans', label: 'Plans' },
                  { id: 'payments', label: 'Payments' },
                  { id: 'gender', label: 'Gender' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalyticsTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      analyticsTab === tab.id
                        ? 'bg-[#3B82F6] text-white'
                        : 'text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[300px] flex flex-col justify-center">
              {analyticsTab === 'revenue' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Daily Collections (Last 7 Days)</p>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-bold">
                      Today: ₹{stats.revenue.today.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-[320px] -ml-2 sm:ml-0">
                    <LightweightChart data={stats.revenueChartData} />
                  </div>
                </div>
              )}

              {analyticsTab === 'plans' && (
                <div className="space-y-6">
                  <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Active Subscription Distribution</p>
                  {Object.keys(stats.planDistribution).length === 0 ? (
                    <p className="text-slate-500 text-xs text-center py-10 font-bold uppercase">No active subscriptions registered</p>
                  ) : (
                    <div className="space-y-5">
                      {Object.entries(stats.planDistribution).map(([planName, count]) => {
                        const total = Object.values(stats.planDistribution).reduce((a, b) => a + b, 0);
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={planName} className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-white">{planName}</span>
                              <span className="font-bold text-[#94A3B8]">{count} Athletes ({percent}%)</span>
                            </div>
                            <div className="w-full h-2.5 bg-[#0F1117] rounded-full overflow-hidden border border-white/5">
                              <div 
                                className="h-full bg-gradient-to-r from-[#3B82F6] to-[#60A5FA] rounded-full" 
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {analyticsTab === 'payments' && (
                <div className="space-y-8">
                  <div>
                    <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-5">Transactions Mode Split</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#0F1117] p-5 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] font-black uppercase text-[#60A5FA] tracking-widest mb-1">UPI Transactions</p>
                        <p className="text-2xl font-black text-white">{stats.paymentMethods.upiPercent}%</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">Volume: ₹{stats.paymentMethods.upiVolume.toLocaleString()}</p>
                      </div>
                      <div className="bg-[#0F1117] p-5 rounded-2xl border border-white/5 text-center">
                        <p className="text-[10px] font-black uppercase text-amber-500 tracking-widest mb-1">Cash Transactions</p>
                        <p className="text-2xl font-black text-white">{stats.paymentMethods.cashPercent}%</p>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">Volume: ₹{stats.paymentMethods.cashVolume.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <span>UPI</span>
                      <span>CASH</span>
                    </div>
                    <div className="w-full h-3.5 bg-[#0F1117] rounded-full overflow-hidden flex border border-white/5">
                      <div className="h-full bg-[#3B82F6]" style={{ width: `${stats.paymentMethods.upiPercent}%` }} />
                      <div className="h-full bg-amber-500" style={{ width: `${stats.paymentMethods.cashPercent}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {analyticsTab === 'gender' && (
                <div className="space-y-6">
                  <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Member Demographics Split</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-[#0F1117] p-4 rounded-2xl border border-white/5 text-center">
                      <p className="text-[9px] font-black uppercase text-sky-400 tracking-widest mb-1">Male</p>
                      <p className="text-2xl font-black text-white">{stats.genderStats.male}</p>
                    </div>
                    <div className="bg-[#0F1117] p-4 rounded-2xl border border-white/5 text-center">
                      <p className="text-[9px] font-black uppercase text-pink-400 tracking-widest mb-1">Female</p>
                      <p className="text-2xl font-black text-white">{stats.genderStats.female}</p>
                    </div>
                    <div className="bg-[#0F1117] p-4 rounded-2xl border border-white/5 text-center">
                      <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1">Other</p>
                      <p className="text-2xl font-black text-white">{stats.genderStats.other}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="w-full h-3 bg-[#0F1117] rounded-full overflow-hidden flex border border-white/5">
                      {(() => {
                        const total = stats.genderStats.male + stats.genderStats.female + stats.genderStats.other;
                        const malePct = total > 0 ? (stats.genderStats.male / total) * 100 : 33.3;
                        const femalePct = total > 0 ? (stats.genderStats.female / total) * 100 : 33.3;
                        const otherPct = total > 0 ? (stats.genderStats.other / total) * 100 : 33.3;
                        return (
                          <>
                            <div className="h-full bg-sky-400" style={{ width: `${malePct}%` }} />
                            <div className="h-full bg-pink-400" style={{ width: `${femalePct}%` }} />
                            <div className="h-full bg-slate-500" style={{ width: `${otherPct}%` }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Activity Feed Widget */}
          <div>
            <RecentActivityFeed activities={stats.recentActivity} />
          </div>
        </div>

        {/* Right Column (1/3 Width): Operations Desk */}
        <div className="space-y-6 sm:space-y-8">
          
          {/* Quick Actions & Command Center */}
          <div className="bg-[#1A1F2B] border border-white/5 rounded-3xl p-6 relative overflow-hidden">
            <h3 className="text-white font-extrabold text-base mb-5 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#3B82F6]" />
              Operations Command
            </h3>
            
            <div className="grid grid-cols-2 gap-3 mb-5">
              <Link 
                to="/members/new" 
                className="onboarding-add-member-btn p-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Add Member</span>
              </Link>
              
              <Link 
                to="/subscriptions/new" 
                className="onboarding-activate-plan-btn p-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <CalendarPlus className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Activate Plan</span>
              </Link>

              <Link 
                to="/payments/new" 
                className="onboarding-pay-invoice-btn p-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <CircleDollarSign className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Pay Invoice</span>
              </Link>

              <Link 
                to="/scanner" 
                className="onboarding-gate-scanner-btn p-4 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 rounded-2xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <QrCode className="w-4.5 h-4.5" />
                </div>
                <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider">Gate Scanner</span>
              </Link>
            </div>

            <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
              <button 
                onClick={handlePrintPoster}
                className="onboarding-print-poster-btn w-full py-3 bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 border border-[#3B82F6]/20 rounded-xl text-[10px] font-black uppercase tracking-wider text-[#60A5FA] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-3.5 h-3.5" />
                Print QR Poster
              </button>

              {/* Turnstile Sync Rate */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#0F1117] border border-white/5 text-[10px] font-bold">
                <span className="text-slate-500 uppercase tracking-wider">Scanner Gates Status</span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-black uppercase">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {stats?.todayCheckIns > 0 ? "Synced (100%)" : "Online (Idle)"}
                </span>
              </div>
            </div>
          </div>

          {/* Pending requests approval box (Brought to top-priority area & highlighted!) */}
          <div className="onboarding-requests-widget">
            <PendingRequestsWidget gymId={gym?.id} gymCode={gym?.unique_code} onRefreshStats={fetchStats} />
          </div>

          {/* Expiring Soon */}
          <div className="onboarding-expiring-widget">
            <ExpiringWidget members={stats.expiringMembers} onRefresh={fetchStats} />
          </div>

          {/* Outstanding dues */}
          <div className="onboarding-payments-widget">
            <PendingPaymentsWidget payments={stats.pendingPayments} />
          </div>

        </div>

      </div>
      {renderPosterModal()}
    </div>
  )
}
