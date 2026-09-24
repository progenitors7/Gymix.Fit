import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isSuperAdmin } from '../../config/admins'

export default function SuperAdminRoute({ children }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500">Super Admin Verifying...</p>
        </div>
      </div>
    )
  }

  const hasAdminAccess = isSuperAdmin(user?.email) || profile?.role === 'super_admin'

  if (!hasAdminAccess) {
    console.warn('Unauthorized access attempt to Super Admin panel.', { email: user?.email, role: profile?.role })
    return <Navigate to="/dashboard" replace />
  }

  return children
}
