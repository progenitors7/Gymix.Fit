import { useState, useEffect } from 'react'
import { 
  Smartphone, 
  Globe, 
  ArrowRight, 
  Download, 
  Sparkles, 
  Share2, 
  Check, 
  Copy,
  Building
} from 'lucide-react'
import { motion } from 'framer-motion'

export default function AppConnectionBridge({ gymCode, gymName, onContinueWeb }) {
  const [copied, setCopied] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera
    if (/android/i.test(ua)) {
      setIsAndroid(true)
    } else if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
      setIsIOS(true)
    } else {
      // Default fallback if unknown mobile
      setIsAndroid(true)
    }
  }, [])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(`gymix-connect:${gymCode}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (err) {
      console.warn('Failed to copy gym code:', err)
    }
  }

  const handleAndroidRedirect = () => {
    // 1. Copy the sync code to clipboard
    navigator.clipboard.writeText(`gymix-connect:${gymCode}`)
      .then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      })
      .catch(() => {})

    // 2. Android Intent URL - Chrome's official mechanism.
    // Tries to open com.gymix.fit:// app scheme first.
    // If app not installed, Chrome automatically redirects to browser_fallback_url (Play Store).
    // This is the ONLY reliable approach — custom schemes + setTimeout fallback
    // fails because Chrome kills page JS context when no app handles the scheme.
    const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.gymix.fit'
    const intentUrl = `intent://signup?gym=${gymCode}&role=member#Intent;scheme=com.gymix.fit;package=com.gymix.fit;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`
    window.location.href = intentUrl
  }

  return (
    <div className="w-full text-center space-y-6 py-4">
      {/* Gym Brand Icon/Header */}
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-20 h-20 rounded-[2.5rem] bg-[#863BFF]/10 flex items-center justify-center mx-auto shadow-2xl shadow-[#863BFF]/5 border border-[#863BFF]/20"
      >
        <Building className="w-10 h-10 text-[#863BFF]" />
      </motion.div>

      <div className="space-y-2">
        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
          Scan Successful
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mt-2">
          Connect to {gymName || 'Your Gym'}
        </h2>
        <p className="text-zinc-400 text-xs font-medium leading-relaxed max-w-xs mx-auto">
          Get connected to register your profile and access the athlete terminal.
        </p>
      </div>

      {/* Main OS-Specific Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-5 text-left max-w-sm mx-auto shadow-xl"
      >
        {isAndroid ? (
          <>
            {/* Android Option */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-800">
                <Smartphone className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Use Play Store App</p>
                <p className="text-[10px] text-zinc-400 font-medium">Recommended for the best experience</p>
              </div>
            </div>

            <button
              onClick={handleAndroidRedirect}
              className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Install & Connect App
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
              <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-[0.2em]"><span className="bg-[#11131E] px-3 text-zinc-500">OR</span></div>
            </div>

            {/* Web Fallback */}
            <button
              onClick={onContinueWeb}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Globe className="w-4 h-4 text-zinc-400" />
              Continue in Browser
            </button>
          </>
        ) : (
          <>
            {/* iOS Option */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-950/40 border border-violet-800">
                <Smartphone className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">iOS Web Application</p>
                <p className="text-[10px] text-zinc-400 font-medium">Launch directly in Safari</p>
              </div>
            </div>

            <button
              onClick={onContinueWeb}
              className="w-full py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs transition-all shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 cursor-pointer"
            >
              Continue to Sign Up
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* iOS Add to Home Screen Hint */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/50 border border-slate-200 dark:border-zinc-800 text-[10px] leading-relaxed text-slate-600 dark:text-zinc-400 font-medium">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 dark:text-zinc-200">Native Experience:</span> Tap the <span className="inline-block bg-slate-200 dark:bg-zinc-800 px-1 rounded"><Share2 className="w-2.5 h-2.5 inline mx-0.5 -mt-0.5" /> Share</span> button in Safari, then select <span className="text-slate-900 dark:text-white font-bold">"Add to Home Screen"</span> for fullscreen app-mode.
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Copy Code Section for Manual Paste if required */}
      <div className="max-w-xs mx-auto pt-2 space-y-2">
        <p className="text-[9px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
          Your Connection Code:
        </p>
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs">
          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs tracking-wider pl-2 select-all">
            {gymCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 transition-all flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase text-slate-700 dark:text-zinc-200 tracking-wider cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
