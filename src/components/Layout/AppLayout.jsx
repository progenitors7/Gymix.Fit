import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useGym } from '../../hooks/useGym'
import { isSuperAdmin } from '../../config/admins'
import { useNotifications } from '../../hooks/useNotifications'
import BroadcastBanner from './BroadcastBanner'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'
import { 
  LayoutDashboard, 
  Users, 
  CalendarRange, 
  CreditCard, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  ChevronRight,
  QrCode,
  Clock,
  Trophy
} from 'lucide-react'
import Logo from '../UI/Logo'

// Utility for cleaner class merging
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'QR Scanner',
    path: '/scanner',
    icon: QrCode,
  },
  {
    label: 'Athletes',
    path: '/members',
    icon: Users,
  },
  {
    label: 'Leaderboard',
    path: '/leaderboard',
    icon: Trophy,
  },
  {
    label: 'Attendance',
    path: '/attendance',
    icon: Clock,
  },
  {
    label: 'Subscriptions',
    path: '/subscriptions',
    icon: CalendarRange,
  },
  {
    label: 'Revenue History',
    path: '/payments',
    icon: CreditCard,
  },
  {
    label: 'Notifications',
    path: '/notifications',
    id: 'nav-notifications',
    icon: Bell,
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings,
  },
  {
    label: 'Billing',
    path: '/billing',
    icon: CreditCard,
  },
  {
    label: 'Super Admin',
    path: '/super-admin',
    icon: ShieldCheck,
  },
]

function SidebarContent({ onClose, isMobile }) {
  const { user, profile, signOut } = useAuth()
  const { gym } = useGym()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)

  const hasAdminAccess = isSuperAdmin(user?.email)
  const isPaywalled = gym?.status === 'pending' || gym?.billing_status === 'expired'

  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.path === '/super-admin') return hasAdminAccess
    // When paywalled, only show Billing and Settings nav items
    if (isPaywalled) {
      return item.path === '/billing' || item.path === '/settings'
    }
    return true
  })

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const signOutPromise = signOut()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timed out')), 2000)
      )
      await Promise.race([signOutPromise, timeoutPromise])
    } catch (error) {
      console.error('Sign out error or timeout:', error)
      localStorage.clear()
      window.location.href = '/login'
    } finally {
      setSigningOut(false)
    }
  }

  const initials = gym?.gym_name?.slice(0, 2).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'GY'
  const emailDisplay = user?.email || ''

  return (
    <div className="flex flex-col h-full bg-[#151922] border-r border-white/5 relative">
      {/* Logo Area */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
        <Logo className="w-8 h-8 flex-shrink-0 drop-shadow-[0_0_8px_rgba(134,59,255,0.2)]" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white text-lg tracking-tight leading-none">Gym OS</p>
          <p className="text-slate-400 text-[10px] mt-1 truncate uppercase tracking-widest font-semibold">{gym?.gym_name ?? 'Loading…'}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="ml-auto w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-all rounded-lg hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto hide-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="relative block"
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[#3B82F6]/10 border border-[#3B82F6]/20 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <div className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200",
                isActive ? "text-[#3B82F6]" : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5"
              )}>
                <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-[#3B82F6]" : "text-[#94A3B8]")} />
                <span className="flex-1">{item.label}</span>
                
                {item.id === 'nav-notifications' && unreadCount > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-[20px] px-1.5 rounded-full bg-[#3B82F6] text-white text-[10px] font-bold shadow-lg shadow-[#3B82F6]/20">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {isActive && !isMobile && (
                  <ChevronRight className="w-4 h-4 text-[#3B82F6] opacity-50" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-white/5 bg-[#151922]">
        <div className="group flex items-center gap-3 px-3 py-3 rounded-2xl bg-[#1A1F2B] border border-white/5 transition-all hover:border-[#3B82F6]/30">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A1F2B] to-[#2D3748] border border-white/10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-inner overflow-hidden">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#F8FAFC] text-[13px] font-semibold truncate leading-tight">{gym?.gym_name || 'Admin'}</p>
            <p className="text-[#94A3B8] text-[11px] truncate mt-0.5">{emailDisplay}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
          >
            {signingOut ? (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function BottomNav() {
  const location = useLocation()
  const { user } = useAuth()
  const { gym } = useGym()
  const { unreadCount } = useNotifications()

  const hasAdminAccess = isSuperAdmin(user?.email)
  const isPaywalled = gym?.status === 'pending' || gym?.billing_status === 'expired'

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.path === '/settings') return false
    if (item.path === '/super-admin') return hasAdminAccess
    // When paywalled, only show Billing in bottom nav
    if (isPaywalled) {
      return item.path === '/billing'
    }
    return true
  }).slice(0, 5) // Keep bottom nav to max 5 items for mobile

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#1A1F2B]/90 backdrop-blur-xl border-t border-white/5 z-[100] pb-safe">
      <div className="flex items-center justify-around h-full px-2">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200",
                isActive ? "text-[#3B82F6]" : "text-[#94A3B8]"
              )}
            >
              <motion.div 
                animate={{ scale: isActive ? 1.1 : 1 }}
                className="relative z-10"
              >
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div 
                    layoutId="bottom-nav-indicator"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#3B82F6]" 
                  />
                )}
              </motion.div>
              {item.id === 'nav-notifications' && unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#3B82F6] text-white text-[8px] font-bold z-20 shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AppLayout({ children }) {
  const { profile } = useAuth()

  // B2B2C Member Shell: Bypass owner layout sidebars & headers entirely
  if (profile?.role === 'member') {
    return (
      <div className="flex h-screen bg-[#0F1117] overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    )
  }

  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { gym } = useGym()
  const showBillingReminder =
    location.pathname !== '/billing' &&
    Number.isFinite(gym?.billing_days_left) &&
    gym.billing_days_left >= 0 &&
    gym.billing_days_left <= 7

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  return (
    <div className="flex h-screen bg-[#0F1117] overflow-hidden selection:bg-[#3B82F6]/30 selection:text-[#3B82F6]">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:w-[280px] flex-col flex-shrink-0 z-50">
        <SidebarContent isMobile={false} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed top-0 bottom-0 left-0 w-[280px] z-[70] transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onClose={() => setSidebarOpen(false)} isMobile={true} />
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#151922]/80 backdrop-blur-md flex-shrink-0 z-40 sticky top-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-[#94A3B8] hover:text-white transition-colors rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Logo className="w-7 h-7 flex-shrink-0" />
              <span className="font-bold text-[#F8FAFC] text-[15px] tracking-tight">Gym OS</span>
            </div>
          </div>
          <Link to="/settings" className="p-2 -mr-2 text-[#94A3B8] hover:text-[#F8FAFC] transition-all">
            <Settings className="w-5 h-5" />
          </Link>
        </header>

        {/* Page content with smooth route transition wrapper */}
        <main className="flex-1 overflow-y-auto pb-28 lg:pb-0 scroll-smooth">
          <BroadcastBanner />
          {showBillingReminder && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <p className="text-amber-100 text-xs font-bold">
                  Your Gym OS plan expires in {gym.billing_days_left} day{gym.billing_days_left === 1 ? '' : 's'}.
                </p>
              </div>
              <Link
                to="/billing"
                className="px-4 py-2 rounded-xl bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest text-center"
              >
                Renew
              </Link>
            </div>
          )}
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
