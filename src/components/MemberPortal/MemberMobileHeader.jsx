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
      className="sticky top-0 z-40 lg:hidden flex items-center justify-between px-6 pb-4 bg-[#151922]/80 backdrop-blur-md border-b border-white/5 shadow-lg shadow-black/20"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A1F2B] to-[#2D3748] border border-white/10 flex items-center justify-center text-white text-xs font-bold shadow-inner overflow-hidden flex-shrink-0">
          {membership?.avatar_url || profile?.avatar_url ? (
            <img src={membership?.avatar_url || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <div className="space-y-0.5">
          <h1 className="text-sm font-black text-white tracking-wider flex items-center gap-1">
            <span>Hi, {profile?.full_name?.split(' ')[0] || 'Athlete'}!</span>
          </h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
            {membership ? membership.gyms?.gym_name : 'No Connected Gym'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {membership && (
          <button
            onClick={() => setActiveTab('notifications')}
            className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#3B82F6] rounded-full flex items-center justify-center text-[9px] font-bold text-white border border-[#0f1117]">
                {unreadCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={() => setMobileMenuOpen(true)}
          className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          title="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
