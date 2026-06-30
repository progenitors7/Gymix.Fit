import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentGym } from '../../hooks/useCurrentGym'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabaseClient'

/**
 * ProtectedRoute — Clean state machine guard.
 *
 * Evaluation order:
 *   1. Auth loading → spinner
 *   2. No user → redirect /login
 *   3. Member → pass through immediately (no gym checks)
 *   4. Owner: gym loading (non-admin pages only) → spinner
 *   5. Owner: gym error (non-admin pages only) → error card
 *   6. Owner: no gym / pending / expired (non-admin pages only) → redirect /billing
 *   7. All checks passed → render children
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
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Verifying Access...</p>
        </div>
      </div>
    )
  }

  // ── Step 2: Not logged in ──
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // ── Step 3: Determine role and page type ──
  const isMember = profile?.role === 'member'
  const isOwner = profile?.role === 'owner'
  const isBillingPage = location.pathname === '/billing'
  const isSettingsPage = location.pathname === '/settings'
  const isSuperAdmin = location.pathname.startsWith('/super-admin')
  const isAdminPage = isBillingPage || isSettingsPage || isSuperAdmin

  const isPlaystoreApp = localStorage.getItem('is_playstore_app') === 'true' || window.Capacitor !== undefined;

  // Anti-Steering: Prevent loading billing page inside the native Play Store app
  if (isPlaystoreApp && isBillingPage) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Step 4: Members skip ALL gym/billing checks ──
  if (isMember) {
    return children
  }

  // ── Step 5: Gym error — show error card (non-admin pages only) ──
  if (gymError && !isAdminPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212] p-6 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500 text-3xl mx-auto mb-6">
            ⚠️
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Gym Data</h2>
          <p className="text-slate-400 text-sm mb-8">
            {gymError}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-sky-500 hover:bg-sky-400 text-white font-semibold rounded-xl transition-all"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all"
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
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Loading Gym...</p>
        </div>
      </div>
    )
  }

  // ── Step 7: Blocked Gym owner check ──
  if (isOwner && gym?.status === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117] p-6 text-center">
        <div className="max-w-md w-full bg-[#1c1c1c] border border-red-500/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-[50px] rounded-full pointer-events-none" />
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 text-3xl mx-auto mb-6 border border-red-500/20">
            🚫
          </div>
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Account Suspended</h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
            Your gym account <strong className="text-white">"{gym?.gym_name}"</strong> has been suspended by the platform administrator due to a policy violation or outstanding dues. Please contact administration to resolve this.
          </p>
          <div className="space-y-3">
            <a
              href="mailto:support@gymix.fit"
              className="block w-full py-4 bg-red-500 hover:bg-red-400 text-white font-bold rounded-2xl transition-all uppercase text-xs tracking-wider shadow-lg shadow-red-500/10"
            >
              Contact Administration
            </a>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = '/login';
              }}
              className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all border border-white/5 uppercase text-xs tracking-wider"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Step 8: Owner billing redirect — no gym, pending, or expired ──
  if (isOwner && !isAdminPage && user?.email !== 'demo.owner@gymix.fit' && (!gym || gym?.status === 'pending' || gym?.billing_status === 'expired')) {
    if (isPlaystoreApp) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0F1117] p-6 text-center">
          <div className="max-w-md w-full bg-[#1c1c1c] border border-[#3390ec]/20 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#3390ec]/5 blur-[50px] rounded-full pointer-events-none" />
            <div className="w-16 h-16 bg-[#3390ec]/10 rounded-2xl flex items-center justify-center text-[#3390ec] text-3xl mx-auto mb-6 border border-[#3390ec]/20">
              ⚡
            </div>
            <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">Reactivation Required</h2>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed font-semibold">
              To keep managing your gym, please manage your subscription online. 
              <br/><br/>
              Once your account has been updated, your mobile app will automatically unlock!
            </p>
            <div className="space-y-3">
              <button
                onClick={handleManageOnline}
                className="w-full py-4 bg-[#3390ec] hover:bg-[#287cd0] text-white font-bold rounded-2xl transition-all uppercase text-xs tracking-wider shadow-lg shadow-[#3390ec]/10 flex items-center justify-center gap-2"
              >
                Manage Subscription Online
              </button>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all border border-white/5 uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {refreshing ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
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
