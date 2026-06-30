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

  const handleAndroidRedirect = async () => {
    // 1. Copy the sync code to clipboard so the app can auto-read it upon first launch
    await handleCopyCode()

    // 2. Trigger the Android Intent to open the app if installed, or fallback to Play Store
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
        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.25em] bg-emerald-500/5 px-3 py-1 rounded-full border border-emerald-500/10">
          Scan Successful
        </span>
        <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mt-2">
          Connect to {gymName || 'Your Gym'}
        </h2>
        <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-xs mx-auto">
          Get connected to register your profile and access the athlete terminal.
        </p>
      </div>

      {/* Main OS-Specific Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-[2rem] bg-black/40 border border-white/5 space-y-5 text-left max-w-sm mx-auto"
      >
        {isAndroid ? (
          <>
            {/* Android Option */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">Use Play Store App</p>
                <p className="text-[10px] text-slate-500 font-bold">Recommended for the best experience</p>
              </div>
            </div>

            <button
              onClick={handleAndroidRedirect}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Download className="w-4 h-4" />
              Install & Connect App
            </button>

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
              <div className="relative flex justify-center text-[8px] font-black uppercase tracking-[0.2em]"><span className="bg-[#1A1F2B] px-3 text-slate-600">OR</span></div>
            </div>

            {/* Web Fallback */}
            <button
              onClick={onContinueWeb}
              className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:bg-white/[0.06]"
            >
              <Globe className="w-4 h-4 text-slate-400" />
              Continue in Browser
            </button>
          </>
        ) : (
          <>
            {/* iOS Option */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-[#863BFF]/20">
                <Smartphone className="w-5 h-5 text-[#863BFF]" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase tracking-wider">iOS Web Application</p>
                <p className="text-[10px] text-slate-500 font-bold">Launch directly in Safari</p>
              </div>
            </div>

            <button
              onClick={onContinueWeb}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#863BFF] to-[#7030D8] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-[#863BFF]/15 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              Continue to Sign Up
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* iOS Add to Home Screen Hint */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] leading-relaxed text-slate-400 font-medium">
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-300">Native Experience:</span> Tap the <span className="inline-block bg-white/10 px-1 rounded"><Share2 className="w-2.5 h-2.5 inline mx-0.5 -mt-0.5" /> Share</span> button in Safari, then select <span className="text-white font-bold">"Add to Home Screen"</span> for fullscreen app-mode.
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>

      {/* Copy Code Section for Manual Paste if required */}
      <div className="max-w-xs mx-auto pt-2 space-y-2">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
          Your Connection Code:
        </p>
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/5">
          <span className="font-mono font-bold text-white text-xs tracking-wider pl-2 select-all">
            {gymCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-2 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 transition-all flex items-center justify-center gap-1.5 text-[9px] font-black uppercase text-slate-300 tracking-wider"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied!</span>
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
