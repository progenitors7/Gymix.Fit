import { Calendar, LogIn } from 'lucide-react'

export default function MemberAttendanceTab({ membership, attendanceLogs }) {
  const getLocalDateStr = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }

  const renderCalendarGrid = () => {
    if (!membership) return null

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const totalDays = new Date(year, month + 1, 0).getDate()
    const startDayOfWeek = new Date(year, month, 1).getDay()

    const days = []
    
    // Previous month padding
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8" />)
    }

    const checkInDates = new Set(
      (attendanceLogs || []).map(log => getLocalDateStr(new Date(log.check_in_time)))
    )

    const todayStr = getLocalDateStr(new Date())

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d)
      const dateStr = getLocalDateStr(date)
      const hasCheckedIn = checkInDates.has(dateStr)
      const isPast = dateStr < todayStr
      const isToday = dateStr === todayStr
      const isSunday = date.getDay() === 0

      let dayClass = 'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative '
      
      if (hasCheckedIn) {
        dayClass += 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold'
      } else if (isToday) {
        dayClass += 'bg-violet-500/15 border border-violet-500/40 text-violet-600 dark:text-violet-400 font-bold'
      } else if (isSunday) {
        dayClass += 'bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 font-medium'
      } else if (isPast) {
        dayClass += 'bg-rose-500/10 border border-rose-500/15 text-rose-500/70 font-medium'
      } else {
        dayClass += 'bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 font-medium'
      }

      days.push(
        <div key={d} className={dayClass} title={date.toDateString()}>
          {d}
        </div>
      )
    }

    return days
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Attendance Calendar Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Calendar</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-zinc-800">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2 justify-items-center">
            {renderCalendarGrid()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-3.5 border-t border-slate-100 dark:border-zinc-800 text-[11px] font-medium text-slate-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/10 border border-rose-500/20" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/10 border border-amber-500/20" />
              <span>Sunday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-violet-500/20 border border-violet-500/40" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Detailed Logs Timeline Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Check-in / Check-out History</h4>
            <span className="text-xs font-semibold bg-slate-100 dark:bg-zinc-800 px-2.5 py-0.5 rounded-lg text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
              Total logs: {(attendanceLogs || []).length}
            </span>
          </div>

          {(!attendanceLogs || attendanceLogs.length === 0) ? (
            <div className="text-center py-10 text-slate-500 dark:text-zinc-400 text-xs font-medium">
              No check-ins registered yet. Scan your pass QR to log check-ins!
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {attendanceLogs.map((log, index) => {
                const checkIn = new Date(log.check_in_time)
                const checkOut = log.check_out_time ? new Date(log.check_out_time) : null
                
                let durationStr = null
                if (checkIn && checkOut) {
                  const durationMs = checkOut - checkIn
                  const durationMins = Math.floor(durationMs / 60000)
                  const durationHrs = Math.floor(durationMins / 60)
                  const displayMins = durationMins % 60
                  durationStr = durationHrs > 0 ? `${durationHrs}h ${displayMins}m` : `${durationMins}m`
                }

                return (
                  <div key={index} className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex items-center justify-between relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
                          <span>In: {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {checkOut ? (
                        <div className="space-y-1">
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 px-2 py-0.5 rounded-md">
                            Checked Out
                          </span>
                          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                            Out: {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {durationStr && (
                            <p className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold">
                              Duration: {durationStr}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          Active Session ⚡
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
    </div>
  )
}
