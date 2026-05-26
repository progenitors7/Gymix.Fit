import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  QrCode, Activity, LogOut, CheckCircle2, AlertCircle, 
  Clock, ShieldAlert, Sparkles, Send, RefreshCw, Calendar, 
  Building, Flame, User, LogIn, ChevronRight, Edit2, Check, Shield, Copy, Lock, Trophy, Menu, X, Bell, Phone,
  Fingerprint, Info, AlertTriangle, Camera, Upload
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { connectionService } from '../../services/connectionService'
import Logo from '../UI/Logo'

// Standard input styles matching the system
const inputCls = 'w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.04] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all'

export default function MemberDashboard() {
  const { profile, signOut, refreshProfile } = useAuth()
  
  // Navigation & View tab: 'pass' | 'attendance' | 'streaks' | 'profile' | 'progress'
  const [activeTab, setActiveTab] = useState('pass')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [passMode, setPassMode] = useState('qr') // 'qr' | 'biometric'

  // Onboarding Profile states
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  const [onboardName, setOnboardName] = useState('')
  const [onboardPhone, setOnboardPhone] = useState('')
  const [onboardGender, setOnboardGender] = useState('male')
  const [onboardSaving, setOnboardSaving] = useState(false)
  const [onboardError, setOnboardError] = useState('')
  
  // Cooldown and quota states
  const [cooldownTimeLeft, setCooldownTimeLeft] = useState(0)
  const [nameChangeCount, setNameChangeCount] = useState(0)
  const [lastNameChangeAt, setLastNameChangeAt] = useState(null)
  const [avatarCooldownTimeLeft, setAvatarCooldownTimeLeft] = useState(0)
  const [avatarChangeCount, setAvatarChangeCount] = useState(0)
  const [lastAvatarChangeAt, setLastAvatarChangeAt] = useState(null)

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
  const [showLeaderboardInfo, setShowLeaderboardInfo] = useState(false)
  const [currentSeason, setCurrentSeason] = useState(1)
  const [seasonEndDate, setSeasonEndDate] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [seasonHistory, setSeasonHistory] = useState({})
  const [historyLoading, setHistoryLoading] = useState(false)

  // Notifications states
  const [notifications, setNotifications] = useState([])
  const [notifsLoading, setNotifsLoading] = useState(false)

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
  const [shareTheme, setShareTheme] = useState('cyber')
  
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
  const [profileAvatar, setProfileAvatar] = useState('')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraStream, setCameraStream] = useState(null)
  const [avatarSize, setAvatarSize] = useState(null)

  const getBase64SizeKB = (base64Str) => {
    if (!base64Str) return null
    const stringLength = base64Str.length - 'data:image/jpeg;base64,'.length
    const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633
    return (sizeInBytes / 1024).toFixed(1)
  }

  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxDim = 150
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.6)
          resolve(compressedBase64)
        }
        img.onerror = (err) => reject(err)
        img.src = event.target.result
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  }

  const startCamera = async () => {
    try {
      setShowCamera(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      setCameraStream(stream)
      setTimeout(() => {
        const videoEl = document.getElementById('member-webcam')
        if (videoEl) videoEl.srcObject = stream
      }, 100)
    } catch (err) {
      console.error('[Webcam] Error starting camera:', err)
      setProfileError('Failed to access camera. Check permissions.')
      setShowCamera(false)
    }
  }

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop())
      setCameraStream(null)
    }
    setShowCamera(false)
  }

  const captureSnapshot = () => {
    const videoEl = document.getElementById('member-webcam')
    if (!videoEl) return

    const canvas = document.createElement('canvas')
    canvas.width = 150
    canvas.height = 150
    const ctx = canvas.getContext('2d')

    // Handle horizontal mirroring for natural screenshot
    ctx.translate(150, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(videoEl, 0, 0, 150, 150)

    const base64 = canvas.toDataURL('image/jpeg', 0.6)
    setProfileAvatar(base64)
    setAvatarSize(getBase64SizeKB(base64))
    stopCamera()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const base64 = await compressImage(file)
      setProfileAvatar(base64)
      setAvatarSize(getBase64SizeKB(base64))
    } catch (err) {
      console.error('[File] Error compressing image:', err)
      setProfileError('Failed to process image. Select another file.')
    }
  }

  const fetchGoogleAvatar = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      const googlePic = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture
      if (googlePic) {
        setProfileAvatar(googlePic)
        setAvatarSize(null)
        setProfileSuccess('Google profile photo imported! ✨')
      } else {
        setProfileError('No profile photo found in active Google Account.')
      }
    } catch (err) {
      console.error('[Google] Error fetching profile picture:', err)
      setProfileError('Failed to fetch from Google profile.')
    }
  }

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

  // Fetch member specific notifications + global announcements
  const fetchMemberNotifications = async (memberId, gymId) => {
    setNotifsLoading(true)
    try {
      // 1. Fetch personal notifications
      const { data: dbNotifs, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('related_member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      // 2. Fetch platform broadcasts
      let broadcastNotifs = []
      try {
        const { data: broadcasts, error: bcError } = await supabase
          .from('broadcasts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)

        if (bcError) throw bcError

        let dismissedIds = []
        try {
          const saved = localStorage.getItem('dismissed_broadcasts')
          dismissedIds = saved ? JSON.parse(saved) : []
        } catch (e) {
          console.error('Dismissed broadcasts parsing error:', e)
        }

        broadcastNotifs = (broadcasts || []).map(b => ({
          id: b.id,
          type: 'system_broadcast',
          title: b.title,
          message: b.message,
          related_member_id: null,
          is_read: dismissedIds.includes(b.id),
          created_at: b.created_at
        }))
      } catch (bcErr) {
        console.error('Error fetching broadcasts for member:', bcErr)
      }

      // Merge and sort
      const merged = [...(dbNotifs || []), ...broadcastNotifs].sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at)
      })

      setNotifications(merged)
    } catch (err) {
      console.error('Error fetching member notifications:', err)
    } finally {
      setNotifsLoading(false)
    }
  }

  // Automatic verification function to check for access pass expiry and send notification
  const syncMemberNotifications = async (memberData) => {
    if (!memberData || !memberData.expiry_date) return

    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const expiry = new Date(memberData.expiry_date)
      expiry.setHours(0, 0, 0, 0)

      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))

      // Fetch recent unacknowledged or similar type notifications for this member
      const { data: recentNotifs, error } = await supabase
        .from('notifications')
        .select('type, created_at')
        .eq('related_member_id', memberData.id)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // last 7 days

      if (error) throw error

      const existingTypes = new Set(recentNotifs?.map(n => n.type) || [])

      const newNotifs = []

      // Access Expired Notification
      if (diffDays < 0) {
        if (!existingTypes.has('membership_expired')) {
          newNotifs.push({
            gym_id: memberData.gym_id,
            related_member_id: memberData.id,
            type: 'membership_expired',
            title: 'Access Pass Expired 🚨',
            message: `Your access pass has expired on ${new Date(memberData.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}. Please visit the gym desk to renew your membership immediately.`,
            is_read: false
          })
        }
      } 
      // Access Expiring Soon Notification (0 to 3 days remaining)
      else if (diffDays <= 3) {
        if (!existingTypes.has('membership_expiring')) {
          const daysText = diffDays === 0 ? 'today' : diffDays === 1 ? 'tomorrow' : `in ${diffDays} days`
          newNotifs.push({
            gym_id: memberData.gym_id,
            related_member_id: memberData.id,
            type: 'membership_expiring',
            title: 'Access Pass Expiring Soon ⏳',
            message: `Your access pass will expire ${daysText}. Please visit the front desk to renew your plan and keep your consistency streak going!`,
            is_read: false
          })
        }
      }

      if (newNotifs.length > 0) {
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(newNotifs)

        if (insertError) throw insertError
        
        // Refresh local notifications state
        await fetchMemberNotifications(memberData.id, memberData.gym_id)
      }
    } catch (err) {
      console.warn('Silent warning syncing member notifications:', err)
    }
  }

  // Mark single notification as read
  const markMemberNotifAsRead = async (notifId, type) => {
    try {
      if (type === 'system_broadcast') {
        const saved = localStorage.getItem('dismissed_broadcasts')
        let dismissed = saved ? JSON.parse(saved) : []
        if (!dismissed.includes(notifId)) {
          dismissed.push(notifId)
          localStorage.setItem('dismissed_broadcasts', JSON.stringify(dismissed))
        }
      } else {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notifId)

        if (error) throw error
      }

      // Update local state directly
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // Fetch Community Check-in Leaderboard
  const fetchLeaderboard = async (gymId) => {
    setLeaderboardLoading(true)
    try {
      // 1. Automatically check and rotate season if expired (lazy trigger)
      try {
        await supabase.rpc('check_and_rotate_gym_season', { target_gym_id: gymId })
      } catch (rotationErr) {
        console.error('[Seasons] Error rotating season:', rotationErr)
      }

      // 2. Fetch active season info
      const { data: seasonData } = await supabase
        .from('leaderboard_seasons')
        .select('season_number, end_date')
        .eq('gym_id', gymId)
        .eq('status', 'active')
        .maybeSingle()

      if (seasonData) {
        setCurrentSeason(seasonData.season_number)
        setSeasonEndDate(seasonData.end_date)
      }

      // 3. Fetch current season members ranking
      const { data, error } = await supabase
        .from('members')
        .select('id, full_name, leaderboard_xp, avatar_url')
        .eq('gym_id', gymId)
      
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
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLeaderboardLoading(false)
    }
  }

  // Fetch past seasons history archive
  const fetchSeasonHistory = async (gymId) => {
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
        .eq('gym_id', gymId)
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
      console.error('Error fetching season history:', err)
    } finally {
      setHistoryLoading(false)
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
      
      // Map DB lowercase log types ('pr', 'weight') to frontend expectation ('PR', 'BODYWEIGHT')
      const mappedData = (data || []).map(log => ({
        ...log,
        log_type: log.log_type === 'pr' ? 'PR' : (log.log_type === 'weight' ? 'BODYWEIGHT' : log.log_type)
      }))
      
      setProgressLogs(mappedData)
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
          log_type: newLogType === 'PR' ? 'pr' : 'weight',
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

  // Calculate top PR values for lifting cards (cached using useMemo to optimize render performance on low-end devices)
  const prValues = useMemo(() => {
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
  }, [progressLogs])

  // Dynamic colors and styles for Instagram PR themes
  const getThemeStyles = (theme) => {
    switch (theme) {
      case 'volcano':
        return {
          bg: 'from-[#140b08] via-[#22100d] to-[#1c0c1e]',
          glow1: 'bg-rose-500/10',
          glow2: 'bg-orange-500/10',
          border: 'border-rose-500/30',
          shadow: 'shadow-rose-500/20 shadow-[0_0_40px_rgba(244,63,94,0.15)]',
          titleColor: 'text-rose-400',
          statColor: 'text-transparent bg-clip-text bg-gradient-to-r from-white via-rose-300 to-orange-400',
          gymColor: 'text-orange-400'
        }
      case 'emerald':
        return {
          bg: 'from-[#07130e] via-[#0d2217] to-[#1a0f24]',
          glow1: 'bg-emerald-500/10',
          glow2: 'bg-yellow-500/10',
          border: 'border-emerald-500/30',
          shadow: 'shadow-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.15)]',
          titleColor: 'text-emerald-400',
          statColor: 'text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-300 to-yellow-400',
          gymColor: 'text-emerald-400'
        }
      case 'cyber':
      default:
        return {
          bg: 'from-[#0c0e17] via-[#121424] to-[#1c111e]',
          glow1: 'bg-amber-500/10',
          glow2: 'bg-purple-500/10',
          border: 'border-purple-500/30',
          shadow: 'shadow-purple-500/20 shadow-[0_0_40px_rgba(134,59,255,0.15)]',
          titleColor: 'text-purple-400',
          statColor: 'text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400',
        }
    }
  }

  // Helper to generate high-resolution dynamic vertical story poster on HTML5 Canvas
  const generatePosterCanvas = () => {
    if (!activeShareLog) return null
    
    const canvas = document.createElement('canvas')
    canvas.width = 720
    canvas.height = 1280
    const ctx = canvas.getContext('2d')
    
    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, 720, 1280)
    if (shareTheme === 'volcano') {
      grad.addColorStop(0, '#120705')
      grad.addColorStop(0.5, '#1e0a07')
      grad.addColorStop(1, '#140616')
    } else if (shareTheme === 'emerald') {
      grad.addColorStop(0, '#040d0a')
      grad.addColorStop(0.5, '#081a11')
      grad.addColorStop(1, '#12091a')
    } else {
      grad.addColorStop(0, '#07080f')
      grad.addColorStop(0.5, '#0c0d1b')
      grad.addColorStop(1, '#150a18')
    }
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 720, 1280)

    // Draw a premium cyber background grid
    ctx.save()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)'
    ctx.lineWidth = 1
    // Vertical grid lines
    for (let gx = 0; gx < 720; gx += 40) {
      ctx.beginPath()
      ctx.moveTo(gx, 0)
      ctx.lineTo(gx, 1280)
      ctx.stroke()
    }
    // Horizontal grid lines
    for (let gy = 0; gy < 1280; gy += 40) {
      ctx.beginPath()
      ctx.moveTo(0, gy)
      ctx.lineTo(720, gy)
      ctx.stroke()
    }
    ctx.restore()
    
    // Draw radial glowing backgrounds
    const themeStyle = getThemeStyles(shareTheme)
    
    const radial1 = ctx.createRadialGradient(100, 200, 0, 100, 200, 500)
    radial1.addColorStop(0, themeStyle.glow1.replace('0.1', '0.35'))
    radial1.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = radial1
    ctx.fillRect(0, 0, 720, 1280)

    const radial2 = ctx.createRadialGradient(620, 1080, 0, 620, 1080, 500)
    radial2.addColorStop(0, themeStyle.glow2.replace('0.1', '0.35'))
    radial2.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = radial2
    ctx.fillRect(0, 0, 720, 1280)
    
    // Central Glass Panel
    ctx.save()
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)'
    ctx.shadowBlur = 60
    ctx.fillStyle = 'rgba(255, 255, 255, 0.025)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)'
    ctx.lineWidth = 2
    
    const x = 70, y = 140, w = 580, h = 960, r = 48
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.restore()
    
    // Draw Gymix SVG Logo Symbol
    ctx.save()
    ctx.translate(110, 175)
    ctx.scale(0.7, 0.7)
    const logoGrad = ctx.createLinearGradient(0, 0, 48, 46)
    if (shareTheme === 'volcano') {
      logoGrad.addColorStop(0, '#EF4444')
      logoGrad.addColorStop(1, '#F59E0B')
    } else if (shareTheme === 'emerald') {
      logoGrad.addColorStop(0, '#10B981')
      logoGrad.addColorStop(1, '#34D399')
    } else {
      logoGrad.addColorStop(0, '#863BFF')
      logoGrad.addColorStop(1, '#C084FC')
    }
    ctx.fillStyle = logoGrad
    ctx.shadowColor = shareTheme === 'volcano' ? 'rgba(239,68,68,0.45)' : (shareTheme === 'emerald' ? 'rgba(16,185,129,0.45)' : 'rgba(134,59,255,0.45)')
    ctx.shadowBlur = 12
    ctx.fill(new Path2D("M25.946 44.938c-.664.845-2.021.375-2.021-.698V33.937a2.26 2.26 0 0 0-2.262-2.262H10.287c-.92 0-1.456-1.04-.92-1.788l7.48-10.471c1.07-1.497 0-3.578-1.842-3.578H1.237c-.92 0-1.456-1.04-.92-1.788L10.013.474c.214-.297.556-.474.92-.474h28.894c.92 0 1.456 1.04.92 1.788l-7.48 10.471c-1.07 1.498 0 3.579 1.842 3.579h11.377c.943 0 1.473 1.088.89 1.83L25.947 44.94z"))
    ctx.restore()

    // Branding text (offset right of logo)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 italic 26px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('Gymix', 155, 202)
    
    ctx.fillStyle = '#64748B'
    ctx.font = '900 11px sans-serif'
    ctx.fillText('ATHLETE TERMINAL', 155, 222)
    
    // Draw Verified Stamp Capsule
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)'
    ctx.lineWidth = 1.5
    const bX = 440, bY = 178, bW = 170, bH = 40, bR = 20
    ctx.beginPath()
    ctx.moveTo(bX + bR, bY)
    ctx.lineTo(bX + bW - bR, bY)
    ctx.quadraticCurveTo(bX + bW, bY, bX + bW, bY + bR)
    ctx.lineTo(bX + bW, bY + bH - bR)
    ctx.quadraticCurveTo(bX + bW, bY + bH, bX + bW - bR, bY + bH)
    ctx.lineTo(bX + bR, bY + bH)
    ctx.quadraticCurveTo(bX, bY + bH, bX, bY + bH - bR)
    ctx.lineTo(bX, bY + bR)
    ctx.quadraticCurveTo(bX, bY, bX + bR, bY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.fillStyle = '#10B981'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('✓ Gymix Verified', bX + bW / 2, bY + 25)
    
    // Draw PR Content Type Capsule
    const prTitle = activeShareLog.log_type === 'PR' ? 'NEW PERSONAL RECORD' : 'BODY WEIGHT UPDATE'
    ctx.font = '900 13px sans-serif'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'
    ctx.lineWidth = 1
    ctx.textAlign = 'center'
    const tW = ctx.measureText(prTitle).width + 30
    const tH = 30, tX = 360 - tW / 2, tY = 410, tR = 15
    ctx.beginPath()
    ctx.moveTo(tX + tR, tY)
    ctx.lineTo(tX + tW - tR, tY)
    ctx.quadraticCurveTo(tX + tW, tY, tX + tW, tY + tR)
    ctx.lineTo(tX + tW, tY + tH - tR)
    ctx.quadraticCurveTo(tX + tW, tY + tH, tX + tW - tR, tY + tH)
    ctx.lineTo(tX + tR, tY + tH)
    ctx.quadraticCurveTo(tX, tY + tH, tX, tY + tH - tR)
    ctx.lineTo(tX, tY + tR)
    ctx.quadraticCurveTo(tX, tY, tX + tR, tY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    
    ctx.fillStyle = '#94A3B8'
    ctx.fillText(prTitle, 360, 429)
    
    // Exercise Name with high contrast neon drop-shadow
    ctx.save()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '900 italic 42px sans-serif'
    ctx.textAlign = 'center'
    ctx.shadowColor = shareTheme === 'volcano' ? 'rgba(244,63,94,0.3)' : (shareTheme === 'emerald' ? 'rgba(16,185,129,0.3)' : 'rgba(134,59,255,0.3)')
    ctx.shadowBlur = 15
    ctx.fillText(activeShareLog.exercise_name.toUpperCase(), 360, 495)
    ctx.restore()
    
    // Main PR value centered baseline layout
    const valStr = `${activeShareLog.value}`
    ctx.save()
    ctx.font = '900 italic 136px sans-serif'
    const valWidth = ctx.measureText(valStr).width
    
    ctx.font = '900 italic 36px sans-serif'
    const unitWidth = ctx.measureText(' kg').width
    
    const totalWidth = valWidth + unitWidth
    const startX = 360 - totalWidth / 2
    
    ctx.textAlign = 'left'
    ctx.font = '900 italic 136px sans-serif'
    
    // Value text metallic gradient
    const valGrad = ctx.createLinearGradient(startX, 0, startX + valWidth, 0)
    if (shareTheme === 'volcano') {
      valGrad.addColorStop(0, '#FFFFFF')
      valGrad.addColorStop(1, '#EF4444')
    } else if (shareTheme === 'emerald') {
      valGrad.addColorStop(0, '#FFFFFF')
      valGrad.addColorStop(1, '#10B981')
    } else {
      valGrad.addColorStop(0, '#FFFFFF')
      valGrad.addColorStop(1, '#863BFF')
    }
    ctx.fillStyle = valGrad
    
    ctx.shadowColor = shareTheme === 'volcano' ? 'rgba(239,68,68,0.45)' : (shareTheme === 'emerald' ? 'rgba(16,185,129,0.45)' : 'rgba(134,59,255,0.45)')
    ctx.shadowBlur = 25
    ctx.fillText(valStr, startX, 640)
    ctx.restore()
    
    // kg unit
    ctx.fillStyle = '#64748B'
    ctx.font = '900 italic 36px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(' kg', startX + valWidth, 640)

    if (activeShareLog.notes) {
      // Notes background quote box
      ctx.save()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.015)'
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
      ctx.lineWidth = 1
      const qW = 440, qH = 50, qX = 360 - qW/2, qY = 705, qR = 12
      ctx.beginPath()
      ctx.moveTo(qX + qR, qY)
      ctx.lineTo(qX + qW - qR, qY)
      ctx.quadraticCurveTo(qX + qW, qY, qX + qW, qY + qR)
      ctx.lineTo(qX + qW, qY + qH - qR)
      ctx.quadraticCurveTo(qX + qW, qY + qH, qX + qW - qR, qY + qH)
      ctx.lineTo(qX + qR, qY + qH)
      ctx.quadraticCurveTo(qX, qY + qH, qX, qY + qH - qR)
      ctx.lineTo(qX, qY + qR)
      ctx.quadraticCurveTo(qX, qY, qX + qR, qY)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      ctx.fillStyle = '#E2E8F0'
      ctx.font = 'italic bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`“${activeShareLog.notes}”`, 360, 737)
    }
    
    // Fading Gradient Divider Line
    const divGrad = ctx.createLinearGradient(110, 0, 610, 0)
    divGrad.addColorStop(0, 'rgba(255,255,255,0)')
    divGrad.addColorStop(0.2, 'rgba(255,255,255,0.06)')
    divGrad.addColorStop(0.5, 'rgba(255,255,255,0.15)')
    divGrad.addColorStop(0.8, 'rgba(255,255,255,0.06)')
    divGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.strokeStyle = divGrad
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(110, 830)
    ctx.lineTo(610, 830)
    ctx.stroke()
    
    // Draw Footer Statistics
    ctx.fillStyle = '#64748B'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('ATHLETE IDENTITY', 110, 880)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 18px sans-serif'
    ctx.fillText(profile?.full_name || 'Athlete', 610, 880)
    
    ctx.fillStyle = '#64748B'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('CONSISTENCY STREAK', 110, 935)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#F97316'
    ctx.font = '900 18px sans-serif'
    ctx.fillText(`🔥 ${streakCount} Days Active`, 610, 935)
    
    ctx.fillStyle = '#64748B'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('TRAINING HUB', 110, 990)
    ctx.textAlign = 'right'
    ctx.font = '900 18px sans-serif'
    if (shareTheme === 'volcano') ctx.fillStyle = '#EF4444'
    else if (shareTheme === 'emerald') ctx.fillStyle = '#10B981'
    else ctx.fillStyle = '#863BFF'
    ctx.fillText(membership?.gyms?.gym_name?.toUpperCase() || 'TRAINING GYM', 610, 990)
    
    // Premium Gymix branding watermark
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.font = '900 13px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('⚡ POWERED BY GYMIX.FIT • JOIN THE CLUB ⚡', 360, 1150)
    
    return canvas
  }

  // Draw high-resolution dynamic vertical story poster and download as file
  const handleDownloadImage = () => {
    const canvas = generatePosterCanvas()
    if (!canvas) return
    
    const link = document.createElement('a')
    link.download = `${profile?.full_name?.replace(/\s+/g, '_') || 'athlete'}_${activeShareLog.exercise_name?.replace(/\s+/g, '_')}_PR.png`
    link.href = canvas.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Use Web Share API on mobile to share actual file, falls back to direct WhatsApp link on Desktop
  const handleNativeShare = async () => {
    const canvas = generatePosterCanvas()
    if (!canvas) return
    
    const caption = `💪 Verified Lift: I just smashed a new ${activeShareLog.exercise_name} PR of ${activeShareLog.value} kg at ${membership?.gyms?.gym_name || 'My Gym'} on Gymix! Consistency Streak: ${streakCount} Days! 🔥 #Gymix #FitnessGoal`
    
    try {
      if (navigator.share && navigator.canShare) {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            // Direct text share fallback
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
            window.open(waUrl, '_blank')
            return
          }
          
          const file = new File([blob], `${profile?.full_name?.replace(/\s+/g, '_') || 'athlete'}_PR.png`, { type: 'image/png' })
          
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: 'My Gymix PR Achievement!',
                text: caption
              })
            } catch (shareErr) {
              console.log('Share dismissed or failed, fallback to direct text link', shareErr)
              const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
              window.open(waUrl, '_blank')
            }
          } else {
            const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
            window.open(waUrl, '_blank')
          }
        }, 'image/png')
      }
    } catch (err) {
      console.error('Error sharing achievement:', err)
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(caption)}`
      window.open(waUrl, '_blank')
    }
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
      // 0. Fetch latest profile details from database to compute onboarding completed and cooldowns
      const { data: dbProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .single()

      if (profileErr) throw profileErr

      setOnboardingCompleted(dbProfile.onboarding_completed || false)
      setProfileName(dbProfile.full_name || '')
      setProfilePhone(dbProfile.phone_number || '')
      setProfileGender(dbProfile.gender || 'male')
      setProfileAvatar(dbProfile.avatar_url || '')
      setNameChangeCount(dbProfile.name_change_count || 0)
      setLastNameChangeAt(dbProfile.last_name_change_at || null)

      // Initialize onboarding fields if not completed yet
      if (!dbProfile.onboarding_completed) {
        setOnboardName(dbProfile.full_name || '')
        setOnboardPhone(dbProfile.phone_number || '')
        setOnboardGender(dbProfile.gender || 'male')
      }

      // Calculate 3-month (90-day) cooldown for name/phone changes
      const chgCount = dbProfile.name_change_count || 0
      const lastChgAt = dbProfile.last_name_change_at
      let daysRemaining = 0
      if (chgCount >= 3 && lastChgAt) {
        const lastChangeDate = new Date(lastChgAt)
        const currentDate = new Date()
        const diffMs = currentDate - lastChangeDate
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays < 90) {
          daysRemaining = Math.ceil(90 - diffDays)
        }
      }
      setCooldownTimeLeft(daysRemaining)

      // Calculate 3-month (90-day) cooldown for profile photo changes
      const avChgCount = dbProfile.avatar_change_count || 0
      const lastAvChgAt = dbProfile.last_avatar_change_at
      let avDaysRemaining = 0
      if (avChgCount >= 3 && lastAvChgAt) {
        const lastChangeDate = new Date(lastAvChgAt)
        const currentDate = new Date()
        const diffMs = currentDate - lastChangeDate
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays < 90) {
          avDaysRemaining = Math.ceil(90 - diffDays)
        }
      }
      setAvatarCooldownTimeLeft(avDaysRemaining)
      setAvatarChangeCount(avChgCount)
      setLastAvatarChangeAt(lastAvChgAt)

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
        setProfileAvatar(memberData.avatar_url || dbProfile.avatar_url || '')

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

        // 7. Fetch and sync member notifications automatically
        fetchMemberNotifications(memberData.id, memberData.gym_id)
        syncMemberNotifications(memberData)
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

  // Onboarding profile submission logic
  const handleOnboardSubmit = async (e) => {
    e.preventDefault()
    if (!onboardName.trim()) {
      setOnboardError('Full name is required!')
      return
    }
    if (!onboardPhone.trim()) {
      setOnboardError('Phone number is required!')
      return
    }

    setOnboardSaving(true)
    setOnboardError('')

    try {
      const { error: onboardErr } = await supabase
        .from('profiles')
        .update({
          full_name: onboardName.trim(),
          phone_number: onboardPhone.trim(),
          gender: onboardGender,
          onboarding_completed: true
        })
        .eq('id', profile.id)

      if (onboardErr) throw onboardErr

      // Sync member table if already connected (fallback)
      if (membership) {
        const { error: memberErr } = await supabase
          .from('members')
          .update({
            full_name: onboardName.trim(),
            phone_number: onboardPhone.trim(),
            gender: onboardGender
          })
          .eq('id', membership.id)

        if (memberErr) throw memberErr
      }

      // Refresh global authentication profile state
      if (refreshProfile) {
        await refreshProfile()
      }

      // Reload dashboard configuration
      await loadMemberSystem()
    } catch (err) {
      setOnboardError(err.message || 'Failed to complete profile setup. Please try again.')
    } finally {
      setOnboardSaving(false)
    }
  }

  // Profile Edit logic
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    if (!profileName.trim()) return

    setSavingProfile(true)
    setProfileSuccess('')
    setProfileError('')

    try {
      // 0. Fetch latest profile details from database to check limits securely
      const { data: dbProfile, error: fetchErr } = await supabase
        .from('profiles')
        .select('full_name, phone_number, name_change_count, last_name_change_at, avatar_url, avatar_change_count, last_avatar_change_at')
        .eq('id', profile.id)
        .single()

      if (fetchErr) throw fetchErr

      const nameChanged = dbProfile.full_name !== profileName.trim()
      const phoneChanged = dbProfile.phone_number !== profilePhone.trim()
      const eitherChanged = nameChanged || phoneChanged

      let newCount = dbProfile.name_change_count || 0
      let newLastChangeAt = dbProfile.last_name_change_at

      if (eitherChanged) {
        // Evaluate cooldown status
        const chgCount = dbProfile.name_change_count || 0
        const lastChgAt = dbProfile.last_name_change_at
        
        if (chgCount >= 3 && lastChgAt) {
          const lastChangeDate = new Date(lastChgAt)
          const currentDate = new Date()
          const diffMs = currentDate - lastChangeDate
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          if (diffDays < 90) {
            const daysRemaining = Math.ceil(90 - diffDays)
            throw new Error(`You have reached the limit of 3 profile changes in 3 months. You can edit your name/number again in ${daysRemaining} days, or ask your Gym Owner to change it from their dashboard.`)
          } else {
            // Cooldown has expired! Reset count to 1 and update last_name_change_at
            newCount = 1
            newLastChangeAt = new Date().toISOString()
          }
        } else {
          // Increment changes counter and update timestamp
          newCount = chgCount + 1
          newLastChangeAt = new Date().toISOString()
        }
      }

      const avatarChanged = dbProfile.avatar_url !== (profileAvatar || null)
      let newAvatarCount = dbProfile.avatar_change_count || 0
      let newLastAvatarChangeAt = dbProfile.last_avatar_change_at

      if (avatarChanged) {
        // Evaluate avatar cooldown status
        const avChgCount = dbProfile.avatar_change_count || 0
        const lastAvChgAt = dbProfile.last_avatar_change_at
        
        if (avChgCount >= 3 && lastAvChgAt) {
          const lastChangeDate = new Date(lastAvChgAt)
          const currentDate = new Date()
          const diffMs = currentDate - lastChangeDate
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          if (diffDays < 90) {
            const daysRemaining = Math.ceil(90 - diffDays)
            throw new Error(`You have reached the limit of 3 profile photo changes in 3 months. You can edit your photo again in ${daysRemaining} days, or ask your Gym Owner to change it from their dashboard.`)
          } else {
            // Cooldown has expired! Reset count to 1 and update last_avatar_change_at
            newAvatarCount = 1
            newLastAvatarChangeAt = new Date().toISOString()
          }
        } else {
          // Increment changes counter and update timestamp
          newAvatarCount = avChgCount + 1
          newLastAvatarChangeAt = new Date().toISOString()
        }
      }

      // 1. Update globally inside profiles table
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: profileName.trim(),
          phone_number: profilePhone.trim(),
          gender: profileGender,
          avatar_url: profileAvatar || null,
          name_change_count: newCount,
          last_name_change_at: newLastChangeAt,
          avatar_change_count: newAvatarCount,
          last_avatar_change_at: newLastAvatarChangeAt
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
            gender: profileGender,
            avatar_url: profileAvatar || null
          })
          .eq('id', membership.id)

        if (memberErr) throw memberErr
      }

      setProfileSuccess('Profile updated successfully! ✨')
      
      // Sync global auth provider details
      if (refreshProfile) {
        await refreshProfile()
      }
      
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
      const isSunday = date.getDay() === 0

      let dayClass = 'w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative '
      let dotColor = ''
      let tooltipTitle = ''

      if (hasCheckedIn) {
        dayClass += 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black shadow-[0_0_12px_rgba(16,185,129,0.15)]'
        dotColor = 'bg-emerald-400 animate-pulse'
        tooltipTitle = 'Present 💪'
      } else if (isToday) {
        dayClass += 'bg-blue-500/10 border border-blue-500/40 text-blue-400 font-black animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.15)]'
        tooltipTitle = 'Today'
      } else if (isSunday) {
        dayClass += 'bg-amber-500/5 border border-amber-500/20 text-amber-500/60 font-semibold'
        dotColor = 'bg-amber-500/40'
        tooltipTitle = 'Sunday Rest Day 💤'
      } else if (isPast && membership.join_date && dateStr >= membership.join_date) {
        dayClass += 'bg-rose-500/5 border border-rose-500/20 text-rose-400/60 font-medium'
        dotColor = 'bg-rose-500'
        tooltipTitle = 'Absent ❌'
      } else {
        dayClass += 'bg-white/[0.01] border border-white/5 text-slate-700 opacity-40'
        tooltipTitle = 'Rest/Not Active'
      }

      days.push(
        <div key={d} className={dayClass} title={tooltipTitle}>
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

  // FORCE ONBOARDING PROFILE SETUP FIRST
  if (!onboardingCompleted) {
    return (
      <div className="min-h-screen bg-[#0f111a] text-slate-100 font-sans relative overflow-x-hidden flex items-center justify-center p-4">
        {/* Background decorations */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-[#863BFF]/10 blur-[100px] rounded-full pointer-events-none z-0" />
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none z-0" />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 shadow-[0_0_50px_rgba(134,59,255,0.15)] rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden pt-10 max-w-md w-full z-10"
        >
          <div className="absolute inset-0 bg-[#863BFF]/5 animate-pulse rounded-[2.5rem] pointer-events-none" />

          <div className="relative space-y-6 z-10">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.01] border border-white/5 shadow-inner flex items-center justify-center mx-auto mb-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[#863BFF]/5 blur-md rounded-full" />
              <User className="w-8 h-8 text-[#b370ff]" />
            </div>
            
            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-[#863BFF]/10 border border-[#863BFF]/20 text-[9px] font-black uppercase tracking-widest text-[#b370ff]">
                Setup Your Athlete Profile
              </span>
              <h3 className="text-2xl font-black text-white uppercase italic tracking-tight pt-1">
                Yo, Welcome to Gymix!
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-semibold">
                Please complete your display profile to get connected to your Gym Hub.
              </p>
            </div>

            {onboardError && (
              <div className="px-4.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider text-left">
                <ShieldAlert className="w-4 h-4 inline mr-2 text-rose-400" />
                {onboardError}
              </div>
            )}

            <form onSubmit={handleOnboardSubmit} className="space-y-4 text-left">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Full Display Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#863BFF] transition-colors" />
                  <input
                    type="text"
                    placeholder="E.g. Shubh Sharma"
                    value={onboardName}
                    onChange={(e) => setOnboardName(e.target.value)}
                    required
                    disabled={onboardSaving}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/20 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Mobile Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#863BFF] transition-colors" />
                  <input
                    type="tel"
                    placeholder="E.g. +91 9999999999"
                    value={onboardPhone}
                    onChange={(e) => setOnboardPhone(e.target.value)}
                    required
                    disabled={onboardSaving}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/20 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]"
                  />
                </div>
              </div>

              {/* Gender Preference */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Gender Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'other'].map((gender) => (
                    <button
                      key={gender}
                      type="button"
                      disabled={onboardSaving}
                      onClick={() => setOnboardGender(gender)}
                      className={`py-3 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center cursor-pointer hover:border-white/20 ${
                        onboardGender === gender
                        ? 'bg-[#863BFF]/20 border-[#863BFF] text-white shadow-[0_0_15px_rgba(134,59,255,0.25)]'
                        : 'bg-white/[0.02] border-white/5 text-slate-500'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={onboardSaving}
                className="w-full py-4.5 bg-gradient-to-r from-[#863BFF] to-[#b370ff] hover:from-[#762fe6] hover:to-[#a25eff] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#863BFF]/20 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {onboardSaving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Complete Profile Setup
                  </>
                )}
              </button>
            </form>

            {/* Logout Action */}
            <div className="pt-4 border-t border-white/5">
              <button
                onClick={signOut}
                type="button"
                className="text-[10px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-widest transition-colors cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        </motion.div>
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
              <h1 className="text-base font-black text-white uppercase tracking-wider italic">Gymix</h1>
              <p className="text-[10px] font-bold text-[#b370ff] uppercase tracking-widest leading-none">Member Terminal</p>
            </div>
          </div>

          {/* Member summary card */}
          <div className="p-4.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3.5 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#863BFF] to-[#b370ff] flex items-center justify-center font-black text-white shadow-md text-sm overflow-hidden border border-white/10">
              {(membership?.avatar_url || profile?.avatar_url) ? (
                <img src={membership.avatar_url || profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0).toUpperCase() || 'M'
              )}
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
              { id: 'notifications', label: 'Alerts & Inbox', icon: Bell, badge: notifications.filter(n => !n.is_read).length > 0 ? `${notifications.filter(n => !n.is_read).length} New` : null },
              { id: 'attendance', label: 'Attendance logs', icon: Calendar },
              { id: 'streaks', label: 'Workout Streaks', icon: Flame, badge: `${streakCount} Days` },
              { id: 'leaderboard', label: 'Gym Leaderboard', icon: Trophy },
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
                        : item.id === 'leaderboard'
                        ? 'bg-yellow-500/10 border-yellow-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                        : 'bg-[#863BFF]/10 border-[#863BFF]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                      }`}
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? (item.id === 'streaks' ? 'text-orange-400' : item.id === 'progress' ? 'text-amber-400' : item.id === 'leaderboard' ? 'text-yellow-400' : 'text-[#b370ff]') : 'text-slate-500'}`} />
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
        
        {/* MOBILE ONLY STICKY HEADER */}
        <div className="sticky top-0 z-40 md:hidden flex items-center justify-between px-6 py-4 bg-[#0f111a]/85 backdrop-blur-xl border-b border-white/10 w-full shadow-lg shadow-black/20">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#863BFF] to-[#b370ff] flex items-center justify-center font-black text-white shadow-lg shadow-[#863BFF]/30 text-sm relative group overflow-hidden border border-white/10"
            >
              {(membership?.avatar_url || profile?.avatar_url) ? (
                <img src={membership.avatar_url || profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0).toUpperCase() || 'M'
              )}
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

          <div className="flex items-center gap-2">
            {membership && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer relative"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notifications.filter(n => !n.is_read).length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-[#0f1117]">
                    {notifications.filter(n => !n.is_read).length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => setMobileMenuOpen(true)}
              className="w-10 h-10 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-w-4xl lg:max-w-5xl mx-auto w-full p-4 sm:p-6 md:p-8 space-y-6">
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
                          <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl flex-1 flex flex-col justify-center items-center transition-all duration-300 hover:border-white/20 min-h-[360px]">
                            
                            {/* Rotating ring spinner indicator (Only show if QR is active) */}
                            {(!membership.gyms?.biometric_enabled || passMode === 'qr') && (
                              <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400 animate-in fade-in duration-300">
                                <span className="relative flex h-1.5 w-1.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                                SECURE • ROTATING IN {timeLeft}s
                              </div>
                            )}

                            {/* Dual Mode Switcher Selector (Only if biometric is enabled) */}
                            {membership.gyms?.biometric_enabled && (
                              <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 mb-6 relative z-10 w-full max-w-[280px]">
                                <button 
                                  onClick={() => setPassMode('qr')}
                                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${passMode === 'qr' ? 'bg-[#863BFF]/20 border border-[#863BFF]/20 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  QR Code Pass
                                </button>
                                <button 
                                  onClick={() => setPassMode('biometric')}
                                  className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${passMode === 'biometric' ? 'bg-[#10B981]/20 border border-[#10B981]/20 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                  <Fingerprint className="w-3.5 h-3.5" />
                                  Biometric Sync
                                </button>
                              </div>
                            )}

                            <div className="space-y-6 pt-2 w-full flex-1 flex flex-col justify-center items-center">
                              {(!membership.gyms?.biometric_enabled || passMode === 'qr') ? (
                                <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center">
                                  {/* QR Container with neon glow effect */}
                                  <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto group">
                                    {/* Pulsing neon glow underlay */}
                                    <div className="absolute -inset-1.5 bg-gradient-to-r from-[#863BFF] to-[#b370ff] rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-pulse" />
                                    
                                    <div className="relative w-full h-full bg-white rounded-3xl p-4 flex flex-col items-center justify-center border border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                                      <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken)}`}
                                        alt="Gate Access Pass"
                                        className="w-full h-full object-contain rounded-xl select-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-1 pt-1">
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                                      <Shield className="w-3.5 h-3.5 text-emerald-400" />
                                      ACTIVE PASS KEY
                                    </h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                      SCAN PASS QR AT FRONT DESK ON ENTRY
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center py-4">
                                  {/* Biometric linked display with dynamic colors */}
                                  <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto group flex items-center justify-center">
                                    {/* Neon glow ring */}
                                    <div className={`absolute -inset-1 bg-gradient-to-tr ${membership.biometric_user_id ? 'from-[#10B981] to-emerald-400' : 'from-rose-500 to-rose-400'} rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500`} />
                                    
                                    <div className={`relative w-full h-full rounded-full flex flex-col items-center justify-center border-2 ${membership.biometric_user_id ? 'bg-[#10B981]/5 border-[#10B981]/30 text-[#10B981]' : 'bg-rose-500/5 border-rose-500/30 text-rose-400'} shadow-2xl backdrop-blur-md`}>
                                      <Fingerprint className="w-16 h-16 animate-pulse" />
                                    </div>
                                  </div>

                                  <div className="space-y-2 max-w-sm">
                                    <div className="flex justify-center">
                                      {membership.biometric_user_id ? (
                                        <span className="px-3.5 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[9px] font-black uppercase tracking-widest text-[#10B981] shadow-lg shadow-[#10B981]/5">
                                          Device Linked 🟢
                                        </span>
                                      ) : (
                                        <span className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest text-rose-400 shadow-lg">
                                          Link Missing 🔴
                                        </span>
                                      )}
                                    </div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-wider">
                                      {membership.biometric_user_id ? `Active Bio User ID: #${membership.biometric_user_id}` : 'Biometric Link Inactive'}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                      {membership.biometric_user_id 
                                        ? "Your account is securely synced with the gym's biometric face/fingerprint terminals. Simply walk to the reception scanner to log entry!" 
                                        : "Your biometric ID is not linked to your account yet. Please visit the reception desk to scan your finger/face and complete linking."}
                                    </p>
                                  </div>
                                </div>
                              )}
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

                          {/* Mobile Quick-Access to Lifts PR */}
                          <div 
                            onClick={() => setActiveTab('progress')}
                            className="md:hidden p-4.5 rounded-[2rem] bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-600/10 border border-amber-500/20 flex items-center justify-between cursor-pointer active:scale-98 transition-all duration-300 shadow-md hover:scale-[1.01]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                                <Sparkles className="w-4 h-4 fill-amber-400/25 animate-pulse" />
                              </div>
                              <div className="text-left">
                                <span className="text-[8px] font-black uppercase text-amber-400 tracking-widest leading-none">Athlete Logs</span>
                                <h4 className="text-[10px] font-bold text-white uppercase tracking-wide mt-0.5">Track Lifts & PR Progress</h4>
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
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

                          {/* Beautiful Premium Legend */}
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
                              <span className="w-2.5 h-2.5 rounded bg-blue-500/10 border border-blue-500/40" />
                              <span>Today</span>
                            </div>
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

                      {/* LOYALTY MODULES (Only displayed when Gym Loyalty Coins is enabled by owner) */}
                      {membership.gyms?.enable_gym_coins && (
                        <div className="space-y-6 mt-6 animate-in fade-in duration-300">
                          
                          {/* GYM COINS WALLET */}
                          <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.03] via-yellow-500/[0.01] to-amber-600/[0.03] border border-amber-500/20 rounded-[2rem] p-6 space-y-5 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-amber-500/40 min-h-[220px] flex flex-col justify-between">
                            <div className="relative z-10 w-full space-y-5">
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
                                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
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
                          </div>

                          {/* COINS REDEEM SHOP */}
                          <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-4 shadow-2xl transition-all duration-300 hover:border-white/20 relative overflow-hidden">
                            <div className="relative z-10 w-full space-y-4">
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider">Loyalty Rewards Shop</h4>
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Redeem your coins at the gym counter</p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                                {[
                                  { name: 'Free Protein Shake', cost: 100, desc: 'Fresh post-workout whey shake from gym juice bar.' },
                                  { name: 'Custom Shaker Bottle', cost: 200, desc: 'High-quality leak-proof Gymix branded shaker.' },
                                  { name: 'Premium Gym T-Shirt', cost: 500, desc: 'High-performance athletic tee.' }
                                ].map((reward, i) => {
                                  const canAfford = (membership.gym_coins_balance || 0) >= reward.cost;
                                  return (
                                    <div key={i} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col justify-between space-y-3 relative group text-left">
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

                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* TAB 4: MEMBER NOTIFICATIONS HUB */}
                  {activeTab === 'notifications' && (
                    <motion.div
                      key="notifications-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6 animate-in fade-in duration-300"
                    >
                      <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2rem] p-6 space-y-6 shadow-2xl transition-all duration-300 hover:border-white/20">
                        
                        <div className="flex items-center justify-between pb-4 border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400">
                              <Bell className="w-4.5 h-4.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-white uppercase tracking-wider">Gym Alerts & Broadcasts</h4>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Stay updated with your membership & announcements</p>
                            </div>
                          </div>
                          <span className="text-[9px] font-black uppercase bg-white/5 border border-white/5 px-2.5 py-1 rounded-md text-slate-400">
                            Unread: {notifications.filter(n => !n.is_read).length}
                          </span>
                        </div>

                        {notifsLoading ? (
                          <div className="text-center py-12 text-slate-500 text-[10px] uppercase font-bold tracking-widest animate-pulse">
                            Loading your inbox...
                          </div>
                        ) : notifications.length === 0 ? (
                          <div className="text-center py-16 space-y-3">
                            <div className="w-12 h-12 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center mx-auto text-slate-600">
                              <Check className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <h5 className="text-xs font-black text-white uppercase tracking-wider">No notifications yet</h5>
                              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Your inbox is completely empty and clean!</p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                            {notifications.map((n) => {
                              const isBroadcast = n.type === 'system_broadcast'
                              const styles = isBroadcast 
                                ? { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', label: 'ANNOUNCEMENT' }
                                : n.type === 'membership_expired'
                                ? { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', label: 'EXPIRED ALERT' }
                                : { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', label: 'EXPIRING ALERT' }

                              return (
                                <div 
                                  key={n.id} 
                                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                    n.is_read 
                                      ? 'bg-white/[0.01] border-white/5 opacity-50' 
                                      : `${styles.bg} ${styles.border} shadow-[0_0_15px_rgba(0,0,0,0.15)]`
                                  }`}
                                >
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${n.is_read ? 'bg-white/5 text-slate-500' : 'bg-white/10 text-white'}`}>
                                        {styles.label}
                                      </span>
                                      <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                                        {new Date(n.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <h5 className={`text-xs font-black uppercase tracking-wide ${n.is_read ? 'text-slate-400' : 'text-white'}`}>
                                      {n.title}
                                    </h5>
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                      {n.message}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                                    {!n.is_read && (
                                      <button
                                        onClick={() => markMemberNotifAsRead(n.id, n.type)}
                                        className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 text-white text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                                      >
                                        Acknowledge
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* TAB 4.5: DEDICATED GYM PODIUM LEADERBOARD HUB */}
                  {activeTab === 'leaderboard' && (
                    <motion.div
                      key="leaderboard-tab"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 350, damping: 25 }}
                      className="space-y-6"
                    >
                      {(() => {
                        const getPodiumMember = (index) => {
                          return leaderboard[index] || { full_name: 'Empty Slot', xp_points: 0, id: 'empty' };
                        };
                        return (
                          <>
                            {/* 3D GLASSMORPHIC PODIUM */}
                            <div className="p-6 rounded-[2.5rem] bg-white/[0.01] border border-white/5 shadow-2xl relative overflow-hidden flex flex-col items-center">
                              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#863BFF]/5 to-transparent blur-xl rounded-full pointer-events-none" />
                              
                              <div className="flex items-center gap-2 mb-6">
                                <span className="px-3.5 py-1 rounded-full bg-[#863BFF]/10 border border-[#863BFF]/20 text-[9px] font-black uppercase tracking-widest text-[#b370ff]">
                                  Gym Arena Season {currentSeason}
                                </span>
                                <button 
                                  onClick={() => {
                                    setShowHistoryModal(true);
                                    if (membership?.gym_id) {
                                      fetchSeasonHistory(membership.gym_id);
                                    }
                                  }}
                                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-[#b370ff] hover:bg-[#863BFF]/10 transition-all cursor-pointer shadow-md"
                                >
                                  Past Seasons
                                </button>
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
                                  {/* Avatar wrapper */}
                                  <div className="w-12 h-12 rounded-full p-[2.5px] frame-silver-animated flex items-center justify-center shadow-lg relative mb-3">
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
                                  
                                  {/* Pedestal block */}
                                  <div className="w-full h-24 mt-4 rounded-t-2xl bg-gradient-to-t from-slate-400/5 to-slate-400/15 border-t border-x border-slate-400/30 flex items-center justify-center font-black text-slate-400 text-xl tracking-tighter shadow-2xl shadow-slate-400/5">
                                    II
                                  </div>
                                </div>

                                {/* RANK 1 (GOLD) */}
                                <div className="flex-1 flex flex-col items-center transform -translate-y-4">
                                  {/* Floating Crown above Avatar */}
                                  <div className="relative mb-3 flex flex-col items-center">
                                    <div className="absolute -top-4 text-[18px] z-20 animate-float-crown filter drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">👑</div>
                                    <div className="w-16 h-16 rounded-full p-[3px] frame-gold-animated flex items-center justify-center shadow-2xl relative shadow-amber-400/15">
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
                                  
                                  {/* Pedestal block */}
                                  <div className="w-full h-32 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-500/10 to-amber-500/20 border-t border-x border-amber-500/40 flex items-center justify-center font-black text-amber-400 text-2xl tracking-tighter shadow-2xl shadow-amber-500/10">
                                    I
                                  </div>
                                </div>

                                {/* RANK 3 (BRONZE) */}
                                <div className="flex-1 flex flex-col items-center">
                                  {/* Avatar wrapper */}
                                  <div className="w-11 h-11 rounded-full p-[2px] frame-bronze-animated flex items-center justify-center shadow-lg relative mb-3 overflow-hidden">
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
                                  
                                  {/* Pedestal block */}
                                  <div className="w-full h-18 mt-4 rounded-t-2xl bg-gradient-to-t from-amber-700/5 to-amber-700/15 border-t border-x border-amber-700/30 flex items-center justify-center font-black text-amber-700 text-lg tracking-tighter shadow-2xl shadow-amber-700/5">
                                    III
                                  </div>
                                </div>

                              </div>
                            </div>

                            {/* RANKS 4 TO 10 LIST */}
                            <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 space-y-4 shadow-2xl transition-all duration-300 hover:border-white/20">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Arena Contenders (Ranks 4-10)</p>
                              
                              {leaderboard.length <= 3 ? (
                                <div className="text-center py-6 text-slate-500 text-xs font-medium">No other contenders active yet. Scan entries to rise in rank!</div>
                              ) : (
                                <div className="space-y-2.5">
                                  {leaderboard.slice(3, 10).map((userRow, index) => {
                                    const isCurrentUser = userRow.id === membership.id
                                    const currentRank = index + 4
                                    return (
                                      <div 
                                        key={userRow.id}
                                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs transition-all ${
                                          isCurrentUser
                                          ? 'bg-[#863BFF]/10 border-[#863BFF]/40 shadow-[0_0_15px_rgba(134,59,255,0.15)] scale-[1.01] font-black'
                                          : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.02] hover:border-white/10'
                                        }`}
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
                                          <span className="text-slate-200 font-bold">{userRow.full_name} {isCurrentUser && ' (You)'}</span>
                                        </div>
                                        <span className="text-[10px] font-black bg-white/5 border border-white/5 px-2.5 py-1 rounded text-slate-400">{userRow.xp_points} XP</span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>

                            {/* YOUR STANDINGS STICKY SUMMARY CARD */}
                            {(() => {
                              const userIndex = leaderboard.findIndex(u => u.id === membership.id)
                              const userRank = userIndex !== -1 ? userIndex + 1 : null
                              const nextContender = userIndex > 0 ? leaderboard[userIndex - 1] : null
                              const xpDiff = (userRank && nextContender) ? nextContender.xp_points - leaderboard[userIndex].xp_points : 0

                              let berdiriText = ''
                              if (userRank === 1) {
                                berdiriText = '🥇 You are dominating the Leaderboard! Keep up the grind to defend your Crown!'
                              } else if (userRank) {
                                berdiriText = nextContender 
                                  ? `💪 Rank #${userRank} • You're just ${xpDiff + 1} XP away from beating ${nextContender.full_name} at Rank #${userRank - 1}!` 
                                  : `🔥 Rank #${userRank} • Keep checking in daily to rise in standing!`
                              } else {
                                berdiriText = '⚡ Unranked • Check out from your training sessions to claim your spot in the Arena!'
                              }

                              return (
                                <div className="p-5 rounded-2xl bg-gradient-to-r from-[#863BFF]/10 via-[#b370ff]/5 to-[#863BFF]/10 border border-[#863BFF]/30 shadow-lg text-center animate-in slide-in-from-bottom duration-300">
                                  <p className="text-xs font-black text-white tracking-wide">{berdiriText}</p>
                                </div>
                              )
                            })()}

                            {/* INFO MODAL OVERLAY */}
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
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#863BFF]/5 blur-2xl rounded-full pointer-events-none" />
                                    
                                    <div className="flex justify-between items-start mb-6">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-[#863BFF]/10 border border-[#863BFF]/20 flex items-center justify-center text-[#b370ff]">
                                          <Trophy className="w-5 h-5" />
                                        </div>
                                        <div>
                                          <h3 className="text-sm font-black text-white uppercase tracking-wider">Scoring System</h3>
                                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Anti-Cheat Fair Play</p>
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
                                            <strong className="text-white">⚡ Base check-in:</strong> Gate check-in scan complete karne par instant <span className="text-emerald-400 font-bold">+10 XP</span> credit hote hain.
                                          </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-[#863BFF] mt-1.5 flex-shrink-0" />
                                          <div>
                                            <strong className="text-white">⏱️ Optimal Training Sweet Spot:</strong> Quality training is highly rewarded!
                                            <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
                                              <li>Workout 45 - 75 mins: <span className="text-emerald-400 font-bold">+15 XP Golden Zone Bonus</span>.</li>
                                              <li>Workout 30 - 45 mins / 75 - 90 mins: <span className="text-emerald-400 font-bold">+10 XP</span>.</li>
                                              <li>Workout under 30 mins: <span className="text-emerald-400 font-bold">+5 XP</span>.</li>
                                            </ul>
                                          </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                                          <div>
                                            <strong className="text-white">⏰ Temporal Clockwork Bonus:</strong> Continuous 3 din tak regular same-hour time window (discipline schedule) par check-in karne par <span className="text-yellow-400 font-bold">+10 XP</span> milega.
                                          </div>
                                        </div>

                                        <div className="flex items-start gap-3">
                                          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                                          <div>
                                            <strong className="text-white">🔥 Streak Multipliers:</strong> Gym continuous aane par aapki total base XP multiplier badh jayegi:
                                            <ul className="mt-1.5 space-y-1 text-[10px] text-slate-400 pl-3 list-disc">
                                              <li>3+ Day Streak: <span className="text-orange-400 font-bold">1.2x XP</span>.</li>
                                              <li>7+ Day Streak: <span className="text-orange-400 font-bold">1.5x XP</span>.</li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="p-3.5 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-[10px] text-rose-400 leading-normal flex items-start gap-2.5 font-medium">
                                        <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 text-rose-400 mt-0.5" />
                                        <div>
                                          <span className="font-bold text-rose-300">Important Anti-Ghosting Rule:</span> Agar aap gym chodte waqt <span className="font-black text-rose-300">CHECK-OUT scan</span> karna bhool jate hain, toh us training session ka **0 XP** milega (Lekin aapki <span className="font-bold text-emerald-400">Workout Streak safe rahegi!</span>). Always scan when leaving the gym.
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                </motion.div>
                              )}

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
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#863BFF]/5 blur-2xl rounded-full pointer-events-none" />
                                    
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
                                          No completed seasons archived yet. Play hard to claim a spot in the archives!
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
                          </>
                        );
                      })()}
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
                          <p className="text-2xl font-black text-white">{prValues['Bench Press'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
                        </div>

                        {/* Squat Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.05] via-transparent to-amber-600/[0.05] border border-amber-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-amber-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Squat Max</p>
                          <p className="text-2xl font-black text-white">{prValues['Squat'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
                        </div>

                        {/* Deadlift Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-amber-500/[0.05] via-transparent to-amber-600/[0.05] border border-amber-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-amber-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-amber-500 tracking-widest">Deadlift Max</p>
                          <p className="text-2xl font-black text-white">{prValues['Deadlift'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
                          <span className="text-[8px] text-slate-500 font-bold uppercase">PR Lift 🔥</span>
                        </div>

                        {/* Body Weight Card */}
                        <div className="backdrop-blur-md bg-gradient-to-tr from-emerald-500/[0.05] via-transparent to-emerald-600/[0.05] border border-emerald-500/20 p-5 rounded-[2rem] text-center space-y-2 relative group overflow-hidden shadow-xl hover:scale-[1.02] hover:border-emerald-500/40 transition-all duration-300">
                          <p className="text-[8px] font-black uppercase text-emerald-400 tracking-widest">Body Weight</p>
                          <p className="text-2xl font-black text-white">{prValues['Body Weight'] || '—'} <span className="text-xs text-slate-500 font-bold">kg</span></p>
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

                      {/* Mobile Quick-Access to Lifts PR */}
                      <div 
                        onClick={() => setActiveTab('progress')}
                        className="md:hidden p-4.5 rounded-[2rem] bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-amber-600/10 border border-amber-500/20 flex items-center justify-between cursor-pointer active:scale-98 transition-all duration-300 shadow-md hover:scale-[1.01] mb-2"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                            <Sparkles className="w-4.5 h-4.5 fill-amber-400/25 animate-pulse" />
                          </div>
                          <div className="text-left">
                            <span className="text-[8px] font-black uppercase text-amber-400 tracking-widest leading-none">Athlete Logs</span>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wide mt-0.5">Track Lifts & PR Progress</h4>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-amber-400" />
                      </div>

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
                            {/* Photo Selection Widget */}
                            <div className="flex flex-col items-center gap-4 p-5 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#863BFF]/5 to-transparent blur-xl rounded-full pointer-events-none" />
                              
                              <div className="relative group w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center bg-gradient-to-tr from-[#1E293B] to-[#0F172A] shadow-2xl overflow-hidden hover:border-[#863BFF]/40 transition-all duration-300">
                                {profileAvatar ? (
                                  <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <User className="w-8 h-8 text-slate-600" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Camera className="w-5 h-5 text-white" />
                                </div>
                              </div>

                              <div className="text-center space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Profile Photo</span>
                                {profileAvatar && (
                                  <p className="text-[9px] font-black text-[#10B981] uppercase tracking-wider">
                                    {profileAvatar.startsWith('data:') ? `Compressed: ${getBase64SizeKB(profileAvatar) || '—'} KB` : 'Google Linked 🌐'}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap justify-center pt-1.5">
                                <input
                                  type="file"
                                  accept="image/*"
                                  id="dashboard-avatar-upload"
                                  onChange={handleFileChange}
                                  className="hidden"
                                  disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                                />
                                <label
                                  htmlFor="dashboard-avatar-upload"
                                  className={`px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md ${avatarCooldownTimeLeft > 0 ? 'opacity-50 pointer-events-none' : ''}`}
                                >
                                  <Upload className="w-3.5 h-3.5 text-[#b370ff]" />
                                  Upload Photo
                                </label>

                                <button
                                  type="button"
                                  onClick={startCamera}
                                  disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                                  className="px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                                  Take Photo
                                </button>

                                <button
                                  type="button"
                                  onClick={fetchGoogleAvatar}
                                  disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                                  className="px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-[#863BFF]/20 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                  Google Sync
                                </button>

                                {profileAvatar && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setProfileAvatar('');
                                      setAvatarSize(null);
                                    }}
                                    disabled={avatarCooldownTimeLeft > 0 || savingProfile}
                                    className="px-3 py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              
                              {/* Photo Quota display */}
                              {avatarCooldownTimeLeft > 0 ? (
                                <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 justify-center mt-1">
                                  <Lock className="w-3 h-3" />
                                  <span>Photo Changes Locked ({avatarCooldownTimeLeft} days left)</span>
                                </div>
                              ) : (
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider text-center mt-1">
                                  Photo Quota: <span className="text-emerald-400 font-black">{avatarChangeCount}/3 changes used</span> (in 3 months)
                                </div>
                              )}
                            </div>
                            
                            {/* Name Quota & Cooldown display status */}
                            {cooldownTimeLeft > 0 ? (
                              <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5" />
                                <span>Name/Phone Changes Locked ({cooldownTimeLeft} days left)</span>
                              </div>
                            ) : (
                              <div className="px-4 py-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-slate-400 text-[9px] font-bold uppercase tracking-wider flex justify-between items-center">
                                <span>Name/Phone Changes Quota</span>
                                <span className="text-emerald-400 font-black">{nameChangeCount}/3 changes used (in 3 months)</span>
                              </div>
                            )}

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
                                  disabled={cooldownTimeLeft > 0 || savingProfile}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/20 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="Display name"
                                />
                              </div>
                            </div>

                            {/* Phone field */}
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Mobile Number</label>
                              <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#863BFF] transition-colors" />
                                <input 
                                  type="text" 
                                  value={profilePhone}
                                  onChange={(e) => setProfilePhone(e.target.value)}
                                  disabled={cooldownTimeLeft > 0 || savingProfile}
                                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:bg-white/[0.04] focus:border-[#863BFF]/50 focus:ring-1 focus:ring-[#863BFF]/20 transition-all shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                  placeholder="Add phone number"
                                />
                              </div>
                            </div>

                            {/* Gender preference preference */}
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
                              disabled={cooldownTimeLeft > 0 || savingProfile}
                              className="w-full py-3.5 bg-white hover:bg-slate-100 text-black text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
                            >
                              {savingProfile ? (
                                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                              ) : cooldownTimeLeft > 0 ? (
                                <>
                                  <Lock className="w-3.5 h-3.5" />
                                  Changes Locked
                                </>
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

          {/* BUTTON 4: LEADERBOARD / ARENA */}
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`relative flex-1 flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all cursor-pointer z-10 ${
              activeTab === 'leaderboard' 
              ? 'text-yellow-400 font-black' 
              : 'text-slate-500 hover:text-slate-300 font-semibold'
            }`}
          >
            {activeTab === 'leaderboard' && (
              <motion.div 
                layoutId="activeTabPill"
                className="absolute inset-0 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl -z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Trophy className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[8px] uppercase tracking-wider leading-none">Arena</span>
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
            Powered by Gymix
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
              className="max-w-md w-full flex flex-col items-center space-y-5"
            >
              {/* THE SHARABLE CARD (DYNAMIZED WITH LIVE THEME SELECTION) */}
              <div 
                id="share-pr-card"
                className={`w-full max-w-[310px] sm:max-w-[330px] aspect-[9/16] rounded-[2.2rem] bg-gradient-to-br ${getThemeStyles(shareTheme).bg} border-2 ${getThemeStyles(shareTheme).border} p-5.5 flex flex-col justify-between relative overflow-hidden shadow-2xl ${getThemeStyles(shareTheme).shadow} transition-all duration-500 select-none`}
              >
                {/* Visual design glow backdrops */}
                <div className={`absolute top-[-10%] left-[-20%] w-60 h-60 ${getThemeStyles(shareTheme).glow1} blur-[80px] rounded-full pointer-events-none transition-all duration-500`} />
                <div className={`absolute bottom-[-10%] right-[-20%] w-60 h-60 ${getThemeStyles(shareTheme).glow2} blur-[80px] rounded-full pointer-events-none transition-all duration-500`} />
                
                {/* CARD HEADER */}
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-2">
                    <Logo className="w-6.5 h-6.5 drop-shadow-[0_0_8px_rgba(134,59,255,0.4)]" />
                    <span className="text-[9px] font-black uppercase text-white tracking-[0.2em] italic">Gymix</span>
                  </div>
                  
                  {/* Verified Badge */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[7px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)] animate-pulse">
                    <Check className="w-2.5 h-2.5" />
                    <span>Gymix Verified</span>
                  </div>
                </div>

                {/* CARD BODY (CENTER DETAILS) */}
                <div className="my-auto text-center space-y-5 relative z-10 pt-4">
                  <span className="px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[8px] font-black uppercase tracking-[0.25em] text-slate-400">
                    {activeShareLog.log_type === 'PR' ? '💪 New Personal Record' : '⚖️ Body Weight Log'}
                  </span>
                  
                  <div className="space-y-2">
                    <h2 className={`text-xs font-black uppercase tracking-widest transition-colors duration-500 ${getThemeStyles(shareTheme).titleColor} drop-shadow-[0_0_10px_rgba(255,255,255,0.05)]`}>
                      {activeShareLog.exercise_name}
                    </h2>
                    <div className="flex items-baseline justify-center gap-1.5">
                      <h1 className={`text-5xl font-black italic tracking-tighter transition-all duration-500 ${getThemeStyles(shareTheme).statColor} drop-shadow-[0_0_20px_rgba(255,255,255,0.08)]`}>
                        {activeShareLog.value}
                      </h1>
                      <span className="text-xl font-black italic text-slate-500 uppercase tracking-wide">kg</span>
                    </div>
                  </div>

                  {activeShareLog.notes && (
                    <p className="text-[11px] font-semibold text-slate-300 italic max-w-[220px] mx-auto leading-relaxed px-4 py-1.5 rounded-xl bg-white/[0.01] border border-white/5">
                      “{activeShareLog.notes}”
                    </p>
                  )}
                </div>

                {/* CARD FOOTER */}
                <div className="pt-4 border-t border-dashed border-white/10 relative z-10 flex flex-col gap-2.5 bg-black/20 p-3.5 rounded-2xl">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Athlete</span>
                    <span className="text-white font-black truncate max-w-[120px]">{profile?.full_name || 'Athlete'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Consistency Streak</span>
                    <span className="text-orange-400 font-black flex items-center gap-1">
                      <span>{streakCount} Days Active</span>
                      <span>🔥</span>
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Training Hub</span>
                    <span className={`font-black uppercase italic truncate max-w-[120px] transition-colors duration-500 ${getThemeStyles(shareTheme).gymColor}`}>
                      {membership?.gyms?.gym_name || 'My Gym'}
                    </span>
                  </div>
                </div>
              </div>

              {/* DYNAMIC INSTAGRAM THEME SWAP BUTTONS */}
              <div className="w-full text-center space-y-2">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Select Story Poster Color Theme</span>
                <div className="flex gap-2 justify-center">
                  <button 
                    onClick={() => setShareTheme('cyber')}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer hover:scale-102 ${shareTheme === 'cyber' ? 'bg-[#863BFF]/20 border-[#863BFF] text-white shadow-[0_0_12px_rgba(134,59,255,0.25)]' : 'bg-white/5 border-white/5 text-slate-400'}`}
                  >
                    🌌 Cyber Glow
                  </button>
                  <button 
                    onClick={() => setShareTheme('volcano')}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer hover:scale-102 ${shareTheme === 'volcano' ? 'bg-rose-500/20 border-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.25)]' : 'bg-white/5 border-white/5 text-slate-400'}`}
                  >
                    🌋 Volcano Fire
                  </button>
                  <button 
                    onClick={() => setShareTheme('emerald')}
                    className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border cursor-pointer hover:scale-102 ${shareTheme === 'emerald' ? 'bg-emerald-500/20 border-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.25)]' : 'bg-white/5 border-white/5 text-slate-400'}`}
                  >
                    🌲 Forest Power
                  </button>
                </div>
              </div>

              {/* ACTION BUTTONS (DOWNLOAD/SHARE PNG POSTER) */}
              <div className="w-full space-y-2.5 text-center">
                <div className="flex flex-wrap gap-2.5 justify-center">
                  <button 
                    onClick={handleNativeShare}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-xl shadow-emerald-500/10 animate-in slide-in-from-bottom duration-300"
                  >
                    <Send className="w-4 h-4" />
                    Share Story
                  </button>

                  <button 
                    onClick={handleDownloadImage}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-xl shadow-amber-500/10 animate-in slide-in-from-bottom duration-300"
                  >
                    <Sparkles className="w-4 h-4 fill-black/25" />
                    Download PNG
                  </button>
                  
                  <button 
                    onClick={() => {
                      const shareText = `💪 Verified Lift: I just smashed a new ${activeShareLog.exercise_name} PR of ${activeShareLog.value} kg at ${membership?.gyms?.gym_name || 'My Gym'} on Gymix! Consistency Streak: ${streakCount} Days! 🔥 #Gymix #FitnessGoal`;
                      navigator.clipboard.writeText(shareText);
                      alert('Share text copied! Feel free to paste it into your caption or post.');
                    }}
                    className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-lg animate-in slide-in-from-bottom duration-300"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Caption
                  </button>

                  <button 
                    onClick={() => {
                      setShareModalOpen(false);
                      setActiveShareLog(null);
                    }}
                    className="px-4 py-3 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400 text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-95 shadow-lg animate-in slide-in-from-bottom duration-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE SIDE NAVIGATION DRAWER */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop blur overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 backdrop-blur-sm bg-black/60 z-40 md:hidden"
            />
            
            {/* Drawer panel content */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 bottom-0 left-0 w-[290px] bg-[#0c0e14]/95 border-r border-white/10 backdrop-blur-3xl p-6 flex flex-col justify-between z-50 md:hidden shadow-2xl"
            >
              <div className="space-y-7">
                {/* Brand & Close button header */}
                <div className="flex items-center justify-between pb-5 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <Logo className="w-8 h-8 drop-shadow-[0_0_10px_rgba(134,59,255,0.4)]" />
                    <div className="space-y-0.5">
                      <h1 className="text-sm font-black text-white uppercase tracking-wider italic">Gymix</h1>
                      <p className="text-[9px] font-bold text-[#b370ff] uppercase tracking-widest leading-none">Drawer</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Profile Identity Widget */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center gap-3.5 shadow-inner">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#863BFF] to-[#b370ff] flex items-center justify-center font-black text-white text-xs shadow-md overflow-hidden border border-white/10">
                    {(membership?.avatar_url || profile?.avatar_url) ? (
                      <img src={membership.avatar_url || profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      profile?.full_name?.charAt(0).toUpperCase() || 'M'
                    )}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <h4 className="text-xs font-black text-white truncate">Yo, {profile?.full_name?.split(' ')[0] || 'Athlete'}!</h4>
                    <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest leading-none truncate">
                      {membership ? membership.gyms?.gym_name : 'No Connected Gym'}
                    </p>
                  </div>
                </div>

                {/* Navigation Links inside Drawer */}
                <nav className="flex flex-col gap-1.5">
                  {[
                    { id: 'pass', label: 'Access Pass Key', icon: QrCode },
                    { id: 'notifications', label: 'Alerts & Inbox', icon: Bell, color: 'text-sky-400', badge: notifications.filter(n => !n.is_read).length > 0 ? notifications.filter(n => !n.is_read).length : null },
                    { id: 'progress', label: 'PR & Progress', icon: Sparkles, color: 'text-amber-400' },
                    { id: 'attendance', label: 'Attendance logs', icon: Calendar },
                    { id: 'leaderboard', label: 'Gym Leaderboard', icon: Trophy, color: 'text-yellow-400' },
                    { id: 'streaks', label: 'Workout Streaks', icon: Flame, badge: `${streakCount} Days`, color: 'text-orange-400' },
                    { id: 'profile', label: 'Profile settings', icon: User }
                  ].map((item) => {
                    const Icon = item.icon
                    const isActive = activeTab === item.id
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id)
                          setMobileMenuOpen(false)
                        }}
                        className={`relative flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer text-left w-full z-10 ${
                          isActive ? 'text-white font-black' : 'text-slate-500 hover:text-slate-300 font-semibold'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="activeTabPillMobileDrawer"
                            className={`absolute inset-0 rounded-xl -z-10 border ${
                              item.id === 'streaks'
                              ? 'bg-orange-500/10 border-orange-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                              : item.id === 'progress'
                              ? 'bg-amber-500/10 border-amber-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                              : item.id === 'leaderboard'
                              ? 'bg-yellow-500/10 border-yellow-500/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                              : 'bg-[#863BFF]/10 border-[#863BFF]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
                            }`}
                            transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          />
                        )}
                        <div className="flex items-center gap-3">
                          <Icon className={`w-4.5 h-4.5 ${isActive ? (item.color || 'text-[#b370ff]') : 'text-slate-500'}`} />
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

              {/* Mobile Drawer Logout */}
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  signOut()
                }}
                className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-2xl bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 text-rose-400 text-xs font-black uppercase tracking-widest transition-all cursor-pointer active:scale-98 shadow-sm"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── WEBCAM SNAPSHOT MODAL OVERLAY ── */}
      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-[#0F111A]/95 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-2xl flex flex-col items-center gap-6"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
              
              <div className="w-full flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Webcam Capture</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Snap a display picture</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={stopCamera}
                  className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewfinder camera view */}
              <div className="w-64 h-64 rounded-full border-4 border-emerald-500/40 relative overflow-hidden shadow-2xl bg-black flex items-center justify-center">
                <video
                  id="member-webcam"
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                
                {/* Neon Target circular crop guide */}
                <div className="absolute inset-4 rounded-full border border-dashed border-emerald-500/50 pointer-events-none flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border border-emerald-500/20" />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-4 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-300 text-xs font-black uppercase tracking-wider rounded-2xl transition-all active:scale-95 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={captureSnapshot}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-emerald-500/25 active:scale-95 cursor-pointer"
                >
                  Snap Photo
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
