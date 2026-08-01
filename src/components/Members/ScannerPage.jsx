import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Camera, ArrowLeft, ShieldAlert, LogIn, LogOut
} from 'lucide-react'
import { useCurrentGym } from '../../hooks/useCurrentGym'
import { connectionService } from '../../services/connectionService'
import toast from 'react-hot-toast'

/**
 * Html5Qrcode internal scanner states (from library source).
 * Used to safely check state before calling pause/resume/stop.
 */
const SCANNER_STATE = { NOT_STARTED: 1, SCANNING: 2, PAUSED: 3 }

export default function ScannerPage() {
  const navigate = useNavigate()
  const { gymId } = useCurrentGym()
  
  const [scanning, setScanning] = useState(false)
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [scannerError, setScannerError] = useState('')

  // Scanned feedback state overlay
  const [scanResult, setScanResult] = useState(null) // { success: boolean, message: string, member: object }

  // Refs for race-condition-safe access inside callbacks and timers
  const html5QrCodeRef = useRef(null)
  const isProcessingRef = useRef(false)
  const selectedCameraIdRef = useRef('')
  const resumeTimerRef = useRef(null)
  const scannerId = 'qr-reader-container'

  // Keep camera ID ref in sync with React state so setTimeout closures always read the latest value
  useEffect(() => {
    selectedCameraIdRef.current = selectedCameraId
  }, [selectedCameraId])

  // ── Offline Sync ──────────────────────────────────────────────────────────
  // Sync queued offline check-in logs to the database using manual attendance logging bypass
  const syncOfflineLogs = useCallback(async () => {
    if (!gymId || !navigator.onLine) return
    const queueKey = `gymix_offline_checkins_${gymId}`
    const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
    if (queue.length === 0) return

    console.log(`[Scanner] Syncing ${queue.length} offline check-in(s)...`)
    let successCount = 0
    
    for (const item of queue) {
      try {
        await connectionService.logManualAttendance(gymId, item.memberId)
        successCount++
      } catch (err) {
        console.error('[Scanner] Failed to sync offline item:', item, err)
      }
    }

    localStorage.removeItem(queueKey)
    if (successCount > 0) {
      toast.success(`Synced ${successCount} offline check-ins to server! ⚡`)
    }
  }, [gymId])

  // Run sync on mount and when connection status changes back to online
  useEffect(() => {
    syncOfflineLogs()
    const handleOnline = () => syncOfflineLogs()
    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [gymId, syncOfflineLogs])

  // ── Scanner State Helper ──────────────────────────────────────────────────
  /** Safely read the current Html5Qrcode scanner state without throwing. */
  const getScannerState = () => {
    try {
      return html5QrCodeRef.current?.getState?.() ?? SCANNER_STATE.NOT_STARTED
    } catch {
      return SCANNER_STATE.NOT_STARTED
    }
  }

  // ── Start Camera (full hardware init — used on mount & camera change ONLY) ──
  const startScanner = async (cameraId) => {
    if (!cameraId || isProcessingRef.current) return
    setScannerError('')

    // Clear any pending resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }

    // Stop any existing scan cleanly
    if (html5QrCodeRef.current) {
      try {
        const state = getScannerState()
        if (state === SCANNER_STATE.SCANNING || state === SCANNER_STATE.PAUSED) {
          await html5QrCodeRef.current.stop()
        }
      } catch {
        // Instance is corrupted — discard it, we'll create a fresh one below
        html5QrCodeRef.current = null
      }
    }

    // Reuse existing instance when possible; create fresh one if needed
    if (!html5QrCodeRef.current) {
      html5QrCodeRef.current = new Html5Qrcode(scannerId)
    }

    const config = {
      fps: 12, // Slightly higher than default for faster detection
      qrbox: { width: 250, height: 250 }
    }

    try {
      await html5QrCodeRef.current.start(
        cameraId,
        config,
        (decodedText) => handleScanSuccess(decodedText),
        () => {} // Silent callback for QR discovery failures (standard behavior)
      )
      setScanning(true)
    } catch (err) {
      console.error('[Scanner] Failed to start camera:', err)
      // Instance failed — clear so next attempt creates a fresh one
      html5QrCodeRef.current = null
      setScannerError('Failed to initialize camera. Try selecting a different camera device.')
      setScanning(false)
    }
  }

  // ── Stop Camera (full hardware teardown — only for cleanup & camera switch) ──
  const stopScanner = async () => {
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }

    if (html5QrCodeRef.current) {
      try {
        const state = getScannerState()
        if (state === SCANNER_STATE.SCANNING || state === SCANNER_STATE.PAUSED) {
          await html5QrCodeRef.current.stop()
        }
      } catch (err) {
        console.error('[Scanner] Error stopping:', err)
      }
    }
    setScanning(false)
  }

  // ── Pause Scanner (freeze video + stop decoding, but KEEP camera hardware open) ──
  const pauseScanner = () => {
    try {
      if (getScannerState() === SCANNER_STATE.SCANNING) {
        html5QrCodeRef.current.pause(true) // true = also freeze video frame
      }
    } catch (err) {
      console.error('[Scanner] Error pausing:', err)
    }
  }

  // ── Resume Scanner (unfreeze video + restart decoding — instant, no hardware re-init) ──
  const resumeScanner = () => {
    try {
      if (getScannerState() === SCANNER_STATE.PAUSED) {
        html5QrCodeRef.current.resume()
        return true
      }
    } catch (err) {
      console.error('[Scanner] Error resuming:', err)
    }
    return false
  }

  // ── Camera Init & Permission Request ──────────────────────────────────────
  const requestCameraAccess = () => {
    setScannerError('')
    
    const obtainDevices = () => {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setCameras(devices)
            // Prefer the back/environment-facing camera for gym QR scanning
            const backCam = devices.find(d => {
              const label = (d.label || '').toLowerCase()
              return label.includes('back') || label.includes('rear') || label.includes('environment')
            })
            
            if (backCam) {
              setSelectedCameraId(backCam.id)
              startScanner(backCam.id)
            } else if (devices.length > 1) {
              // If labels are empty (common in WebView), select devices[1].id for dropdown
              // (usually the back camera is the second one in the list on Android)
              // but start with facingMode environment to let the OS choose the back camera.
              setSelectedCameraId(devices[1].id)
              startScanner({ facingMode: "environment" })
            } else {
              setSelectedCameraId(devices[0].id)
              startScanner(devices[0].id)
            }
          } else {
            setScannerError('No camera devices found. Please ensure camera access is enabled.')
          }
        })
        .catch((err) => {
          console.error('[Scanner] Error listing cameras:', err)
          setScannerError('Failed to list camera devices.')
        })
    }

    // Force WebView to request native camera permission using getUserMedia
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          // Stop stream immediately to release hardware lock before Html5Qrcode takes over
          stream.getTracks().forEach(track => track.stop())
          obtainDevices()
        })
        .catch((err) => {
          console.error('[Scanner] Camera permission request failed:', err)
          setScannerError('Camera permission denied or unavailable.')
        })
    } else {
      obtainDevices()
    }
  }

  // Mount: request camera & start scanning. Unmount: full teardown.
  useEffect(() => {
    requestCameraAccess()

    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current)
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState?.() ?? SCANNER_STATE.NOT_STARTED
          if (state === SCANNER_STATE.SCANNING || state === SCANNER_STATE.PAUSED) {
            html5QrCodeRef.current.stop().catch(() => {})
          }
        } catch {
          // Ignore cleanup errors
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── QR Scan Success Handler ───────────────────────────────────────────────
  const handleScanSuccess = async (decodedText) => {
    // Race-condition-safe duplicate check using ref (React state update is async and would be too slow)
    if (isProcessingRef.current) return
    isProcessingRef.current = true
    
    // PAUSE the scanner — freezes video frame & stops decoding, but keeps camera hardware open.
    // This is the key fix: we never release the camera hardware between scans.
    pauseScanner()

    // Clear any previous resume timer
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current)
      resumeTimerRef.current = null
    }

    /**
     * Helper: schedule auto-resume after the result card is shown.
     * Tries instant resume() first; falls back to full startScanner() if resume fails.
     */
    const scheduleResume = (delayMs) => {
      isProcessingRef.current = false
      
      resumeTimerRef.current = setTimeout(() => {
        setScanResult(null)
        resumeTimerRef.current = null

        // Try instant resume (no camera re-init, zero lag)
        if (!resumeScanner()) {
          // Fallback: full restart (e.g. if pause() had failed earlier)
          const cameraId = selectedCameraIdRef.current
          if (cameraId && document.getElementById(scannerId)) {
            startScanner(cameraId)
          }
        }
      }, delayMs)
    }

    const isOffline = !navigator.onLine
    if (isOffline) {
      try {
        // Parse token locally for basic validation: MEM_SECURE_memberId_gymId_timestamp
        const parts = decodedText.split('_')
        if (parts.length < 5 || parts[0] !== 'MEM' || parts[1] !== 'SECURE' || parts[3] !== gymId) {
          throw new Error('Invalid QR Code format! ❌')
        }
        
        const memberId = parts[2]
        
        // Save to offline queue in localStorage
        const queueKey = `gymix_offline_checkins_${gymId}`
        const queue = JSON.parse(localStorage.getItem(queueKey) || '[]')
        
        if (!queue.find(q => q.qrToken === decodedText)) {
          queue.push({
            qrToken: decodedText,
            memberId,
            scannedAt: new Date().toISOString()
          })
          localStorage.setItem(queueKey, JSON.stringify(queue))
        }

        setScanResult({
          success: true,
          action: 'checkin',
          message: 'Saved Offline! Will sync when online. 💾',
          member: { full_name: 'Offline Athlete', membership_plan: 'Offline Validation' },
          time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          checkInTimeStr: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          checkOutTimeStr: null,
          durationStr: null
        })
      } catch (err) {
        setScanResult({
          success: false,
          message: err.message || 'Offline Scan Failed! ❌'
        })
      }
      scheduleResume(2500)
      return
    }

    try {
      // Execute B2B2C secure rolling token validation checks
      const result = await connectionService.logAttendanceCheckIn(gymId, decodedText)
      
      const checkInTime = result.attendance?.check_in_time 
        ? new Date(result.attendance.check_in_time)
        : null
      const checkOutTime = result.attendance?.check_out_time 
        ? new Date(result.attendance.check_out_time)
        : null

      let durationStr = null
      if (checkInTime && checkOutTime) {
        const durationMs = checkOutTime - checkInTime
        const durationMins = Math.floor(durationMs / 60000)
        const durationHrs = Math.floor(durationMins / 60)
        const displayMins = durationMins % 60
        durationStr = durationHrs > 0 ? `${durationHrs}h ${displayMins}m` : `${durationMins}m`
      }

      // Success Overlay State
      setScanResult({
        success: true,
        action: result.action,
        message: result.action === 'checkout' 
          ? 'Attendance Checked-Out successfully! 👋' 
          : 'Attendance Checked-In successfully! ✅',
        member: result.member,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        checkInTimeStr: checkInTime ? checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
        checkOutTimeStr: checkOutTime ? checkOutTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null,
        durationStr
      })
      scheduleResume(2500) // 2.5s — fast enough for busy gym queues
    } catch (err) {
      // Error Overlay State
      setScanResult({
        success: false,
        message: err.message || 'Check-in Failed! ❌'
      })
      scheduleResume(3000) // 3s for errors — slightly longer so owner can read
    }
  }

  return (
    <div className="p-6 sm:p-10 lg:p-12 max-w-2xl mx-auto space-y-8 pb-28 sm:pb-10">
      
      {/* HEADER */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="group w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Camera className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">Gate Entry</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Attendance Scanner</h1>
        </div>
      </div>

      {/* Main glass frame card */}
      <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden text-center min-h-[450px] flex flex-col justify-between">
        
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center space-y-6">
          {scannerError && (
            <div className="w-full flex flex-col items-center gap-4">
              <div className="w-full px-4.5 py-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider animate-shake">
                <ShieldAlert className="w-5 h-5 inline mr-2 text-rose-400" />
                {scannerError}
              </div>
              <button
                onClick={requestCameraAccess}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
              >
                Retry Camera Access
              </button>
            </div>
          )}

          {/* ─── SCANNER VIEW — ALWAYS MOUNTED IN DOM, NEVER REMOVED ─── */}
          <div className="w-full flex flex-col items-center space-y-6">

            {/* Cameras Dropdown selection — hidden during result overlay */}
            {cameras.length > 1 && !scanResult && (
              <div className="w-full max-w-xs flex flex-col gap-2 text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Camera Lens</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => {
                    const newId = e.target.value
                    setSelectedCameraId(newId)
                    startScanner(newId)
                  }}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3.5 text-white text-xs font-medium focus:outline-none"
                >
                  {cameras.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${cameras.indexOf(c) + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Secure Scan window wrapper — ALWAYS in DOM so camera hardware is never released */}
            <div className="relative w-64 h-64 mx-auto rounded-[2rem] overflow-hidden border border-white/5 bg-slate-950/80 p-1">
              {/* Neon flashing camera alignment lines — only visible during active scanning */}
              {scanning && !scanResult && (
                <div className="absolute inset-0 z-10 pointer-events-none border-2 border-emerald-500/20 rounded-[2rem] overflow-hidden">
                  {/* Highly performant CSS-only Laser scanner effect line */}
                  <>
                    <style>{`
                      @keyframes scanLaser {
                        0% { top: 0%; }
                        50% { top: 100%; }
                        100% { top: 0%; }
                      }
                      .animate-laser {
                        animation: scanLaser 3s linear infinite;
                      }
                    `}</style>
                    <div className="w-full h-0.5 bg-emerald-500 absolute top-0 animate-laser" style={{ boxShadow: '0 0 8px #10B981' }} />
                  </>
                </div>
              )}

              {/* HTML5 QR Container — PERMANENTLY in DOM. Never unmounted. */}
              <div 
                id={scannerId} 
                className="w-full h-full rounded-[2rem] overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
              />
            </div>

            {/* Instructions & toggle — hidden during result overlay */}
            {!scanResult && (
              <>
                <div className="space-y-1">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">ALIGN MEMBER QR CODE</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">System matches rolling sessions dynamically</p>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => {
                      if (scanning) stopScanner()
                      else startScanner(selectedCameraId)
                    }}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                      scanning 
                        ? 'bg-rose-500/10 border border-rose-500/15 text-rose-400 hover:bg-rose-500/20' 
                        : 'bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {scanning ? 'Stop Camera' : 'Start Camera'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── RESULT OVERLAY — Absolute positioned over the glass card ─── */}
        {/* This covers the frozen camera view without unmounting it */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              key="result-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-6 sm:p-8 bg-[#12141C]/98 rounded-[2.5rem]"
            >
              <div className={`w-full max-w-sm p-8 rounded-[2rem] border relative overflow-hidden flex flex-col items-center justify-center space-y-6 ${
                scanResult.success 
                  ? scanResult.action === 'checkout'
                    ? 'bg-sky-500/5 border-sky-500/20 text-sky-400'
                    : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
              }`}>

                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${
                  scanResult.success 
                    ? scanResult.action === 'checkout'
                      ? 'bg-sky-500/10 border border-sky-500/20'
                      : 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-rose-500/10 border border-rose-500/20'
                }`}>
                  {scanResult.success ? (
                    scanResult.action === 'checkout' ? (
                      <LogOut className="w-8 h-8 text-sky-400" />
                    ) : (
                      <LogIn className="w-8 h-8 text-emerald-400" />
                    )
                  ) : (
                    <ShieldAlert className="w-8 h-8 text-rose-400" />
                  )}
                </div>

                <div className="space-y-2 relative z-10">
                  <h4 className="text-xl font-black uppercase italic tracking-tight">
                    {scanResult.success 
                      ? scanResult.action === 'checkout'
                        ? 'Access Granted - Check-Out'
                        : 'Access Granted - Check-In' 
                      : 'Access Denied'}
                  </h4>
                  <p className="text-xs font-bold leading-relaxed max-w-xs mx-auto text-slate-400 uppercase tracking-wide">
                    {scanResult.message}
                  </p>
                </div>

                {scanResult.success && scanResult.member && (
                  <div className="w-full max-w-sm p-4.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3.5 pt-4 text-left relative z-10">
                    <div className="flex justify-between items-baseline text-xs font-semibold text-slate-500">
                      <span>ATHLETE</span>
                      <strong className="text-white text-sm font-black uppercase italic">{scanResult.member.full_name}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                      <span>ACTIVE PLAN</span>
                      <span className={`font-bold uppercase tracking-wider ${
                        scanResult.action === 'checkout' ? 'text-sky-400' : 'text-emerald-400'
                      }`}>{scanResult.member.membership_plan}</span>
                    </div>

                    {scanResult.action === 'checkout' ? (
                      <>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                          <span>CHECK-IN TIME</span>
                          <span className="text-white font-semibold">{scanResult.checkInTimeStr || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                          <span>CHECK-OUT TIME</span>
                          <span className="text-sky-400 font-bold">{scanResult.checkOutTimeStr || scanResult.time}</span>
                        </div>
                        {scanResult.durationStr && (
                          <div className="flex justify-between items-center text-xs font-semibold text-slate-500 pt-2 border-t border-white/5">
                            <span>SESSION DURATION</span>
                            <span className="text-white font-black uppercase tracking-wider bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">{scanResult.durationStr}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
                        <span>CHECK-IN TIME</span>
                        <span className="text-emerald-400 font-bold">{scanResult.time}</span>
                      </div>
                    )}
                  </div>
                )}
                
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest pt-2 animate-pulse">
                  System returning to live scanner feed shortly...
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
