import { Calendar, LogIn, LogOut } from 'lucide-react'

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
      attendanceLogs.map(log => getLocalDateStr(new Date(log.check_in_time)))
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
        dayClass += 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black'
      } else if (isToday) {
        dayClass += 'bg-[#3B82F6]/10 border border-[#3B82F6]/40 text-[#3B82F6] font-black'
      } else if (isSunday) {
        dayClass += 'bg-amber-500/5 border border-amber-500/20 text-amber-500/60 font-semibold'
      } else if (isPast) {
        dayClass += 'bg-rose-500/5 border border-rose-500/10 text-rose-500/30 font-medium'
      } else {
        dayClass += 'bg-white/[0.01] border border-white/5 text-slate-600 font-medium'
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
        <div className="bg-[#1A1F2B] border border-white/5 rounded-[2rem] p-6 space-y-5 shadow-2xl">
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
            {renderCalendarGrid()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 pt-3.5 border-t border-white/5 text-[8px] font-black uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/40" />
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/5 border border-rose-500/20" />
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/5 border border-amber-500/20" />
              <span>Sunday Off</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-[#3B82F6]/15 border border-[#3B82F6]/40" />
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Detailed Logs Timeline Card */}
        <div className="bg-[#1A1F2B] border border-white/5 rounded-[2rem] p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Check-in / Check-out Streams</p>
            <span className="text-[8px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-slate-400">Total logs: {attendanceLogs.length}</span>
          </div>

          {attendanceLogs.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-xs font-semibold">
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
                  <div key={index} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between relative group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <LogIn className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-white">
                          {checkIn.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                          <span>In: {checkIn.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {checkOut ? (
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                            Checked Out
                          </span>
                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                            Out: {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          {durationStr && (
                            <p className="text-[8px] text-[#3B82F6] font-bold">
                              Duration: {durationStr}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded">
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
