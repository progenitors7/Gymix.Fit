import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentGym } from '../../hooks/useCurrentGym'
import { isSuperAdmin } from '../../config/admins'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'
import { isNativeCapacitorApp } from '../../utils/platform'

/**
 * ProtectedRoute — Clean state machine guard.
 */
export default function ProtectedRoute({ children }) {
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const { gym, gymLoading, gymError, refreshGym } = useCurrentGym()
  const location = useLocation()
  
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    if (refreshing) return
    setRefreshing(true)
    try {
      await refreshGym()
      toast.success('Access status refreshed!')
    } catch (err) {
      toast.error('Failed to refresh status.')
    } finally {
      setRefreshing(false)
    }
  }

  const handleManageOnline = async () => {
    toast.success('Opening secure billing portal...')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const tokenHash = `#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`
        window.open(`https://gymix.fit/billing?source=app${tokenHash}`, '_system')
      } else {
        window.open('https://gymix.fit/billing?source=app', '_system')
      }
    } catch (e) {
      console.error('[ProtectedRoute] Failed to get session for billing:', e)
      window.open('https://gymix.fit/billing?source=app', '_system')
    }
  }

  // ── Step 1: Auth still loading (user + profile sync) ──
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest">Verifying Access...</p>
        </div>
      </div>
    )
  }

  // ── Step 2: Not logged in ──
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ── Step 2.5: Super Admin Dedicated Bypass & Routing ──
  const isSuperAdminUser = isSuperAdmin(user?.email) || profile?.role === 'super_admin'
  const isGhostMode = !!(localStorage.getItem('ghost_mode_gym_id') || localStorage.getItem('selected_gym_id'))

  if (isSuperAdminUser) {
    // If accessing standard dashboard without ghost mode, direct to Super Admin command center
    if ((location.pathname === '/dashboard' || location.pathname === '/') && !isGhostMode) {
      return <Navigate to="/super-admin" replace />
    }
    // Super Admin should never be trapped in gym owner billing pages
    if (location.pathname === '/billing' || location.pathname === '/subscription-status') {
      return <Navigate to="/super-admin" replace />
    }
    // Super Admin is fully exempt from all individual gym checks and billing paywalls
    return children
  }

  // ── Step 3: Determine role and page type ──
  const isMember = profile?.role === 'member'
  const isOwner = profile?.role === 'owner'
  const isBillingPage = location.pathname === '/billing'
  const isSettingsPage = location.pathname === '/settings'
  const isSuperAdminRoute = location.pathname.startsWith('/super-admin')
  const isAdminPage = isBillingPage || isSettingsPage || isSuperAdminRoute

  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true' || isNativeCapacitorApp();

  // Anti-Steering: Prevent loading billing page inside the native Play Store app
  if (isPlaystoreApp && isBillingPage) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Step 4: Member route mapping & access protection ──
  if (isMember) {
    // Map standalone paths to corresponding member portal tabs
    if (location.pathname === '/notifications') {
      return <Navigate to="/dashboard?tab=notifications" replace />
    }
    if (location.pathname === '/attendance') {
      return <Navigate to="/dashboard?tab=attendance" replace />
    }
    if (location.pathname === '/leaderboard') {
      return <Navigate to="/dashboard?tab=leaderboard" replace />
    }
    if (location.pathname === '/profile') {
      return <Navigate to="/dashboard?tab=profile" replace />
    }
    if (location.pathname === '/store' || location.pathname === '/store-manager') {
      return <Navigate to="/dashboard?tab=store" replace />
    }

    // Block members from accessing gym owner management consoles
    const ownerOnlyPaths = [
      '/scanner', 
      '/members', 
      '/subscriptions', 
      '/payments', 
      '/settings', 
      '/billing', 
      '/subscription-status'
    ]
    const isOwnerRoute = ownerOnlyPaths.some(p => location.pathname === p || location.pathname.startsWith(p + '/'))
    if (isOwnerRoute) {
      return <Navigate to="/dashboard" replace />
    }

    return children
  }

  // ── Step 5: Gym error — show error card (non-admin pages only) ──
  if (gymError && !isAdminPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 text-2xl mx-auto mb-5">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Failed to Load Gym Data</h2>
          <p className="text-slate-600 dark:text-zinc-400 text-xs mb-6">
            {gymError}
          </p>
          <div className="space-y-2.5">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold text-xs rounded-xl border border-slate-200 dark:border-zinc-700 transition-all cursor-pointer"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 6: Owner gym still loading — only block non-admin pages ──
  if (isOwner && gymLoading && !isAdminPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-slate-400 dark:text-zinc-500 text-xs font-bold uppercase tracking-widest">Loading Gym...</p>
        </div>
      </div>
    )
  }

  // ── Step 7: Blocked Gym owner check (Dedicated Server Suspended UI) ──
  if (isOwner && gym?.status === 'blocked') {
    const customMessage = gym?.blocked_message || 
      `Aapke gym account ka dedicated cloud server aur database recharge na hone ki wajah se hosting provider dwara automatically suspend (shut down) kar diya gaya hai.\n\nServer maintenance cost aur hosting subscription overdue hai. Server restart aur live data restore karane ke liye kripya platform administrator se sampark karein.`

    const gymCode = gym?.unique_code || '88454F'

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090D16] p-4 sm:p-6 text-center relative overflow-hidden select-none">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-red-600/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="max-w-md w-full bg-[#111624]/90 backdrop-blur-xl border border-red-500/20 rounded-[2rem] p-6 sm:p-8 shadow-2xl shadow-red-950/40 relative z-10 text-left">
          
          {/* Top Server Status Badge */}
          <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="text-[11px] font-mono font-bold tracking-wider text-red-400 uppercase">
                Server Offline
              </span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-red-500/10 border border-red-500/20 text-[10px] font-mono text-red-300 font-semibold">
              NODE: IN-WEST-{gymCode}
            </div>
          </div>

          {/* Icon Header */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/5 border border-red-500/30 flex items-center justify-center text-red-400 text-3xl mb-5 shadow-inner">
            🔌
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase mb-1">
            Cloud Instance Suspended
          </h2>
          <p className="text-xs font-mono text-slate-400 mb-5">
            TARGET GYM: <span className="text-white font-bold">{gym?.name || gym?.gym_name || 'Race Gym'}</span>
          </p>

          {/* Detailed Message Box */}
          <div className="bg-[#0A0E1A] border border-white/5 rounded-2xl p-4 sm:p-5 mb-6 text-xs text-slate-300 leading-relaxed space-y-3 font-normal">
            {customMessage.split('\n\n').map((para, idx) => (
              <p key={idx} className={idx === 0 ? 'text-slate-200' : 'text-slate-400'}>
                {para}
              </p>
            ))}
          </div>

          {/* Server Diagnostic Bar */}
          <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 mb-6 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Billing Status:</span>
            <span className="font-bold text-red-400 tracking-wider">UNPAID / DEALLOCATED</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <a
              href="mailto:support@gymix.fit?subject=Server%20Recharge%20Reactivation%20Request%20-%20Race%20Gym"
              className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 active:scale-[0.98] text-white font-bold rounded-xl transition-all uppercase text-xs tracking-wider shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 cursor-pointer text-center"
            >
              <span>Contact Server Administrator</span>
            </a>

            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }}
              className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-[0.98] text-slate-400 hover:text-white font-semibold rounded-xl transition-all border border-white/5 uppercase text-xs tracking-wider cursor-pointer text-center"
            >
              Sign Out
            </button>
          </div>

          {/* Footer watermark */}
          <p className="mt-5 text-center text-[10px] text-slate-600 font-mono">
            SYS_CODE: ERR_INSTANCE_RECHARGE_OVERDUE • GYMIX CORE
          </p>
        </div>
      </div>
    )
  }

  // ── Step 8: Owner billing redirect — no gym, pending, or expired ──
  if (isOwner && !isAdminPage && user?.email !== 'demo.owner@gymix.fit' && (!gym || gym?.status === 'pending' || gym?.billing_status === 'expired')) {
    if (isPlaystoreApp) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950 p-6 text-center">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl relative overflow-hidden">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl mx-auto mb-5 border border-emerald-200 dark:border-emerald-800/40">
              ⚡
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2">Reactivation Required</h2>
            <p className="text-slate-600 dark:text-zinc-400 text-xs mb-6 leading-relaxed font-medium">
              To keep managing your gym, please manage your subscription online. 
              <br/><br/>
              Once your account has been updated, your mobile app will automatically unlock!
            </p>
            <div className="space-y-2.5">
              <button
                onClick={handleManageOnline}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold rounded-xl transition-all uppercase text-xs tracking-wider shadow-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                Manage Subscription Online
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl transition-all border border-slate-200 dark:border-zinc-700 uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {refreshing ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : null}
                {refreshing ? 'Refreshing...' : 'Refresh Payment Status'}
              </button>

              <button
                onClick={async () => {
                  await signOut();
                  window.location.href = '/login';
                }}
                className="w-full py-4 bg-transparent hover:bg-white/5 text-slate-500 hover:text-slate-400 font-bold rounded-2xl transition-all uppercase text-[10px] tracking-widest"
              >
                Sign Out / Log Out
              </button>
            </div>
          </div>
        </div>
      );
    }

    return <Navigate to="/billing" replace />
  }

  // ── Step 9: All checks passed ──
  return children
}
