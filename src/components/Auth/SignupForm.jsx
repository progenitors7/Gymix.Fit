import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
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

export default function SignupForm({ onSwitch }) {
  const { signUp, signInWithGoogle } = useAuth()
  const [searchParams] = useSearchParams()

  // Parse URL Parameters
  const paramRole = searchParams.get('role') // 'member' or 'owner'
  const paramGym = searchParams.get('gym')   // gym connection code

  // State Management
  const [selectedRole, setSelectedRole] = useState(() => {
    return paramRole === 'member' ? 'member' : 'owner'
  })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [gymName, setGymName] = useState('')
  
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isRoleLocked = paramRole === 'member'

  // Capture scanned gym code from URL and persist in localStorage for inside-app confirmation
  useEffect(() => {
    if (paramGym) {
      localStorage.setItem('scanned_gym_code', paramGym.trim().toUpperCase())
      console.log('[SignupForm] Persisted scanned gym code in localStorage:', paramGym)
    }
  }, [paramGym])

  // Handle Google Auth (strictly as free member role)
  const handleGoogleSignup = async () => {
    try {
      setLoading(true)
      setError(null)
      await signInWithGoogle()
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
        if (!gymName.trim()) {
          setError('Gym Name is required.')
          setLoading(false)
          return
        }
        await signUp(email, password, 'owner', '', gymName.trim())
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
          className="w-20 h-20 rounded-[2.5rem] bg-emerald-500/10 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/5 border border-emerald-500/20"
        >
          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        </motion.div>
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Verification Sent!</h2>
          <p className="text-slate-400 text-sm leading-relaxed font-semibold">
            We sent a verification link to:<br />
            <span className="text-emerald-500 font-bold">{email}</span>
          </p>
          <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-[11.5px] font-bold text-slate-300 tracking-wide leading-relaxed max-w-sm mx-auto">
            Please check your email and click the link to activate your account. Once verified, return here to log in and access your dashboard!
          </div>
        </div>
        <button
          onClick={onSwitch}
          className="text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-[0.2em] transition-all border-b border-emerald-500/20 pb-1"
        >
          Return to Login
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      
      {/* ── Premium Role Tabs ── */}
      <div className="space-y-2">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
          I am registering as:
        </label>
        <div className="flex rounded-2xl bg-black/40 p-1 border border-white/5 relative">
          <button
            type="button"
            disabled={isRoleLocked}
            onClick={() => setSelectedRole('owner')}
            className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              selectedRole === 'owner'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black shadow-lg shadow-emerald-500/15'
                : 'text-slate-500 hover:text-slate-300'
            } ${isRoleLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Building className="w-3.5 h-3.5" />
            Gym Owner
          </button>
          <button
            type="button"
            onClick={() => setSelectedRole('member')}
            className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              selectedRole === 'member'
                ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-black shadow-lg shadow-emerald-500/15'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Gym Athlete
          </button>
        </div>
        
        {isRoleLocked && (
          <p className="text-[9px] font-bold text-emerald-500/60 uppercase tracking-wider ml-1.5 flex items-center gap-1.5 animate-pulse">
            <Sparkles className="w-3 h-3" />
            Locked to Athlete (Scanned QR Link active)
          </p>
        )}
      </div>

      {/* ── Google Signup ── */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-black font-bold text-xs transition-all active:scale-[0.98] disabled:opacity-50 border border-white/10"
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
          <div className="w-full border-t border-white/5"></div>
        </div>
        <div className="relative flex justify-center text-[9px] font-bold uppercase tracking-[0.25em]">
          <span className="bg-[#191D26] px-4 text-slate-600">OR REGISTER WITH EMAIL</span>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
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
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="gym-name" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Gym / Studio Name
                </label>
                <div className="relative group">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    id="gym-name"
                    type="text"
                    required
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g. Iron Paradise Gym"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
                  />
                </div>
              </div>
            </motion.div>
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
                <label htmlFor="member-fullname" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                  Your Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
                  <input
                    id="member-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Credentials ── */}
        <div className="space-y-1.5">
          <label htmlFor="signup-email" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
            Email Address
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
            <input
              id="signup-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. member@gymrevenue.os"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
            Choose Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full pl-12 pr-12 py-3 rounded-2xl bg-black/40 border border-white/5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-emerald-500 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signup-confirm-password" className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">
            Confirm Password
          </label>
          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-emerald-500 transition-colors" />
            <input
              id="signup-confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter passcode"
              className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/5 text-white placeholder-slate-700 text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all font-medium"
            />
          </div>
        </div>

        <button
          id="signup-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-[0.98] flex items-center justify-center gap-3 mt-4"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              Create Account
              <UserPlus className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <p className="pt-4 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider">
        Have an account?{' '}
        <button
          id="switch-to-login"
          onClick={onSwitch}
          className="text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          Login
        </button>
      </p>
    </div>
  )
}
