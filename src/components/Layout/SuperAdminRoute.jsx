import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { isSuperAdmin } from '../../config/admins'

export default function SuperAdminRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1c1c1c]">
        <div className="w-10 h-10 border-2 border-[#3390ec]/20 border-t-[#3390ec] rounded-full animate-spin" />
      </div>
    )
  }

  const hasAdminAccess = isSuperAdmin(user?.email)

  if (!hasAdminAccess) {
    console.warn('Unauthorized access attempt to Super Admin panel.')
    return <Navigate to="/dashboard" replace />
  }

  return children
}
