import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  QrCode, Activity, LogOut, CheckCircle2, AlertCircle, 
  Clock, ShieldAlert, Sparkles, Send, Download, RefreshCw, Calendar, Building 
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { connectionService } from '../../services/connectionService'
import Logo from '../UI/Logo'

// Standard input styles matching the system
const inputCls = 'w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all'

export default function MemberDashboard() {
  const { profile, signOut } = useAuth()
  
  // Loading & State variables
  const [loading, setLoading] = useState(true)
  const [membership, setMembership] = useState(null)
  const [connectionReq, setConnectionReq] = useState(null)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [streakCount, setStreakCount] = useState(0)
  
  // Connection Form states
  const [gymCode, setGymCode] = useState('')
  const [submittingReq, setSubmittingReq] = useState(false)
  const [reqError, setReqError] = useState('')
  const [reqSuccess, setReqSuccess] = useState('')
  const [scannedGym, setScannedGym] = useState(null)
  const [scannedGymLoading, setScannedGymLoading] = useState(false)

  // Rolling Session QR states
  const [qrToken, setQrToken] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)

  // Calculate check-in streaks dynamically from database logs
  const calculateStreak = (logs) => {
    if (!logs || logs.length === 0) {
      setStreakCount(0)
      return
    }

    // Get unique YYYY-MM-DD dates of check-ins
    const checkInDates = new Set(
      logs.map(log => new Date(log.check_in_time).toISOString().split('T')[0])
    )

    let streak = 0
    let checkDate = new Date() // Start checking from today
    const todayStr = checkDate.toISOString().split('T')[0]

    // If they checked in today, start counting from today
    if (checkInDates.has(todayStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      // If not checked in today, check if they checked in yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]
      
      if (checkInDates.has(yesterdayStr)) {
        streak++
        checkDate = yesterday
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        // No check-in today and no check-in yesterday -> streak is 0
        setStreakCount(0)
        return
      }
    }

    // Loop backwards to count consecutive active days
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (checkInDates.has(dateStr)) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    setStreakCount(streak)
  }

  // Fetch connection/membership details
  const loadMemberSystem = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setReqError('')
    try {
      // 1. Check if user is already an approved member
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, gyms(id, gym_name, unique_code)')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (memberError) throw memberError

      if (memberData) {
        setMembership(memberData)
        setConnectionReq(null)

        // 2. Fetch real check-in attendance logs
        const { data: logs, error: logsError } = await supabase
          .from('attendance')
          .select('check_in_time')
          .eq('member_id', memberData.id)
          .order('check_in_time', { ascending: false })

        if (logsError) throw logsError
        setAttendanceLogs(logs || [])
        
        // 3. Calculate dynamic streaks
        calculateStreak(logs || [])
      } else {
        setMembership(null)
        // 4. If not, check if they have a pending request
        const req = await connectionService.getConnectionStatus(profile.id)
        setConnectionReq(req)

        // 5. If no active pending request exists, check for scanned_gym_code to pre-fill
        if (!req) {
          const code = localStorage.getItem('scanned_gym_code')
          if (code) {
            setScannedGymLoading(true)
            const { data: gymData, error: gymErr } = await supabase
              .from('gyms')
              .select('id, gym_name, unique_code')
              .eq('unique_code', code.trim().toUpperCase())
              .maybeSingle()
            if (!gymErr && gymData) {
              setScannedGym(gymData)
              setGymCode(gymData.unique_code)
            } else {
              setScannedGym(null)
            }
            setScannedGymLoading(false)
          } else {
            setScannedGym(null)
          }
        } else {
          setScannedGym(null)
        }
      }
    } catch (err) {
      console.error('Error loading member system:', err)
      setReqError('Failed to load profile connection status.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    loadMemberSystem()
  }, [loadMemberSystem])

  // Rolling QR token generation logic
  useEffect(() => {
    if (!membership) return

    const generateRollingToken = () => {
      const timestamp = Math.floor(Date.now() / 1000)
      // Dynamic secure token containing Member ID, Gym ID, and exact rotation timestamp
      const token = `MEM_SECURE_${membership.id}_${membership.gym_id}_${timestamp}`
      setQrToken(token)
      setTimeLeft(30)
    }

    generateRollingToken()

    // 30-second rolling interval matching standard authenticator/payment dynamic QRs
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateRollingToken()
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [membership])

  const handleClearScannedGym = () => {
    localStorage.removeItem('scanned_gym_code')
    setScannedGym(null)
    setGymCode('')
    setReqSuccess('')
    setReqError('')
  }

  // Handle Gym Connection request submission
  const handleConnect = async (e) => {
    if (e) e.preventDefault()
    
    const targetCode = gymCode.trim() || scannedGym?.unique_code
    if (!targetCode) return
    
    setSubmittingReq(true)
    setReqError('')
    setReqSuccess('')
    try {
      const result = await connectionService.sendConnectionRequest(targetCode, profile.id)
      setReqSuccess(`Request submitted to "${result.gym.gym_name}" successfully!`)
      setGymCode('')
      // Clear scanned gym code since connection is initiated
      localStorage.removeItem('scanned_gym_code')
      setScannedGym(null)
      // Refresh state
      await loadMemberSystem()
    } catch (err) {
      setReqError(err.message || 'Failed to submit request.')
    } finally {
      setSubmittingReq(false)
    }
  };

  // Handle connection request cancellation
  const handleCancelRequest = async () => {
    if (!connectionReq) return
    setLoading(true)
    try {
      await connectionService.cancelConnectionRequest(connectionReq.id)
      setConnectionReq(null)
      setReqSuccess('Connection request successfully cancelled.')
    } catch (err) {
      setReqError('Failed to cancel request.')
    } finally {
      setLoading(false)
    }
  };

  // Member leave gym flow
  const handleLeaveGym = async () => {
    if (!membership) return
    const confirm = window.confirm(
      'Are you sure you want to disconnect from this gym? All check-in history and access keys associated with this profile will be disconnected.'
    )
    if (!confirm) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('members')
        .update({ profile_id: null })
        .eq('id', membership.id)

      if (error) throw error
      setMembership(null)
      setReqSuccess('Successfully disconnected from your gym.')
    } catch (err) {
      setReqError('Failed to leave gym. Please check your network.')
    } finally {
      setLoading(false)
    }
  };

  // Render check-in days calendar grid for the current month
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
      attendanceLogs.map(log => new Date(log.check_in_time).toISOString().split('T')[0])
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
      } else if (isPast && membership.join_date && dateStr >= membership.join_date) {
        dayClass += 'bg-white/[0.01] border border-white/5 text-slate-600'
        dotColor = 'bg-rose-500/10'
      } else {
        dayClass += 'text-slate-600 opacity-30'
      }

      days.push(
        <div key={d} className={dayClass} title={hasCheckedIn ? `Checked-in` : `Absent/Rest`}>
          {d}
          {dotColor && <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${dotColor}`} />}
        </div>
      )
    }

    return days
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-slate-100 font-sans p-4 sm:p-8 flex flex-col justify-between max-w-lg mx-auto pb-28 relative overflow-x-hidden overflow-y-auto">
      {/* Background decorations */}
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* TOP HEADER */}
      <div className="flex items-center justify-between pb-6 border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <Logo className="w-8 h-8 drop-shadow-[0_0_12px_rgba(16,185,129,0.3)]" />
          <div className="space-y-0.5">
            <h1 className="text-sm font-black text-white uppercase tracking-wider italic">AthletOS</h1>
            <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none">Member Terminal</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 hover:border-white/10 active:scale-95 transition-all cursor-pointer"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* MAIN DYNAMIC CONTENT SWITCH */}
      <div className="flex-1 flex flex-col justify-center py-8 relative z-10">
        
        {reqError && (
          <div className="mb-6 px-4.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider animate-shake">
            <ShieldAlert className="w-4 h-4 inline mr-2 text-rose-400" />
            {reqError}
          </div>
        )}

        {reqSuccess && (
          <div className="mb-6 px-4.5 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-400" />
            {reqSuccess}
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* CASE 1: NOT CONNECTED (Show Code Entry Panel) */}
          {!membership && !connectionReq && (
            <motion.div
              key="connect-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8"
            >
              <div className="text-center space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 shadow-inner flex items-center justify-center mx-auto mb-4 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[#863BFF]/5 blur-md rounded-full" />
                  <QrCode className="w-8 h-8 text-slate-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">First, Connect to a Gym</h2>
                <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                  To access your workout check-in streams and streaks, first connect to your local gym owner.
                </p>
              </div>

              {scannedGymLoading ? (
                <div className="glass-card border border-white/5 rounded-3xl p-8 text-center space-y-4 animate-pulse">
                  <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Loading scanned gym details...</p>
                </div>
              ) : scannedGym ? (
                /* PRE-FILLED SCANNED GYM CONFIRMATION PANEL */
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card border border-emerald-500/20 bg-gradient-to-b from-slate-900/40 via-[#131924]/60 to-emerald-500/[0.02] rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-emerald-500/[0.01] animate-pulse rounded-[2.5rem]" />
                  
                  <div className="relative z-10 space-y-6">
                    <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
                      <Building className="w-8 h-8 text-emerald-400" />
                    </div>

                    <div className="space-y-2">
                      <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400">Gym Poster QR Detected</span>
                      <h3 className="text-2xl font-black text-white uppercase italic tracking-tight pt-1">
                        {scannedGym.gym_name}
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-medium">
                        You scanned the QR poster for this gym. Click the connect button to send an instant join request!
                      </p>
                    </div>

                    <div className="pt-2 border-t border-white/5 space-y-4">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                        <span>Gym Code</span>
                        <span className="text-emerald-400 font-mono font-black tracking-widest bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">{scannedGym.unique_code}</span>
                      </div>

                      <button
                        onClick={() => handleConnect()}
                        disabled={submittingReq}
                        className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submittingReq ? (
                          <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Join Request
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleClearScannedGym}
                        type="button"
                        className="block mx-auto text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-wider transition-colors pt-1"
                      >
                        Connect to another gym instead
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* MANUAL GYM CODE ENTRY */
                <form onSubmit={handleConnect} className="space-y-4">
                  <div className="relative group">
                    <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
                    <input
                      type="text"
                      placeholder="Enter Gym Code (e.g. AX7Y9D)"
                      value={gymCode}
                      onChange={(e) => setGymCode(e.target.value.toUpperCase())}
                      maxLength={10}
                      disabled={submittingReq}
                      required
                      className={inputCls}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingReq}
                    className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReq ? (
                      <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Connection Request
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* CASE 2: CONNECTION REQUEST PENDING (Awaiting Approval) */}
          {!membership && connectionReq && (
            <motion.div
              key="pending-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="glass-card border border-[#A770FF]/15 bg-gradient-to-br from-slate-900/50 via-[#1A1F2B]/60 to-[#A770FF]/5 rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden"
            >
              {/* Pulsing loading background */}
              <div className="absolute inset-0 bg-[#A770FF]/5 animate-pulse rounded-[2.5rem]" />
              
              <div className="relative space-y-6 z-10">
                <div className="w-16 h-16 rounded-3xl bg-[#A770FF]/10 border border-[#A770FF]/20 flex items-center justify-center mx-auto animate-bounce">
                  <Clock className="w-8 h-8 text-[#A770FF]" />
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-[#A770FF]/10 border border-[#A770FF]/20 text-[9px] font-black uppercase tracking-widest text-[#A770FF]">Connection Pending</span>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight pt-1">
                    Awaiting Approval
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                    Your request to join <strong className="text-white">"{connectionReq.gyms?.gym_name}"</strong> was sent. Gym owner will activate your pass shortly.
                  </p>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                    <span>Gym Code</span>
                    <span className="text-white font-black">{connectionReq.gyms?.unique_code}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={loadMemberSystem}
                      className="flex-1 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Check Status
                    </button>

                    <button
                      onClick={handleCancelRequest}
                      className="flex-1 py-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      Cancel Request
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* CASE 3: CONNECTED & APPROVED MEMBER (Show Dynamic QR, Streak, Pass Info) */}
          {membership && (
            <motion.div
              key="member-active-panel"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Gym Name & Expiry header banner */}
              <div className="p-5 rounded-[2rem] bg-white/[0.01] border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Active Membership</p>
                  <h4 className="text-sm font-black text-white uppercase italic tracking-tight">{membership.gyms?.gym_name}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Plan Name</p>
                  <span className="text-[10px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">
                    {membership.membership_plan}
                  </span>
                </div>
              </div>

              {/* Dynamic Authentication QR Code */}
              <div className="glass-card border border-white/5 rounded-[2.5rem] p-6.5 bg-gradient-to-b from-[#161B22]/70 to-[#0F1117]/80 text-center relative overflow-hidden shadow-2xl">
                {/* Rolling countdown ring overlay */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Refreshes in {timeLeft}s
                </div>

                <div className="space-y-6 pt-6">
                  {/* Premium QR placeholder container */}
                  <div className="w-52 h-52 bg-white rounded-3xl p-5 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.1)] border border-emerald-500/20 flex flex-col items-center justify-center relative group">
                    <div className="w-full h-full border-4 border-dashed border-[#1E293B] rounded-2xl flex flex-col items-center justify-center opacity-70 p-4">
                      {/* Simple visual fallback representing scanned dynamic QR */}
                      <QrCode className="w-24 h-24 text-slate-900 stroke-[1.2]" />
                      <div className="h-1.5 w-24 bg-emerald-500/20 rounded-full mt-4 overflow-hidden relative">
                        <motion.div 
                          className="h-full bg-emerald-500" 
                          animate={{ width: ['0%', '100%'] }} 
                          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">YOUR GATE ACCESS QR</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Show this screen to receptionist scanner on entry</p>
                  </div>
                </div>
              </div>

              {/* Workout Streak & Pass Details Widget */}
              <div className="grid grid-cols-2 gap-4">
                {/* Streak card */}
                <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 text-center space-y-1 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full pointer-events-none" />
                  <Sparkles className="w-6 h-6 text-amber-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-black text-white">{streakCount} Days 🔥</p>
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Active Check-in Streak</p>
                </div>

                {/* Expiration Card */}
                <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 text-center space-y-1 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
                  <Activity className="w-6 h-6 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl font-black text-white">
                    {membership.expiry_date ? Math.ceil((new Date(membership.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)) : '—'} Days
                  </p>
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Days Remaining on Pass</p>
                </div>
              </div>

              {/* DYNAMIC ATTENDANCE CALENDAR */}
              <div className="glass-card border border-white/5 rounded-[2rem] p-6 space-y-5">
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
              </div>

              {/* RECENT CHECK-INS FEED */}
              {attendanceLogs.length > 0 && (
                <div className="glass-card border border-white/5 rounded-[2rem] p-6 space-y-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Recent Check-in Timings</p>
                  <div className="space-y-2">
                    {attendanceLogs.slice(0, 3).map((log, index) => {
                      const logDate = new Date(log.check_in_time)
                      return (
                        <div key={index} className="flex justify-between items-center text-xs font-semibold p-2.5 rounded-xl bg-white/[0.01] border border-white/5">
                          <span className="text-slate-400">
                            {logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="text-white font-bold">
                            {logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Safe Exit connection details */}
              <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Registered Date</p>
                  <span className="text-[10px] font-semibold text-slate-300">{membership.join_date}</span>
                </div>
                <button
                  onClick={handleLeaveGym}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 hover:text-rose-300 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  Leave Gym
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* SYSTEM META FOOTER */}
      <div className="absolute bottom-6 left-0 right-0 text-center relative z-10">
        <p className="text-[8px] font-black uppercase text-slate-600 tracking-[0.25em]">
          Powered by Gym Revenue Operating System
        </p>
      </div>
    </div>
  )
}
