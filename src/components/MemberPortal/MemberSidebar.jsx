import { QrCode, Bell, Calendar, Flame, Trophy, Sparkles, User, LogOut, ShoppingBag } from 'lucide-react'
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
    { id: 'progress', label: 'PR & Progress', icon: Sparkles },
    { id: 'profile', label: 'Profile Settings', icon: User }
  ]

  const initials = profile?.full_name?.slice(0, 2).toUpperCase() || 'M'

  return (
    <div className="flex flex-col h-full bg-[#151922] border-r border-white/5 justify-between">
      <div>
        {/* Logo Area */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-white/5">
          <Logo className="w-8 h-8 flex-shrink-0 drop-shadow-[0_0_8px_rgba(134,59,255,0.2)]" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-lg tracking-tight leading-none">Gymix</p>
            <p className="text-[#94A3B8] text-[10px] mt-1 truncate uppercase tracking-widest font-semibold">Member Terminal</p>
          </div>
        </div>

        {/* Navigation items matching the Owner UI style */}
        <nav className="px-4 py-6 space-y-1.5 overflow-y-auto hide-scrollbar">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                  isActive 
                    ? "text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 font-semibold" 
                    : "text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-[#3B82F6]" : "text-[#94A3B8]"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-[#3B82F6] text-white' : 'bg-white/5 text-[#94A3B8]'
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
      <div className="p-4 border-t border-white/5 bg-[#151922]">
        <div className="flex items-center gap-3 px-3 py-3 rounded-2xl bg-[#1A1F2B] border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1A1F2B] to-[#2D3748] border border-white/10 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-inner overflow-hidden">
            {membership?.avatar_url || profile?.avatar_url ? (
              <img src={membership?.avatar_url || profile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[#F8FAFC] text-[13px] font-semibold truncate leading-tight">
              {profile?.full_name || 'Athlete'}
            </p>
            <p className="text-[#94A3B8] text-[11px] truncate mt-0.5">
              {membership ? membership.gyms?.gym_name : 'No Active Gym'}
            </p>
          </div>
          <button
            onClick={onSignOut}
            title="Sign out"
            className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-all flex-shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
