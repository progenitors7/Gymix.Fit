import { Bell, Check } from 'lucide-react'

export default function MemberNotificationsTab({
  notifications,
  notifsLoading,
  markMemberNotifAsRead
}) {
  const unreadNotifications = notifications.filter(n => !n.is_read)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="bg-[#1A1F2B] border border-white/5 rounded-[2rem] p-6 space-y-6 shadow-2xl">
        
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 text-[#3B82F6]">
              <Bell className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-white uppercase tracking-wider">Gym Alerts & Broadcasts</h4>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Stay updated with your membership & announcements</p>
            </div>
          </div>
          <span className="text-[9px] font-black uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-slate-400">
            Unread: {unreadNotifications.length}
          </span>
        </div>

        {notifsLoading ? (
          <div className="text-center py-12 text-slate-500 text-[10px] uppercase font-bold tracking-widest">
            Loading your inbox...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
              <Check className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h5 className="text-xs font-black text-white uppercase tracking-wider">No notifications yet</h5>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Your inbox is completely empty and clean!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {notifications.map((n) => {
              const isBroadcast = n.type === 'system_broadcast'
              const styles = isBroadcast 
                ? { bg: 'bg-indigo-500/[0.04]', border: 'border-indigo-500/25', text: 'text-indigo-400', label: 'ANNOUNCEMENT' }
                : n.type === 'membership_expired'
                ? { bg: 'bg-rose-500/[0.04]', border: 'border-rose-500/25', text: 'text-rose-400', label: 'EXPIRED ALERT' }
                : { bg: 'bg-amber-500/[0.04]', border: 'border-amber-500/25', text: 'text-amber-400', label: 'EXPIRING ALERT' }

              return (
                <div 
                  key={n.id} 
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    n.is_read 
                      ? 'bg-white/[0.01] border-white/5 opacity-50' 
                      : `${styles.bg} ${styles.border}`
                  }`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${n.is_read ? 'bg-white/5 text-slate-500' : 'bg-white/10 text-white'}`}>
                        {styles.label}
                      </span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <h5 className={`text-xs font-black uppercase tracking-wide ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                      {n.title}
                    </h5>
                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    {!n.is_read && (
                      <button
                        onClick={() => markMemberNotifAsRead(n.id, n.type)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
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
