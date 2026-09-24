import { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { ShieldCheck, Zap, ArrowRight, Activity, Users, TrendingUp } from 'lucide-react'
import Logo from '../UI/Logo'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import ForgotPasswordForm from './ForgotPasswordForm'
import AppConnectionBridge from './AppConnectionBridge'
import { supabase } from '../../lib/supabaseClient'
import { isNativeCapacitorApp } from '../../utils/platform'
import { isSuperAdmin } from '../../config/admins'

export default function AuthPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paramGym = searchParams.get('gym')
  const getNormalizedCode = (code) => {
    if (!code) return '';
    return code.toUpperCase().trim()
      .replace(/I/g, '1')
      .replace(/O/g, '0')
      .replace(/L/g, '1');
  };
  const normalizedGymParam = getNormalizedCode(paramGym);
  const isOwnerSignup = location.pathname === '/owner-signup'

  const [mode, setMode] = useState(() => {
    const qMode = searchParams.get('mode')
    if (qMode === 'signup' || qMode === 'forgot-password' || qMode === 'login') return qMode
    if (location.pathname === '/signup' || location.pathname === '/owner-signup') return 'signup'
    if (location.pathname === '/forgot-password') return 'forgot-password'
    return 'login'
  })

  useEffect(() => {
    const qMode = searchParams.get('mode')
    if (qMode === 'signup' || location.pathname === '/signup' || location.pathname === '/owner-signup') {
      setMode('signup')
    } else if (qMode === 'forgot-password' || location.pathname === '/forgot-password') {
      setMode('forgot-password')
    } else if (qMode === 'login' || location.pathname === '/login') {
      setMode('login')
    }
  }, [location.pathname, searchParams])

  const handleSwitchMode = (targetMode) => {
    setMode(targetMode)
    const currentSearch = location.search || ''
    if (targetMode === 'signup') {
      navigate(`/signup${currentSearch}`)
    } else if (targetMode === 'owner-signup') {
      navigate(`/owner-signup${currentSearch}`)
    } else if (targetMode === 'forgot-password') {
      navigate(`/forgot-password${currentSearch}`)
    } else {
      navigate(`/login${currentSearch}`)
    }
  }

  const [platformStats, setPlatformStats] = useState({
    gymsCount: '1.2K+',
    revenueText: '₹48Cr+',
    membersCount: '2.4L+'
  })

  const [bypassBridge, setBypassBridge] = useState(false)
  const [gymName, setGymName] = useState('')
  const [showBridge, setShowBridge] = useState(false)

  // Detect mobile browser scan connection bridge
  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isNative = isNativeCapacitorApp()
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

    if (isMobile && !isNative && !isStandalone && normalizedGymParam && (location.pathname === '/signup' || mode === 'signup') && !bypassBridge) {
      setShowBridge(true)
      // Fetch gym name to display on the bridge
      supabase
        .from('gyms')
        .select('gym_name')
        .eq('unique_code', normalizedGymParam)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setGymName(data.gym_name)
        })
    } else {
      setShowBridge(false)
    }
  }, [normalizedGymParam, location.pathname, mode, bypassBridge])

  // Fetch real platform stats from the database dynamically
  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase.rpc('get_public_platform_stats')
        if (!error && data && data.length > 0) {
          const stats = data[0]
          
          const rawGyms = Number(stats.total_gyms) || 0
          const rawMembers = Number(stats.total_members) || 0
          const rawRevenue = Number(stats.total_revenue) || 0
          
          const formatGyms = (val) => {
            if (val > 1000) return `${(val / 1000).toFixed(1)}K+`
            return `${val}+`
          }
          
          const formatMembers = (val) => {
            if (val > 100000) return `${(val / 100000).toFixed(1)}L+`
            if (val > 1000) return `${(val / 1000).toFixed(1)}K+`
            return `${val}+`
          }
          
          const formatRevenue = (val) => {
            if (val > 10000000) return `₹${(val / 10000000).toFixed(1)}Cr+`
            if (val > 100000) return `₹${(val / 100000).toFixed(1)}L+`
            if (val > 1000) return `₹${(val / 1000).toFixed(1)}K+`
            return `₹${val}+`
          }

          setPlatformStats({
            gymsCount: formatGyms(rawGyms),
            membersCount: formatMembers(rawMembers),
            revenueText: formatRevenue(rawRevenue)
          })
        }
      } catch (err) {
        console.error('Error fetching platform stats:', err)
      }
    }
    fetchStats()
  }, [])

  // Capture scanned gym code from URL parameter securely
  useEffect(() => {
    if (normalizedGymParam) {
      localStorage.setItem('scanned_gym_code', normalizedGymParam)
    }
  }, [normalizedGymParam])

  if (!loading && user) {
    if (isSuperAdmin(user.email)) {
      return <Navigate to="/super-admin" replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090A10] flex items-center justify-center transition-colors">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo-transparent.png" alt="Gymix" className="w-12 h-12 object-contain animate-pulse" />
          <div className="w-6 h-6 border-2 border-violet-500/20 border-t-violet-600 dark:border-t-violet-400 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#090A10] flex selection:bg-violet-500/30 selection:text-white relative">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden group">
        {/* Background Image with Parallax-like effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110 opacity-70"
          style={{ backgroundImage: `url('/gym_login_bg_1778764200762.png')` }}
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#090A10] via-[#090A10]/85 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090A10] via-transparent to-transparent z-10" />
        
        <div className="relative z-20 flex flex-col justify-between p-16 h-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <Logo className="w-12 h-12 drop-shadow-[0_0_15px_rgba(124,58,237,0.4)]" />
            </div>
            <span className="font-black text-white text-2xl tracking-tighter italic uppercase">Gym<span className="text-[#7C3AED]">ix</span></span>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-violet-400 font-bold text-[11px] uppercase tracking-[0.25em] mb-4 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-violet-400" />
                Your Gym Management Partner
              </p>
              <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.95] tracking-tighter uppercase italic">
                GROW YOUR <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-500">GYM.</span><br />
                FASTER.
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-400 text-lg leading-relaxed max-w-md font-medium"
            >
              The all-in-one software to manage your gym members, payments, and growth. Built simple, optimized for results.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-3"
            >
              {[
                { icon: TrendingUp, text: 'Sales & Growth' },
                { icon: Users, text: 'Member Records' },
                { icon: ShieldCheck, text: 'Secure Data' }
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10 text-[10px] font-bold uppercase tracking-wider text-zinc-300 backdrop-blur-md">
                  <f.icon className="w-3.5 h-3.5 text-violet-400" />
                  {f.text}
                </div>
              ))}
            </motion.div>
          </div>

          {/* Glass Stats Row */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid grid-cols-3 gap-8 p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 backdrop-blur-sm"
          >
            {[
              { label: 'Gym Owners', value: platformStats.gymsCount, color: 'text-violet-400' },
              { label: 'Revenue', value: platformStats.revenueText, color: 'text-white' },
              { label: 'Members', value: platformStats.membersCount, color: 'text-violet-400' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className={`text-2xl font-black tracking-tight ${stat.color}`}>{stat.value}</p>
                <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider leading-none">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right auth panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative overflow-y-auto overflow-x-hidden min-h-screen lg:h-screen w-full">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/10 blur-[130px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="w-full max-w-[420px] space-y-6 relative z-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 flex items-center justify-center mx-auto lg:hidden"
          >
            <Logo className="w-16 h-16 drop-shadow-[0_0_12px_rgba(124,58,237,0.5)]" />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${location.pathname}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ transition: 'none' }}
              className={`rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden bg-[#11131E]/95 backdrop-blur-2xl border border-zinc-800/80 shadow-black/60 ${
                isOwnerSignup
                  ? 'ring-1 ring-violet-500/30 border-violet-500/40 shadow-violet-500/10'
                  : ''
              }`}
            >
              {isOwnerSignup ? (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500" />
              ) : (
                <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />
              )}
              {/* Header inside the dark card with crisp visible text */}
              {!showBridge && mode !== 'signup' && (
                <div className="text-center space-y-2 mb-8">
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase italic leading-none">
                    {mode === 'login' ? 'Welcome Back' : 'Forgot Password'}
                  </h2>
                  <p className="text-zinc-400 text-xs sm:text-sm font-medium leading-relaxed">
                    {mode === 'login' 
                      ? 'Sign in to manage your gym dashboard.' 
                      : 'We will help you get back into your account.'}
                  </p>
                </div>
              )}

              {/* Dynamic Tabs */}
              {mode !== 'forgot-password' && !showBridge && !isOwnerSignup && (
                <div className="flex rounded-2xl bg-zinc-950/80 p-1.5 border border-zinc-800/80 mb-8">
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('login')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchMode('signup')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {mode === 'login' ? (
                <LoginForm 
                  onSwitch={() => handleSwitchMode('signup')} 
                  onForgotPassword={() => handleSwitchMode('forgot-password')} 
                />
              ) : mode === 'signup' ? (
                showBridge ? (
                  <AppConnectionBridge 
                    gymCode={normalizedGymParam} 
                    gymName={gymName} 
                    onContinueWeb={() => setBypassBridge(true)} 
                  />
                ) : (
                  <SignupForm 
                    onSwitch={() => handleSwitchMode('login')} 
                    forcedRole={isOwnerSignup ? 'owner' : undefined} 
                  />
                )
              ) : (
                <ForgotPasswordForm 
                  onSwitch={(newMode) => handleSwitchMode(newMode || 'login')} 
                />
              )}
            </motion.div>
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-center space-y-4"
          >
            <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.3em]">
              © 2026 GYMIX
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
