import { Menu, Bell } from 'lucide-react'

export default function MemberMobileHeader({ 
  profile, 
  membership, 
  setActiveTab, 
  setMobileMenuOpen, 
  notifications 
}) {
  const unreadCount = notifications.filter(n => !n.is_read).length
  const initials = profile?.full_name?.slice(0, 2).toUpperCase() || 'M'

  return (
    <header 
      style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
      className="sticky top-0 z-40 lg:hidden flex items-center justify-between px-6 pb-4 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-800 dark:text-zinc-200 text-xs font-bold overflow-hidden flex-shrink-0">
          {membership?.avatar_url || profile?.avatar_url ? (
            <img src={membership?.avatar_url || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="space-y-0.5 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-1">
            <span>Hi, {profile?.full_name?.split(' ')[0] || 'Athlete'}!</span>
          </h1>
          <p className="text-[10px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider truncate leading-none">
            {membership ? membership.gyms?.gym_name : 'No Connected Gym'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {membership && (
          <button
            onClick={() => setActiveTab('notifications')}
            className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-white dark:border-zinc-950">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white active:scale-95 transition-all cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
