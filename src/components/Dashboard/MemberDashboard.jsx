import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  QrCode, Activity, LogOut, CheckCircle2, AlertCircle, 
  Clock, ShieldAlert, Sparkles, Send, RefreshCw, Calendar, 
  Building, Flame, User, LogIn, ChevronRight, Edit2, Check, Shield, Copy
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { connectionService } from '../../services/connectionService'
import Logo from '../UI/Logo'

// Standard input styles matching the system
const inputCls = 'w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.04] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all'

export default function MemberDashboard() {
  const { profile, signOut } = useAuth()
  
  // Navigation & View tab: 'pass' | 'attendance' | 'streaks' | 'profile' | 'progress'
  const [activeTab, setActiveTab] = useState('pass')

  // Loading & State variables
  const [loading, setLoading] = useState(true)
  const [membership, setMembership] = useState(null)
  const [connectionReq, setConnectionReq] = useState(null)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [streakCount, setStreakCount] = useState(0)

  // Loyalty Coins and Leaderboard states
  const [coinTransactions, setCoinTransactions] = useState([])
  const [coinsLoading, setCoinsLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  // Progress Tracker states
  const [progressLogs, setProgressLogs] = useState([])
  const [progressLoading, setProgressLoading] = useState(false)
  const [newLogType, setNewLogType] = useState('PR') // 'PR' or 'BODYWEIGHT'
  const [newExerciseName, setNewExerciseName] = useState('Bench Press')
  const [newValue, setNewValue] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [loggingProgress, setLoggingProgress] = useState(false)

  // Instagram Share modal states
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [activeShareLog, setActiveShareLog] = useState(null)
  
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

  // Profile Edit states
  const [profileName, setProfileName] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileGender, setProfileGender] = useState('male')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')

  const getLocalDateStr = (d) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const date = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }

  // Calculate check-in streaks dynamically from database logs (skipping Sundays as rest days)
  const calculateStreak = (logs) => {
    if (!logs || logs.length === 0) {
      setStreakCount(0)
      return
    }

    const checkInDates = new Set(
      logs.map(log => getLocalDateStr(new Date(log.check_in_time)))
    )

    let streak = 0
    let checkDate = new Date()
    checkDate.setHours(0, 0, 0, 0)

    // Trace back to find the most recent check-in date
    let daysSinceLastCheckIn = 0
    let tempDate = new Date(checkDate)

    while (true) {
      const dateStr = getLocalDateStr(tempDate)
      if (checkInDates.has(dateStr)) {
        break // Found the most recent check-in!
      }
      if (tempDate.getDay() !== 0) { // Not Sunday
        daysSinceLastCheckIn++
      }
      // If looked back more than 1 active gym day missed, the streak is dead
      if (daysSinceLastCheckIn > 1) {
        setStreakCount(0)
        return
      }
      tempDate.setDate(tempDate.getDate() - 1)
    }

    // Now trace backwards from the last check-in date
    checkDate = new Date(tempDate)

    while (true) {
      const dateStr = getLocalDateStr(checkDate)
      const hasCheckedIn = checkInDates.has(dateStr)
      const isSunday = checkDate.getDay() === 0

      if (hasCheckedIn) {
        streak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else if (isSunday) {
        // It's Sunday and no check-in. Skip it without breaking the streak.
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        // It's a weekday/Saturday and they didn't check in -> streak is broken!
        break
      }
    }

    setStreakCount(streak)
  }

  // Fetch Loyalty Coin transaction logs
  const fetchCoinsData = async (memberId) => {
    setCoinsLoading(true)
    try {
      const { data, error } = await supabase
        .from('member_coins_transactions')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setCoinTransactions(data || [])
    } catch (err) {
      console.error('Error fetching coin transactions:', err)
    } finally {
      setCoinsLoading(false)
    }
  }

  // Fetch Community Check-in Leaderboard
  const fetchLeaderboard = async (gymId) => {
    setLeaderboardLoading(true)
    try {
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, attendance(id)')
        .eq('gym_id', gymId)
      
      if (error) throw error
      
      const ranked = (data || [])
        .map(m => ({
          id: m.id,
          full_name: m.full_name || 'Anonymous Athlete',
          checkins_count: m.attendance?.length || 0
        }))
        .sort((a, b) => b.checkins_count - a.checkins_count)
        .slice(0, 10);
      
      setLeaderboard(ranked)
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  // Fetch member progress tracking logs
  const fetchProgressLogs = async (memberId) => {
    setProgressLoading(true)
    try {
      const { data, error } = await supabase
        .from('member_progress_logs')
        .select('*')
        .eq('member_id', memberId)
        .order('recorded_at', { ascending: false })
      
      if (error) throw error
      setProgressLogs(data || [])
    } catch (err) {
      console.error('Error fetching progress logs:', err)
    } finally {
      setProgressLoading(false)
    }
  }

  // Handle adding progress logs in frontend
  const handleAddProgressLog = async (e) => {
    e.preventDefault()
    if (!membership) return
    setLoggingProgress(true)
    try {
      const { error } = await supabase
        .from('member_progress_logs')
        .insert({
          member_id: membership.id,
          log_type: newLogType,
          exercise_name: newLogType === 'BODYWEIGHT' ? 'Body Weight' : newExerciseName,
          value: parseFloat(newValue),
          notes: newNotes.trim() || null,
          recorded_at: new Date().toISOString()
        })
      
      if (error) throw error
      setNewValue('')
      setNewNotes('')
      await fetchProgressLogs(membership.id)
      alert('Progress logged successfully! 💪')
    } catch (err) {
      console.error('Error adding progress log:', err)
      alert(err.message || 'Failed to save progress entry.')
    } finally {
      setLoggingProgress(false)
    }
  }

  // Calculate top PR values for lifting cards
  const getPRValues = () => {
    const prs = {
      'Bench Press': 0,
      'Squat': 0,
      'Deadlift': 0,
      'Body Weight': 0
    }
    
    progressLogs.forEach(log => {
      if (log.log_type === 'PR') {
        const name = log.exercise_name
        if (prs[name] !== undefined) {
          prs[name] = Math.max(prs[name], parseFloat(log.value))
        } else {
          prs[name] = Math.max(prs[name] || 0, parseFloat(log.value))
        }
      } else if (log.log_type === 'BODYWEIGHT') {
        if (prs['Body Weight'] === 0) {
          prs['Body Weight'] = parseFloat(log.value)
        }
      }
    })
    
    return prs
  }

  // Get dynamic athlete rank based on streaks
  const getAthleteRank = (streak) => {
    if (streak >= 30) return { name: 'Immortal Gym Lord', emoji: '👑', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' }
    if (streak >= 15) return { name: 'Diamond Beast', emoji: '💎', color: 'text-sky-400 border-sky-500/30 bg-sky-500/10' }
    if (streak >= 7) return { name: 'Gold Grinder', emoji: '🏆', color: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' }
    if (streak >= 3) return { name: 'Iron Athlete', emoji: '🦾', color: 'text-slate-300 border-slate-500/30 bg-slate-500/10' }
    return { name: 'Gym Starter', emoji: '🪵', color: 'text-orange-400 border-orange-500/30 bg-orange-500/10' }
  }

  // Fetch connection/membership details
  const loadMemberSystem = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    setReqError('')

    const executeFetch = async () => {
      // Set initial profile name from global context
      setProfileName(profile.full_name || '')

      // 1. Check if user is already an approved member
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*, gyms(*)')
        .eq('profile_id', profile.id)
        .maybeSingle()

      if (memberError) throw memberError

      if (memberData) {
        setMembership(memberData)
        setConnectionReq(null)
        
        // Load inputs for profile edit form
        setProfilePhone(memberData.phone_number || '')
        setProfileGender(memberData.gender || 'male')

        // 2. Fetch real check-in attendance logs
        const { data: logs, error: logsError } = await supabase
          .from('attendance')
          .select('check_in_time, check_out_time')
          .eq('member_id', memberData.id)
          .order('check_in_time', { ascending: false })

        if (logsError) throw logsError
        setAttendanceLogs(logs || [])
        
        // 3. Calculate dynamic streaks
        calculateStreak(logs || [])

        // 4. Fetch loyalty coins transactions
        fetchCoinsData(memberData.id)

        // 5. Fetch community check-in leaderboard
        fetchLeaderboard(memberData.gym_id)

        // 6. Fetch progress and PR logs
        fetchProgressLogs(memberData.id)
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
    }

    try {
      try {
        await executeFetch()
      } catch (err) {
        if (err.status === 401 || err.code === 'PGRST301') {
          console.warn('[MemberDashboard] Stale session (401/PGRST301). Refreshing token...')
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()
          if (!refreshError && session) {
            console.log('[MemberDashboard] Token refreshed. Retrying fetch...')
            await executeFetch()
          } else {
            throw err
          }
        } else {
          throw err
        }
      }
    } catch (err) {
      console.error('Error loading member system:', err)
      setReqError(err.message || 'Failed to load profile connection status.')
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.full_name])

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
      setActiveTab('pass')
    } catch (err) {
      setReqError('Failed to leave gym. Please check your network.')
    } finally {
      setLoading(false)
    }
  };

  // Profile Edit logic
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) return

    setSavingProfile(true)
    setProfileSuccess('')
    setProfileError('')

    try {
      // 1. Update globally inside profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim()
        })
        .eq('id', profile.id)

      if (profileErr) throw profileErr

      // 2. Update locally inside members table
      if (membership) {
        const { error: memberErr } = await supabase
          .from('members')
          .update({
            full_name: profileName.trim(),
            phone_number: profilePhone.trim(),
            gender: profileGender
          })
          .eq('id', membership.id)

        if (memberErr) throw memberErr
      }

      setProfileSuccess('Profile updated successfully! ✨')
      await loadMemberSystem()
    } catch (err) {
      setProfileError(err.message || 'Failed to update profile settings.')
    } finally {
      setSavingProfile(false)
    }
  }

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
      attendanceLogs.map(log => getLocalDateStr(new Date(log.check_in_time)))
    )

    const todayStr = getLocalDateStr(new Date())

    for (let d = 1; d <= totalDays; d++) {
      const date = new Date(year, month, d)
      const dateStr = getLocalDateStr(date)
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
        <Logo className="w-12 h-12 drop-shadow-[0_0_15px_rgba(134,59,255,0.3)] animate-pulse" />
      </div>
    )
  }

  const activeRank = getAthleteRank(streakCount)

  return (
    <div className="min-h-screen bg-[#0f111a] text-slate-100 font-sans relative overflow-x-hidden flex flex-col md:flex-row">
      
      {/* Background decorations */}
      <motion.div 
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 10, -10, 0],
          y: [0, -15, 15, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -top-32 -right-32 w-64 h-64 bg-[#863BFF]/10 blur-[100px] rounded-full pointer-events-none z-0" 
      />
      <motion.div 
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -15, 15, 0],
          y: [0, 20, -20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none z-0" 
      />

      {/* DESKTOP SIDEBAR NAVIGATION */}
      <div className="hidden md:flex fixed top-0 bottom-0 left-0 w-80 bg-[#0c0e14]/70 border-r border-white/10 backdrop-blur-2xl p-6 flex-col justify-between z-30">
        <div className="space-y-8">
          {/* Brand logo header */}
          <div className="flex items-center gap-3 pb-6 border-b border-white/5">
            <Logo className="w-9 h-9 drop-shadow-[0_0_12px_rgba(134,59,255,0.4)]" />
            <div className="space-y-0.5">
              <h1 className="text-base font-black text-white uppercase tracking-wider italic">AthletOS</h1>
              <p className="text-[10px] font-bold text-[#b370ff] uppercase tracking-widest leading-none">Member Terminal</p>
            </div>
          </div>

          {/* Member summary card */}
          <div className="p-4.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3.5 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#863BFF] to-[#b370ff] flex items-center justify-center font-black text-white shadow-md text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() || 'M'}
            </div>
            <div className="space-y-0.5 overflow-hidden">
              <h4 className="text-xs font-black text-white truncate">Yo, {profile?.full_name?.split(' ')[0] || 'Athlete'}!</h4>
              <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none truncate">
                {membership ? membership.gyms?.gym_name : 'No Active Gym'}
              </p>
            </div>
          </div>

          {/* Sidebar Nav Links */}
          <nav className="flex flex-col gap-2">
            {[
              { id: 'pass', label: 'Access Pass Key', icon: QrCode },
              { id: 'attendance', label: 'Attendance logs', icon: Calendar },
              { id: 'streaks', label: 'Workout Streaks', icon: Flame, badge: `${streakCount} Days` },
              { id: 'progress', label: 'PR & Progress', icon: Sparkles },
              { id: 'profile', label: 'Profile settings', icon: User }
            ].map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all cursor-pointer text-left w-full z-10 ${
                    isActive ? 'text-white font-black' : 'text-slate-500 hover:text-slate-300 font-semibold'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPillDesktop"
                      className={`absolute inset-0 rounded-2xl -z-10 border ${
                        item.id === 'streaks'
                        ? 'bg-orange-500/10 border-orange-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : item.id === 'progress'
                        ? 'bg-amber-500/10 border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'bg-[#863BFF]/10 border-[#863BFF]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      }`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? (item.id === 'streaks' ? 'text-orange-400' : item.id === 'progress' ? 'text-amber-400' : 'text-[#b370ff]') : 'text-slate-500'}`} />
                    <span className="text-xs uppercase tracking-wider">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${
                      isActive 
                      ? 'bg-orange-500/20 text-orange-400' 
                      : 'bg-white/5 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Desktop Logout Button */}
        <button
          onClick={signOut}
          className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400 text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-98 shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* MAIN CONTAINER CONTENT VIEW (padding left to accommodate sidebar on desktop) */}
      <div className="flex-1 flex flex-col min-h-screen md:pl-80 pb-28 md:pb-8 relative z-10 w-full">
        <div className="max-w-4xl lg:max-w-5xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-6">
          
          {/* MOBILE ONLY HEADER */}
          <div className="flex items-center justify-between pb-5 border-b border-white/5 md:hidden">
            <div className="flex items-center gap-3">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#863BFF] to-[#b370ff] flex items-center justify-center font-black text-white shadow-lg shadow-[#863BFF]/30 text-sm relative group overflow-hidden"
              >
                {profile?.full_name?.charAt(0).toUpperCase() || 'M'}
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
              <div className="space-y-0.5">
                <h1 className="text-sm font-black text-white tracking-wider flex items-center gap-1.5">
                  <span>Yo, {profile?.full_name?.split(' ')[0] || 'Athlete'}!</span>
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h1>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                  {membership ? membership.gyms?.gym_name : 'No Connected Gym'}
                </p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* MAIN SWITCHBOARD OR NOT CONNECTED PANEL */}
          <div className="w-full flex-1 flex flex-col justify-start">
            
            {reqError && (
              <div className="mb-6 px-4.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider">
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
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="space-y-6 pt-4 max-w-md mx-auto w-full"
                >
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 rounded-3xl bg-white/[0.01] border border-white/5 shadow-inner flex items-center justify-center mx-auto mb-4 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-[#863BFF]/5 blur-md rounded-full" />
                      <QrCode className="w-8 h-8 text-slate-400 group-hover:text-[#863BFF] transition-colors" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">Connect your Pass</h2>
                    <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
                      Enter your local gym's custom gateway code or scan their QR poster to claim your active membership pass.
                    </p>
                  </div>

                  {scannedGymLoading ? (
                    <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-3xl p-8 text-center space-y-4 animate-pulse">
                      <div className="w-8 h-8 border-2 border-[#863BFF]/20 border-t-[#863BFF] rounded-full animate-spin mx-auto" />
                      <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Verifying gym poster...</p>
                    </div>
                  ) : scannedGym ? (
                    /* PRE-FILLED SCANNED GYM CONFIRMATION PANEL */
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className="backdrop-blur-md bg-[#12141c]/60 border border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)] rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-emerald-500/[0.01] animate-pulse rounded-[2.5rem]" />
                      
                      <div className="relative z-10 space-y-6">
                        <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto shadow-inner">
                          <Building className="w-8 h-8 text-emerald-400" />
                        </div>

                        <div className="space-y-2">
                          <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400">Gym Poster Detected</span>
                          <h3 className="text-2xl font-black text-white uppercase italic tracking-tight pt-1">
                            {scannedGym.gym_name}
                          </h3>
                          <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-medium">
                            You scanned the QR poster. Click below to immediately submit your connection request to the receptionist terminal.
                          </p>
                        </div>

                        <div className="pt-2 border-t border-white/5 space-y-4">
                          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                            <span>Terminal Code</span>
                            <span className="text-emerald-400 font-mono font-black tracking-widest bg-emerald-500/5 px-2.5 py-1 rounded-lg border border-emerald-500/10">{scannedGym.unique_code}</span>
                          </div>

                          <button
                            onClick={() => handleConnect()}
                            disabled={submittingReq}
                            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/10 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {submittingReq ? (
                              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Send className="w-4 h-4" />
                                Send Connection
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleClearScannedGym}
                            type="button"
                            className="block mx-auto text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-wider transition-colors pt-1"
                          >
                            Enter code manually instead
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* MANUAL GYM CODE ENTRY */
                    <form onSubmit={handleConnect} className="space-y-4">
                      <div className="relative group">
                        <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#863BFF] transition-colors" />
                        <input
                          type="text"
                          placeholder="ENTER GYM CODE (E.G. AX7Y9D)"
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
                        className="w-full py-4.5 bg-gradient-to-r from-[#863BFF] to-[#b370ff] hover:from-[#762fe6] hover:to-[#a25eff] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#863BFF]/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                      >
                        {submittingReq ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Connect Terminal
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
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="backdrop-blur-md bg-[#12141c]/60 border border-[#863BFF]/30 shadow-[0_0_30px_rgba(134,59,255,0.15)] rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden pt-10 max-w-md mx-auto w-full"
                >
                  {/* Pulsing loading background */}
                  <div className="absolute inset-0 bg-[#863BFF]/5 animate-pulse rounded-[2.5rem] pointer-events-none" />
                  
                  <div className="relative space-y-6 z-10">
                    <div className="w-16 h-16 rounded-3xl bg-[#863BFF]/10 border border-[#863BFF]/20 flex items-center justify-center mx-auto animate-bounce">
                      <Clock className="w-8 h-8 text-[#863BFF]" />
                    </div>

                    <div className="space-y-2">
                      <span className="px-3.5 py-1 rounded-full bg-[#863BFF]/10 border border-[#863BFF]/20 text-[9px] font-black uppercase tracking-widest text-[#863BFF]">Pending Reception Approval</span>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tight pt-1">
                        Awaiting Activation
                      </h3>
                      <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                        Your request to connect to <strong className="text-white">"{connectionReq.gyms?.gym_name}"</strong> has been queued. Ask the gym desk to activate your gate pass.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                        <span>Gym Code</span>
                        <span className="text-white font-mono font-black">{connectionReq.gyms?.unique_code}</span>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={loadMemberSystem}
                          className="flex-1 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Sync Pass
                        </button>

                        <button
                          onClick={handleCancelRequest}
                          className="flex-1 py-3.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* CASE 3: CONNECTED & APPROVED MEMBER (TAB MULTI-VIEW) */}
              {membership && (
                <div className="w-full">
                  
                  {/* TAB 1: PASS KEY */}
                  {activeTab === 'pass' && (
                    <motion.div
                      key="pass-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6"
                    >
                      {/* Responsive Grid for Desktop Pass View */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                        
                        {/* Main Key Column */}
                        <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
                          {/* Expiry Header */}
                          <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 p-5 rounded-[2rem] flex items-center justify-between shadow-lg">
                            <div className="space-y-0.5">
                              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Active Gym</p>
                              <h4 className="text-base font-black text-white uppercase italic tracking-tight">{membership.gyms?.gym_name}</h4>
                            </div>
                            <div className="text-right space-y-0.5">
                              <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Plan Tier</p>
                              <span className="text-[9px] font-black uppercase bg-[#863BFF]/20 border border-[#863BFF]/40 text-[#b370ff] px-2.5 py-0.5 rounded-md">
                                {membership.membership_plan}
                              </span>
                            </div>
                          </div>

                          {/* Active Pass Card */}
                          <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-8 text-center relative overflow-hidden shadow-2xl flex-1 flex flex-col justify-center items-center transition-all duration-300 hover:border-white/20 min-h-[350px]">
                            {/* Rotating ring spinner indicator */}
                            <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                              </span>
                              SECURE • ROTATING IN {timeLeft}s
                            </div>

                            <div className="space-y-6 pt-5 w-full">
                              {/* QR Container with neon glow effect */}
                              <div className="relative w-52 h-52 mx-auto group">
                                {/* Pulsing neon glow underlay */}
                                <div className="absolute -inset-1.5 bg-gradient-to-r from-[#863BFF] to-[#b370ff] rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-pulse" />
                                
                                <div className="relative w-full h-full bg-white rounded-3xl p-4.5 flex flex-col items-center justify-center border border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                                  <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken)}`}
                                    alt="Gate Access Pass"
                                    className="w-full h-full object-contain rounded-xl select-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1 pt-2">
                                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                  ACTIVE PASS KEY
                                </h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                  SCAN PASS QR AT FRONT DESK ON ENTRY
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Side stats Column */}
                        <div className="flex flex-col gap-6 justify-between lg:col-span-1">
                          {/* Streak Display widget */}
                          <div 
                            onClick={() => setActiveTab('streaks')}
                            className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 p-6 rounded-[2rem] text-center space-y-2 relative group overflow-hidden transition-all duration-300 hover:border-orange-500/30 hover:bg-orange-500/5 hover:scale-[1.02] cursor-pointer flex-1 flex flex-col justify-center"
                          >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full pointer-events-none" />
                            <Flame className="w-7 h-7 text-orange-500 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-white">{streakCount} Days 🔥</p>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-relaxed">Workout Consistency Streak</p>
                          </div>

                          {/* Remaining Days Widget */}
                          <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 p-6 rounded-[2rem] text-center space-y-2 relative group overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:scale-[1.02] flex-1 flex flex-col justify-center">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
                            <Activity className="w-7 h-7 text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                            <p className="text-3xl font-black text-white">
                              {membership.expiry_date ? Math.max(0, Math.ceil((new Date(membership.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) : '—'} Days
                            </p>
                            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest leading-relaxed">Remaining Access Pass</p>
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {/* TAB 2: ATTENDANCE HUB */}
                  {activeTab === 'attendance' && (
                    <motion.div
                      key="attendance-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6"
                    >
                      {/* Responsive Split Side-by-Side Grid on Desktop */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        
                        {/* Dynamic Calendar card */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-5 shadow-2xl transition-all duration-300 hover:border-white/20">
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

                        {/* Detailed Vertical Logs Timeline */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl transition-all duration-300 hover:border-white/20">
                          <div className="flex items-center justify-between">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Check-in / Check-out Streams</p>
                            <span className="text-[8px] font-black uppercase bg-white/5 px-2 py-0.5 rounded text-slate-400">Total logs: {attendanceLogs.length}</span>
                          </div>

                          {attendanceLogs.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 text-xs font-semibold">
                              No check-ins registered yet. Scan your pass QR to log check-ins!
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                              {attendanceLogs.map((log, index) => {
                                const checkIn = new Date(log.check_in_time)
                                const checkOut = log.check_out_time ? new Date(log.check_out_time) : null
                                return (
                                  <div key={index} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between relative group shadow-sm hover:scale-[1.01]">
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
                                        <div className="space-y-0.5">
                                          <span className="text-[9px] font-black uppercase text-slate-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded">
                                            Checked Out
                                          </span>
                                          <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                                            Out: {checkOut.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      ) : (
                                        <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded animate-pulse">
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
                    </motion.div>
                  )}

                  {/* TAB 3: STREAKS & GAMIFICATION */}
                  {activeTab === 'streaks' && (
                    <motion.div
                      key="streaks-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6"
                    >
                      {/* Responsive Side-by-Side Split on Desktop */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        
                        {/* Gamified Fire Card with Pulsing Gradient Border */}
                        <div className="relative p-8 rounded-[2.5rem] bg-[#1a0f0a]/60 border border-orange-500/30 shadow-[0_0_40px_rgba(249,115,22,0.25)] text-center overflow-hidden group flex flex-col justify-center items-center min-h-[300px]">
                          {/* Moving pulsing glow mesh */}
                          <motion.div 
                            animate={{
                              scale: [1, 1.2, 1],
                              opacity: [0.15, 0.3, 0.15],
                              rotate: [0, 180, 360]
                            }}
                            transition={{
                              duration: 8,
                              repeat: Infinity,
                              ease: "linear"
                            }}
                            className="absolute inset-0 bg-gradient-to-br from-orange-600 via-amber-500 to-rose-600 blur-2xl rounded-[2.5rem] pointer-events-none"
                          />
                          {/* Inner dark glass mask to keep content clean */}
                          <div className="absolute inset-[1px] bg-[#12141c]/90 rounded-[2.5rem] z-0" />
                          
                          <div className="relative z-10 space-y-5 w-full">
                            {/* Pulsing Flame graphic */}
                            <motion.div
                              animate={{ 
                                scale: [1, 1.15, 1],
                                rotate: [0, 7, -7, 0] 
                              }}
                              transition={{ 
                                duration: 2.5, 
                                repeat: Infinity,
                                ease: "easeInOut"
                              }}
                              className="w-18 h-18 bg-gradient-to-tr from-orange-500 via-amber-500 to-rose-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-orange-500/30 relative"
                            >
                              {/* Outer pulse ring */}
                              <div className="absolute -inset-1 bg-orange-500/20 rounded-full blur-sm animate-ping pointer-events-none" />
                              <Flame className="w-10 h-10 text-white fill-white relative z-10" />
                            </motion.div>

                            <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase text-orange-400 tracking-widest leading-none">CURRENT WORKOUT STREAK</p>
                              <h3 className="text-5xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white via-orange-300 to-amber-400">
                                {streakCount} DAYS
                              </h3>
                            </div>

                            {/* Athlete Level Badge */}
                            <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-wider ${activeRank.color} shadow-[0_4px_12px_rgba(0,0,0,0.25)]`}>
                              <span>{activeRank.emoji}</span>
                              <span>{activeRank.name}</span>
                            </div>
                          </div>
                        </div>

                        {/* Gamified stats & Motivation Panel */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-5 shadow-2xl transition-all duration-300 hover:border-white/20 flex flex-col justify-between">
                          <div className="space-y-4">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Weekly Consistency Flex</h4>
                            
                            {/* Visual 7 days bar */}
                            <div className="flex justify-between items-center gap-2 pt-2">
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                                const checkInDaysMap = new Set(
                                  attendanceLogs.map(log => new Date(log.check_in_time).getDay())
                                )
                                const dayMapIndex = [1, 2, 3, 4, 5, 6, 0][idx]
                                const isActive = checkInDaysMap.has(dayMapIndex)
                                return (
                                  <div key={day} className="flex-1 flex flex-col items-center gap-2">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                                      isActive 
                                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-400 font-bold shadow-[0_0_12px_rgba(249,115,22,0.25)] scale-105' 
                                      : 'bg-white/[0.02] border-white/5 text-slate-600 text-[10px]'
                                    }`}>
                                      {isActive ? <Check className="w-4 h-4 text-orange-400" /> : day.charAt(0)}
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-wider text-slate-500">{day.substring(0, 3)}</span>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Gamified Motivation quotes */}
                          <div className="p-4 rounded-2xl bg-[#f97316]/5 border border-[#f97316]/10 relative overflow-hidden">
                            <div className="absolute top-3 left-3 opacity-10 font-serif text-3xl text-orange-400">“</div>
                            <p className="text-slate-300 text-xs font-bold leading-relaxed pl-5 pr-2">
                              {streakCount > 0 
                                ? "You are out-working 99% of the room. Keep showing up, consistency is the ultimate flex."
                                : "The toughest check-in is the first check-in. Break the streak flatline and claim your first burn today!"
                              }
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* IF GYM COINS ARE ENABLED */}
                      {membership.gyms?.enable_gym_coins && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 animate-in fade-in duration-300">
                          
                          {/* GYM COINS WALLET */}
                          <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.03] via-yellow-500/[0.01] to-amber-600/[0.03] border border-amber-500/20 rounded-[2rem] p-6 space-y-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-amber-500/40">
                            {/* Gold shimmering particles effect */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                                  <Sparkles className="w-4.5 h-4.5 fill-amber-400/20 animate-pulse" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black text-white uppercase tracking-wider">Gym Coins Wallet</h4>
                                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Earned Loyalty Rewards</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 font-mono tracking-tight drop-shadow-[0_2px_10px_rgba(245,158,11,0.2)]">
                                  {membership.gym_coins_balance || 0} 🪙
                                </div>
                              </div>
                            </div>

                            {/* Transactions scroll area */}
                            <div className="space-y-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Transaction History</p>
                              {coinsLoading ? (
                                <div className="text-center py-6 text-slate-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">Syncing transactions...</div>
                              ) : coinTransactions.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 text-xs font-medium">
                                  No transactions logged yet. Start checking in to accumulate coins!
                                </div>
                              ) : (
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                  {coinTransactions.map((tx, index) => (
                                    <div key={index} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors">
                                      <div className="space-y-0.5">
                                        <span className="font-bold text-slate-200">{tx.reason}</span>
                                        <p className="text-[8px] text-slate-500 font-medium">
                                          {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                      <span className={`font-mono font-black ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* COMMUNITY LEADERBOARD */}
                          <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-5 shadow-2xl transition-all duration-300 hover:border-white/20">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-[#863BFF]/10 flex items-center justify-center border border-[#863BFF]/20 text-[#b370ff]">
                                <Flame className="w-4.5 h-4.5 animate-pulse" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Gym Leaderboard</h4>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Top Active Members Ranked by Check-ins</p>
                              </div>
                            </div>

                            {leaderboardLoading ? (
                              <div className="text-center py-6 text-slate-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">Calculating rankings...</div>
                            ) : leaderboard.length === 0 ? (
                              <div className="text-center py-6 text-slate-500 text-xs font-medium">
                                No check-in records found.
                              </div>
                            ) : (
                              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {leaderboard.map((userRow, index) => {
                                  const isCurrentUser = userRow.id === membership.id;
                                  let medal = '';
                                  let bgStyle = 'bg-white/[0.01] border-white/5';
                                  if (index === 0) {
                                    medal = '👑';
                                    bgStyle = 'bg-amber-500/[0.05] border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]';
                                  } else if (index === 1) {
                                    medal = '🥈';
                                    bgStyle = 'bg-slate-400/[0.05] border-slate-400/20';
                                  } else if (index === 2) {
                                    medal = '🥉';
                                    bgStyle = 'bg-amber-700/[0.05] border-amber-700/20';
                                  }
                                  
                                  if (isCurrentUser) {
                                    bgStyle = 'bg-[#863BFF]/10 border-[#863BFF]/30 shadow-[0_0_15px_rgba(134,59,255,0.1)]';
                                  }

                                  return (
                                    <div 
                                      key={userRow.id} 
                                      className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${bgStyle} ${isCurrentUser ? 'scale-[1.01] font-black' : ''}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="font-mono text-[10px] font-black text-slate-500 w-4">#{index + 1}</span>
                                        <span className="font-bold text-slate-200">{userRow.full_name} {isCurrentUser && ' (You)'}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black bg-white/5 border border-white/5 px-2 py-0.5 rounded text-slate-400">{userRow.checkins_count} check-ins</span>
                                        {medal && <span className="text-sm">{medal}</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* COINS REDEEM SHOP */}
                          <div className="lg:col-span-2 backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl transition-all duration-300 hover:border-white/20">
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">Loyalty Rewards Shop</h4>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Redeem your coins at the gym counter</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                              {[
                                { name: 'Free Protein Shake', cost: 100, desc: 'Fresh post-workout whey shake from gym juice bar.' },
                                { name: 'Custom Shaker Bottle', cost: 200, desc: 'High-quality leak-proof GymOS branded shaker.' },
                                { name: 'Premium Gym T-Shirt', cost: 500, desc: 'High-performance athletic tee.' }
                              ].map((reward, i) => {
                                const canAfford = (membership.gym_coins_balance || 0) >= reward.cost;
                                return (
                                  <div key={i} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between space-y-3 relative group">
                                    <div className="space-y-1">
                                      <div className="flex justify-between items-start">
                                        <h5 className="text-xs font-black text-white uppercase tracking-wider">{reward.name}</h5>
                                        <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${canAfford ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-white/5 text-slate-500'}`}>{reward.cost} 🪙</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">{reward.desc}</p>
                                    </div>
                                    <button 
                                      disabled
                                      className={`w-full py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${
                                        canAfford 
                                        ? 'bg-amber-500/5 border-amber-500/20 text-amber-400 group-hover:bg-amber-500/10 group-hover:border-amber-500/30' 
                                        : 'bg-white/[0.01] border-white/5 text-slate-600'
                                      }`}
                                    >
                                      Ask Desk to Redeem
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 5: PR & PROGRESS HUB */}
                  {activeTab === 'progress' && (
                    <motion.div
                      key="progress-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6"
                    >
                      {/* PR Lift Cards Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Bench Press Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.05] via-transparent to-amber-600/[0.05] border border-amber-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-amber-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Bench Press Max</p>
                          <p className="text-2xl font-black text-white">{getPRValues()['Bench Press'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
                        </div>

                        {/* Squat Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.05] via-transparent to-amber-600/[0.05] border border-amber-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-amber-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Squat Max</p>
                          <p className="text-2xl font-black text-white">{getPRValues()['Squat'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
                        </div>

                        {/* Deadlift Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.05] via-transparent to-amber-600/[0.05] border border-amber-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-amber-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Deadlift Max</p>
                          <p className="text-2xl font-black text-white">{getPRValues()['Deadlift'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
                        </div>

                        {/* Body Weight Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-emerald-500/[0.05] via-transparent to-emerald-600/[0.05] border border-emerald-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-emerald-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Body Weight</p>
                          <p className="text-2xl font-black text-white">{getPRValues()['Body Weight'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">Latest Log ⚖️</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                        
                        {/* LOG PROGRESS FORM */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 space-y-5 shadow-2xl transition-all duration-300 hover:border-white/20">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">Log Workout Progress</h4>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 font-medium">Record PRs or Body Weight updates</p>
                            </div>
                          </div>

                          <form onSubmit={handleAddProgressLog} className="space-y-4">
                            {/* Log Type Selector */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewLogType('PR');
                                  setNewExerciseName('Bench Press');
                                }}
                                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer ${
                                  newLogType === 'PR'
                                  ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                                  : 'bg-white/[0.02] border-white/5 text-slate-500'
                                }`}
                              >
                                Max Lift PR 🔥
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setNewLogType('BODYWEIGHT');
                                  setNewExerciseName('Body Weight');
                                }}
                                className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer ${
                                  newLogType === 'BODYWEIGHT'
                                  ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                                  : 'bg-white/[0.02] border-white/5 text-slate-500'
                                }`}
                              >
                                Body Weight ⚖️
                              </button>
                            </div>

                            {/* Exercise Selection (Only if Log Type is PR) */}
                            {newLogType === 'PR' && (
                              <div className="space-y-1.5 animate-in fade-in duration-300">
                                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Select Exercise</label>
                                <select 
                                  value={newExerciseName}
                                  onChange={(e) => setNewExerciseName(e.target.value)}
                                  className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-white/10 text-white text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-amber-500/50 transition-all select-none"
                                >
                                  {['Bench Press', 'Squat', 'Deadlift', 'Shoulder Press', 'Barbell Row', 'Incline Bench Press', 'Bicep Curl'].map((name) => (
                                    <option key={name} value={name} className="bg-[#12141c] text-white py-2">{name}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Weight / Value Input */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                                {newLogType === 'PR' ? 'Lift Weight (kg)' : 'Body Weight (kg)'}
                              </label>
                              <input 
                                type="number" 
                                step="0.1"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                required
                                placeholder="e.g. 85.5"
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-amber-500/50 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                              />
                            </div>

                            {/* Notes Input */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Notes / Logs</label>
                              <input 
                                type="text" 
                                value={newNotes}
                                onChange={(e) => setNewNotes(e.target.value)}
                                placeholder="e.g. Felt light, clean reps! (Optional)"
                                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-amber-500/50 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                              />
                            </div>

                            <button
                              type="submit"
                              disabled={loggingProgress}
                              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {loggingProgress ? (
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Sparkles className="w-3.5 h-3.5 fill-black/20" />
                                  Log Entry
                                </>
                              )}
                            </button>
                          </form>
                        </div>

                        {/* PROGRESS LOG TIMELINE */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-2xl transition-all duration-300 hover:border-white/20">
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">Progress Timeline</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 font-medium">History of your workout gains</p>
                          </div>

                          {progressLoading ? (
                            <div className="text-center py-10 text-slate-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">Retreiving PR logs...</div>
                          ) : progressLogs.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 text-xs font-semibold">
                              No progress entries logged yet. Record your lifts above to start tracking!
                            </div>
                          ) : (
                            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                              {progressLogs.map((log) => {
                                const date = new Date(log.recorded_at);
                                const isPR = log.log_type === 'PR';
                                return (
                                  <div key={log.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all flex items-center justify-between shadow-sm relative group">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs font-black ${
                                        isPR 
                                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                      }`}>
                                        {isPR ? 'PR' : 'BW'}
                                      </div>
                                      <div className="space-y-0.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-black text-white uppercase tracking-wide">
                                            {log.exercise_name}
                                          </span>
                                          <span className="text-[9px] text-slate-500 font-bold">
                                            {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                          </span>
                                        </div>
                                        {log.notes && (
                                          <p className="text-[10px] text-slate-400 font-medium italic">
                                            “{log.notes}”
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-black ${isPR ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {log.value} kg
                                      </span>
                                      <button
                                        onClick={() => {
                                          setActiveShareLog(log);
                                          setShareModalOpen(true);
                                        }}
                                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow active:scale-95"
                                        title="Share PR"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4: PROFILE & GYM CONNECTION META */}
                  {activeTab === 'profile' && (
                    <motion.div
                      key="profile-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6"
                    >
                      {/* Settings Success/Error alerts */}
                      {profileSuccess && (
                        <div className="px-4.5 py-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 inline mr-2 text-emerald-400" />
                          {profileSuccess}
                        </div>
                      )}
                      
                      {profileError && (
                        <div className="px-4.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider">
                          <ShieldAlert className="w-4 h-4 inline mr-2 text-rose-400" />
                          {profileError}
                        </div>
                      )}

                      {/* Desktop Two-Column Layout Grid for settings */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                        
                        {/* Profile editing card */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-5 shadow-2xl transition-all duration-300 hover:border-white/20">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#863BFF]/10 flex items-center justify-center border border-[#863BFF]/20 text-[#b370ff]">
                              <User className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">Personal Settings</h4>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Configure your athlete identity</p>
                            </div>
                          </div>

                          <form onSubmit={handleUpdateProfile} className="space-y-4">
                            {/* Name field */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Full Display Name</label>
                              <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#863BFF] transition-colors" />
                                <input 
                                  type="text" 
                                  value={profileName}
                                  onChange={(e) => setProfileName(e.target.value)}
                                  required
                                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/20 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                                  placeholder="Display name"
                                />
                              </div>
                            </div>

                            {/* Phone field */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Mobile Number</label>
                              <div className="relative group">
                                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#863BFF] transition-colors" />
                                <input 
                                  type="text" 
                                  value={profilePhone}
                                  onChange={(e) => setProfilePhone(e.target.value)}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/20 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                                  placeholder="Add phone number"
                                />
                              </div>
                            </div>

                            {/* Gender selection buttons */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Gender Preference</label>
                              <div className="grid grid-cols-3 gap-2">
                                {['male', 'female', 'other'].map((gender) => (
                                  <button
                                    key={gender}
                                    type="button"
                                    onClick={() => setProfileGender(gender)}
                                    className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer hover:border-white/20 ${
                                      profileGender === gender
                                      ? 'bg-[#863BFF]/20 border-[#863BFF] text-white shadow-[0_0_15px_rgba(134,59,255,0.25)]'
                                      : 'bg-white/[0.02] border-white/5 text-slate-500'
                                    }`}
                                  >
                                    {gender}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="w-full py-3.5 bg-white hover:bg-slate-100 text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {savingProfile ? (
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </form>
                        </div>

                        {/* Connected Gym & Active membership metadata card */}
                        <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-5 shadow-2xl transition-all duration-300 hover:border-white/20 flex flex-col justify-between">
                          <div className="space-y-5">
                            {/* Gym Header Hub details */}
                            <div className="p-4.5 rounded-2xl bg-emerald-500/[0.02] border border-emerald-500/10 space-y-3">
                              <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">CONNECTED HUB</span>
                              </div>
                              <div className="space-y-1">
                                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{membership.gyms?.gym_name || 'My Gym'}</h3>
                                <div className="flex items-center gap-2 pt-1">
                                  <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Unique Code:</span>
                                  <span 
                                    onClick={() => {
                                      navigator.clipboard.writeText(membership.gyms?.unique_code)
                                      alert('Gym connection code copied!')
                                    }}
                                    className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold tracking-widest cursor-pointer select-all select-none hover:bg-emerald-500/20 transition-all"
                                    title="Click to copy gym code"
                                  >
                                    {membership.gyms?.unique_code}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Athlete Info Stack */}
                            <div className="space-y-3">
                              <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-500">Athlete Pass Meta</h4>
                              
                              <div className="space-y-2.5 text-xs">
                                <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-slate-400">
                                  <span>Athlete ID</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-white font-mono font-bold select-all text-[10px] max-w-[120px] truncate">{membership.id}</span>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(membership.id)
                                        alert('Athlete ID copied to clipboard!')
                                      }}
                                      className="text-slate-500 hover:text-white p-1 transition-all cursor-pointer"
                                      title="Copy Athlete ID"
                                    >
                                      <Copy className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-slate-400">
                                  <span>Email Address</span>
                                  <span className="text-white font-semibold">{profile?.email}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-slate-400">
                                  <span>Active Pass Plan</span>
                                  <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">{membership.membership_plan}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 border-b border-white/5 text-slate-400">
                                  <span>Member Since</span>
                                  <span className="text-white font-semibold">{membership.join_date}</span>
                                </div>
                                <div className="flex justify-between items-center py-1.5 text-slate-400">
                                  <span>Pass Expiry</span>
                                  <span className="text-rose-400 font-bold">{membership.expiry_date || '—'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* DANGER: LEAVE GYM BUTTON */}
                          <button
                            onClick={handleLeaveGym}
                            className="w-full py-3.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 hover:border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mt-4"
                          >
                            Disconnect from Gym Hub
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  )}

                </div>
              )}
            </AnimatePresence>

          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {membership && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-[420px] rounded-[2rem] bg-[#0c0e14]/70 border border-white/10 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 flex items-center justify-between z-50 md:hidden animate-in slide-in-from-bottom duration-300">
          {/* BUTTON 1: PASS */}
          <button
            onClick={() => setActiveTab('pass')}
            className={`relative flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all cursor-pointer z-10 ${
              activeTab === 'pass' 
              ? 'text-[#b370ff] font-black' 
              : 'text-slate-500 hover:text-slate-300 font-semibold'
            }`}
          >
            {activeTab === 'pass' && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[#863BFF]/10 border border-[#863BFF]/20 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <QrCode className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[8px] uppercase tracking-wider leading-none">Pass</span>
          </button>

          {/* BUTTON 2: ATTENDANCE */}
          <button
            onClick={() => setActiveTab('attendance')}
            className={`relative flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all cursor-pointer z-10 ${
              activeTab === 'attendance' 
              ? 'text-[#b370ff] font-black' 
              : 'text-slate-500 hover:text-slate-300 font-semibold'
            }`}
          >
            {activeTab === 'attendance' && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[#863BFF]/10 border border-[#863BFF]/20 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Calendar className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[8px] uppercase tracking-wider leading-none">History</span>
          </button>

          {/* BUTTON 3: STREAKS */}
          <button
            onClick={() => setActiveTab('streaks')}
            className={`relative flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all cursor-pointer z-10 ${
              activeTab === 'streaks' 
              ? 'text-orange-400 font-black' 
              : 'text-slate-500 hover:text-slate-300 font-semibold'
            }`}
          >
            {activeTab === 'streaks' && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-orange-500/10 border border-orange-500/20 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Flame className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[8px] uppercase tracking-wider leading-none">Streak</span>
          </button>

          {/* BUTTON 4: PROGRESS */}
          <button
            onClick={() => setActiveTab('progress')}
            className={`relative flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all cursor-pointer z-10 ${
              activeTab === 'progress' 
              ? 'text-amber-400 font-black' 
              : 'text-slate-500 hover:text-slate-300 font-semibold'
            }`}
          >
            {activeTab === 'progress' && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-amber-500/10 border border-amber-500/20 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Sparkles className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[8px] uppercase tracking-wider leading-none">PRs</span>
          </button>

          {/* BUTTON 5: PROFILE */}
          <button
            onClick={() => setActiveTab('profile')}
            className={`relative flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all cursor-pointer z-10 ${
              activeTab === 'profile' 
              ? 'text-[#b370ff] font-black' 
              : 'text-slate-500 hover:text-slate-300 font-semibold'
            }`}
          >
            {activeTab === 'profile' && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-[#863BFF]/10 border border-[#863BFF]/20 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <User className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[8px] uppercase tracking-wider leading-none">Profile</span>
          </button>
        </div>
      )}

      {/* SYSTEM META FOOTER (Mobile/Non-connected ONLY) */}
      {!membership && (
        <div className="absolute bottom-6 left-0 right-0 text-center relative z-10 md:hidden">
          <p className="text-[8px] font-black uppercase text-slate-600 tracking-[0.25em]">
            Powered by Gym Revenue Operating System
          </p>
        </div>
      )}

      {/* INSTAGRAM SHARE MODAL */}
      <AnimatePresence>
        {shareModalOpen && activeShareLog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-xl bg-black/80 flex items-center justify-center p-4 z-[100]"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-md w-full flex flex-col items-center space-y-6"
            >
              {/* THE SHARABLE CARD */}
              <div 
                id="share-pr-card"
                className="w-full max-w-[340px] aspect-[9/16] rounded-[2.5rem] bg-gradient-to-br from-[#0c0e17] via-[#121424] to-[#1c111e] border-2 border-white/10 p-6 flex flex-col justify-between relative overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] shadow-purple-500/10 group select-none animate-in fade-in zoom-in-95 duration-300"
              >
                {/* Visual design glow backdrops */}
                <div className="absolute top-[-10%] left-[-20%] w-60 h-60 bg-amber-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-20%] w-60 h-60 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
                
                {/* CARD HEADER */}
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                    <Logo className="w-7 h-7 drop-shadow-[0_0_8px_rgba(134,59,255,0.4)]" />
                    <span className="text-[10px] font-black uppercase text-white tracking-[0.2em] italic">GymOS</span>
                  </div>
                  
                  {/* Verified Badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[8px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse">
                    <Check className="w-2.5 h-2.5" />
                    <span>GymOS Verified</span>
                  </div>
                </div>

                {/* CARD BODY (CENTER DETAILS) */}
                <div className="my-auto text-center space-y-5 relative z-10 pt-4">
                  <span className="px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.25em] text-slate-400">
                    {activeShareLog.log_type === 'PR' ? 'New Personal Record' : 'Body Weight Log'}
                  </span>
                  
                  <div className="space-y-1.5">
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">{activeShareLog.exercise_name}</h2>
                    <h1 className="text-5xl font-black italic tracking-tighter text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.1)]">
                      {activeShareLog.value} <span className="text-xl font-medium text-slate-400 not-italic">kg</span>
                    </h1>
                  </div>

                  {activeShareLog.notes && (
                    <p className="text-xs font-semibold text-slate-300 italic max-w-[240px] mx-auto leading-relaxed">
                      “{activeShareLog.notes}”
                    </p>
                  )}
                </div>

                {/* CARD FOOTER */}
                <div className="pt-4 border-t border-white/5 relative z-10 flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase">
                    <span>Athlete</span>
                    <span className="text-white font-black">{profile?.full_name || 'Athlete'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase">
                    <span>Consistency Streak</span>
                    <span className="text-orange-400 font-black flex items-center gap-1">
                      <span>{streakCount} Days</span>
                      <span>🔥</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500 uppercase">
                    <span>Training Hub</span>
                    <span className="text-emerald-400 font-black">{membership?.gyms?.gym_name || 'My Gym'}</span>
                  </div>
                </div>
              </div>

              {/* FLOATING ACTION OVERLAY CONTROLS */}
              <div className="w-full space-y-3 pt-2 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  💡 Tip: Take a screenshot to post directly to your Instagram story!
                </p>
                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => {
                      const shareText = `💪 Verified Lift: I just smashed a new ${activeShareLog.exercise_name} PR of ${activeShareLog.value} kg at ${membership?.gyms?.gym_name || 'My Gym'} on GymOS! Consistency Streak: ${streakCount} Days! 🔥 #GymOS #FitnessGoal`;
                      navigator.clipboard.writeText(shareText);
                      alert('Share text copied! Feel free to paste it into your caption or post.');
                    }}
                    className="px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-lg animate-in slide-in-from-bottom duration-300"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Captions
                  </button>

                  <button 
                    onClick={() => {
                      setShareModalOpen(false);
                      setActiveShareLog(null);
                    }}
                    className="px-5 py-3 rounded-xl bg-[#863BFF] hover:bg-[#722ce0] text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 shadow-lg shadow-[#863BFF]/20 animate-in slide-in-from-bottom duration-300"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
