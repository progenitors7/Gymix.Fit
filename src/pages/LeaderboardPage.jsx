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
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-amber-600 dark:text-amber-400 font-bold text-[10px] uppercase tracking-wider">Gym Arena</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Active Rankings</h1>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mt-1">
            Season {currentSeason} active • Resets automatically every 3 months
          </p>
        </div>
        
        <button 
          onClick={handleOpenHistoryModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold text-xs transition-all cursor-pointer active:scale-95"
        >
          <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Past Seasons History</span>
        </button>
      </div>

      {leaderboardLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Loading Leaderboard...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Podium and Standings Card */}
          <div className="lg:col-span-2 space-y-6">
            {/* 3D PODIUM */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 relative overflow-hidden flex flex-col items-center">
              
              <div className="flex items-center gap-2 mb-6">
                <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  Leaderboard Podium
                </span>
                <button 
                  onClick={() => setShowLeaderboardInfo(true)}
                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer"
                  title="Leaderboard Scoring Rules"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-end justify-center gap-4 sm:gap-6 w-full max-w-lg pt-12 pb-6 border-b border-slate-200 dark:border-zinc-800">
                
                {/* RANK 2 (SILVER) */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full p-[2.5px] bg-slate-300 dark:bg-slate-400 border border-slate-300 dark:border-slate-500 flex items-center justify-center relative mb-3">
                    <div className="w-full h-full rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                      {getPodiumMember(1).avatar_url ? (
                        <img src={getPodiumMember(1).avatar_url} alt="Rank 2" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-bold">{getPodiumMember(1).full_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="absolute -top-1 -left-1 text-[12px] z-10">🥈</div>
                    <div className="absolute -bottom-1 -right-1 bg-slate-500 text-white font-bold text-[8px] px-1.5 py-0.5 rounded-full z-10">#2</div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate max-w-[80px] sm:max-w-[100px] block">{getPodiumMember(1).full_name}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{getPodiumMember(1).xp_points} XP</span>
                  
                  <div className="w-full h-24 mt-4 rounded-t-2xl bg-gradient-to-t from-slate-400/5 to-slate-400/15 border-t border-x border-slate-400/30 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xl tracking-tight">
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
                          <span className="text-amber-500 text-lg font-bold">{getPodiumMember(0).full_name.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-full z-10">#1</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[90px] sm:max-w-[120px] block">{getPodiumMember(0).full_name}</span>
                  <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider">{getPodiumMember(0).xp_points} XP</span>
                  
                  <div className="w-full h-32 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-500/10 to-amber-500/20 border-t border-x border-amber-500/40 flex items-center justify-center font-bold text-amber-500 text-2xl tracking-tight">
                    I
                  </div>
                </div>

                {/* RANK 3 (BRONZE) */}
                <div className="flex-1 flex flex-col items-center">
                  <div className="w-11 h-11 rounded-full p-[2px] bg-amber-700 border border-amber-800 flex items-center justify-center relative mb-3 overflow-hidden">
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
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px] sm:max-w-[100px] block">{getPodiumMember(2).full_name}</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{getPodiumMember(2).xp_points} XP</span>
                  
                  <div className="w-full h-18 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-700/5 to-amber-700/15 border-t border-x border-amber-700/30 flex items-center justify-center font-bold text-amber-700 text-lg tracking-tight">
                    III
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Ranks 4 to 10 list */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Arena Contenders (Ranks 4-10)</p>
              
              {leaderboard.length <= 3 ? (
                <div className="text-center py-10 text-slate-400 dark:text-zinc-500 text-xs font-medium">
                  No other contenders active yet. Check-ins will trigger standings automatically.
                </div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.slice(3, 10).map((userRow, index) => {
                    const currentRank = index + 4
                    return (
                      <div 
                        key={userRow.id}
                        className="p-3 rounded-xl border bg-slate-50 dark:bg-zinc-800/60 border-slate-200/80 dark:border-zinc-700/60 hover:bg-slate-100/80 dark:hover:bg-zinc-800 flex items-center justify-between text-xs transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[10px] font-bold text-slate-400 w-4">#{currentRank}</span>
                          <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-[10px] font-bold overflow-hidden flex-shrink-0">
                            {userRow.avatar_url ? (
                              <img src={userRow.avatar_url} alt={userRow.full_name} className="w-full h-full object-cover" />
                            ) : (
                              userRow.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="text-slate-900 dark:text-white font-bold">{userRow.full_name}</span>
                        </div>
                        <span className="text-[10px] font-bold bg-white dark:bg-zinc-700 border border-slate-200 dark:border-zinc-600 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-300">{userRow.xp_points} XP</span>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-500 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Scoring System</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Gym Rules</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLeaderboardInfo(false)}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-medium text-slate-600 dark:text-zinc-300">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-3 leading-relaxed">
                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Base check-in:</strong> Gate check-in scan gives <span className="text-emerald-600 dark:text-emerald-400 font-bold">+10 XP</span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Training Duration Bonus:</strong>
                      <ul className="mt-1.5 space-y-1 text-[10px] text-slate-500 dark:text-zinc-400 pl-3 list-disc">
                        <li>Workout 45 - 75 mins: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+15 XP Golden Zone</span>.</li>
                        <li>Workout 30 - 45 mins / 75 - 90 mins: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+10 XP</span>.</li>
                        <li>Workout under 30 mins: <span className="text-emerald-600 dark:text-emerald-400 font-bold">+5 XP</span>.</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Clockwork Schedule Bonus:</strong> Same check-in hour window for 3 consecutive days gives <span className="text-amber-600 dark:text-amber-400 font-bold">+10 XP</span>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-slate-900 dark:text-white">Streak Multipliers:</strong>
                      <ul className="mt-1.5 space-y-1 text-[10px] text-slate-500 dark:text-zinc-400 pl-3 list-disc">
                        <li>3+ Day Streak: <span className="text-orange-600 dark:text-orange-400 font-bold">1.2x XP</span>.</li>
                        <li>7+ Day Streak: <span className="text-orange-600 dark:text-orange-400 font-bold">1.5x XP</span>.</li>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs"
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <History className="w-6 h-6 text-violet-600 dark:text-violet-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Season Archives</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Historical Podiums</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowHistoryModal(false)}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 pr-1 space-y-4 hide-scrollbar">
                {historyLoading ? (
                  <div className="text-center py-12 space-y-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Loading Archives...</p>
                  </div>
                ) : Object.keys(seasonHistory).length === 0 ? (
                  <div className="text-center py-12 text-slate-400 dark:text-zinc-500 text-xs font-medium">
                    No completed seasons archived yet.
                  </div>
                ) : (
                  Object.entries(seasonHistory).map(([seasonNum, records]) => (
                    <div key={seasonNum} className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/60 space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-700 pb-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Season {seasonNum} Standing</span>
                        <span className="text-[9px] text-slate-500 font-medium">
                          {records[0] ? new Date(records[0].date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ''}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        {records.map((rec) => {
                          let rankSymbol = '🥇'
                          let colorClass = 'text-amber-500'
                          if (rec.final_rank === 2) {
                            rankSymbol = '🥈'
                            colorClass = 'text-slate-500 dark:text-slate-300'
                          } else if (rec.final_rank === 3) {
                            rankSymbol = '🥉'
                            colorClass = 'text-amber-700'
                          } else {
                            rankSymbol = `Rank #${rec.final_rank}`
                            colorClass = 'text-slate-500'
                          }
                          return (
                            <div key={rec.full_name + rec.final_rank} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2.5">
                                <span className="text-sm font-bold w-5 text-center">{rankSymbol}</span>
                                <div className="w-6 h-6 rounded bg-slate-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {rec.avatar_url ? (
                                    <img src={rec.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] text-slate-500 font-bold">{rec.full_name.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <span className="text-slate-900 dark:text-white font-medium">{rec.full_name}</span>
                              </div>
                              <span className={`text-[10px] font-bold ${colorClass}`}>{rec.final_xp} XP</span>
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
