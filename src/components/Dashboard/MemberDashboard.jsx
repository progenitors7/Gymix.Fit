import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BellRing } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabaseClient'
import { connectionService } from '../../services/connectionService'
import Logo from '../UI/Logo'
import { toast } from 'react-hot-toast'
import { pushNotificationService } from '../../services/pushNotificationService'

// Modular Member Portal Subcomponents
import MemberSidebar from '../MemberPortal/MemberSidebar'
import MemberMobileHeader from '../MemberPortal/MemberMobileHeader'
import MemberBottomNav from '../MemberPortal/MemberBottomNav'
import MemberConnectionPanel from '../MemberPortal/MemberConnectionPanel'
import MemberPassTab from '../MemberPortal/MemberPassTab'
import MemberNotificationsTab from '../MemberPortal/MemberNotificationsTab'
import MemberAttendanceTab from '../MemberPortal/MemberAttendanceTab'
import MemberStreaksTab from '../MemberPortal/MemberStreaksTab'
import MemberLeaderboardTab from '../MemberPortal/MemberLeaderboardTab'
import MemberProgressTab from '../MemberPortal/MemberProgressTab'
import { MemberProfileTab, MemberOnboarding } from '../MemberPortal/MemberProfileTab'
import MemberStoreTab from '../MemberPortal/MemberStoreTab'

export default function MemberDashboard() {
  const { profile, signOut, refreshProfile } = useAuth()
  
  // Navigation & View tab: 'pass' | 'notifications' | 'attendance' | 'streaks' | 'leaderboard' | 'progress' | 'profile'
  const [activeTab, setActiveTab] = useState('pass')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showNotificationBanner, setShowNotificationBanner] = useState(false)
  const [showPwaBanner, setShowPwaBanner] = useState(false)

  useEffect(() => {
    const isDismissed = localStorage.getItem('gymix_pwa_banner_dismissed') === 'true'
    const isPlaystoreApp = localStorage.getItem('is_playstore_app') === 'true' || window.Capacitor !== undefined
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    
    if (!isDismissed && !isPlaystoreApp && isMobile) {
      setShowPwaBanner(true)
    }
  }, [])

  useEffect(() => {
    const checkNotificationPermission = async () => {
      if (localStorage.getItem('gymix_dismiss_push_banner') === 'true') return
      const status = await pushNotificationService.checkPermissionStatus()
      if (status === 'prompt' || status === 'denied' || status === 'default') {
        setShowNotificationBanner(true)
      }
    }
    const timer = setTimeout(checkNotificationPermission, 1500)
    return () => clearTimeout(timer)
  }, [])

  const handleEnableNotifications = async () => {
    try {
      const status = await pushNotificationService.checkPermissionStatus()
      if (status === 'denied') {
        toast.error(
          "Notifications are blocked in settings. Please enable them in Settings > Apps > Gymix > Notifications.",
          { duration: 6000 }
        )
      } else {
        await pushNotificationService.initialize(
          profile?.id,
          (notification) => {
            const title = notification.title || 'Gymix'
            const body = notification.body || ''
            toast(body ? `${title}: ${body}` : title, {
              icon: '🔔',
              duration: 5000,
            })
          }
        )
        setTimeout(async () => {
          const newStatus = await pushNotificationService.checkPermissionStatus()
          if (newStatus === 'granted') {
            toast.success("Notifications enabled successfully!")
            setShowNotificationBanner(false)
          }
        }, 1200)
      }
    } catch (err) {
      console.error('[Push] Error requesting notifications:', err)
    }
  }

  const handleDismissNotificationBanner = () => {
    localStorage.setItem('gymix_dismiss_push_banner', 'true')
    setShowNotificationBanner(false)
  }

  const renderNotificationBanner = () => {
    if (!showNotificationBanner) return null
    return (
      <div className="mb-6 rounded-[2rem] border border-[#3390ec]/20 bg-[#3390ec]/10 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#3390ec]/10 border border-[#3390ec]/20 flex items-center justify-center text-[#3390ec]">
            <BellRing className="w-5 h-5 animate-pulse" />
          </div>
          <div className="text-left">
            <p className="text-blue-200 text-xs font-bold">Stay Updated with Real-Time Alerts</p>
            <p className="text-slate-400 text-[11px] font-medium mt-0.5">
              Enable notifications to get plan expiry reminders and fitness rewards instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleEnableNotifications}
            className="px-4 py-2.5 rounded-xl bg-[#3390ec] hover:bg-[#3390ec]/90 text-white text-[10px] font-black uppercase tracking-widest text-center shadow-lg shadow-[#3390ec]/10 transition-all active:scale-95 whitespace-nowrap cursor-pointer"
          >
            Enable Alerts
          </button>
          <button
            onClick={handleDismissNotificationBanner}
            className="px-3 py-2.5 rounded-xl border border-white/10 hover:bg-white/[0.05] text-[#94A3B8] hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    )
  }

  const getMobileOS = () => {
    const userAgent = navigator.userAgent || window.opera
    if (/android/i.test(userAgent)) {
      return 'android'
    }
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      return 'ios'
    }
    return 'unknown'
  }

  const renderPwaBanner = () => {
    if (!showPwaBanner) return null
    const os = getMobileOS()

    if (os === 'android') {
      return (
        <div className="mb-6 bg-gradient-to-r from-indigo-600/30 to-blue-500/10 border border-blue-500/20 rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="space-y-1 text-center sm:text-left z-10">
            <h4 className="text-sm font-black text-white uppercase italic tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
              <span>Official Android App is Live! 🚀</span>
            </h4>
            <p className="text-[#94A3B8] text-xs font-semibold max-w-lg">
              Download the official Gymix app from Play Store for faster QR entry scanning, smoother performance, and instant notifications!
            </p>
          </div>
          <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
            <a 
              href="https://play.google.com/store/apps/details?id=com.gymix.fit"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none text-center px-5 py-3 bg-[#3B82F6] hover:bg-[#287cd0] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-[#3B82F6]/10"
            >
              Download App
            </a>
            <button 
              onClick={() => {
                localStorage.setItem('gymix_pwa_banner_dismissed', 'true')
                setShowPwaBanner(false)
              }}
              className="px-4 py-3 bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all border border-white/5 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )
    }

    if (os === 'ios') {
      return (
        <div className="mb-6 bg-gradient-to-r from-purple-600/30 to-pink-500/10 border border-purple-500/20 rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden animate-in slide-in-from-top duration-300">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[30px] rounded-full pointer-events-none" />
          <div className="space-y-1 text-center sm:text-left z-10">
            <h4 className="text-sm font-black text-white uppercase italic tracking-tight flex items-center justify-center sm:justify-start gap-1.5">
              <span>Install Gymix on your iPhone! 📲</span>
            </h4>
            <p className="text-[#94A3B8] text-xs font-semibold max-w-lg">
              For full-screen workspace, faster loading, and alerts: tap the <strong className="text-white">Share</strong> icon in Safari and select <strong className="text-white">"Add to Home Screen"</strong>.
            </p>
          </div>
          <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
            <button 
              onClick={() => {
                localStorage.setItem('gymix_pwa_banner_dismissed', 'true')
                setShowPwaBanner(false)
              }}
              className="flex-1 sm:flex-none text-center px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-purple-500/10 cursor-pointer"
            >
              Okay, Got It
            </button>
          </div>
        </div>
      )
    }

    return null
  }

  // Onboarding Profile state
  const [onboardingCompleted, setOnboardingCompleted] = useState(true)
  
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
  const [currentSeason, setCurrentSeason] = useState(1)
  const [seasonEndDate, setSeasonEndDate] = useState(null)
  const [seasonHistory, setSeasonHistory] = useState({})
  const [historyLoading, setHistoryLoading] = useState(false)

  // Notifications states
  const [notifications, setNotifications] = useState([])
  const [notifsLoading, setNotifsLoading] = useState(false)

  // Progress Tracker states
  const [progressLogs, setProgressLogs] = useState([])
  const [progressLoading, setProgressLoading] = useState(false)
  
  // Connection Form states
  const [gymCode, setGymCode] = useState('')
  const [submittingReq, setSubmittingReq] = useState(false)
  const [reqError, setReqError] = useState('')
  const [reqSuccess, setReqSuccess] = useState('')
  const [scannedGym, setScannedGym] = useState(null)
  const [scannedGymLoading, setScannedGymLoading] = useState(false)

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
        .slice(0, 10)
      
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
      setNameChangeCount(dbProfile.name_change_count || 0)
      setLastNameChangeAt(dbProfile.last_name_change_at || null)

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

        // 4. Fetch coin transactions
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
      localStorage.removeItem('scanned_gym_code')
      setScannedGym(null)
      await loadMemberSystem()
    } catch (err) {
      setReqError(err.message || 'Failed to submit request.')
    } finally {
      setSubmittingReq(false)
    }
  }

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
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center">
        <Logo className="w-12 h-12 animate-pulse" />
      </div>
    )
  }

  // FORCE ONBOARDING PROFILE SETUP FIRST
  if (!onboardingCompleted) {
    return (
      <MemberOnboarding
        profile={profile}
        membership={membership}
        loadMemberSystem={loadMemberSystem}
        refreshProfile={refreshProfile}
        signOut={signOut}
      />
    )
  }

  const activeRank = getAthleteRank(streakCount)

  return (
    <div className="h-screen bg-[#0F1117] text-slate-100 font-sans flex flex-col lg:flex-row relative overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:block w-80 flex-shrink-0">
        <MemberSidebar
          profile={profile}
          membership={membership}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notifications={notifications}
          streakCount={streakCount}
          onSignOut={signOut}
        />
      </aside>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[110] lg:hidden flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black"
            />
            {/* Menu container */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="relative w-80 max-w-[85vw] h-full bg-[#151922] z-50 flex flex-col"
            >
              <div 
                style={{ top: 'calc(16px + env(safe-area-inset-top))' }}
                className="absolute right-4 z-50"
              >
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MemberSidebar
                  profile={profile}
                  membership={membership}
                  activeTab={activeTab}
                  setActiveTab={(tab) => {
                    setActiveTab(tab)
                    setMobileMenuOpen(false)
                  }}
                  notifications={notifications}
                  streakCount={streakCount}
                  onSignOut={signOut}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MemberMobileHeader
          profile={profile}
          membership={membership}
          setActiveTab={setActiveTab}
          setMobileMenuOpen={setMobileMenuOpen}
          notifications={notifications}
        />

        <main className="flex-1 p-6 lg:p-8 pb-28 lg:pb-8 max-w-6xl w-full mx-auto overflow-y-auto">
          {renderPwaBanner()}
          {renderNotificationBanner()}
          {!membership ? (
            <MemberConnectionPanel
              gymCode={gymCode}
              setGymCode={setGymCode}
              connectionReq={connectionReq}
              scannedGym={scannedGym}
              scannedGymLoading={scannedGymLoading}
              submittingReq={submittingReq}
              handleConnect={handleConnect}
              handleCancelRequest={handleCancelRequest}
              handleClearScannedGym={handleClearScannedGym}
              loadMemberSystem={loadMemberSystem}
            />
          ) : (
            <AnimatePresence mode="wait">
              {activeTab === 'pass' && (
                <MemberPassTab
                  profile={profile}
                  membership={membership}
                  streakCount={streakCount}
                  activeRank={activeRank}
                  loadMemberSystem={loadMemberSystem}
                />
              )}
              {activeTab === 'notifications' && (
                <MemberNotificationsTab
                  notifications={notifications}
                  notifsLoading={notifsLoading}
                  markMemberNotifAsRead={markMemberNotifAsRead}
                />
              )}
              {activeTab === 'attendance' && (
                <MemberAttendanceTab
                  membership={membership}
                  attendanceLogs={attendanceLogs}
                />
              )}
              {activeTab === 'streaks' && (
                <MemberStreaksTab
                  membership={membership}
                  streakCount={streakCount}
                  attendanceLogs={attendanceLogs}
                  coinTransactions={coinTransactions}
                  coinsLoading={coinsLoading}
                />
              )}
              {activeTab === 'leaderboard' && (
                <MemberLeaderboardTab
                  membership={membership}
                  leaderboard={leaderboard}
                  currentSeason={currentSeason}
                  seasonHistory={seasonHistory}
                  historyLoading={historyLoading}
                  fetchSeasonHistory={fetchSeasonHistory}
                />
              )}
              {activeTab === 'progress' && (
                <MemberProgressTab
                  profile={profile}
                  membership={membership}
                  streakCount={streakCount}
                  progressLogs={progressLogs}
                  progressLoading={progressLoading}
                  fetchProgressLogs={fetchProgressLogs}
                />
              )}
              {activeTab === 'store' && (
                <MemberStoreTab
                  profile={profile}
                  membership={membership}
                  setActiveTab={setActiveTab}
                />
              )}
              {activeTab === 'profile' && (
                <MemberProfileTab
                  profile={profile}
                  membership={membership}
                  loadMemberSystem={loadMemberSystem}
                  refreshProfile={refreshProfile}
                  cooldownTimeLeft={cooldownTimeLeft}
                  avatarCooldownTimeLeft={avatarCooldownTimeLeft}
                  nameChangeCount={nameChangeCount}
                  avatarChangeCount={avatarChangeCount}
                  setActiveTab={setActiveTab}
                />
              )}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MemberBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        streakCount={streakCount}
      />
    </div>
  )
}
