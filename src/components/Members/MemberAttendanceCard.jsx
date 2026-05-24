import { useState, useEffect } from 'react'
import { Calendar, Clock, LogIn, LogOut, Check, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function MemberAttendanceCard({ memberId, memberName, joinDate }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!memberId) return
    setLoading(true)
    setError(null)

    const fetchLogs = async () => {
      const { data, error: err } = await supabase
        .from('attendance')
        .select('check_in_time, check_out_time')
        .eq('member_id', memberId)
        .order('check_in_time', { ascending: false })

      if (err) throw err
      setLogs(data || [])
    }

    fetchLogs()
      .catch(e => setError(e.message || 'Failed to load logs'))
      .finally(() => setLoading(false))
  }, [memberId])

  // Compute calendar days for current month
  const renderCalendar = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const totalDays = new Date(year, month + 1, 0).getDate()
    const startDayOfWeek = new Date(year, month, 1).getDay()

    const days = []
    
    // Padding
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
    }

    const checkInDates = new Set(
      logs.map(log => new Date(log.check_in_time).toISOString().split('T')[0])
    )
    const todayStr = new Date().toISOString().split('T')[0]

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d)
      const dateStr = date.toISOString().split('T')[0]
      const hasCheckedIn = checkInDates.has(dateStr)
      const isPast = dateStr < todayStr
      const isToday = dateStr === todayStr

      let dayClass = 'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative '
      let dotColor = ''

      if (hasCheckedIn) {
        dayClass += 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-black'
        dotColor = 'bg-emerald-400'
      } else if (isToday) {
        dayClass += 'bg-white/5 border border-white/10 text-white animate-pulse'
      } else if (isPast && joinDate && dateStr >= joinDate) {
        dayClass += 'bg-white/[0.01] border border-white/5 text-slate-600'
        dotColor = 'bg-rose-500/10'
      } else {
        dayClass += 'text-slate-600 opacity-30'
      }

      days.push(
        <div key={d} className={dayClass} title={hasCheckedIn ? `Attended` : `Absent/No Log`}>
          {d}
          {dotColor && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`} />}
        </div>
      )
    }

    return days
  }

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Parsing attendance records...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-semibold text-center">
        Error loading attendance: {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Monthly Calendar Card */}
      <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Attendance Calendar</h4>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-2 text-center text-[8px] font-black text-slate-500 uppercase tracking-widest pb-2 border-b border-white/5">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 justify-items-center">
          {renderCalendar()}
        </div>
      </div>

      {/* 2. Timeline Card */}
      <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Check-in / Check-out Feed</p>
          <span className="text-[8px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-slate-400">
            {logs.length} sessions
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs font-semibold">
            No check-in history logged.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {logs.map((log, index) => {
              const checkIn = new Date(log.check_in_time)
              const checkOut = log.check_out_time ? new Date(log.check_out_time) : null
              return (
                <div key={index} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                      <LogIn className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black text-white">
                        {checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      <p className="text-[9px] text-slate-500 font-bold">
                        In: {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {checkOut ? (
                      <div className="space-y-0.5">
                        <span className="text-[8px] font-black uppercase text-slate-400 bg-white/5 border border-white/5 px-1.5 py-0.5 rounded">
                          Checked Out
                        </span>
                        <p className="text-[9px] text-slate-500 font-bold mt-0.5">
                          Out: {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded animate-pulse">
                        Active ⚡
                      </span>
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
