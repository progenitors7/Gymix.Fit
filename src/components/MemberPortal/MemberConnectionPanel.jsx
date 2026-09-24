import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, Building, Send, Clock, RefreshCw, AlertCircle, Activity, Camera, X } from 'lucide-react'

export default function MemberConnectionPanel({
  gymCode,
  setGymCode,
  connectionReq,
  scannedGym,
  scannedGymLoading,
  submittingReq,
  handleConnect,
  handleCancelRequest,
  handleClearScannedGym,
  loadMemberSystem
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const html5QrCodeRef = useRef(null)
  const scannerId = 'member-join-qr-reader'

  const startScanner = async () => {
    setScannerError('')
    try {
      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        setScannerError('No camera devices found.')
        return
      }

      const backCam = devices.find(d => {
        const label = (d.label || '').toLowerCase()
        return label.includes('back') || label.includes('rear') || label.includes('environment')
      })
      const cameraId = backCam ? backCam.id : devices[0].id

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerId)
      }

      await html5QrCodeRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 200, height: 200 }
        },
        (decodedText) => {
          handleScanSuccess(decodedText)
        },
        () => {} // silent error callback
      )
    } catch (err) {
      console.error('Failed to start camera:', err)
      setScannerError('Camera access denied or failed to initialize.')
    }
  }

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
      } catch (err) {
        console.error('Failed to stop camera:', err)
      }
      html5QrCodeRef.current = null
    }
  }

  const handleScanSuccess = async (decodedText) => {
    try {
      let extractedCode = decodedText
      if (decodedText.includes('/join/')) {
        const match = decodedText.match(/\/join\/([^/?#\s]+)/)
        if (match) {
          extractedCode = match[1]
        }
      } else if (decodedText.startsWith('gymix-connect:')) {
        extractedCode = decodedText.replace('gymix-connect:', '')
      }

      const normalized = extractedCode.toUpperCase().trim()
        .replace(/I/g, '1')
        .replace(/O/g, '0')
        .replace(/L/g, '1')

      localStorage.setItem('scanned_gym_code', normalized)

      await stopScanner()
      setIsScanning(false)

      if (loadMemberSystem) {
        loadMemberSystem()
      }
    } catch (err) {
      console.error('Error handling scan success:', err)
    }
  }

  useEffect(() => {
    if (isScanning) {
      const timer = setTimeout(() => {
        startScanner()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }
  }, [isScanning])

  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [])

  const inputCls = 'w-full pl-12 pr-5 py-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 text-sm font-semibold focus:outline-none focus:border-violet-500 transition-all'

  return (
    <div className="space-y-6 pt-4 max-w-md mx-auto w-full">
      {/* CASE 1: NOT CONNECTED (Show Gym Code input panel) */}
      {!connectionReq ? (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-600 dark:text-violet-400">
              <QrCode className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Connect your Pass</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed max-w-sm mx-auto">
              Enter your local gym's custom gateway code or scan their QR poster to claim your active membership pass.
            </p>
          </div>

          {scannedGymLoading ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-4">
              <div className="w-8 h-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Verifying gym poster...</p>
            </div>
          ) : scannedGym ? (
            /* PRE-FILLED SCANNED GYM CONFIRMATION PANEL */
            <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-6 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center mx-auto text-slate-700 dark:text-zinc-200">
                  <Building className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Gym Poster Detected</span>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white pt-1">
                    {scannedGym.gym_name}
                  </h3>
                  <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
                    You scanned the QR poster. Click below to immediately submit your connection request to the receptionist terminal.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 space-y-4">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400 px-2">
                    <span>Terminal Code</span>
                    <span className="text-violet-600 dark:text-violet-400 font-mono font-bold tracking-widest bg-violet-500/10 px-2.5 py-1 rounded-lg border border-violet-500/20">{scannedGym.unique_code}</span>
                  </div>

                  <button
                    onClick={() => handleConnect()}
                    disabled={submittingReq}
                    className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submittingReq ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Connection
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleClearScannedGym}
                    type="button"
                    className="block mx-auto text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white uppercase tracking-wider transition-colors pt-1 cursor-pointer"
                  >
                    Enter code manually instead
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MANUAL GYM CODE ENTRY */
            <div className="space-y-4">
              <form onSubmit={handleConnect} className="space-y-4">
                <div className="relative group">
                  <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-violet-500 transition-colors" />
                  <input
                    type="text"
                    placeholder="ENTER GYM CODE (E.G. AX7Y9D)"
                    value={gymCode}
                    onChange={(e) => setGymCode(e.target.value.toUpperCase())}
                    maxLength={10}
                    disabled={submittingReq}
                    required
                    className={inputCls}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReq}
                  className="w-full py-3.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold uppercase tracking-wider rounded-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submittingReq ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Connect Terminal
                    </>
                  )}
                </button>
              </form>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-zinc-800"></div></div>
                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-wider"><span className="bg-slate-50 dark:bg-zinc-950 px-3 text-slate-400">OR</span></div>
              </div>

              <button
                type="button"
                onClick={() => setIsScanning(true)}
                className="w-full py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider rounded-xl active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                Scan QR Code
              </button>
            </div>
          )}

          {/* SCANNING MODAL */}
          {isScanning && (
            <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs">
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-6 text-center space-y-6 relative">
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                    <Camera className="w-4 h-4" />
                    Scan QR Code
                  </div>
                  <button
                    onClick={() => setIsScanning(false)}
                    className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {scannerError && (
                  <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                    {scannerError}
                  </div>
                )}

                {/* Scanner window */}
                <div className="relative w-56 h-56 mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-700 bg-slate-950 p-1">
                  <div id={scannerId} className="w-full h-full rounded-xl overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
                </div>

                <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium max-w-xs mx-auto">
                  Align the gym's printed QR poster code within the frame to connect instantly
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* CASE 2: CONNECTION REQUEST PENDING (Awaiting Approval) */
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-6 relative overflow-hidden pt-10">
          <div className="relative space-y-6 z-10">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-600 dark:text-violet-400">
              <Clock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">Pending Reception Approval</span>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white pt-1">
                Awaiting Activation
              </h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed max-w-xs mx-auto">
                Your request to connect to <strong className="text-slate-900 dark:text-white">"{connectionReq.gyms?.gym_name}"</strong> has been queued. Ask the gym desk to activate your gate pass.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-3">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400 px-2">
                <span>Gym Code</span>
                <span className="text-slate-900 dark:text-white font-mono font-bold">{connectionReq.gyms?.unique_code}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={loadMemberSystem}
                  className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-semibold uppercase tracking-wider transition-all border border-slate-200 dark:border-zinc-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Pass
                </button>

                <button
                  onClick={handleCancelRequest}
                  className="flex-1 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider transition-all border border-rose-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
