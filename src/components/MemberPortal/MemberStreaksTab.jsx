import { Flame, Check, Coins } from 'lucide-react'

export default function MemberStreaksTab({
  membership,
  streakCount,
  attendanceLogs,
  coinTransactions,
  coinsLoading
}) {
  const getAthleteRank = (streak) => {
    if (streak >= 30) return { name: 'Immortal Gym Lord', emoji: '👑', color: 'text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10' }
    if (streak >= 15) return { name: 'Diamond Beast', emoji: '💎', color: 'text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/10' }
    if (streak >= 7) return { name: 'Gold Grinder', emoji: '🏆', color: 'text-yellow-600 dark:text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
    if (streak >= 3) return { name: 'Iron Athlete', emoji: '🦾', color: 'text-slate-700 dark:text-slate-300 border-slate-500/30 bg-slate-500/10' }
    return { name: 'Gym Starter', emoji: '🪵', color: 'text-orange-600 dark:text-orange-400 border-orange-500/30 bg-orange-500/10' }
  }

  const activeRank = getAthleteRank(streakCount)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Side-by-side split grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Fire Streak Card */}
        <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-center flex flex-col justify-center items-center min-h-[300px]">
          <div className="space-y-5 w-full">
            <div className="w-16 h-16 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center mx-auto relative text-orange-500">
              <Flame className="w-9 h-9 fill-orange-500/20" />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase text-orange-600 dark:text-orange-400 tracking-wider">CURRENT WORKOUT STREAK</p>
              <h3 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {streakCount} DAYS
              </h3>
            </div>

            {/* Athlete Level Badge */}
            <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wider ${activeRank.color}`}>
              <span>{activeRank.emoji}</span>
              <span>{activeRank.name}</span>
            </div>
          </div>
        </div>

        {/* Weekly Consistency & Motivation Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Weekly Consistency</h4>
            
            {/* Visual 7 days bar */}
            <div className="flex justify-between items-center gap-2 pt-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                const checkInDaysMap = new Set(
                  (attendanceLogs || []).map(log => new Date(log.check_in_time).getDay())
                )
                const dayMapIndex = [1, 2, 3, 4, 5, 6, 0][idx]
                const isActive = checkInDaysMap.has(dayMapIndex)
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                      isActive 
                      ? 'bg-orange-500/15 border-orange-500/40 text-orange-600 dark:text-orange-400 font-bold scale-105' 
                      : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 text-xs'
                    }`}>
                      {isActive ? <Check className="w-4 h-4 text-orange-500" /> : day.charAt(0)}
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{day.substring(0, 3)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Motivation quotes */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800">
            <p className="text-slate-600 dark:text-zinc-300 text-xs font-medium leading-relaxed">
              {streakCount > 0 
                ? "“You are out-working 99% of the room. Keep showing up, consistency is the ultimate flex.”"
                : "“The toughest check-in is the first check-in. Break the streak flatline and claim your first burn today!”"
              }
            </p>
          </div>
        </div>

      </div>

      {/* LOYALTY MODULES (Only displayed when Gym Loyalty Coins is enabled by owner) */}
      {membership?.gyms?.enable_gym_coins && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* GYM COINS WALLET */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5 min-h-[220px] flex flex-col justify-between">
            <div className="w-full space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Coins className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Gym Coins Wallet</h4>
                    <p className="text-xs text-slate-500 dark:text-zinc-400">Earned Loyalty Rewards</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-amber-500 font-mono tracking-tight">
                    {membership.gym_coins_balance || 0} 🪙
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Transaction History</p>
                {coinsLoading ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-medium">Syncing transactions...</div>
                ) : (!coinTransactions || coinTransactions.length === 0) ? (
                  <div className="text-center py-6 text-slate-500 dark:text-zinc-400 text-xs font-medium">
                    No transactions logged yet. Start checking in to accumulate coins!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {coinTransactions.map((tx, index) => (
                      <div key={index} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs hover:bg-slate-100/70 dark:hover:bg-zinc-800/80 transition-colors">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-800 dark:text-zinc-200">{tx.reason}</span>
                          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                            {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* COINS REDEEM SHOP */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4 relative overflow-hidden">
            <div className="w-full space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Loyalty Rewards Shop</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Redeem your coins at the gym counter</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {[
                  { name: 'Free Protein Shake', cost: 100, desc: 'Fresh post-workout whey shake from gym juice bar.' },
                  { name: 'Custom Shaker Bottle', cost: 200, desc: 'High-quality leak-proof Gymix branded shaker.' },
                  { name: 'Premium Gym T-Shirt', cost: 500, desc: 'High-performance athletic tee.' }
                ].map((reward, i) => {
                  const canAfford = (membership.gym_coins_balance || 0) >= reward.cost;
                  return (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-bold text-slate-900 dark:text-white">{reward.name}</h5>
                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${canAfford ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' : 'bg-slate-200 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400'}`}>{reward.cost} 🪙</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">{reward.desc}</p>
                      </div>
                      <button 
                        disabled
                        className={`w-full py-2 rounded-lg text-xs font-semibold tracking-wide transition-all border ${
                          canAfford 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400' 
                          : 'bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-600'
                        }`}
                      >
                        Ask Desk to Redeem
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
