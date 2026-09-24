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
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-t border-slate-200 dark:border-zinc-800 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-all duration-150 cursor-pointer active:scale-95 ${
                isActive ? "text-violet-600 dark:text-violet-400 font-extrabold" : "text-slate-500 dark:text-zinc-400 font-semibold"
              }`}
            >
              <div className="relative z-10">
                <Icon 
                  className="w-5 h-5 transition-transform duration-200" 
                  fill={isActive && item.id !== 'pass' ? "currentColor" : "none"}
                  strokeWidth={isActive && item.id === 'pass' ? 2.5 : 2}
                />
                {item.badge !== undefined && item.badge !== null && (
                  <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full bg-violet-600 text-white text-[8px] font-bold border border-white dark:border-zinc-900 z-20">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none tracking-tight">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
