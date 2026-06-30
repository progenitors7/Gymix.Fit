import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, LogIn, LogOut, Search, RefreshCw, 
  Users, CheckCircle, Flame, Sparkles, Plus, X, AlertCircle
} from 'lucide-react'
import { useCurrentGym } from '../hooks/useCurrentGym'
import { supabase } from '../lib/supabaseClient'
import { connectionService } from '../services/connectionService'
import toast from 'react-hot-toast'

export default function AttendancePage() {
  const { gym } = useCurrentGym()
  const [logs, setLogs] = useState([])
  const [filteredLogs, setFilteredLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])

  // KPIs
  const [stats, setStats] = useState({
    todayArrivals: 0,
    activeInside: 0,
    checkOuts: 0
  })

  // Manual check-in States
  const [isKioskOpen, setIsKioskOpen] = useState(false)
  const [kioskSearch, setKioskSearch] = useState('')
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchMembersForManual = useCallback(async () => {
    if (!gym?.id) return
    setLoadingMembers(true)
    try {
      const { data, error: err } = await supabase
        .from('members')
        .select('id, full_name, phone_number, membership_plan, expiry_date, status, avatar_url')
        .eq('gym_id', gym.id)
        .order('full_name', { ascending: true })
      if (err) throw err
      setMembers(data || [])
    } catch (e) {
      console.error('Error fetching members:', e)
    } finally {
      setLoadingMembers(false)
    }
  }, [gym?.id])

  useEffect(() => {
    if (isKioskOpen && gym?.id) {
      fetchMembersForManual()
    }
  }, [isKioskOpen, gym?.id, fetchMembersForManual])

  const getActiveLogForMember = (memberId) => {
    return logs.find(log => log.members?.id === memberId && !log.check_out_time)
  }

  const getAttendanceStateForMember = (memberId) => {
    const todayStr = new Date().toISOString().split('T')[0]
    const memberTodayLogs = logs.filter(log => {
      const logDateStr = new Date(log.check_in_time).toISOString().split('T')[0]
      return log.members?.id === memberId && logDateStr === todayStr
    })

    const hasActive = memberTodayLogs.find(log => !log.check_out_time)
    const hasCompleted = memberTodayLogs.find(log => log.check_out_time)

    if (hasCompleted) return 'completed'
    if (hasActive) return 'active'
    return 'none'
  }

  const handleManualAttendance = async (member) => {
    if (!gym?.id) return
    setActionLoading(member.id)
    try {
      const res = await connectionService.logManualAttendance(gym.id, member.id)
      if (res.success) {
        if (res.action === 'checkout') {
          toast.success(`${member.full_name} checked out successfully!`)
        } else {
          toast.success(`${member.full_name} checked in successfully!`)
        }
        await fetchAttendanceLogs()
      }
    } catch (err) {
      console.error('Error logging manual attendance:', err)
      toast.error(err.message || 'Failed to log attendance')
    } finally {
      setActionLoading(null)
    }
  }

  const fetchTodayStats = useCallback(async () => {
    if (!gym?.id) return
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const todayStartISO = `${todayStr}T00:00:00.000Z`
      const todayEndISO = `${todayStr}T23:59:59.999Z`

      const { data, error } = await supabase
        .from('attendance')
        .select('check_out_time')
        .eq('gym_id', gym.id)
        .gte('check_in_time', todayStartISO)
        .lte('check_in_time', todayEndISO)

      if (error) throw error

      let arrivals = 0
      let inside = 0
      let outs = 0

      if (data) {
        arrivals = data.length
        data.forEach(log => {
          if (log.check_out_time) {
            outs++
          } else {
            inside++
          }
        })
      }

      setStats({
        todayArrivals: arrivals,
        activeInside: inside,
        checkOuts: outs
      })
    } catch (e) {
      console.error('Error fetching today stats:', e)
    }
  }, [gym?.id])

  const fetchAttendanceLogs = useCallback(async () => {
    if (!gym?.id) return
    setError(null)
    
    try {
      // Filter by selectedDate directly on the database level
      const targetDate = selectedDate || new Date().toISOString().split('T')[0]
      const startISO = `${targetDate}T00:00:00.000Z`
      const endISO = `${targetDate}T23:59:59.999Z`

      const { data, error: err } = await supabase
        .from('attendance')
        .select(`
          id,
          check_in_time,
          check_out_time,
          members (
            id,
            full_name,
            membership_plan,
            phone_number,
            avatar_url
          )
        `)
        .eq('gym_id', gym.id)
        .gte('check_in_time', startISO)
        .lte('check_in_time', endISO)
        .order('check_in_time', { ascending: false })

      if (err) throw err
      setLogs(data || [])
    } catch (e) {
      console.error('Error fetching attendance logs:', e)
      setError(e.message || 'Failed to fetch logs')
    }
  }, [gym?.id, selectedDate])

  // Initial load
  useEffect(() => {
    if (gym?.id) {
      setLoading(true)
      Promise.all([
        fetchAttendanceLogs(),
        fetchTodayStats()
      ]).finally(() => setLoading(false))
    }
  }, [gym?.id, fetchAttendanceLogs, fetchTodayStats])

  // Reload logs when date selection changes
  useEffect(() => {
    if (gym?.id) {
      fetchAttendanceLogs()
    }
  }, [selectedDate, gym?.id, fetchAttendanceLogs])

  const handleRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      fetchAttendanceLogs(),
      fetchTodayStats()
    ])
    setRefreshing(false)
  }

  // Filter logs dynamically by search query (date is handled by DB)
  useEffect(() => {
    if (!logs) return

    let filtered = [...logs]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log => {
        const fullName = log.members?.full_name?.toLowerCase() || ''
        const phone = log.members?.phone_number || ''
        return fullName.includes(query) || phone.includes(query)
      })
    }

    setFilteredLogs(filtered)
  }, [logs, searchQuery])

  // Session duration helper
  const getSessionDuration = (inTime, outTime) => {
    if (!outTime) return ''
    const diff = new Date(outTime) - new Date(inTime)
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    const remMins = mins % 60
    return `${hrs}h ${remMins}m`
  }

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-3 text-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2" />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Loading attendance records...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 pb-28 lg:pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
            <Clock className="w-4 h-4" />
            Live Access Log
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Attendance Logs
          </h1>
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
            Manage and track checked-in members and training session durations
          </p>
        </div>

        {/* Actions Container */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => setIsKioskOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#863BFF] to-[#6A1BFF] hover:from-[#762BEF] hover:to-[#5B0CEF] text-white rounded-2xl font-bold text-xs shadow-lg shadow-[#863BFF]/10 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Manual Check-In
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-3 bg-[#1A1F2B] border border-white/5 hover:border-white/10 text-white rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider animate-shake">
          Error syncing logs: {error}
        </div>
      )}

      {/* KPI STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Active inside gym */}
        <div className="bg-[#12141c]/60 border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.activeInside}</p>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-0.5">Currently Inside Gym ⚡</p>
            </div>
          </div>
        </div>

        {/* Total arrivals today */}
        <div className="bg-[#12141c]/60 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#863BFF]/10 flex items-center justify-center border border-[#863BFF]/20 text-[#b370ff]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.todayArrivals}</p>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-0.5">Total Check-Ins Today</p>
            </div>
          </div>
        </div>

        {/* Checked outs today */}
        <div className="bg-[#12141c]/60 border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{stats.checkOuts}</p>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mt-0.5">Completed Workouts Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER SEARCH PANEL */}
      <div className="flex flex-col sm:flex-row items-stretch gap-4">
        {/* Search bar */}
        <div className="relative group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] group-focus-within:text-[#3B82F6] transition-colors" />
          <input 
            type="text" 
            placeholder="Search checked-in members by name or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1A1F2B] border border-white/5 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/50 transition-all shadow-inner"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-[#1A1F2B] border border-white/5 rounded-2xl px-4 py-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-500" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none w-full sm:w-auto cursor-pointer"
          />
        </div>
      </div>

      {/* LEDGER TIMELINE CONTAINER */}
      <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live check-in stream</p>
          <span className="text-[9px] font-black uppercase bg-white/5 px-2.5 py-0.5 rounded text-slate-400">
            {filteredLogs.length} Records Listed
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-20 text-slate-500 font-semibold space-y-3">
            <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs uppercase tracking-widest">No matching logs found for this date.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse min-w-[600px] table-auto">
              <thead>
                <tr className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                  <th className="py-4.5 px-4">Member</th>
                  <th className="py-4.5 px-4">Plan Name</th>
                  <th className="py-4.5 px-4">Check-In Time</th>
                  <th className="py-4.5 px-4">Check-Out Time</th>
                  <th className="py-4.5 px-4">Session Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const checkIn = new Date(log.check_in_time)
                  const checkOut = log.check_out_time ? new Date(log.check_out_time) : null
                  const isToday = new Date().toISOString().split('T')[0] === checkIn.toISOString().split('T')[0]

                  return (
                    <tr key={log.id} className="text-xs font-semibold text-slate-300 hover:bg-white/[0.01] transition-all group">
                      {/* Name / Phone */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {log.members?.avatar_url ? (
                            <img 
                              src={log.members.avatar_url} 
                              alt={log.members.full_name} 
                              className="w-8 h-8 rounded-full object-cover border border-white/10 group-hover:border-emerald-400/40 transition-colors"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#F8FAFC] text-[10px] font-extrabold uppercase group-hover:border-emerald-400/40 transition-colors">
                              {log.members?.full_name?.slice(0, 1) || 'M'}
                            </div>
                          )}
                          <div className="space-y-0.5">
                            <span className="text-white font-black uppercase italic group-hover:text-emerald-400 transition-colors block">
                              {log.members?.full_name || 'Member'}
                            </span>
                            {log.members?.phone_number && (
                              <p className="text-[10px] text-slate-500 font-medium leading-none">{log.members.phone_number}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-4 px-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                          {log.members?.membership_plan || 'Custom Plan'}
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                          <div>
                            <span className="text-white font-bold">
                              {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isToday && (
                              <p className="text-[9px] text-slate-500 mt-0.5 font-bold">
                                {checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Check-Out */}
                      <td className="py-4 px-4">
                        {checkOut ? (
                          <div className="flex items-center gap-2">
                            <LogOut className="w-3.5 h-3.5 text-sky-400" />
                            <div>
                              <span className="text-white font-bold">
                                {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {!isToday && (
                                <p className="text-[9px] text-slate-500 mt-0.5 font-bold">
                                  {checkOut.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                            In Gym ⚡
                          </span>
                        )}
                      </td>

                      {/* Session duration */}
                      <td className="py-4 px-4">
                        {checkOut ? (
                          <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500/10 border border-sky-500/20 text-sky-400 px-2.5 py-0.5 rounded shadow-sm">
                            {getSessionDuration(log.check_in_time, log.check_out_time)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 bg-white/[0.01] border border-white/5 px-2.5 py-0.5 rounded">
                            Ongoing
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANUAL CHECK-IN MODAL */}
      <AnimatePresence>
        {isKioskOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[#12141C] border border-white/10 rounded-[2.5rem] w-full max-w-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Top glowing strip */}
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-violet-500/0 via-violet-500 to-violet-500/0" />

              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-400" />
                    Manual Check-In Console
                  </h3>
                  <p className="text-[#94A3B8] text-[10px] font-bold uppercase tracking-widest mt-0.5">
                    Search & log attendance for offline members
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsKioskOpen(false)
                    setKioskSearch('')
                  }}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative group mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8] group-focus-within:text-[#863BFF] transition-colors" />
                <input
                  type="text"
                  placeholder="Search member by name or phone..."
                  value={kioskSearch}
                  onChange={(e) => setKioskSearch(e.target.value)}
                  className="w-full bg-[#1A1F2B] border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/50 transition-all shadow-inner"
                />
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar min-h-[200px]">
                {loadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-500">
                    <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Fetching members list...</p>
                  </div>
                ) : (
                  (() => {
                    const query = kioskSearch.trim().toLowerCase()
                    const filtered = members.filter(m => 
                      m.full_name?.toLowerCase().includes(query) ||
                      m.phone_number?.toLowerCase().includes(query)
                    )

                    if (filtered.length === 0) {
                      return (
                        <div className="text-center py-12 text-slate-500 font-semibold space-y-2">
                          <AlertCircle className="w-6 h-6 text-slate-600 mx-auto" />
                          <p className="text-xs uppercase tracking-widest">No matching members found</p>
                        </div>
                      )
                    }

                    return filtered.map(member => {
                      const attState = getAttendanceStateForMember(member.id) // 'completed' | 'active' | 'none'
                      const isCheckedIn = attState === 'active'
                      const isCompleted = attState === 'completed'
                      const todayStr = new Date().toISOString().split('T')[0]
                      const isExpired = member.status === 'expired' || (member.expiry_date && member.expiry_date < todayStr)
                      const isLeft = member.status === 'left'

                      if (isLeft) return null // Hide members who have left

                      return (
                        <div
                          key={member.id}
                          className="p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl border border-white/5 flex items-center justify-between gap-4 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.full_name}
                                className="w-10 h-10 rounded-xl object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#F8FAFC] text-xs font-black uppercase">
                                {member.full_name?.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-white font-extrabold text-sm truncate uppercase italic">
                                  {member.full_name}
                                </span>
                                {isExpired && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[8px] font-black uppercase tracking-wider">
                                    Expired ⚠️
                                  </span>
                                )}
                                {isCheckedIn && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-wider">
                                    In Gym ⚡
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/20 text-sky-400 text-[8px] font-black uppercase tracking-wider">
                                    Done ✓
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-0.5">
                                {member.membership_plan || 'No Active Plan'}
                                {member.expiry_date && ` • Exp: ${new Date(member.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleManualAttendance(member)}
                            disabled={actionLoading !== null || isExpired || isCompleted}
                            className={`px-4 py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-widest cursor-pointer transition-all duration-200 active:scale-95 flex items-center gap-1.5 shrink-0 ${
                              isExpired || isCompleted
                                ? 'bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed'
                                : isCheckedIn
                                ? 'bg-sky-500 hover:bg-sky-600 text-white shadow-lg shadow-sky-500/10'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/10'
                            }`}
                          >
                            {actionLoading === member.id ? (
                              <div className={`w-3.5 h-3.5 border-2 ${isCheckedIn ? 'border-white/20 border-t-white' : 'border-black/20 border-t-black'} rounded-full animate-spin`} />
                            ) : isCompleted ? (
                              <CheckCircle className="w-3.5 h-3.5" />
                            ) : isCheckedIn ? (
                              <LogOut className="w-3.5 h-3.5" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            {isCompleted ? 'Completed' : isCheckedIn ? 'Check Out' : 'Check In'}
                          </button>
                        </div>
                      )
                    })
                  })()
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
