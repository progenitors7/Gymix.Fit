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

export default function AuthPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const paramGym = searchParams.get('gym')
  const isOwnerSignup = location.pathname === '/owner-signup'

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
    const isNative = window.Capacitor !== undefined
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

    if (isMobile && !isNative && !isStandalone && paramGym && location.pathname === '/signup' && !bypassBridge) {
      setShowBridge(true)
      // Fetch gym name to display on the bridge
      supabase
        .from('gyms')
        .select('gym_name')
        .eq('unique_code', paramGym.trim().toUpperCase())
        .maybeSingle()
        .then(({ data }) => {
          if (data) setGymName(data.gym_name)
        })
    } else {
      setShowBridge(false)
    }
  }, [paramGym, location.pathname, bypassBridge])

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
    if (paramGym) {
      localStorage.setItem('scanned_gym_code', paramGym.trim().toUpperCase())
    }
  }, [paramGym])

  const [mode, setMode] = useState(() => {
    if (location.pathname === '/signup' || location.pathname === '/owner-signup') return 'signup'
    if (location.pathname === '/forgot-password') return 'forgot-password'
    return 'login'
  })

  useEffect(() => {
    if (location.pathname === '/signup' || location.pathname === '/owner-signup') {
      setMode('signup')
    } else if (location.pathname === '/login') {
      setMode('login')
    } else if (location.pathname === '/forgot-password') {
      setMode('forgot-password')
    }
  }, [location.pathname])

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F1117]">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#0F1117] flex selection:bg-emerald-500/30 relative">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden group">
        {/* Background Image with Parallax-like effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear group-hover:scale-110"
          style={{ backgroundImage: `url('/gym_login_bg_1778764200762.png')` }}
        />
        
        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F1117] via-[#0F1117]/80 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent z-10" />
        
        <div className="relative z-20 flex flex-col justify-between p-16 h-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4"
          >
            <div className="w-12 h-12 flex items-center justify-center">
              <Logo className="w-12 h-12 drop-shadow-[0_0_15px_rgba(134,59,255,0.3)]" />
            </div>
            <span className="font-black text-white text-2xl tracking-tighter italic uppercase">Gym<span className="text-[#863BFF]">ix</span></span>
          </motion.div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Activity className="w-3 h-3" />
                Your Gym Management Partner
              </p>
              <h1 className="text-6xl xl:text-7xl font-black text-white leading-[0.95] tracking-tighter uppercase italic">
                GROW YOUR <br />
                <span className="text-transparent border-t-emerald-500 bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">GYM.</span><br />
                FASTER.
              </h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 text-lg leading-relaxed max-w-md font-medium"
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
                <div key={f.text} className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300 backdrop-blur-md">
                  <f.icon className="w-3 h-3 text-emerald-400" />
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
            className="grid grid-cols-3 gap-8 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm"
          >
            {[
              { label: 'Gym Owners', value: platformStats.gymsCount, color: 'text-emerald-400' },
              { label: 'Revenue', value: platformStats.revenueText, color: 'text-white' },
              { label: 'Members', value: platformStats.membersCount, color: 'text-emerald-400' },
            ].map((stat) => (
              <div key={stat.label} className="space-y-1">
                <p className={`text-2xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest leading-none">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ── Right auth panel ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative overflow-y-auto overflow-x-hidden min-h-screen lg:h-screen w-full">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="w-full max-w-[420px] space-y-6 relative z-10">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-16 h-16 flex items-center justify-center mx-auto lg:hidden"
          >
            <Logo className="w-16 h-16 drop-shadow-[0_0_8px_rgba(134,59,255,0.5)]" />
          </motion.div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`${mode}-${location.pathname}`}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              style={{ transition: 'none' }}
              className={`glass-card rounded-[2.5rem] p-8 sm:p-10 shadow-2xl relative overflow-hidden ${
                isOwnerSignup
                  ? 'border border-emerald-400/30 ring-1 ring-emerald-400/10 shadow-emerald-500/10'
                  : 'border border-white/10'
              }`}
            >
              {isOwnerSignup && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-400" />
              )}
              {/* Header moved inside the glass-card for seamless transition sync */}
              {!showBridge && mode !== 'signup' && (
                <div className="text-center space-y-3 mb-8">
                  <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                    {mode === 'login' ? 'Welcome Back' : 'Forgot Password'}
                  </h2>
                  <p className="text-slate-500 text-sm font-medium leading-relaxed">
                    {mode === 'login' 
                      ? 'Sign in to manage your gym dashboard.' 
                      : 'We will help you get back into your account.'}
                  </p>
                </div>
              )}

              {/* Dynamic Tabs */}
              {mode !== 'forgot-password' && !showBridge && !isOwnerSignup && (
                <div className="flex rounded-2xl bg-black/40 p-1.5 border border-white/5 mb-8">
                  <button
                    onClick={() => navigate('/login')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === 'login'
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate('/signup')}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      mode === 'signup'
                        ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>
              )}

              {mode === 'login' ? (
                <LoginForm onSwitch={() => navigate('/signup')} onForgotPassword={() => navigate('/forgot-password')} />
              ) : mode === 'signup' ? (
                showBridge ? (
                  <AppConnectionBridge 
                    gymCode={paramGym} 
                    gymName={gymName} 
                    onContinueWeb={() => setBypassBridge(true)} 
                  />
                ) : (
                  <SignupForm onSwitch={() => navigate('/login')} forcedRole={isOwnerSignup ? 'owner' : undefined} />
                )
              ) : (
                <ForgotPasswordForm onSwitch={(newMode) => {
                  if (newMode === 'login') navigate('/login')
                  else if (newMode === 'signup') navigate('/signup')
                  else navigate('/login') // fallback
                }} />
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
