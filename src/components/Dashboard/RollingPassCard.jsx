import { useState, useEffect } from 'react'
import { QrCode, Fingerprint, Shield } from 'lucide-react'

export default function RollingPassCard({ membership }) {
  const [passMode, setPassMode] = useState('qr') // 'qr' | 'biometric'
  const [qrToken, setQrToken] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)

  useEffect(() => {
    if (!membership) return

    const generateRollingToken = () => {
      const timestamp = Math.floor(Date.now() / 1000)
      const token = `MEM_SECURE_${membership.id}_${membership.gym_id}_${timestamp}`
      setQrToken(token)
      setTimeLeft(30)
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

    return () => clearInterval(timer)
  }, [membership])

  return (
    <div className="backdrop-blur-md bg-[#12141c]/60 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 text-center relative overflow-hidden shadow-2xl flex-1 flex flex-col justify-center items-center transition-all duration-300 hover:border-white/20 min-h-[360px]">
      
      {/* Rotating ring spinner indicator (Only show if QR is active) */}
      {(!membership.gyms?.biometric_enabled || passMode === 'qr') && (
        <div className="absolute top-5 right-5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black uppercase tracking-widest text-emerald-400 animate-in fade-in duration-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
          SECURE • ROTATING IN {timeLeft}s
        </div>
      )}

      {/* Dual Mode Switcher Selector (Only if biometric is enabled) */}
      {membership.gyms?.biometric_enabled && (
        <div className="flex bg-black/40 border border-white/5 rounded-2xl p-1 mb-6 relative z-10 w-full max-w-[280px]">
          <button 
            onClick={() => setPassMode('qr')}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${passMode === 'qr' ? 'bg-[#863BFF]/20 border border-[#863BFF]/20 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Code Pass
          </button>
          <button 
            onClick={() => setPassMode('biometric')}
            className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${passMode === 'biometric' ? 'bg-[#10B981]/20 border border-[#10B981]/20 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Fingerprint className="w-3.5 h-3.5" />
            Biometric Sync
          </button>
        </div>
      )}

      <div className="space-y-6 pt-2 w-full flex-1 flex flex-col justify-center items-center">
        {(!membership.gyms?.biometric_enabled || passMode === 'qr') ? (
          <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center">
            {/* QR Container with neon glow effect */}
            <div className="relative w-48 h-48 sm:w-52 sm:h-52 mx-auto group">
              {/* Pulsing neon glow underlay */}
              <div className="absolute -inset-1.5 bg-gradient-to-r from-[#863BFF] to-[#b370ff] rounded-3xl blur-xl opacity-60 group-hover:opacity-80 transition duration-1000 group-hover:duration-200 animate-pulse" />
              
              <div className="relative w-full h-full bg-white rounded-3xl p-4 flex flex-col items-center justify-center border border-white/10 shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrToken)}`}
                  alt="Gate Access Pass"
                  className="w-full h-full object-contain rounded-xl select-none"
                />
              </div>
            </div>

            <div className="space-y-1 pt-1">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                ACTIVE PASS KEY
              </h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                SCAN PASS QR AT FRONT DESK ON ENTRY
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 w-full animate-in fade-in zoom-in-95 duration-300 flex flex-col items-center py-4">
            {/* Biometric linked display with dynamic colors */}
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 mx-auto group flex items-center justify-center">
              {/* Neon glow ring */}
              <div className={`absolute -inset-1 bg-gradient-to-tr ${membership.biometric_user_id ? 'from-[#10B981] to-emerald-400' : 'from-rose-500 to-rose-400'} rounded-full blur-xl opacity-40 group-hover:opacity-60 transition duration-500`} />
              
              <div className={`relative w-full h-full rounded-full flex flex-col items-center justify-center border-2 ${membership.biometric_user_id ? 'bg-[#10B981]/5 border-[#10B981]/30 text-[#10B981]' : 'bg-rose-500/5 border-rose-500/30 text-rose-400'} shadow-2xl backdrop-blur-md`}>
                <Fingerprint className="w-16 h-16 animate-pulse" />
              </div>
            </div>

            <div className="space-y-2 max-w-sm">
              <div className="flex justify-center">
                {membership.biometric_user_id ? (
                  <span className="px-3.5 py-1 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 text-[9px] font-black uppercase tracking-widest text-[#10B981] shadow-lg shadow-[#10B981]/5">
                    Device Linked 🟢
                  </span>
                ) : (
                  <span className="px-3.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-[9px] font-black uppercase tracking-widest text-rose-400 shadow-lg">
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
  )
}
