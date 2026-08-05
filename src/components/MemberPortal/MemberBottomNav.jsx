import { QrCode, Flame, Trophy, ShoppingBag, User } from 'lucide-react'

export default function MemberBottomNav({ activeTab, setActiveTab, streakCount }) {
  const visibleItems = [
    { id: 'pass', icon: QrCode, label: 'Pass' },
    { id: 'streaks', icon: Flame, label: 'Streaks', badge: streakCount > 0 ? streakCount : null },
    { id: 'leaderboard', icon: Trophy, label: 'Leaderboard' },
    { id: 'store', icon: ShoppingBag, label: 'Store' },
    { id: 'profile', icon: User, label: 'Settings' }
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[calc(4rem+env(safe-area-inset-bottom,0px))] bg-[#1A1F2B] border-t border-white/5 z-50 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 cursor-pointer ${
                isActive ? "text-[#3B82F6]" : "text-[#94A3B8]"
              }`}
            >
              <div className="relative z-10">
                <Icon 
                  className="w-5 h-5 transition-transform duration-200 active:scale-90" 
                  fill={isActive && item.id !== 'pass' ? "currentColor" : "none"}
                  strokeWidth={isActive && item.id === 'pass' ? 2.5 : 2}
                />
                {item.badge !== undefined && item.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-[#3B82F6] text-white text-[8px] font-bold z-20">
                    {item.badge}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
