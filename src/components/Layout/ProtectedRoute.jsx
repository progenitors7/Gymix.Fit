import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentGym } from '../../hooks/useCurrentGym'

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
  const { user, profile, loading: authLoading } = useAuth()
  const { gym, gymLoading, gymError } = useCurrentGym()
  const location = useLocation()

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

  // ── Step 7: Owner billing redirect — no gym, pending, or expired ──
  if (isOwner && !isAdminPage && (!gym || gym?.status === 'pending' || gym?.billing_status === 'expired')) {
    return <Navigate to="/billing" replace />
  }

  // ── Step 8: All checks passed ──
  return children
}
