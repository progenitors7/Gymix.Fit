import { QrCode, Bell, Calendar, Flame, Trophy, TrendingUp, User, LogOut, ShoppingBag } from 'lucide-react'
import Logo from '../UI/Logo'

export default function MemberSidebar({ 
  profile, 
  membership, 
  activeTab, 
  setActiveTab, 
  notifications, 
  streakCount, 
  onSignOut 
}) {
  const unreadCount = notifications.filter(n => !n.is_read).length

  const NAV_ITEMS = [
    { id: 'pass', label: 'Access Pass Key', icon: QrCode },
    { 
      id: 'notifications', 
      label: 'Inbox & Alerts', 
      icon: Bell, 
      badge: unreadCount > 0 ? `${unreadCount} New` : null 
    },
    { id: 'attendance', label: 'Attendance Logs', icon: Calendar },
    { id: 'streaks', label: 'Workout Streaks', icon: Flame, badge: streakCount > 0 ? `${streakCount} Days` : null },
    { id: 'leaderboard', label: 'Gym Leaderboard', icon: Trophy },
    { id: 'store', label: 'Gym Store', icon: ShoppingBag },
    { id: 'progress', label: 'PR & Progress', icon: TrendingUp },
    { id: 'profile', label: 'Profile Settings', icon: User }
  ]

  const initials = profile?.full_name?.slice(0, 2).toUpperCase() || 'M'

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 justify-between">
      <div>
        {/* Logo Area */}
        <div 
          style={{ paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))' }}
          className="flex items-center gap-3 px-6 pb-6 border-b border-slate-200 dark:border-zinc-800/80"
        >
          <Logo className="w-8 h-8 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-900 dark:text-white text-lg tracking-tight leading-none">Gymix</p>
            <p className="text-slate-500 dark:text-zinc-400 text-[10px] mt-1 truncate uppercase tracking-widest font-semibold">Member Terminal</p>
          </div>
        </div>

        {/* Navigation items matching the Owner AppLayout style */}
        <nav className="px-4 py-6 space-y-1 overflow-y-auto hide-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 cursor-pointer ${
                  isActive 
                    ? "bg-slate-100 dark:bg-zinc-900 text-slate-900 dark:text-white font-semibold" 
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-zinc-900/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 transition-colors ${isActive ? "text-violet-600 dark:text-violet-400" : "text-slate-400 dark:text-zinc-500"}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isActive ? 'bg-violet-600 text-white' : 'bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* User Footer Profile matching AppLayout.jsx */}
      <div className="p-4 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-zinc-200 text-xs font-bold flex-shrink-0 overflow-hidden">
            {membership?.avatar_url || profile?.avatar_url ? (
              <img src={membership?.avatar_url || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-slate-900 dark:text-zinc-100 text-xs font-semibold truncate leading-tight">
              {profile?.full_name || 'Athlete'}
            </p>
            <p className="text-slate-500 dark:text-zinc-400 text-[11px] truncate mt-0.5 font-medium">
              {membership ? membership.gyms?.gym_name : 'No Active Gym'}
            </p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
