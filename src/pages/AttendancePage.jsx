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
import PullToRefresh from '../components/UI/PullToRefresh'
import { useRealtimeSync } from '../hooks/useRealtimeSync'

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
    const today = new Date()
    const todayYear = today.getFullYear()
    const todayMonth = today.getMonth()
    const todayDate = today.getDate()

    const memberTodayLogs = logs.filter(log => {
      if (log.members?.id !== memberId) return false
      const logD = new Date(log.check_in_time)
      return logD.getFullYear() === todayYear && logD.getMonth() === todayMonth && logD.getDate() === todayDate
    })

    const hasActive = memberTodayLogs.find(log => !log.check_out_time)
    const hasCompleted = memberTodayLogs.find(log => log.check_out_time)

    if (hasActive) return 'active'
    if (hasCompleted) return 'completed'
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
      // Calculate start and end of current day in local timezone
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      const endOfToday = new Date()
      endOfToday.setHours(23, 59, 59, 999)
      const todayStartISO = startOfToday.toISOString()
      const todayEndISO   = endOfToday.toISOString()

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
      // Filter by selectedDate using exact local day start & end boundaries
      const targetDate = selectedDate || new Date().toISOString().split('T')[0]
      const [year, month, day] = targetDate.split('-').map(Number)
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999)
      const startISO = startDate.toISOString()
      const endISO = endDate.toISOString()

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

  // Live Supabase Realtime Sync for attendance records
  useRealtimeSync({
    gymId: gym?.id,
    tables: ['attendance'],
    onUpdate: () => {
      fetchAttendanceLogs()
      fetchTodayStats()
    }
  })

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
    <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8 pb-28 lg:pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Attendance Logs
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mt-1 font-medium">
            Manage and track checked-in members and live training session durations
          </p>
        </div>

        {/* Actions Container */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsKioskOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold text-xs transition-colors active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Check-In</span>
          </button>
          
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700 rounded-xl font-semibold text-xs transition-colors active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium">
          Error syncing logs: {error}
        </div>
      )}

      {/* KPI STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Active inside gym */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Currently Inside Gym</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.activeInside}</p>
          </div>
          <Flame className="w-5 h-5 text-slate-400 dark:text-zinc-500 stroke-[1.5]" />
        </div>

        {/* Total arrivals today */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Total Check-Ins Today</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.todayArrivals}</p>
          </div>
          <Users className="w-5 h-5 text-slate-400 dark:text-zinc-500 stroke-[1.5]" />
        </div>

        {/* Checked outs today */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Completed Workouts Today</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.checkOuts}</p>
          </div>
          <CheckCircle className="w-5 h-5 text-slate-400 dark:text-zinc-500 stroke-[1.5]" />
        </div>
      </div>

      {/* FILTER SEARCH PANEL */}
      <div className="flex flex-col sm:flex-row items-stretch gap-3">
        {/* Search bar */}
        <div className="relative group flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search checked-in members by name or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-all"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl px-3 py-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent border-none text-slate-900 dark:text-white text-xs font-semibold focus:outline-none w-full sm:w-auto cursor-pointer"
          />
        </div>
      </div>

      {/* LEDGER TIMELINE CONTAINER */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Live check-in stream</p>
          <span className="text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700">
            {filteredLogs.length} Records Listed
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-zinc-500 space-y-2">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-zinc-600 mx-auto mb-1" />
            <p className="text-xs font-medium">No check-in logs found for this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider border-b border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-900/40">
                  <th className="py-3 px-6">Member</th>
                  <th className="py-3 px-6">Plan Name</th>
                  <th className="py-3 px-6">Check-In Time</th>
                  <th className="py-3 px-6">Check-Out Time</th>
                  <th className="py-3 px-6">Session Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70">
                {filteredLogs.map((log) => {
                  const checkIn = new Date(log.check_in_time)
                  const checkOut = log.check_out_time ? new Date(log.check_out_time) : null
                  const isToday = new Date().toISOString().split('T')[0] === checkIn.toISOString().split('T')[0]

                  return (
                    <tr key={log.id} className="text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors group">
                      {/* Name / Phone */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          {log.members?.avatar_url ? (
                            <img 
                              src={log.members.avatar_url} 
                              alt={log.members.full_name} 
                              className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-zinc-700"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 text-xs font-bold uppercase">
                              {log.members?.full_name?.slice(0, 1) || 'M'}
                            </div>
                          )}
                          <div>
                            <span className="text-slate-900 dark:text-white font-semibold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors block">
                              {log.members?.full_name || 'Member'}
                            </span>
                            {log.members?.phone_number && (
                              <p className="text-[11px] text-slate-400 dark:text-zinc-500 font-medium">{log.members.phone_number}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-6">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-lg">
                          {log.members?.membership_plan || 'Custom Plan'}
                        </span>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <div>
                            <span className="text-slate-900 dark:text-white font-semibold">
                              {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {!isToday && (
                              <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                {checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-6">
                        {checkOut ? (
                          <div className="flex items-center gap-2">
                            <LogOut className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            <div>
                              <span className="text-slate-900 dark:text-white font-semibold">
                                {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {!isToday && (
                                <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                                  {checkOut.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            Inside Gym
                          </span>
                        )}
                      </td>

                      {/* Session duration */}
                      <td className="py-3.5 px-6">
                        {checkOut ? (
                          <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                            {getSessionDuration(log.check_in_time, log.check_out_time)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                            Active
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xl p-6 relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-800 mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                    Manual Check-In Console
                  </h3>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5">
                    Search and log member attendance directly from front desk
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsKioskOpen(false)
                    setKioskSearch('')
                  }}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative group mb-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500 group-focus-within:text-violet-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search member by name or phone..."
                  value={kioskSearch}
                  onChange={(e) => setKioskSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>

              {/* Members List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-[200px]">
                {loadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                    <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                    <p className="text-xs font-medium">Loading roster...</p>
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
                        <div className="text-center py-10 text-slate-400 dark:text-zinc-500 space-y-1">
                          <AlertCircle className="w-6 h-6 mx-auto text-slate-300 dark:text-zinc-600 mb-1" />
                          <p className="text-xs font-medium">No matching members found</p>
                        </div>
                      )
                    }

                    return filtered.map(member => {
                      const attState = getAttendanceStateForMember(member.id)
                      const isCheckedIn = attState === 'active'
                      const isCompleted = attState === 'completed'
                      const todayStr = new Date().toISOString().split('T')[0]
                      const isExpired = member.status === 'expired' || (member.expiry_date && member.expiry_date < todayStr)
                      const isLeft = member.status === 'left'

                      if (isLeft) return null

                      return (
                        <div
                          key={member.id}
                          className="p-3.5 bg-slate-50/60 dark:bg-zinc-800/50 hover:bg-slate-100/80 dark:hover:bg-zinc-800 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {member.avatar_url ? (
                              <img
                                src={member.avatar_url}
                                alt={member.full_name}
                                className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-zinc-700"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-xs font-bold uppercase">
                                {member.full_name?.slice(0, 1)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-slate-900 dark:text-white font-semibold text-sm truncate">
                                  {member.full_name}
                                </span>
                                {isExpired && (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[9px] font-bold">
                                    Expired
                                  </span>
                                )}
                                {isCheckedIn && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold">
                                    Inside
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 text-[9px] font-bold">
                                    Done
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-400 dark:text-zinc-500 text-[11px] font-medium mt-0.5">
                                {member.membership_plan || 'No Active Plan'}
                                {member.expiry_date && ` • Exp: ${new Date(member.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleManualAttendance(member)}
                            disabled={actionLoading !== null || isExpired}
                            className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5 shrink-0 ${
                              isExpired
                                ? 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700 cursor-not-allowed'
                                : isCheckedIn
                                ? 'bg-sky-600 hover:bg-sky-500 text-white'
                                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            }`}
                          >
                            {actionLoading === member.id ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : isCheckedIn ? (
                              <LogOut className="w-3.5 h-3.5" />
                            ) : (
                              <LogIn className="w-3.5 h-3.5" />
                            )}
                            {isCheckedIn ? 'Check Out' : isCompleted ? 'Check In Again' : 'Check In'}
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
    </PullToRefresh>
  )
}
