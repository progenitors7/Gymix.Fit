import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useGym } from '../../hooks/useGym'
import { isSuperAdmin } from '../../config/admins'
import { useNotifications } from '../../hooks/useNotifications'
import { useTheme } from '../../context/ThemeContext'
import BroadcastBanner from './BroadcastBanner'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'framer-motion'
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
  Trophy,
  Store,
  User,
  Sun,
  Moon,
  Laptop
} from 'lucide-react'
import Logo from '../UI/Logo'
import ThemeToggle from '../UI/ThemeToggle'
import { isNativeCapacitorApp } from '../../utils/platform'

// Utility for cleaner class merging
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const NAV_GROUPS = [
  {
    title: 'Front Desk',
    items: [
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Members Directory', path: '/members', icon: Users },
      { label: 'Gate Check-In (QR)', path: '/scanner', icon: QrCode },
      { label: 'Daily Attendance', path: '/attendance', icon: Clock },
    ]
  },
  {
    title: 'Sales & Billing',
    items: [
      { label: 'Membership Plans', path: '/subscriptions', icon: CalendarRange },
      { label: 'Payments & Ledger', path: '/payments', icon: CreditCard },
      { label: 'Gym Store (POS)', path: '/store-manager', icon: Store },
    ]
  },
  {
    title: 'Community & Alerts',
    items: [
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Notifications', path: '/notifications', id: 'nav-notifications', icon: Bell },
    ]
  },
  {
    title: 'Gym Administration',
    items: [
      { label: 'Gym Settings', path: '/settings', icon: Settings },
      { label: 'Software Billing', path: '/billing', icon: CreditCard },
      { label: 'Owner Profile', path: '/profile', icon: User },
      { label: 'Super Admin', path: '/super-admin', icon: ShieldCheck, adminOnly: true },
    ]
  }
]



function SidebarContent({ onClose, isMobile }) {
  const { user, profile, signOut } = useAuth()
  const { gym } = useGym()
  const { unreadCount } = useNotifications()
  const location = useLocation()
  const [signingOut, setSigningOut] = useState(false)

  const hasAdminAccess = isSuperAdmin(user?.email)
  const isPaywalled = gym?.status === 'pending' || gym?.billing_status === 'expired'
  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true' || isNativeCapacitorApp()

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
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 relative">
      {/* Brand Header */}
      <div 
        style={{ paddingTop: 'calc(20px + env(safe-area-inset-top, 0px))' }}
        className="flex items-center gap-3 px-5 pb-5 border-b border-slate-200 dark:border-zinc-800/80"
      >
        <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shrink-0">
          <Logo className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white text-base tracking-tight leading-none">Gymix</span>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1 truncate font-medium">{gym?.gym_name ?? 'Loading…'}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Categorized Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto hide-scrollbar">
        {NAV_GROUPS.map((group) => {
          // Filter items based on permissions and paywall
          const validItems = group.items.filter((item) => {
            if (item.adminOnly && !hasAdminAccess) return false
            if (isPaywalled) {
              return item.path === '/billing' || item.path === '/settings' || item.path === '/profile'
            }
            return true
          }).map(item => {
            if (isPlaystoreApp && item.path === '/billing') {
              return { ...item, label: 'Subscription', path: '/subscription-status' }
            }
            return item
          })

          if (validItems.length === 0) return null

          return (
            <div key={group.title} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-zinc-500 px-3 pb-1">
                {group.title}
              </p>
              {validItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className="relative block group"
                  >
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer",
                      isActive 
                        ? "bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold" 
                        : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-900/60"
                    )}>
                      <Icon className={cn(
                        "w-4.5 h-4.5 transition-colors", 
                        isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-zinc-500 group-hover:text-slate-600 dark:group-hover:text-zinc-300"
                      )} />
                      <span className="flex-1 truncate">{item.label}</span>
                      
                      {item.id === 'nav-notifications' && unreadCount > 0 && (
                        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[9px] font-black">
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer Controls: Theme Switcher & User Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950 space-y-3">
        {/* Multi-Theme Switcher (Auto/Light/OLED/Abyss) */}
        <div>
          <ThemeToggle variant="segmented" className="w-full justify-between" />
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <Link to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-zinc-200 text-xs font-bold shrink-0 overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-900 dark:text-zinc-100 text-xs font-semibold truncate leading-tight group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                {profile?.full_name || 'Gym Owner'}
              </p>
              <p className="text-slate-400 dark:text-zinc-500 text-[11px] truncate mt-0.5">{emailDisplay}</p>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all disabled:opacity-50 shrink-0 cursor-pointer"
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
  const { gym } = useGym()
  const { unreadCount } = useNotifications()

  const isPaywalled = gym?.status === 'pending' || gym?.billing_status === 'expired'

  const ownerBottomNavItems = [
    { label: 'Home', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Members', path: '/members', icon: Users },
    { label: 'Scanner', path: '/scanner', icon: QrCode },
    { label: 'Plans', path: '/subscriptions', icon: CalendarRange },
    { label: 'Store', path: '/store-manager', icon: Store },
  ]

  if (isPaywalled) {
    return null
  }

  return (
    <nav 
      className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 z-[100] pb-safe"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {ownerBottomNavItems.map((item) => {
          const isActive = location.pathname === item.path
          const Icon = item.icon
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-150 cursor-pointer active:scale-95",
                isActive 
                  ? "text-violet-600 dark:text-violet-400 font-extrabold" 
                  : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 font-semibold"
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] mt-1 leading-none tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AppLayout({ children }) {
  const { user, profile } = useAuth()

  // B2B2C Member Shell: Bypass owner layout sidebars & headers entirely
  if (profile?.role === 'member') {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-zinc-950 overflow-hidden">
        {children}
      </div>
    )
  }

  const [isSidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { gym } = useGym()
  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true' || isNativeCapacitorApp()
  const showBillingReminder =
    !isPlaystoreApp &&
    location.pathname !== '/billing' &&
    Number.isFinite(gym?.billing_days_left) &&
    gym.billing_days_left >= 0 &&
    gym.billing_days_left <= 7

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  const isSuperAdminPage = location.pathname.startsWith('/super-admin')

  if (isSuperAdminPage) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-500 overflow-x-hidden">
        {children}
      </div>
    )
  }

  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 overflow-hidden selection:bg-violet-500/25 selection:text-violet-300">
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex lg:w-[270px] flex-col shrink-0 z-50">
        <SidebarContent isMobile={false} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-[105]"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <aside className={cn(
        "lg:hidden fixed top-0 bottom-0 left-0 w-[280px] z-[110] transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <SidebarContent onClose={() => setSidebarOpen(false)} isMobile={true} />
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Ghost Mode Impersonation Banner */}
        {(localStorage.getItem('ghost_mode_gym_id') || localStorage.getItem('selected_gym_id')) && (
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between z-50 shrink-0">
            <div className="flex items-center gap-2">
              <span>👻</span>
              <span>Ghost Mode Active: Inspecting <strong>{gym?.gym_name || 'Selected Gym'}</strong></span>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('ghost_mode_gym_id');
                localStorage.removeItem('selected_gym_id');
                window.location.href = '/super-admin';
              }}
              className="bg-black/30 hover:bg-black/50 text-white px-3 py-1 rounded-lg border border-white/20 text-[10px] uppercase font-bold cursor-pointer transition-all active:scale-95"
            >
              Exit Ghost Mode
            </button>
          </div>
        )}

        {/* Mobile topbar */}
        <header 
          style={{ paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))' }}
          className="lg:hidden flex items-center justify-between px-4 pb-3 border-b border-slate-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md shrink-0 z-40 sticky top-0"
        >
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Logo className="w-6 h-6 shrink-0" />
              <span className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">
                {gym?.gym_name || 'Gymix'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="compact" />
            <Link 
              to="/profile" 
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-zinc-200 text-[10px] font-bold overflow-hidden cursor-pointer"
              title="View Profile"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.slice(0, 2).toUpperCase() || 'O'
              )}
            </Link>
            <Link to="/settings" className="p-2 -mr-2 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer">
              <Settings className="w-5 h-5" />
            </Link>
          </div>
        </header>

        {/* Page content scroll container */}
        <main className="flex-1 overflow-y-auto pb-28 lg:pb-8 scroll-smooth relative">
          {/* Subtle Ambient Atmosphere Glow (Linear / Apple Pro aesthetic) */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-72 bg-gradient-to-b from-violet-600/[0.08] via-violet-600/[0.02] to-transparent blur-3xl -z-10" />
          <BroadcastBanner />
          {showBillingReminder && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 dark:bg-amber-500/5 px-5 py-3.5 flex flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-amber-800 dark:text-amber-200 text-xs font-semibold">
                  Your Gymix plan expires in {gym.billing_days_left} day{gym.billing_days_left === 1 ? '' : 's'}.
                </p>
              </div>
              <Link
                to="/billing"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-[11px] font-bold tracking-wide text-center cursor-pointer transition-all active:scale-95 shrink-0"
              >
                Renew Plan
              </Link>
            </div>
          )}
          {children}
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
