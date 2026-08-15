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
      <div className="bg-[#1A1F2B] border border-white/5 rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden shadow-xl flex-1 flex flex-col justify-center items-center min-h-[360px]">
        
        {/* Status badges header */}
        <div className="absolute top-5 inset-x-5 flex items-center justify-between pointer-events-none">
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[8px] font-black uppercase tracking-widest text-amber-400">
              <WifiOff className="w-2.5 h-2.5" />
              OFFLINE PASS READY
            </div>
          ) : <div />}

          {/* Rotating countdown indicator */}
          {(!membership.gyms?.biometric_enabled || passMode === 'qr') && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 animate-ping"></span>
              </span>
              SECURE • ROTATING IN {timeLeft}s
            </div>
          )}
        </div>

        {/* Dual Mode Switcher Selector (Only if biometric is enabled) */}
        {membership.gyms?.biometric_enabled && (
          <div className="flex bg-black/40 border border-white/5 rounded-xl p-1 mb-6 mt-4 relative z-10 w-full max-w-[280px]">
            <button 
              onClick={() => setPassMode('qr')}
              className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${passMode === 'qr' ? 'bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Code Pass
            </button>
            <button 
              onClick={() => setPassMode('biometric')}
              className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${passMode === 'biometric' ? 'bg-[#10B981]/10 border border-[#10B981]/20 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              Biometric Sync
            </button>
          </div>
        )}

        <div className="space-y-6 pt-6 w-full flex-1 flex flex-col justify-center items-center">
          {(!membership.gyms?.biometric_enabled || passMode === 'qr') ? (
            <div className="space-y-4 w-full flex flex-col items-center">
              
              {/* Clickable QR Frame */}
              <div 
                onClick={() => setIsZoomed(true)}
                className="group relative w-48 h-48 sm:w-52 sm:h-52 mx-auto border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center bg-white shadow-lg cursor-pointer transition-transform duration-200 active:scale-95 hover:shadow-emerald-500/10"
                title="Tap to enlarge QR Pass"
              >
                {qrDataUrl ? (
                  <img 
                    src={qrDataUrl}
                    alt="Gate Access Pass"
                    className="w-full h-full object-contain rounded-lg select-none"
                  />
                ) : (
                  <div className="w-8 h-8 border-2 border-slate-300 border-t-emerald-500 rounded-full animate-spin" />
                )}

                <div className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                  <Maximize2 className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  ACTIVE PASS KEY
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <span>SCAN PASS AT FRONT DESK</span>
                  <span className="text-slate-600">•</span>
                  <button 
                    type="button" 
                    onClick={() => setIsZoomed(true)}
                    className="text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    Tap to Enlarge
                  </button>
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6 w-full flex flex-col items-center py-4">
              {/* Biometric linked display with dynamic colors */}
              <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto flex items-center justify-center">
                <div className={`relative w-full h-full rounded-full flex flex-col items-center justify-center border ${membership.biometric_user_id ? 'bg-emerald-500/10 border-emerald-500/20 text-[#10B981]' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} shadow-lg`}>
                  <Fingerprint className="w-16 h-16" />
                </div>
              </div>

              <div className="space-y-2 max-w-sm">
                <div className="flex justify-center">
                  {membership.biometric_user_id ? (
                    <span className="px-3.5 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[9px] font-black uppercase tracking-widest text-[#10B981] shadow-sm">
                      Device Linked 🟢
                    </span>
                  ) : (
                    <span className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest text-rose-400 shadow-sm">
                      Link Missing 🔴
                    </span>
                  )}
                </div>
                <h3 className="text-xs font-black text-white uppercase tracking-wider">
                  {membership.biometric_user_id ? `Active Bio User ID: #${membership.biometric_user_id}` : 'Biometric Link Inactive'}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  {membership.biometric_user_id 
                    ? "Your account is securely synced with the gym's biometric face/fingerprint terminals. Simply walk to the reception scanner to log entry!" 
                    : "Your biometric ID is not linked to your account yet. Please visit the reception desk to scan your finger/face and complete linking."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen High Contrast QR Modal Overlay */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#151922] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-6 shadow-2xl relative"
            >
              <button
                onClick={() => setIsZoomed(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1 text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#3B82F6]">
                  {membership.gyms?.gym_name || 'Gymix Access Pass'}
                </span>
                <h4 className="text-base font-black text-white uppercase italic tracking-tight">
                  Gate Scanner Key
                </h4>
              </div>

              <div className="w-64 h-64 mx-auto bg-white rounded-2xl p-4 flex items-center justify-center shadow-2xl">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="Enlarged QR Pass"
                    className="w-full h-full object-contain select-none"
                  />
                )}
              </div>

              <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5 text-[10px] font-bold text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-rotating in {timeLeft}s
                </span>
                <button
                  onClick={() => setIsZoomed(false)}
                  className="text-white hover:text-slate-300 font-semibold uppercase tracking-wider text-[9px]"
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
