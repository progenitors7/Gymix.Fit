import { useState, useEffect } from 'react'
import { QrCode, Fingerprint, Shield, Maximize2, X, WifiOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import QRCode from 'qrcode'

export default function RollingPassCard({ membership }) {
  const [passMode, setPassMode] = useState('qr') // 'qr' | 'biometric'
  const [qrToken, setQrToken] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [isZoomed, setIsZoomed] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!membership) return

    let isMounted = true

    const generateRollingToken = async () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const token = `MEM_SECURE_${membership.id}_${membership.gym_id}_${timestamp}`
      if (!isMounted) return
      setQrToken(token)
      setTimeLeft(30)

      try {
        const dataUrl = await QRCode.toDataURL(token, {
          width: 320,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#ffffff'
          },
          errorCorrectionLevel: 'M'
        })
        if (isMounted) {
          setQrDataUrl(dataUrl)
        }
      } catch (err) {
        console.error('[RollingPassCard] Error generating local QR code:', err)
        // Fallback to QR server if local fails
        if (isMounted) {
          setQrDataUrl(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(token)}`)
        }
      }
    }

    generateRollingToken()

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          generateRollingToken()
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      isMounted = false
      clearInterval(timer)
    }
  }, [membership])

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden flex-1 flex flex-col justify-center items-center min-h-[360px]">
        
        {/* Status badges header */}
        <div className="absolute top-5 inset-x-5 flex items-center justify-between pointer-events-none">
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-semibold tracking-wider text-amber-600 dark:text-amber-400">
              <WifiOff className="w-3 h-3" />
              OFFLINE PASS READY
            </div>
          ) : <div />}

          {/* Rotating countdown indicator */}
          {(!membership?.gyms?.biometric_enabled || passMode === 'qr') && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 animate-ping"></span>
              </span>
              SECURE • ROTATING IN {timeLeft}s
            </div>
          )}
        </div>

        {/* Dual Mode Switcher Selector (Only if biometric is enabled) */}
        {membership?.gyms?.biometric_enabled && (
          <div className="flex items-center gap-1.5 mb-6 mt-4 relative z-10 w-full max-w-[280px]">
            <button 
              onClick={() => setPassMode('qr')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                passMode === 'qr' 
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
              QR Pass
            </button>
            <button 
              onClick={() => setPassMode('biometric')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                passMode === 'biometric' 
                  ? 'bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5 text-emerald-500" />
              Biometric Sync
            </button>
          </div>
        )}

        <div className="space-y-6 pt-6 w-full flex-1 flex flex-col justify-center items-center">
          {(!membership?.gyms?.biometric_enabled || passMode === 'qr') ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              
              {/* Clickable QR Frame */}
              <div 
                onClick={() => setIsZoomed(true)}
                className="group relative w-48 h-48 sm:w-52 sm:h-52 mx-auto border border-slate-200 dark:border-zinc-700 rounded-2xl p-4 flex flex-col items-center justify-center bg-white cursor-pointer transition-transform duration-200 active:scale-95 hover:border-violet-500/50"
                title="Tap to enlarge QR Pass"
              >
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl}
                    alt="Gate Access Pass"
                    className="w-full h-full object-contain rounded-lg select-none"
                  />
                ) : (
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-violet-600 rounded-full animate-spin" />
                )}

                <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                  ACTIVE PASS KEY
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium flex items-center justify-center gap-1.5">
                  <span>SCAN PASS AT FRONT DESK</span>
                  <span className="text-slate-300 dark:text-zinc-700">•</span>
                  <button 
                    type="button" 
                    onClick={() => setIsZoomed(true)}
                    className="text-violet-600 dark:text-violet-400 font-semibold hover:underline cursor-pointer"
                  >
                    Tap to Enlarge
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 w-full flex flex-col items-center py-4">
              {/* Biometric linked display */}
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto flex items-center justify-center">
                <div className={`relative w-full h-full rounded-full flex flex-col items-center justify-center border ${
                  membership?.biometric_user_id 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                  <Fingerprint className="w-16 h-16" />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <div className="flex justify-center">
                  {membership?.biometric_user_id ? (
                    <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-semibold tracking-wider text-emerald-600 dark:text-emerald-400">
                      Device Linked 🟢
                    </span>
                  ) : (
                    <span className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-semibold tracking-wider text-rose-600 dark:text-rose-400">
                      Link Missing 🔴
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {membership?.biometric_user_id ? `Active Bio User ID: #${membership.biometric_user_id}` : 'Biometric Link Inactive'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 font-normal leading-relaxed">
                  {membership?.biometric_user_id 
                    ? "Your account is securely synced with the gym's biometric terminals. Walk to the reception scanner to log entry!" 
                    : "Your biometric ID is not linked to your account yet. Please visit the reception desk to scan and complete linking."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen QR Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-[120] bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 relative"
            >
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  {membership?.gyms?.gym_name || 'Gymix Access Pass'}
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Gate Scanner Key
                </h4>
              </div>

              <div className="w-64 h-64 mx-auto bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-center">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Enlarged QR Pass"
                    className="w-full h-full object-contain select-none"
                  />
                )}
              </div>

              <div className="flex items-center justify-between px-2 pt-2 border-t border-slate-200 dark:border-zinc-800 text-xs font-medium text-slate-500 dark:text-zinc-400">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-rotating in {timeLeft}s
                </span>
                <button
                  onClick={() => setIsZoomed(false)}
                  className="text-slate-900 dark:text-white hover:underline font-semibold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
