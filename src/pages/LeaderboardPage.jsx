import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Info, History, X, User } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useCurrentGym } from '../hooks/useCurrentGym'

export default function LeaderboardPage() {
  const { gymId, isReady } = useCurrentGym()
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(true)
  const [showLeaderboardInfo, setShowLeaderboardInfo] = useState(false)
  const [currentSeason, setCurrentSeason] = useState(1)
  const [seasonEndDate, setSeasonEndDate] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [seasonHistory, setSeasonHistory] = useState({})
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchLeaderboard = useCallback(async (gId) => {
    setLeaderboardLoading(true)
    try {
      // 1. Check and rotate season first via RPC (lazy trigger)
      try {
        await supabase.rpc('check_and_rotate_gym_season', { target_gym_id: gId })
      } catch (rotationErr) {
        console.error('[Seasons] Error checking/rotating season:', rotationErr)
      }

      // 2. Fetch active season info
      const { data: seasonData } = await supabase
        .from('leaderboard_seasons')
        .select('season_number, end_date')
        .eq('gym_id', gId)
        .eq('status', 'active')
        .maybeSingle()

      if (seasonData) {
        setCurrentSeason(seasonData.season_number)
        setSeasonEndDate(seasonData.end_date)
      }

      // 3. Fetch standings ranking for the active season
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, leaderboard_xp, avatar_url')
        .eq('gym_id', gId)
      
      if (error) throw error
      
      const ranked = (data || [])
        .map(m => ({
          id: m.id,
          full_name: m.full_name || 'Anonymous Athlete',
          xp_points: m.leaderboard_xp || 0,
          avatar_url: m.avatar_url || ''
        }))
        .sort((a, b) => b.xp_points - a.xp_points)
        .slice(0, 10);
      
      setLeaderboard(ranked)
    } catch (err) {
      console.error('Error loading leaderboard:', err)
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  const fetchSeasonHistory = useCallback(async (gId) => {
    setHistoryLoading(true)
    try {
      const { data, error } = await supabase
        .from('leaderboard_season_history')
        .select(`
          final_xp,
          final_rank,
          created_at,
          leaderboard_seasons (
            season_number
          ),
          members (
            full_name,
            avatar_url
          )
        `)
        .eq('gym_id', gId)
        .order('created_at', { ascending: false })
        .order('final_rank', { ascending: true })

      if (error) throw error

      const grouped = (data || []).reduce((acc, row) => {
        const seasonNum = row.leaderboard_seasons?.season_number || 1
        if (!acc[seasonNum]) {
          acc[seasonNum] = []
        }
        acc[seasonNum].push({
          full_name: row.members?.full_name || 'Anonymous Athlete',
          avatar_url: row.members?.avatar_url || '',
          final_xp: row.final_xp,
          final_rank: row.final_rank,
          date: row.created_at
        })
        return acc
      }, {})

      setSeasonHistory(grouped)
    } catch (err) {
      console.error('Error loading season history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isReady && gymId) {
      fetchLeaderboard(gymId)
    }
  }, [isReady, gymId, fetchLeaderboard])

  const handleOpenHistoryModal = () => {
    setShowHistoryModal(true)
    if (gymId) {
      fetchSeasonHistory(gymId)
    }
  }

  const getPodiumMember = (index) => {
    return leaderboard[index] || { full_name: 'Empty Slot', xp_points: 0, id: 'empty' };
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center border border-yellow-500/10">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
            </div>
            <p className="text-yellow-400 font-bold text-[10px] uppercase tracking-wider">Gym Arena</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Active Rankings</h1>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1">
            Season {currentSeason} active • Resets automatically every 3 months
          </p>
        </div>
        
        <button 
          onClick={handleOpenHistoryModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 text-white font-bold text-xs transition-all shadow-md cursor-pointer hover:bg-white/5 active:scale-95"
        >
          <History className="w-4 h-4 text-[#b370ff]" />
          <span>Past Seasons History</span>
        </button>
      </div>

      {leaderboardLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-[#863BFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Loading Leaderboard...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Podium and Standings Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3D GLASSMORPHIC PODIUM */}
            <div className="p-6 rounded-[2.5rem] bg-white/[0.01] border border-white/5 relative overflow-hidden flex flex-col items-center">
              
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3.5 py-1 rounded-full bg-[#863BFF]/10 border border-[#863BFF]/20 text-[9px] font-black uppercase tracking-widest text-[#b370ff]">
                  Leaderboard Podium
                </span>
                <button 
                  onClick={() => setShowLeaderboardInfo(true)}
                  className="w-5.5 h-5.5 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 flex items-center justify-center text-slate-400 hover:text-[#b370ff] hover:bg-[#863BFF]/10 transition-all cursor-pointer shadow-md"
                  title="Leaderboard Scoring Rules"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-lg pt-12 pb-6 border-b border-white/5">
                
                {/* RANK 2 (SILVER) */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full p-[2.5px] bg-[#E2E8F0] border border-slate-500/20 flex items-center justify-center relative mb-3">
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
                  
                  <div className="w-full h-24 mt-4 rounded-t-2xl bg-gradient-to-t from-slate-400/5 to-slate-400/15 border-t border-x border-slate-400/30 flex items-center justify-center font-black text-slate-400 text-xl tracking-tighter shadow-2xl shadow-slate-400/5">
                    II
                  </div>
                </div>

                {/* RANK 1 (GOLD) */}
                <div className="flex-1 flex flex-col items-center transform -translate-y-4">
                  <div className="relative mb-3 flex flex-col items-center">
                    <div className="absolute -top-4 text-[18px] z-20">👑</div>
                    <div className="w-16 h-16 rounded-full p-[3px] bg-[#F59E0B] border border-amber-500/20 flex items-center justify-center relative">
                      <div className="w-full h-full rounded-full bg-[#0F1117] flex items-center justify-center overflow-hidden">
                        {getPodiumMember(0).avatar_url ? (
                          <img src={getPodiumMember(0).avatar_url} alt="Rank 1" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-amber-400 text-lg font-black">{getPodiumMember(0).full_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-amber-400 text-black font-black text-[9px] px-2 py-0.5 rounded-full shadow-lg z-10">#1</div>
                    </div>
                  </div>
                  <span className="text-xs font-black text-white truncate max-w-[90px] sm:max-w-[120px] block">{getPodiumMember(0).full_name}</span>
                  <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">{getPodiumMember(0).xp_points} XP</span>
                  
                  <div className="w-full h-32 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-500/10 to-amber-500/20 border-t border-x border-amber-500/40 flex items-center justify-center font-black text-amber-400 text-2xl tracking-tighter shadow-2xl shadow-amber-500/10">
                    I
                  </div>
                </div>

                {/* RANK 3 (BRONZE) */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full p-[2px] bg-[#B45309] border border-amber-800/20 flex items-center justify-center relative mb-3 overflow-hidden">
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
                  
                  <div className="w-full h-18 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-700/5 to-amber-700/15 border-t border-x border-amber-700/30 flex items-center justify-center font-black text-amber-700 text-lg tracking-tighter shadow-2xl shadow-amber-700/5">
                    III
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Ranks 4 to 10 list */}
          <div className="space-y-6">
            <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-2xl transition-all duration-300 hover:border-white/20">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Arena Contenders (Ranks 4-10)</p>
              
              {leaderboard.length <= 3 ? (
                <div className="text-center py-10 text-slate-500 text-xs font-medium">
                  No other contenders active yet. check-ins will trigger standings automatically.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {leaderboard.slice(3, 10).map((userRow, index) => {
                    const currentRank = index + 4
                    return (
                      <div 
                        key={userRow.id}
                        className="p-3.5 rounded-2xl border bg-white/[0.01] border-white/5 hover:bg-white/[0.02] hover:border-white/10 flex items-center justify-between text-xs transition-all"
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
                          <span className="text-slate-200 font-bold">{userRow.full_name}</span>
                        </div>
                        <span className="text-[10px] font-black bg-white/5 border border-white/5 px-2.5 py-1 rounded text-slate-400">{userRow.xp_points} XP</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard rules modal */}
      <AnimatePresence>
        {showLeaderboardInfo && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0F111A]/95 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl"
            >
              {/* No blur decoration */}
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#863BFF]/10 border border-[#863BFF]/20 flex items-center justify-center text-[#b370ff]">
                    <Trophy className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Scoring System</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gym Rules</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLeaderboardInfo(false)}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-semibold text-slate-300">
                <div className="p-4.5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3.5 leading-relaxed">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Base check-in:</strong> Gate check-in scan gives <span className="text-emerald-400 font-bold">+10 XP</span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#863BFF] mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Training Duration Bonus:</strong>
                      <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
                        <li>Workout 45 - 75 mins: <span className="text-emerald-400 font-bold">+15 XP Golden Zone</span>.</li>
                        <li>Workout 30 - 45 mins / 75 - 90 mins: <span className="text-emerald-400 font-bold">+10 XP</span>.</li>
                        <li>Workout under 30 mins: <span className="text-emerald-400 font-bold">+5 XP</span>.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Clockwork Schedule Bonus:</strong> Same check-in hour window for 3 consecutive days gives <span className="text-yellow-400 font-bold">+10 XP</span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-white">Streak Multipliers:</strong>
                      <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
                        <li>3+ Day Streak: <span className="text-orange-400 font-bold">1.2x XP</span>.</li>
                        <li>7+ Day Streak: <span className="text-orange-400 font-bold">1.5x XP</span>.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Season History Modal */}
      <AnimatePresence>
        {showHistoryModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-[#0F111A]/95 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* No blur decoration */}
              
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#863BFF]/10 border border-[#863BFF]/20 flex items-center justify-center text-[#b370ff]">
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
                    <div className="w-6 h-6 border-2 border-[#863BFF] border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Loading Archives...</p>
                  </div>
                ) : Object.keys(seasonHistory).length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                    No completed seasons archived yet.
                  </div>
                ) : (
                  Object.entries(seasonHistory).map(([seasonNum, records]) => (
                    <div key={seasonNum} className="p-4.5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-3">
                      <div className="flex justify-between items-center border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-[#b370ff] tracking-wider">Season {seasonNum} Standing</span>
                        <span className="text-[9px] text-slate-500 font-bold">
                          {records[0] ? new Date(records[0].date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {records.map((rec) => {
                          let rankSymbol = '🥇'
                          let colorClass = 'text-amber-400'
                          if (rec.final_rank === 2) {
                            rankSymbol = '🥈'
                            colorClass = 'text-slate-300'
                          } else if (rec.final_rank === 3) {
                            rankSymbol = '🥉'
                            colorClass = 'text-amber-700'
                          } else {
                            rankSymbol = `Rank #${rec.final_rank}`
                            colorClass = 'text-slate-400'
                          }
                          return (
                            <div key={rec.full_name + rec.final_rank} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold w-5 text-center">{rankSymbol}</span>
                                <div className="w-6 h-6 rounded bg-white/5 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {rec.avatar_url ? (
                                    <img src={rec.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] text-slate-400 font-bold">{rec.full_name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="text-slate-200 font-bold">{rec.full_name}</span>
                              </div>
                              <span className={`text-[10px] font-black ${colorClass}`}>{rec.final_xp} XP</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
