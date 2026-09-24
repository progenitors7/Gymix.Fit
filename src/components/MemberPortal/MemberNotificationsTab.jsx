import { Bell, Check } from 'lucide-react'

export default function MemberNotificationsTab({
  notifications,
  notifsLoading,
  markMemberNotifAsRead
}) {
  const unreadNotifications = (notifications || []).filter(n => !n.is_read)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-6">
        
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 text-violet-600 dark:text-violet-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Gym Alerts & Broadcasts</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Stay updated with your membership & announcements</p>
            </div>
          </div>
          <span className="text-xs font-semibold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2.5 py-0.5 rounded-lg text-slate-600 dark:text-zinc-400">
            Unread: {unreadNotifications.length}
          </span>
        </div>

        {notifsLoading ? (
          <div className="text-center py-12 text-slate-500 dark:text-zinc-400 text-xs font-medium">
            Loading your inbox...
          </div>
        ) : (!notifications || notifications.length === 0) ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center mx-auto text-slate-400 dark:text-zinc-500">
              <Check className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-slate-900 dark:text-white">No notifications yet</h5>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Your inbox is completely empty and clean!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications.map((n) => {
              const isBroadcast = n.type === 'system_broadcast'
              const styles = isBroadcast 
                ? { bg: 'bg-violet-500/[0.04]', border: 'border-violet-500/20', text: 'text-violet-600 dark:text-violet-400', label: 'ANNOUNCEMENT' }
                : n.type === 'membership_expired'
                ? { bg: 'bg-rose-500/[0.04]', border: 'border-rose-500/20', text: 'text-rose-600 dark:text-rose-400', label: 'EXPIRED ALERT' }
                : { bg: 'bg-amber-500/[0.04]', border: 'border-amber-500/20', text: 'text-amber-600 dark:text-amber-400', label: 'EXPIRING ALERT' }

              return (
                <div 
                  key={n.id} 
                  className={`p-4 rounded-xl border transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    n.is_read 
                      ? 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200 dark:border-zinc-800 opacity-60' 
                      : `${styles.bg} ${styles.border}`
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                        n.is_read 
                          ? 'bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300' 
                          : `${styles.text} bg-white dark:bg-zinc-900 border border-current`
                      }`}>
                        {styles.label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h5 className={`text-xs font-bold ${n.is_read ? 'text-slate-500 dark:text-zinc-400' : 'text-slate-900 dark:text-white'}`}>
                      {n.title}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {!n.is_read && (
                      <button
                        onClick={() => markMemberNotifAsRead(n.id, n.type)}
                        className="px-3.5 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold tracking-wide transition-all cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
