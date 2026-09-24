import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
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
import { supabase } from '../../lib/supabaseClient';
import { pushNotificationService } from '../../services/pushNotificationService';
import PullToRefresh from '../UI/PullToRefresh';

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
  Store,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react'
import Logo from '../UI/Logo'
import { isNativeCapacitorApp } from '../../utils/platform'

const isNativeApp = isNativeCapacitorApp() || window.matchMedia('(display-mode: standalone)').matches;

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { profile } = useAuth()
  const [analyticsTab, setAnalyticsTab] = useState('revenue');
  const { gym, gymLoading, gymError, gymName, updateGymName } = useCurrentGym()
  const { stats, loading: statsLoading, error: statsError, fetchStats } = useDashboardStats();
  const navigate = useNavigate();

  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (localStorage.getItem('gymix_dismiss_push_banner') === 'true') return;

      const status = await pushNotificationService.checkPermissionStatus();
      if (status === 'prompt' || status === 'denied' || status === 'default') {
        setShowNotificationBanner(true);
      }
    };

    const timer = setTimeout(checkNotificationPermission, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleEnableNotifications = async () => {
    try {
      const status = await pushNotificationService.checkPermissionStatus();
      if (status === 'denied') {
        toast.error(
          "Notifications are blocked in settings. Please enable them in your device settings.",
          { duration: 6000 }
        );
      } else {
        await pushNotificationService.initialize(
          profile?.id,
          (notification) => {
            const title = notification.title || 'Gymix';
            const body = notification.body || '';
            toast(body ? `${title}: ${body}` : title, {
              icon: '🔔',
              duration: 5000,
            });
          }
        );

        setTimeout(async () => {
          const newStatus = await pushNotificationService.checkPermissionStatus();
          if (newStatus === 'granted') {
            toast.success("Notifications enabled successfully!");
            setShowNotificationBanner(false);
          }
        }, 1200);
      }
    } catch (err) {
      console.error('[Push] Error requesting notifications:', err);
    }
  };

  const handleDismissNotificationBanner = () => {
    localStorage.setItem('gymix_dismiss_push_banner', 'true');
    setShowNotificationBanner(false);
  };

  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchStats();
      setRefreshKey(prev => prev + 1);
      toast.success('Dashboard updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to refresh dashboard');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!gym?.id) return;

    const requestsChannel = supabase
      .channel(`realtime-requests-${gym.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `gym_id=eq.${gym.id}`
        },
        (payload) => {
          setRefreshKey(prev => prev + 1);
          fetchStats();
          if (payload.eventType === 'INSERT') {
            toast.success('New athlete connection request! ⚡');
          }
        }
      )
      .subscribe();

    const attendanceChannel = supabase
      .channel(`realtime-attendance-${gym.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `gym_id=eq.${gym.id}`
        },
        () => {
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
      supabase.removeChannel(attendanceChannel);
    };
  }, [gym?.id, fetchStats]);

  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true' || isNativeCapacitorApp();
  const daysLeft = gym?.billing_days_left;
  const isExpiringSoon = Number.isFinite(daysLeft) && daysLeft >= 0 && daysLeft <= 7;

  const [showPosterModal, setShowPosterModal] = useState(false)
  const [posterQrUrl, setPosterQrUrl] = useState('')

  useEffect(() => {
    if (!gym?.unique_code) return
    const originFallback = (window.location.origin && !window.location.origin.includes('localhost')) 
      ? window.location.origin 
      : 'https://gymix.fit'
    const scanUrl = `${originFallback}/join/${gym.unique_code}`

    QRCode.toDataURL(scanUrl, {
      width: 400,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#09090b', light: '#FFFFFF' }
    })
      .then(setPosterQrUrl)
      .catch(() => {
        setPosterQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}`)
      })
  }, [gym?.unique_code])

  // B2B2C Redirect: Member logs in to dynamic portal, owner logs in to core OS
  if (profile?.role === 'member') {
    return <MemberDashboard />
  }

  const handlePrintPoster = () => {
    setShowPosterModal(true)
  }

  const triggerWebPrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    const originFallback = (window.location.origin && !window.location.origin.includes('localhost')) 
      ? window.location.origin 
      : 'https://gymix.fit'
    const scanUrl = `${originFallback}/join/${gym?.unique_code}`
    const qrUrl = posterQrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(scanUrl)}`
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR Poster - ${gymName}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #09090b;
            }
            .poster-container {
              max-width: 500px;
              margin: 0 auto;
              border: 3px solid #e2e8f0;
              border-radius: 24px;
              padding: 40px;
            }
            .gym-name {
              font-size: 28px;
              font-weight: 800;
              margin-top: 10px;
            }
            .qr-code {
              margin: 25px auto;
              width: 260px;
              height: 260px;
            }
            .qr-code img {
              width: 100%;
              height: 100%;
            }
            .code-box {
              display: inline-block;
              background: #f1f5f9;
              border: 2px dashed #cbd5e1;
              padding: 8px 20px;
              border-radius: 12px;
              font-family: monospace;
              font-size: 22px;
              font-weight: 800;
              letter-spacing: 3px;
            }
          </style>
        </head>
        <body>
          <div class="poster-container">
            <h2>GYMIX ATHLETE TERMINAL</h2>
            <div class="gym-name">${gymName}</div>
            <div class="qr-code"><img src="${qrUrl}" /></div>
            <p>Scan with your phone camera or Gymix app to connect instantly!</p>
            <div style="margin-top: 15px;">
              <p style="font-size: 11px; font-weight: bold; color: #64748b;">GYM CODE</p>
              <div class="code-box">${gym?.unique_code}</div>
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const renderPosterModal = () => {
    if (!showPosterModal) return null

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 relative shadow-xl">
          
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
              Gym Entry Terminal
            </span>
            <button 
              onClick={() => setShowPosterModal(false)}
              className="text-slate-400 hover:text-slate-700 dark:hover:text-white text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Scan to Connect</h2>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{gymName}</p>
          </div>

          {/* QR Code */}
          <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border border-slate-200 dark:border-zinc-700 shadow-sm flex items-center justify-center">
            {posterQrUrl ? (
              <img src={posterQrUrl} alt="Gym QR Code" className="w-full h-full object-contain" />
            ) : (
              <div className="w-7 h-7 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            )}
          </div>

          <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
            Athletes scan this QR code or enter your Gym Code to link with your gym and access their daily pass.
          </p>

          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Gym Code</p>
            <div className="inline-block bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-4 py-1.5 rounded-xl font-mono text-xl font-bold tracking-widest text-slate-900 dark:text-white">
              {gym?.unique_code}
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            {!isPlaystoreApp && (
              <button
                onClick={triggerWebPrint}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs active:scale-95"
              >
                <Printer className="w-4 h-4" />
                Print Wall Poster
              </button>
            )}
            
            <button
              onClick={() => setShowPosterModal(false)}
              className="w-full py-2 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-semibold rounded-xl text-xs cursor-pointer hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Done
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

  const copyGymCode = () => {
    if (!gym?.unique_code) return;
    navigator.clipboard.writeText(gym.unique_code);
    setCopiedCode(true);
    toast.success('Gym code copied to clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!gym && !gymLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xl font-bold">!</div>
        <p className="text-slate-900 dark:text-white font-bold text-base">Gym Account Not Found</p>
        <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-sm">We couldn't retrieve your gym record. Please refresh the page.</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer">
          Reload Page
        </button>
      </div>
    )
  }

  if ((gymError || statsError) && !gymLoading && !statsLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-96 gap-3 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400 text-xl font-bold">⚠</div>
        <p className="text-slate-900 dark:text-white font-bold text-base">Could Not Load Dashboard</p>
        <p className="text-slate-500 dark:text-zinc-400 text-xs max-w-sm">{gymError || statsError}</p>
        <button onClick={() => window.location.reload()} className="mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer">
          Reload Page
        </button>
      </div>
    )
  }

  if (gymLoading || statsLoading || (!stats && !gymError && !statsError)) return <DashboardSkeleton />

  // Completely empty state
  if (stats && stats.membership.total === 0 && stats.pendingRequestsCount === 0) {
    return (
      <div className="p-6 sm:p-10 max-w-3xl mx-auto flex flex-col items-center justify-center min-h-[75vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
          <Logo className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Welcome to {gymName || 'Gymix'}
          </h2>
          <p className="text-slate-500 dark:text-zinc-400 text-sm max-w-md mx-auto mt-2 leading-relaxed">
            Your gym workspace is ready! Invite your athletes to connect using your Gym Code, or register your first member manually.
          </p>
        </div>

        {/* Gym Code Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl max-w-sm w-full space-y-3 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Your Gym Code</p>
          <div className="bg-slate-50 dark:bg-zinc-800 px-4 py-3 rounded-xl border border-slate-200 dark:border-zinc-700 flex items-center justify-between">
            <span className="text-violet-600 dark:text-violet-400 font-mono text-2xl font-bold tracking-widest">{gym?.unique_code}</span>
            <button 
              onClick={copyGymCode}
              className="px-3 py-1.5 bg-white dark:bg-zinc-700 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-all cursor-pointer shadow-xs"
            >
              {copiedCode ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <button 
            onClick={handlePrintPoster}
            className="w-full py-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print Entry QR Poster
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link 
            to="/members/new" 
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </Link>
          <Link 
            to="/scanner" 
            className="px-5 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl text-xs hover:bg-slate-50 dark:hover:bg-zinc-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Open Gate Scanner</span>
          </Link>
        </div>
        {renderPosterModal()}
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={fetchStats} className="min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      
      {/* Push Notifications Permission Banner */}
      {showNotificationBanner && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/[0.04] px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
              <BellRing className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-slate-900 dark:text-white text-xs font-bold">Stay Updated with Real-Time Alerts</p>
              <p className="text-slate-500 dark:text-zinc-400 text-[11px] font-medium">
                Receive check-in scans, payment notifications, and athlete requests instantly.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleEnableNotifications}
              className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              Enable
            </button>
            <button
              onClick={handleDismissNotificationBanner}
              className="px-2 py-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 text-xs font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Command Header Bar ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-zinc-800 pb-5">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <GymNameEditor gymName={gymName} onSave={updateGymName} />
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 text-[10px] font-bold">
              Verified
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 dark:text-zinc-400">
            <span>{greeting}</span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <span>Code:</span>
              <button 
                onClick={copyGymCode}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-violet-600 dark:text-violet-400 font-mono font-bold text-xs border border-slate-200 dark:border-zinc-700 cursor-pointer transition-colors"
                title="Click to copy gym connection code"
              >
                {gym?.unique_code}
                {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3 text-slate-400" />}
              </button>
            </span>
          </div>
        </div>
        
        {/* Quick Action Buttons & Search */}
        <div className="flex items-center gap-2.5 w-full lg:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64 lg:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search members..." 
              onKeyDown={handleSearch}
              className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-violet-500 transition-colors shadow-xs"
            />
          </div>

          <Link
            to="/members/new"
            className="px-3.5 py-2 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Member</span>
          </Link>

          <Link
            to="/scanner"
            className="p-2 sm:px-3 sm:py-2 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Open Gate Scanner"
          >
            <QrCode className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span className="hidden sm:inline">Scanner</span>
          </Link>
          
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Refresh Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Pending Requests Alert Banner ── */}
      {stats?.pendingRequestsCount > 0 && (
        <div 
          onClick={() => {
            const el = document.getElementById('pending-requests-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
          className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-emerald-400 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <UserPlus className="w-5 h-5 animate-pulse" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-100 truncate">
                {stats.pendingRequestsCount} Athlete Request{stats.pendingRequestsCount > 1 ? 's' : ''} Awaiting Approval
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium truncate">
                Click to inspect identity, photos, and approve access passes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shrink-0">
            <span>Review</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      )}

      {/* Onboarding Checklist Widget */}
      {profile?.role === 'owner' && (
        <OnboardingChecklist profile={profile} gym={gym} stats={stats} />
      )}

      {/* ── KPI Metric Grid ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <StatCard 
          title="Monthly Revenue" 
          value={`₹${stats.revenue.monthly.toLocaleString()}`} 
          subtitle={`₹${stats.revenue.total.toLocaleString()} total`}
          icon={<CircleDollarSign className="w-4.5 h-4.5" />} 
          colorClass="emerald" 
          trend={stats.trends?.revenue || "+0.0%"}
        />
        <StatCard 
          title="Active Members" 
          value={`${stats.membership.active}`} 
          subtitle={`of ${stats.membership.total} total`}
          icon={<CheckCircle2 className="w-4.5 h-4.5" />} 
          colorClass="violet" 
          trend={stats.trends?.membership || "Active"}
        />
        <StatCard 
          title="Today's Check-ins" 
          value={`${stats.todayCheckIns}`} 
          subtitle={`${stats.attendanceRate}% active`}
          icon={<Clock className="w-4.5 h-4.5" />} 
          colorClass="indigo" 
          trend={`${stats.attendanceRate}%`}
        />
        <StatCard 
          title="Pending Dues" 
          value={`₹${stats.revenue.pending.toLocaleString()}`} 
          subtitle="Uncollected fees"
          icon={<Clock className="w-4.5 h-4.5" />} 
          colorClass="rose" 
          trend={stats.trends?.pending || "Dues"}
        />
        <StatCard 
          title="Yearly Collections" 
          value={`₹${(stats.revenue.yearly || 0).toLocaleString()}`} 
          subtitle="Last 365 days"
          icon={<TrendingUp className="w-4.5 h-4.5" />} 
          colorClass="primary" 
          trend={null}
        />
        <StatCard 
          title="Store Sales" 
          value={`₹${(stats.revenue.store || 0).toLocaleString()}`} 
          subtitle="Supplements & items"
          icon={<Store className="w-4.5 h-4.5" />} 
          colorClass="amber" 
          trend={null}
        />
      </div>

      {/* ── Main Layout Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column (2/3 Width): Analytics & Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Analytics Console */}
          <div className="bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-5 sm:p-6 text-left shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3 border-b border-slate-100 dark:border-white/[0.04] pb-4">
              <div>
                <h3 className="text-slate-900 dark:text-white font-semibold text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-violet-500" />
                  <span>Performance & Analytics</span>
                </h3>
                <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium mt-0.5">
                  Real-time collections and distribution metrics
                </p>
              </div>
              
              {/* Tabs Switcher */}
              <div className="flex bg-slate-100/70 dark:bg-zinc-950/50 p-1 rounded-xl border border-slate-200/60 dark:border-white/[0.04] self-start text-xs font-semibold">
                {[
                  { id: 'revenue', label: 'Revenue' },
                  { id: 'plans', label: 'Plans' },
                  { id: 'payments', label: 'Modes' },
                  { id: 'gender', label: 'Demographics' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAnalyticsTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      analyticsTab === tab.id
                        ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-[280px] flex flex-col justify-center">
              {analyticsTab === 'revenue' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Daily Collections (Last 7 Days)</p>
                    <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-md font-bold">
                      Today: ₹{stats.revenue.today.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-[280px] -ml-2 sm:ml-0">
                    <LightweightChart data={stats.revenueChartData} />
                  </div>
                </div>
              )}

              {analyticsTab === 'plans' && (
                <div className="space-y-5">
                  <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Active Membership Plans</p>
                  {Object.keys(stats.planDistribution).length === 0 ? (
                    <p className="text-slate-400 dark:text-zinc-500 text-xs text-center py-10 font-medium">No active plan records found</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(stats.planDistribution).map(([planName, count]) => {
                        const total = Object.values(stats.planDistribution).reduce((a, b) => a + b, 0);
                        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                          <div key={planName} className="space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-900 dark:text-white">{planName}</span>
                              <span className="text-slate-500 dark:text-zinc-400 font-medium">{count} members ({percent}%)</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-700">
                              <div 
                                className="h-full bg-emerald-500 rounded-full" 
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
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-0.5">UPI Payments</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.paymentMethods.upiPercent}%</p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Vol: ₹{stats.paymentMethods.upiVolume.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-wider mb-0.5">Cash Payments</p>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.paymentMethods.cashPercent}%</p>
                      <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">Vol: ₹{stats.paymentMethods.cashVolume.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">
                      <span>UPI ({stats.paymentMethods.upiPercent}%)</span>
                      <span>Cash ({stats.paymentMethods.cashPercent}%)</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-zinc-700">
                      <div className="h-full bg-blue-500" style={{ width: `${stats.paymentMethods.upiPercent}%` }} />
                      <div className="h-full bg-amber-500" style={{ width: `${stats.paymentMethods.cashPercent}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {analyticsTab === 'gender' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-[10px] font-bold uppercase text-sky-600 dark:text-sky-400 tracking-wider mb-0.5">Male</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.genderStats.male}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-[10px] font-bold uppercase text-pink-600 dark:text-pink-400 tracking-wider mb-0.5">Female</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.genderStats.female}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-center">
                      <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-0.5">Other</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{stats.genderStats.other}</p>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden flex border border-slate-200 dark:border-zinc-700">
                    {(() => {
                      const total = stats.genderStats.male + stats.genderStats.female + stats.genderStats.other;
                      const malePct = total > 0 ? (stats.genderStats.male / total) * 100 : 33.3;
                      const femalePct = total > 0 ? (stats.genderStats.female / total) * 100 : 33.3;
                      const otherPct = total > 0 ? (stats.genderStats.other / total) * 100 : 33.3;
                      return (
                        <>
                          <div className="h-full bg-sky-500" style={{ width: `${malePct}%` }} />
                          <div className="h-full bg-pink-500" style={{ width: `${femalePct}%` }} />
                          <div className="h-full bg-slate-400" style={{ width: `${otherPct}%` }} />
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Outstanding Dues Widget */}
          {stats.pendingPayments && stats.pendingPayments.length > 0 && (
            <PendingPaymentsWidget payments={stats.pendingPayments} />
          )}
        </div>

        {/* Right Column (1/3 Width): Actionable Live Feeds & Operations */}
        <div className="space-y-5">
          
          {/* 1. Pending Athlete Connection Requests (Top Priority) */}
          <div id="pending-requests-section" className="scroll-mt-24">
            <PendingRequestsWidget 
              gymId={gym?.id} 
              gymCode={gym?.unique_code} 
              onRefreshStats={fetchStats} 
              refreshKey={refreshKey} 
            />
          </div>

          {/* 2. Expiring Soon (Renewals & WhatsApp alerts) */}
          <ExpiringWidget members={stats.expiringMembers} onRefresh={fetchStats} />

          {/* 3. QR Gate Quick Bar & Poster Trigger */}
          <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between gap-3 text-left shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <QrCode className="w-4 h-4 text-violet-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Entry QR Gate</p>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scanner Active
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0">
              <Link 
                to="/scanner" 
                className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 shadow-xs"
              >
                Open
              </Link>
              <button 
                onClick={handlePrintPoster}
                className="p-1.5 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 rounded-lg transition-colors cursor-pointer"
                title="Print Entry QR Poster"
              >
                <Printer className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 4. Real-time Activity Feed */}
          <RecentActivityFeed activities={stats.recentActivity} />

        </div>

      </div>
      </div>
      {renderPosterModal()}
    </PullToRefresh>
  )
}
