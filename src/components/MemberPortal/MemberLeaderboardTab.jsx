import { useState } from 'react'
import { Trophy, Info, X, AlertTriangle, History } from 'lucide-react'

export default function MemberLeaderboardTab({
  membership,
  leaderboard,
  currentSeason,
  seasonHistory,
  historyLoading,
  fetchSeasonHistory
}) {
  const [showLeaderboardInfo, setShowLeaderboardInfo] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)

  const getPodiumMember = (index) => {
    return leaderboard[index] || { full_name: 'Empty Slot', xp_points: 0, id: 'empty' }
  }

  // Calculate Standing summary text
  const userIndex = leaderboard.findIndex(u => u.id === membership?.id)
  const userRank = userIndex !== -1 ? userIndex + 1 : null
  const nextContender = userIndex > 0 ? leaderboard[userIndex - 1] : null
  const xpDiff = (userRank && nextContender) ? nextContender.xp_points - leaderboard[userIndex].xp_points : 0

  let berdiriText = ''
  if (userRank === 1) {
    berdiriText = '🥇 You are dominating the Leaderboard! Keep up the grind to defend your Crown!'
  } else if (userRank) {
    berdiriText = nextContender 
      ? `💪 Rank #${userRank} • You're just ${xpDiff + 1} XP away from beating ${nextContender.full_name} at Rank #${userRank - 1}!` 
      : `🔥 Rank #${userRank} • Keep checking in daily to rise in standing!`
  } else {
    berdiriText = '⚡ Unranked • Check out from your training sessions to claim your spot in the Arena!'
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Page Header matching Subscriptions & LeaderboardPage standard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider">Gym Arena</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Active Rankings</h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
            Season {currentSeason} active • Train daily and log workouts to rank up
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setShowHistoryModal(true)
              if (membership?.gym_id) fetchSeasonHistory(membership.gym_id)
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 font-semibold text-xs transition-all cursor-pointer active:scale-95"
          >
            <History className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            <span>Past Seasons</span>
          </button>
          <button 
            onClick={() => setShowLeaderboardInfo(true)}
            className="p-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title="Leaderboard Scoring Rules"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Your Standing Banner */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/10 dark:bg-violet-950/20 px-5 py-3.5 text-xs font-semibold text-violet-700 dark:text-violet-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <span>{berdiriText}</span>
        <span className="text-[10px] uppercase tracking-wider font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2.5 py-0.5 rounded-lg shrink-0">
          Live Season {currentSeason}
        </span>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 7 Cols: Podium Card */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col items-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Top 3 Podium
            </span>
          </div>

          {/* Podium Layout */}
          <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-lg pt-10 pb-4">
            
            {/* RANK 2 (SILVER) */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full p-[2px] bg-slate-300 dark:bg-slate-500/40 border border-slate-300 dark:border-slate-500 flex items-center justify-center relative mb-3">
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {getPodiumMember(1).avatar_url ? (
                    <img src={getPodiumMember(1).avatar_url} alt="Rank 2" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-600 dark:text-slate-300 text-sm font-bold">{getPodiumMember(1).full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -top-1 -left-1 text-[12px] z-10">🥈</div>
                <div className="absolute -bottom-1 -right-1 bg-slate-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full z-10">#2</div>
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[90px] block text-center">{getPodiumMember(1).full_name}</span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold uppercase">{getPodiumMember(1).xp_points} XP</span>
              
              <div className="w-full h-24 mt-4 rounded-t-2xl bg-gradient-to-t from-slate-400/5 to-slate-400/15 border-t border-x border-slate-400/30 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xl">
                II
              </div>
            </div>

            {/* RANK 1 (GOLD) */}
            <div className="flex-1 flex flex-col items-center transform -translate-y-4">
              <div className="relative mb-3 flex flex-col items-center">
                <div className="absolute -top-4 text-[18px] z-20">👑</div>
                <div className="w-16 h-16 rounded-full p-[3px] bg-amber-400 border border-amber-500 flex items-center justify-center relative">
                  <div className="w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                    {getPodiumMember(0).avatar_url ? (
                      <img src={getPodiumMember(0).avatar_url} alt="Rank 1" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-amber-600 dark:text-amber-400 text-lg font-bold">{getPodiumMember(0).full_name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full z-10">#1</div>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[100px] block text-center">{getPodiumMember(0).full_name}</span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase">{getPodiumMember(0).xp_points} XP</span>
              
              <div className="w-full h-32 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-500/10 to-amber-500/20 border-t border-x border-amber-500/40 flex items-center justify-center font-bold text-amber-600 dark:text-amber-400 text-2xl">
                I
              </div>
            </div>

            {/* RANK 3 (BRONZE) */}
            <div className="flex-1 flex flex-col items-center">
              <div className="w-11 h-11 rounded-full p-[2px] bg-amber-700 border border-amber-800 flex items-center justify-center relative mb-3">
                <div className="w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {getPodiumMember(2).avatar_url ? (
                    <img src={getPodiumMember(2).avatar_url} alt="Rank 3" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-amber-700 text-xs font-bold">{getPodiumMember(2).full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -top-1 -left-1 text-[12px] z-10">🥉</div>
                <div className="absolute -bottom-1 -right-1 bg-amber-800 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full z-10">#3</div>
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[90px] block text-center">{getPodiumMember(2).full_name}</span>
              <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold uppercase">{getPodiumMember(2).xp_points} XP</span>
              
              <div className="w-full h-18 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-700/5 to-amber-700/15 border-t border-x border-amber-700/30 flex items-center justify-center font-bold text-amber-700 text-lg">
                III
              </div>
            </div>

          </div>
        </div>

        {/* Right 5 Cols: RANKS 4 TO 10 LIST */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-zinc-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Arena Contenders (Ranks 4-10)</p>
            <span className="text-[10px] font-bold text-slate-400">Points</span>
          </div>
          
          {leaderboard.length <= 3 ? (
            <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-xs font-medium">
              No other contenders active yet. Scan entries to rise in rank!
            </div>
          ) : (
            <div className="space-y-2">
              {leaderboard.slice(3, 10).map((userRow, index) => {
                const isCurrentUser = userRow.id === membership?.id
                const currentRank = index + 4
                return (
                  <div 
                    key={userRow.id}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                      isCurrentUser
                      ? 'bg-violet-500/10 border-violet-500/30 font-bold text-violet-700 dark:text-violet-300'
                      : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700/60 hover:bg-slate-100/80 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[10px] font-bold text-slate-400 w-4">#{currentRank}</span>
                      <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-[10px] font-bold overflow-hidden flex-shrink-0">
                        {userRow.avatar_url ? (
                          <img src={userRow.avatar_url} alt={userRow.full_name} className="w-full h-full object-cover" />
                        ) : (
                          userRow.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="truncate font-medium">{userRow.full_name} {isCurrentUser && '(You)'}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg text-slate-700 dark:text-zinc-300 shrink-0">
                      {userRow.xp_points} XP
                    </span>
                  </div>
                )
              })}

              {/* If user is ranked outside Top 10, show divider dots and their personalized rank card */}
              {userRank && userRank > 10 && (
                <>
                  <div className="flex justify-center items-center gap-1.5 py-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700"></span>
                  </div>
                  {(() => {
                    const currentUserRow = leaderboard[userRank - 1]
                    if (!currentUserRow) return null
                    return (
                      <div 
                        className="p-3 rounded-xl border flex items-center justify-between text-xs bg-violet-500/10 border-violet-500/30 font-bold text-violet-700 dark:text-violet-300"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-[10px] font-bold text-violet-600 dark:text-violet-400 w-4">#{userRank}</span>
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-[10px] font-bold overflow-hidden flex-shrink-0">
                            {currentUserRow.avatar_url ? (
                              <img src={currentUserRow.avatar_url} alt={currentUserRow.full_name} className="w-full h-full object-cover" />
                            ) : (
                              currentUserRow.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="truncate">{currentUserRow.full_name} (You)</span>
                        </div>
                        <span className="text-[10px] font-bold bg-violet-600 text-white px-2 py-0.5 rounded-lg shrink-0">
                          {currentUserRow.xp_points} XP
                        </span>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RULES MODAL OVERLAY */}
      {showLeaderboardInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 relative zoom-in-95 animate-in duration-150">
            <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Scoring System</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Anti-Cheat Fair Play Rules</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLeaderboardInfo(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600 dark:text-zinc-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-3 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">⚡ Base check-in:</strong> Completing a gate check-in scan credits <span className="text-emerald-600 dark:text-emerald-400 font-bold">+10 XP</span> instantly.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">⏱️ Optimal Training Sweet Spot:</strong> Quality training is highly rewarded!
                    <ul className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-zinc-400 pl-3 list-disc">
                      <li>Workout 45 - 75 mins: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+15 XP Golden Zone Bonus</span>.</li>
                      <li>Workout 30 - 45 mins / 75 - 90 mins: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+10 XP</span>.</li>
                      <li>Workout under 30 mins: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+5 XP</span>.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">⏰ Temporal Clockwork Bonus:</strong> Checking in within the same daily hour-long window for 3 consecutive days awards a Temporal Clockwork bonus of <span className="text-amber-600 dark:text-amber-400 font-bold">+10 XP</span>.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">🔥 Streak Multipliers:</strong> Attending the gym consistently increases your base check-in XP multiplier:
                    <ul className="mt-1.5 space-y-1 text-[11px] text-slate-500 dark:text-zinc-400 pl-3 list-disc">
                      <li>3+ Day Streak: <span className="text-orange-600 dark:text-orange-400 font-bold">1.2x XP</span>.</li>
                      <li>7+ Day Streak: <span className="text-orange-600 dark:text-orange-400 font-bold">1.5x XP</span>.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-400 leading-normal flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                <div>
                  <span className="font-bold">Important Anti-Ghosting Rule:</span> If you forget to scan your <span className="font-bold">CHECK-OUT scan</span> when leaving the gym, you will receive <span className="font-bold">0 XP</span> for that training session (Your <span className="text-emerald-600 dark:text-emerald-400 font-bold">Workout Streak remains safe!</span>). Always scan when leaving the gym.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAST SEASONS HISTORY MODAL OVERLAY */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 relative flex flex-col max-h-[80vh] zoom-in-95 animate-in duration-150">
            <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Past Seasons History</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">Arena Archives</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {historyLoading ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold">Loading Archives...</p>
                </div>
              ) : Object.keys(seasonHistory).length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-zinc-400 text-xs font-medium">
                  No completed seasons archived yet. Play hard to claim a spot in the archives!
                </div>
              ) : (
                Object.entries(seasonHistory).map(([seasonNum, records]) => (
                  <div key={seasonNum} className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 space-y-2.5">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-700 pb-2">
                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400">Season {seasonNum} Standings</span>
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                        {records[0] ? new Date(records[0].date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {records.slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex justify-between items-center text-xs text-slate-700 dark:text-zinc-300">
                          <span className="font-semibold flex items-center gap-1.5">
                            <span>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                            <span>{rec.full_name}</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">{rec.final_xp} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
