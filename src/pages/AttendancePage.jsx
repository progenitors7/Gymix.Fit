import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, Clock, LogIn, LogOut, Search, RefreshCw, 
  Users, CheckCircle, Flame, Sparkles
} from 'lucide-react'
import { useCurrentGym } from '../hooks/useCurrentGym'
import { supabase } from '../lib/supabaseClient'

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

  const fetchAttendanceLogs = useCallback(async () => {
    if (!gym?.id) return
    setError(null)
    
    try {
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
            phone_number
          )
        `)
        .eq('gym_id', gym.id)
        .order('check_in_time', { ascending: false })

      if (err) throw err
      setLogs(data || [])
    } catch (e) {
      console.error('Error fetching attendance logs:', e)
      setError(e.message || 'Failed to fetch logs')
    }
  }, [gym?.id])

  // Initial load
  useEffect(() => {
    if (gym?.id) {
      setLoading(true)
      fetchAttendanceLogs().finally(() => setLoading(false))
    }
  }, [gym?.id, fetchAttendanceLogs])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAttendanceLogs()
    setRefreshing(false)
  }

  // Filter logs dynamically and compute stats
  useEffect(() => {
    if (!logs) return

    // 1. Compute today stats (using today's date in local time)
    const todayStr = new Date().toISOString().split('T')[0]
    
    let arrivals = 0
    let inside = 0
    let outs = 0

    logs.forEach((log) => {
      const logDateStr = new Date(log.check_in_time).toISOString().split('T')[0]
      if (logDateStr === todayStr) {
        arrivals++
        if (log.check_out_time) {
          outs++
        } else {
          inside++
        }
      }
    })

    setStats({
      todayArrivals: arrivals,
      activeInside: inside,
      checkOuts: outs
    })

    // 2. Filter logs by search and selected date
    let filtered = [...logs]
    
    if (selectedDate) {
      filtered = filtered.filter(log => {
        const logDateStr = new Date(log.check_in_time).toISOString().split('T')[0]
        return logDateStr === selectedDate
      })
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(log => {
        const fullName = log.members?.full_name?.toLowerCase() || ''
        const phone = log.members?.phone_number || ''
        return fullName.includes(query) || phone.includes(query)
      })
    }

    setFilteredLogs(filtered)

  }, [logs, searchQuery, selectedDate])

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
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Parsing Attendance Ledger...</p>
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
            Live Access Ledger
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-3">
            Attendance Logs
          </h1>
          <p className="text-[#94A3B8] text-xs font-semibold uppercase tracking-wider">
            Manage and track checked-in members and training session durations
          </p>
        </div>

        {/* Sync Trigger */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-3 bg-[#1A1F2B] border border-white/5 hover:border-white/10 text-white rounded-2xl font-bold text-xs shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Sync Ledger
        </button>
      </div>

      {error && (
        <div className="px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider animate-shake">
          Error syncing logs: {error}
        </div>
      )}

      {/* KPI STATS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Active inside gym */}
        <div className="backdrop-blur-md bg-[#12141c]/60 border border-emerald-500/20 p-6 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
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
        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/5 p-6 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#863BFF]/5 blur-2xl rounded-full pointer-events-none" />
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
        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/5 p-6 rounded-3xl relative overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 blur-2xl rounded-full pointer-events-none" />
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
                        <div className="space-y-0.5">
                          <span className="text-white font-black uppercase italic group-hover:text-emerald-400 transition-colors">
                            {log.members?.full_name || 'Member'}
                          </span>
                          {log.members?.phone_number && (
                            <p className="text-[10px] text-slate-500 font-medium leading-none">{log.members.phone_number}</p>
                          )}
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
                          <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.1)]">
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

    </div>
  )
}
