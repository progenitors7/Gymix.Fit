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
      
      {/* 3D-Like Flat Podium Panel */}
      <div className="p-6 rounded-[2.5rem] bg-[#1A1F2B] border border-white/5 shadow-2xl flex flex-col items-center">
        
        <div className="flex items-center gap-2 mb-6">
          <span className="px-3.5 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[9px] font-black uppercase tracking-widest text-[#3B82F6]">
            Gym Arena Season {currentSeason}
          </span>
          <button 
            onClick={() => {
              setShowHistoryModal(true)
              if (membership?.gym_id) {
                fetchSeasonHistory(membership.gym_id)
              }
            }}
            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-all cursor-pointer shadow-md"
          >
            Past Seasons
          </button>
          <button 
            onClick={() => setShowLeaderboardInfo(true)}
            className="w-5.5 h-5.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-[#3B82F6] hover:bg-[#3B82F6]/10 transition-all cursor-pointer shadow-md"
            title="Leaderboard Scoring Rules"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Podium Layout */}
        <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-lg pt-12 pb-6 border-b border-white/5">
          
          {/* RANK 2 (SILVER) - Flat Stylings */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-12 h-12 rounded-full p-[2px] bg-slate-400/20 border border-slate-400/40 flex items-center justify-center shadow-lg relative mb-3">
              <div className="w-full h-full rounded-full bg-[#0F1117] flex items-center justify-center overflow-hidden">
                {getPodiumMember(1).avatar_url ? (
                  <img src={getPodiumMember(1).avatar_url} alt="Rank 2" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 text-sm font-black">{getPodiumMember(1).full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -top-1 -left-1 text-[12px] z-10">🥈</div>
              <div className="absolute -bottom-1 -right-1 bg-slate-400 text-black font-black text-[8px] px-1.5 py-0.5 rounded-full z-10">#2</div>
            </div>
            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[80px] sm:max-w-[100px] block">{getPodiumMember(1).full_name}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{getPodiumMember(1).xp_points} XP</span>
            
            <div className="w-full h-24 mt-4 rounded-t-2xl bg-white/[0.01] border-t border-x border-slate-400/20 flex items-center justify-center font-black text-slate-400 text-lg">
              II
            </div>
          </div>

          {/* RANK 1 (GOLD) - Flat Stylings */}
          <div className="flex-1 flex flex-col items-center transform -translate-y-4">
            <div className="relative mb-3 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full p-[2.5px] bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shadow-2xl relative">
                <div className="w-full h-full rounded-full bg-[#0F1117] flex items-center justify-center overflow-hidden">
                  {getPodiumMember(0).avatar_url ? (
                    <img src={getPodiumMember(0).avatar_url} alt="Rank 1" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-amber-400 text-lg font-black">{getPodiumMember(0).full_name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[14px] z-10">👑</div>
                <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg z-10">#1</div>
              </div>
            </div>
            <span className="text-xs font-black text-white truncate max-w-[90px] sm:max-w-[120px] block">{getPodiumMember(0).full_name}</span>
            <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">{getPodiumMember(0).xp_points} XP</span>
            
            <div className="w-full h-32 mt-4 rounded-t-2xl bg-white/[0.02] border-t border-x border-amber-400/30 flex items-center justify-center font-black text-amber-400 text-xl">
              I
            </div>
          </div>

          {/* RANK 3 (BRONZE) - Flat Stylings */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-11 h-11 rounded-full p-[1.5px] bg-amber-700/20 border border-amber-700/40 flex items-center justify-center shadow-lg relative mb-3">
              <div className="w-full h-full rounded-full bg-[#0F1117] flex items-center justify-center overflow-hidden">
                {getPodiumMember(2).avatar_url ? (
                  <img src={getPodiumMember(2).avatar_url} alt="Rank 3" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-amber-700 text-xs font-black">{getPodiumMember(2).full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="absolute -top-1 -left-1 text-[12px] z-10">🥉</div>
              <div className="absolute -bottom-1 -right-1 bg-amber-700 text-white font-black text-[8px] px-1.5 py-0.5 rounded-full z-10">#3</div>
            </div>
            <span className="text-[10px] font-bold text-slate-400 truncate max-w-[80px] sm:max-w-[100px] block">{getPodiumMember(2).full_name}</span>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{getPodiumMember(2).xp_points} XP</span>
            
            <div className="w-full h-18 mt-4 rounded-t-2xl bg-white/[0.01] border-t border-x border-amber-700/20 flex items-center justify-center font-black text-amber-700 text-base">
              III
            </div>
          </div>

        </div>
      </div>

      {/* RANKS 4 TO 10 LIST */}
      <div className="bg-[#1A1F2B] border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl">
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Arena Contenders (Ranks 4-10)</p>
        
        {leaderboard.length <= 3 ? (
          <div className="text-center py-6 text-slate-500 text-xs font-medium">
            No other contenders active yet. Scan entries to rise in rank!
          </div>
        ) : (
          <div className="space-y-2.5">
            {leaderboard.slice(3, 10).map((userRow, index) => {
              const isCurrentUser = userRow.id === membership?.id
              const currentRank = index + 4
              return (
                <div 
                  key={userRow.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                    isCurrentUser
                    ? 'bg-[#3B82F6]/10 border-[#3B82F6]/30 font-black'
                    : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] font-black text-slate-500 w-4">#{currentRank}</span>
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 text-[10px] font-bold overflow-hidden flex-shrink-0">
                      {userRow.avatar_url ? (
                        <img src={userRow.avatar_url} alt={userRow.full_name} className="w-full h-full object-cover" />
                      ) : (
                        userRow.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-slate-200 font-bold">{userRow.full_name} {isCurrentUser && ' (You)'}</span>
                  </div>
                  <span className="text-[10px] font-black bg-white/5 border border-white/5 px-2.5 py-1 rounded text-slate-400">{userRow.xp_points} XP</span>
                </div>
              )
            })}

            {/* If user is ranked outside Top 10, show divider dots and their personalized rank card */}
            {userRank && userRank > 10 && (
              <>
                <div className="flex justify-center items-center gap-1.5 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700/60"></span>
                </div>
                {(() => {
                  const currentUserRow = leaderboard[userRank - 1]
                  if (!currentUserRow) return null
                  return (
                    <div 
                      className="p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all bg-[#3B82F6]/10 border-[#3B82F6]/30 font-black animate-in fade-in duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[10px] font-black text-[#3B82F6] w-4">#{userRank}</span>
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 text-[10px] font-bold overflow-hidden flex-shrink-0">
                          {currentUserRow.avatar_url ? (
                            <img src={currentUserRow.avatar_url} alt={currentUserRow.full_name} className="w-full h-full object-cover" />
                          ) : (
                            currentUserRow.full_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-slate-200 font-bold">{currentUserRow.full_name} (You)</span>
                      </div>
                      <span className="text-[10px] font-black bg-[#3B82F6]/20 border border-[#3B82F6]/30 px-2.5 py-1 rounded text-white">{currentUserRow.xp_points} XP</span>
                    </div>
                  )
                })()}
              </>
            )}
          </div>
        )}
      </div>

      {/* YOUR STANDINGS FLAT SUMMARY CARD */}
      <div className="p-5 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 shadow-lg text-center">
        <p className="text-xs font-black text-white tracking-wide">{berdiriText}</p>
      </div>

      {/* RULES MODAL OVERLAY */}
      {showLeaderboardInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-[#151922] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Scoring System</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Anti-Cheat Fair Play</p>
                </div>
              </div>
              <button 
                onClick={() => setShowLeaderboardInfo(false)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-300 max-h-[60vh] overflow-y-auto pr-1">
              <div className="p-4.5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3.5 leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">⚡ Base check-in:</strong> Completing a gate check-in scan credits <span className="text-emerald-400 font-bold">+10 XP</span> instantly.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">⏱️ Optimal Training Sweet Spot:</strong> Quality training is highly rewarded!
                    <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
                      <li>Workout 45 - 75 mins: <span className="text-emerald-400 font-bold">+15 XP Golden Zone Bonus</span>.</li>
                      <li>Workout 30 - 45 mins / 75 - 90 mins: <span className="text-emerald-400 font-bold">+10 XP</span>.</li>
                      <li>Workout under 30 mins: <span className="text-emerald-400 font-bold">+5 XP</span>.</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">⏰ Temporal Clockwork Bonus:</strong> Checking in within the same daily hour-long window for 3 consecutive days awards a Temporal Clockwork bonus of <span className="text-yellow-400 font-bold">+10 XP</span>.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                  <div>
                    <strong className="text-white">🔥 Streak Multipliers:</strong> Attending the gym consistently increases your base check-in XP multiplier:
                    <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
                      <li>3+ Day Streak: <span className="text-orange-400 font-bold">1.2x XP</span>.</li>
                      <li>7+ Day Streak: <span className="text-orange-400 font-bold">1.5x XP</span>.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-400 leading-normal flex items-start gap-2.5 font-medium">
                <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <span className="font-bold text-rose-300">Important Anti-Ghosting Rule:</span> If you forget to scan your <span className="font-black text-rose-300">CHECK-OUT scan</span> when leaving the gym, you will receive <span className="font-bold text-rose-300">0 XP</span> for that training session (However, your <span className="font-bold text-emerald-400">Workout Streak remains safe!</span>). Always scan when leaving the gym.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PAST SEASONS HISTORY MODAL OVERLAY */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-lg bg-[#151922] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6]">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Past Seasons History</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Arena Archives</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHistoryModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-5 hide-scrollbar">
              {historyLoading ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Loading Archives...</p>
                </div>
              ) : Object.keys(seasonHistory).length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                  No completed seasons archived yet. Play hard to claim a spot in the archives!
                </div>
              ) : (
                Object.entries(seasonHistory).map(([seasonNum, records]) => (
                  <div key={seasonNum} className="p-4.5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-[10px] font-black uppercase text-[#3B82F6] tracking-wider">Season {seasonNum} Standing</span>
                      <span className="text-[9px] text-slate-500 font-bold">
                        {records[0] ? new Date(records[0].date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {records.slice(0, 3).map((rec, i) => (
                        <div key={i} className="flex justify-between items-center text-[10px] text-slate-400">
                          <span className="font-bold flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'} {rec.full_name}
                          </span>
                          <span className="font-mono font-black">{rec.final_xp} XP</span>
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
