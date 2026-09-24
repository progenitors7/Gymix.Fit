import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  UserPlus, 
  CheckCircle2, 
  Building, 
  User, 
  Sparkles 
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function SignupForm({ onSwitch, forcedRole }) {
  const { signUp, signInWithGoogle } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Parse URL Parameters
  const paramRole = searchParams.get('role') // 'member' or 'owner'
  const paramGym = searchParams.get('gym')   // gym connection code

  // State Management
  const [selectedRole, setSelectedRole] = useState(() => {
    if (forcedRole) return forcedRole
    return paramRole === 'owner' ? 'owner' : 'member'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isInviteActive = paramRole === 'member' && !!paramGym
  const isRoleLocked = isInviteActive
  const isOwnerFlow = selectedRole === 'owner'

  // Capture scanned gym code from URL and persist in localStorage for inside-app confirmation
  useEffect(() => {
    if (paramGym) {
      localStorage.setItem('scanned_gym_code', paramGym.trim().toUpperCase())
    }
  }, [paramGym])

  // Handle Google Auth (using selected role)
  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle(selectedRole)
    } catch (err) {
      setError(err.message || 'Failed to connect with Google.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords don't match.")
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (selectedRole === 'owner') {
        await signUp(email, password, 'owner')
      } else {
        if (!fullName.trim()) {
          setError('Full Name is required.')
          setLoading(false)
          return
        }
        
        // 1. Sign up the athlete
        await signUp(email, password, 'member', fullName.trim())
      }
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to create account.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full text-center space-y-8 py-4">
        <motion.div 
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-[2.5rem] bg-violet-500/10 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/5 border border-violet-500/20"
        >
          <CheckCircle2 className="w-10 h-10 text-violet-400" />
        </motion.div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Verification Sent!</h2>
          <p className="text-zinc-400 text-sm leading-relaxed font-semibold">
            We sent a verification link to:<br />
            <span className="text-violet-400 font-bold">{email}</span>
          </p>
          <div className="p-4 rounded-2xl bg-violet-500/5 border border-violet-500/10 text-[11.5px] font-bold text-zinc-300 tracking-wide leading-relaxed max-w-sm mx-auto">
            Please check your email and click the link to activate your account. Once verified, return here to log in and access your dashboard!
          </div>
        </div>
        <button
          onClick={onSwitch}
          className="text-[10px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-[0.2em] transition-all border-b border-violet-500/20 pb-1 cursor-pointer"
        >
          Return to Login
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      
      {/* ── Animated Card Header ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRole}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="text-center space-y-3"
        >
          {isOwnerFlow && (
            <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-[9px] font-black uppercase tracking-[0.22em] text-violet-300">
              <Building className="h-3.5 w-3.5" />
              Gym Owner Account
            </div>
          )}
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tighter uppercase italic leading-none px-2">
            {selectedRole === 'owner' ? (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 via-fuchsia-300 to-violet-400 drop-shadow-[0_0_15px_rgba(124,58,237,0.25)]">Register Your Gym</span>
            ) : (
              'Athlete Sign Up'
            )}
          </h2>
          <p className="text-zinc-400 text-xs font-semibold uppercase tracking-wider leading-relaxed">
            {selectedRole === 'owner' ? 'This creates a gym owner dashboard and gym workspace.' : 'Join your gym community and track logs.'}
          </p>
        </motion.div>
      </AnimatePresence>

      {isOwnerFlow && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-white/[0.02] p-5 text-left shadow-xl shadow-violet-500/5"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-400/10">
              <Building className="h-5 w-5 text-violet-300" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-black uppercase tracking-wide text-white">You are creating a Gym Owner account</p>
              <p className="text-[11px] font-semibold leading-relaxed text-zinc-400">
                Use this only if you manage a gym. Members should go back and create an athlete account with their gym code.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Scanned Invite Header Banner ── */}
      {isInviteActive && (
        <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-center space-y-1">
          <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Athlete Invitation Active
          </p>
          <p className="text-[9.5px] font-bold text-zinc-400 uppercase tracking-wider">
            Registering for Gym Connection
          </p>
        </div>
      )}

      {!isOwnerFlow && (
        <>
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-zinc-900 font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 border border-white/10 cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.038l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.483 0 2.443 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-[0.25em]">
              <span className="bg-[#11131E] px-4 text-zinc-500">OR REGISTER WITH EMAIL</span>
            </div>
          </div>
        </>
      )}

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-2xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-medium text-center"
        >
          {error}
        </motion.div>
      )}

      {/* ── Signup Form ── */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Dynamic Fields based on Role */}
        <AnimatePresence mode="wait">
          {selectedRole === 'owner' ? (
            <motion.div
              key="owner-fields"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="hidden"
            />
          ) : (
            <motion.div
              key="member-fields"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="member-fullname" className="block text-xs font-semibold text-zinc-300 ml-0.5">
                  Your Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                  <input
                    id="member-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium shadow-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isOwnerFlow && (
          <>
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-zinc-900 font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 border border-white/10 cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.483 0 2.443 2.017.957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Create Gym Owner Account with Google
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-[0.25em]">
                <span className="bg-[#11131E] px-4 text-zinc-500">OR USE EMAIL</span>
              </div>
            </div>
          </>
        )}

        {/* ── Credentials ── */}
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-xs font-semibold text-zinc-300 ml-0.5">
            {isOwnerFlow ? 'Owner Email Address' : 'Email Address'}
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isOwnerFlow ? 'e.g. owner@gymix.fit' : 'e.g. member@gymix.fit'}
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium shadow-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-xs font-semibold text-zinc-300 ml-0.5">
            Choose Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full pl-11 pr-11 py-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium shadow-xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm-password" className="block text-xs font-semibold text-zinc-300 ml-0.5">
            Confirm Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter passcode"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium shadow-xs"
            />
          </div>
        </div>

        <button
          id="signup-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 mt-5 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              {isOwnerFlow ? 'Create Gym Owner Account' : 'Create Account'}
              <UserPlus className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 text-center space-y-2.5">
        <p className="text-xs font-medium text-zinc-400">
          Have an account?{' '}
          <button
            id="switch-to-login"
            type="button"
            onClick={onSwitch}
            className="text-violet-400 hover:text-violet-300 font-bold hover:underline transition-colors cursor-pointer ml-1"
          >
            Login
          </button>
        </p>

        {!isRoleLocked && (
          <p className="text-[11px] font-medium text-zinc-500">
            {selectedRole === 'member' ? (
              <>
                Are you a Gym Owner?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/owner-signup')}
                  className="text-violet-400 hover:text-violet-300 transition-colors font-bold cursor-pointer ml-1"
                >
                  Register your Gym
                </button>
              </>
            ) : (
              <>
                Registering a Gym?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="text-violet-400 hover:text-violet-300 transition-colors font-bold cursor-pointer ml-1"
                >
                  Join as Athlete
                </button>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  )
}
