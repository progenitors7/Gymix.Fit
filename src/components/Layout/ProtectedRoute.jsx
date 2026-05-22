import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCurrentGym } from '../../hooks/useCurrentGym'

export default function ProtectedRoute({ children }) {
  const { user, loading: authLoading } = useAuth()
  const { gym, gymLoading, gymError } = useCurrentGym()
  const location = useLocation()

  // Block rendering and show loading screen if:
  // 1. Auth is loading
  // 2. Gym is loading
  // 3. User is authenticated, but gym object is not loaded yet and there is no gym loading error
  if (authLoading || gymLoading || (user && !gym && !gymError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#121212]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#3390ec] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Verifying Access...</p>
        </div>
      </div>
    )
  }

  // Show a clear error screen if gym loading failed (instead of crashing individual pages)
  if (gymError) {
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

  if (!user) {
    return <Navigate to="/" replace />
  }

  // Subscription Paywall: Redirect to billing if gym is pending or expired.
  // Allow access to /billing, /settings, and /super-admin
  const isBillingPage = location.pathname === '/billing'
  const isSettingsPage = location.pathname === '/settings'
  const isSuperAdmin = location.pathname.startsWith('/super-admin')
  const requiresBilling = gym?.status === 'pending' || gym?.billing_status === 'expired'
  
  if (requiresBilling && !isBillingPage && !isSettingsPage && !isSuperAdmin) {
    return <Navigate to="/billing" replace />
  }

  return children
}
