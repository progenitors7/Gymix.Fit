import { useState, useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { ArrowUpRight, ArrowLeft, Check } from 'lucide-react'
import './AuthPage.css'
import GymixScene from '../Marketing/GymixScene'
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

  const mode = (() => {
    if (location.pathname === '/signup' || location.pathname === '/owner-signup') return 'signup'
    if (location.pathname === '/forgot-password') return 'forgot-password'
    if (location.pathname === '/login') return 'login'
    const qMode = searchParams.get('mode')
    if (qMode === 'signup' || qMode === 'forgot-password' || qMode === 'login') return qMode
    return 'login'
  })()

  const handleSwitchMode = (targetMode) => {
    const params = new URLSearchParams(location.search)
    params.delete('mode')
    const currentSearch = params.size ? `?${params}` : ''
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

  const [bypassBridge, setBypassBridge] = useState(false)
  const [bridgeGym, setBridgeGym] = useState(null)
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  const showBridge = isMobile && !isNativeCapacitorApp() && !isStandalone && !!normalizedGymParam && mode === 'signup' && !bypassBridge
  const gymName = bridgeGym?.code === normalizedGymParam ? bridgeGym.name : ''

  // Detect mobile browser scan connection bridge
  useEffect(() => {
    let active = true
    if (showBridge) {
      // Fetch gym name to display on the bridge
      supabase
        .from('gyms')
        .select('gym_name')
        .eq('unique_code', normalizedGymParam)
        .maybeSingle()
        .then(({ data }) => {
          if (active && data) setBridgeGym({ code: normalizedGymParam, name: data.gym_name })
        })
    }
    return () => { active = false }
  }, [normalizedGymParam, showBridge])

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
    <div className="gx-auth gx-auth-dimensional">
      <aside className="gx-auth-scene">
        <Link to="/?landing=true" className="gx-auth-brand"><img src="/logo-transparent.png" alt="" />gymix<span>.</span></Link>
        <div className="gx-auth-scene-copy"><h1>Your gym.<br/><em>Another dimension.</em></h1><p>Step into your daily workspace.</p></div>
        <div className="gx-auth-3d"><GymixScene compact/></div>
        <div className="gx-auth-scene-footer"><span><Check size={15}/> Members. Fees. Attendance.</span><span>ALL TOGETHER.</span></div>
      </aside>
      <main className="gx-auth-main">
        <header><Link to="/?landing=true"><ArrowLeft size={15}/> Back to Gymix</Link><span>YOUR NEXT CHAPTER.</span></header>
        <div className="gx-auth-content">
          <Link to="/?landing=true" className="gx-auth-brand gx-auth-mobile-brand"><img src="/logo-transparent.png" alt=""/>gymix<span>.</span></Link>
          {!showBridge && <nav className="gx-auth-tabs" aria-label="Account access"><button aria-pressed={mode === 'login'} onClick={() => handleSwitchMode('login')}>Log in</button><button aria-pressed={mode === 'signup'} onClick={() => handleSwitchMode('signup')}>Create account <ArrowUpRight size={14}/></button></nav>}
          {!showBridge && mode !== 'signup' && <div className="gx-auth-title"><h2>{mode === 'login' ? 'Back to your gym.' : 'Let’s get you back in.'}</h2><p>{mode === 'login' ? 'Your members. Your progress. Right where you left them.' : 'Enter your email to reset your password.'}</p></div>}
          <motion.div key={`${mode}-${location.pathname}`} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.18}} className="gx-auth-form">
            {mode === 'login' ? <LoginForm onSwitch={() => handleSwitchMode('signup')} onForgotPassword={() => handleSwitchMode('forgot-password')}/> : mode === 'signup' ? showBridge ? <AppConnectionBridge gymCode={normalizedGymParam} gymName={gymName} onContinueWeb={() => setBypassBridge(true)}/> : <SignupForm onSwitch={() => handleSwitchMode('login')} forcedRole={isOwnerSignup ? 'owner' : undefined}/> : <ForgotPasswordForm onSwitch={newMode => handleSwitchMode(newMode || 'login')}/>}
          </motion.div>
          <p className="gx-auth-help">Need a hand? <a href="mailto:founder@gymix.fit">Talk to the founder <ArrowUpRight size={12}/></a></p>
        </div>
        <footer><span>© {new Date().getFullYear()} Gymix</span><Link to="/privacy-policy">Privacy policy</Link></footer>
      </main>
    </div>
  )
}
