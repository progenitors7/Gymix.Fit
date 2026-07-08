import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'

export default function AppUpdateChecker() {
  const [showModal, setShowModal] = useState(false)
  const [isForced, setIsForced] = useState(false)
  const [config, setConfig] = useState(null)
  
  useEffect(() => {
    async function checkAppVersion() {
      try {
        // 1. Fetch latest app configuration from Supabase
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'android_app_version_config')
          .maybeSingle()

        if (error || !data || !data.value) {
          console.warn('[AppUpdateChecker] No version configuration found in system_settings')
          return
        }

        const appConfig = data.value
        setConfig(appConfig)

        // Store config in localStorage for notifications and other views
        localStorage.setItem('gymix_latest_version_config', JSON.stringify(appConfig))

        // 2. Identify if running in native app (Capacitor)
        const isNative = window.Capacitor !== undefined
        if (!isNative) {
          // If we are on web browser, updates are live automatically
          return
        }

        // Get native app version information
        const { App } = await import('@capacitor/app')
        const info = await App.getInfo()
        const localVersionCode = parseInt(info.build, 10) || 0
        
        // Save current code locally for reference
        localStorage.setItem('gymix_current_version_code', localVersionCode.toString())

        // 3. Compare versions
        if (localVersionCode > 0 && localVersionCode < appConfig.latest_version_code) {
          const forceRequired = appConfig.force_update || localVersionCode < appConfig.min_version_code
          setIsForced(forceRequired)

          if (forceRequired) {
            setShowModal(true)
          } else {
            // Check snooze duration (24 hours) for optional updates
            const lastDismissed = localStorage.getItem('gymix_update_dismissed_at')
            if (lastDismissed) {
              const hoursSinceDismiss = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60)
              if (hoursSinceDismiss < 24) {
                // Snoozed for today
                return
              }
            }
            setShowModal(true)
          }
        }
      } catch (err) {
        console.error('[AppUpdateChecker] Error running update checker:', err)
      }
    }

    // Delay check slightly on startup to let major authentication states settle first
    const timer = setTimeout(checkAppVersion, 3000)
    return () => clearTimeout(timer)
  }, [])

  const handleUpdate = () => {
    if (!config) return
    const storeUrl = config.play_store_url || 'market://details?id=com.gymix.fit'
    window.open(storeUrl, '_system')
  }

  const handleLater = () => {
    localStorage.setItem('gymix_update_dismissed_at', Date.now().toString())
    setShowModal(false)
  }

  if (!showModal || !config) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative max-w-md w-full bg-[#161B26] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden text-center"
        >
          {/* Top aesthetic glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-[#863BFF]/10 blur-[60px] rounded-full pointer-events-none" />

          {/* Icon Header */}
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <div className="absolute inset-0 bg-[#863BFF]/10 rounded-[2rem] border border-[#863BFF]/20 animate-pulse" />
            {isForced ? (
              <AlertTriangle className="w-10 h-10 text-amber-500 relative z-10" />
            ) : (
              <Sparkles className="w-10 h-10 text-[#863BFF] relative z-10 animate-bounce" />
            )}
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tight mb-2">
            {isForced ? 'Critical Update Required' : 'New Update Available!'}
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-slate-300">
              v{config.latest_version_name || 'Latest'}
            </span>
            {isForced && (
              <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 uppercase tracking-wider">
                Required
              </span>
            )}
          </div>

          {/* Message Description */}
          <p className="text-slate-400 text-sm leading-relaxed mb-8 font-medium">
            {isForced
              ? 'To keep your gym connection secure and operational, you must update Gymix to the latest version immediately.'
              : 'Upgrade to the latest version of Gymix now to unlock brand-new features, enhanced speeds, and optimized biometric scanning.'}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3 relative z-10">
            <button
              onClick={handleUpdate}
              className="w-full py-4 bg-[#863BFF] hover:bg-[#722EE5] text-white font-black rounded-2xl transition-all uppercase text-xs tracking-wider shadow-lg shadow-[#863BFF]/25 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Update Now</span>
              <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </button>

            {!isForced && (
              <button
                onClick={handleLater}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-slate-300 font-bold rounded-2xl transition-all border border-white/5 uppercase text-xs tracking-wider cursor-pointer"
              >
                Later
              </button>
            )}
          </div>

          {/* Bottom small security watermark */}
          <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold tracking-wider uppercase">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/70" />
            <span>Securely verified by Gymix System</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
