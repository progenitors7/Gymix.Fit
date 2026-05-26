import { Flame, Check, Sparkles } from 'lucide-react'

export default function MemberStreaksTab({
  membership,
  streakCount,
  attendanceLogs,
  coinTransactions,
  coinsLoading
}) {
  const getAthleteRank = (streak) => {
    if (streak >= 30) return { name: 'Immortal Gym Lord', emoji: '👑', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
    if (streak >= 15) return { name: 'Diamond Beast', emoji: '💎', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' }
    if (streak >= 7) return { name: 'Gold Grinder', emoji: '🏆', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
    if (streak >= 3) return { name: 'Iron Athlete', emoji: '🦾', color: 'text-slate-300 border-slate-500/30 bg-slate-500/10' }
    return { name: 'Gym Starter', emoji: '🪵', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' }
  }

  const activeRank = getAthleteRank(streakCount)

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Side-by-side split grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Fire Streak Card (Flat design, optimized for budget phones) */}
        <div className="p-8 rounded-[2.5rem] bg-[#1A1F2B] border border-orange-500/30 text-center flex flex-col justify-center items-center min-h-[300px]">
          <div className="space-y-5 w-full">
            <div className="w-18 h-18 bg-orange-500/10 border border-orange-500/20 rounded-full flex items-center justify-center mx-auto relative">
              <Flame className="w-10 h-10 text-orange-500 fill-orange-500/20" />
            </div>

            <div className="space-y-1">
              <p className="text-[9px] font-black uppercase text-orange-400 tracking-widest leading-none">CURRENT WORKOUT STREAK</p>
              <h3 className="text-5xl font-black italic tracking-tighter text-white">
                {streakCount} DAYS
              </h3>
            </div>

            {/* Athlete Level Badge */}
            <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${activeRank.color}`}>
              <span>{activeRank.emoji}</span>
              <span>{activeRank.name}</span>
            </div>
          </div>
        </div>

        {/* Weekly Consistency & Motivation Panel */}
        <div className="bg-[#1A1F2B] border border-white/5 rounded-[2rem] p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Weekly Consistency Flex</h4>
            
            {/* Visual 7 days bar */}
            <div className="flex justify-between items-center gap-2 pt-2">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                const checkInDaysMap = new Set(
                  attendanceLogs.map(log => new Date(log.check_in_time).getDay())
                )
                const dayMapIndex = [1, 2, 3, 4, 5, 6, 0][idx]
                const isActive = checkInDaysMap.has(dayMapIndex)
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                      isActive 
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold scale-105' 
                      : 'bg-white/[0.02] border-white/5 text-slate-600 text-[10px]'
                    }`}>
                      {isActive ? <Check className="w-4 h-4 text-orange-400" /> : day.charAt(0)}
                    </div>
                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">{day.substring(0, 3)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Motivation quotes */}
          <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
            <p className="text-slate-300 text-xs font-medium leading-relaxed pl-2 pr-2">
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
        <div className="space-y-6 mt-6 animate-in fade-in duration-200">
          
          {/* GYM COINS WALLET */}
          <div className="bg-[#1A1F2B] border border-white/5 rounded-[2rem] p-6 space-y-5 min-h-[220px] flex flex-col justify-between">
            <div className="w-full space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                    <Sparkles className="w-4.5 h-4.5 fill-amber-400/20" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Gym Coins Wallet</h4>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Earned Loyalty Rewards</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
                    {membership.gym_coins_balance || 0} 🪙
                  </div>
                </div>
              </div>

              {/* Transactions list */}
              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Transaction History</p>
                {coinsLoading ? (
                  <div className="text-center py-6 text-slate-500 text-[10px] uppercase font-bold tracking-widest">Syncing transactions...</div>
                ) : coinTransactions.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs font-medium">
                    No transactions logged yet. Start checking in to accumulate coins!
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                    {coinTransactions.map((tx, index) => (
                      <div key={index} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-200">{tx.reason}</span>
                          <p className="text-[8px] text-slate-500 font-medium">
                            {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`font-mono font-black ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
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
          <div className="bg-[#1A1F2B] border border-white/5 rounded-[2rem] p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="w-full space-y-4">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Loyalty Rewards Shop</h4>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Redeem your coins at the gym counter</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {[
                  { name: 'Free Protein Shake', cost: 100, desc: 'Fresh post-workout whey shake from gym juice bar.' },
                  { name: 'Custom Shaker Bottle', cost: 200, desc: 'High-quality leak-proof Gymix branded shaker.' },
                  { name: 'Premium Gym T-Shirt', cost: 500, desc: 'High-performance athletic tee.' }
                ].map((reward, i) => {
                  const canAfford = (membership.gym_coins_balance || 0) >= reward.cost;
                  return (
                    <div key={i} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between space-y-3 text-left">
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <h5 className="text-xs font-black text-white uppercase tracking-wider">{reward.name}</h5>
                          <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${canAfford ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-slate-500'}`}>{reward.cost} 🪙</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{reward.desc}</p>
                      </div>
                      <button 
                        disabled
                        className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                          canAfford 
                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/30' 
                          : 'bg-white/[0.01] border-white/5 text-slate-600'
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
