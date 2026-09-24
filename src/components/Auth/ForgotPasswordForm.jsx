import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Mail, Loader2, ArrowLeft, Send, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ForgotPasswordForm({ onSwitch }) {
  const { resetPasswordForEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)
    try {
      await resetPasswordForEmail(email)
      setSuccess(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
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
        <div className="space-y-3">
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Link Dispatched</h2>
          <p className="text-zinc-400 text-sm leading-relaxed font-medium">
            Recovery instructions sent to <br />
            <span className="text-violet-400 font-bold">{email}</span>
          </p>
        </div>
        <button
          onClick={() => onSwitch('login')}
          className="text-xs font-bold text-violet-400 hover:text-violet-300 uppercase tracking-wider transition-all border-b border-violet-500/20 pb-1 cursor-pointer"
        >
          Return to Login
        </button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onSwitch('login')}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reset Password</p>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs font-medium text-center"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="reset-email" className="block text-xs font-semibold text-zinc-300 ml-1">
            Registered Email
          </label>
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              id="reset-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@yourgym.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all font-medium shadow-xs"
            />
          </div>
        </div>

        <button
          id="reset-submit-btn"
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-3 mt-4 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Dispatching...
            </>
          ) : (
            <>
              Send Recovery Link
              <Send className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
