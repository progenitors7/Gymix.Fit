import { QrCode, Building, Send, Clock, RefreshCw, AlertCircle, Activity } from 'lucide-react'

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
  const inputCls = 'w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.04] focus:border-[#3B82F6]/50 focus:ring-1 focus:ring-[#3B82F6]/30 transition-all'

  return (
    <div className="space-y-6 pt-4 max-w-md mx-auto w-full">
      {/* CASE 1: NOT CONNECTED (Show Gym Code input panel) */}
      {!connectionReq ? (
        <div className="space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-[#1A1F2B] border border-white/5 shadow-inner flex items-center justify-center mx-auto mb-4 relative overflow-hidden group">
              <QrCode className="w-8 h-8 text-slate-400 group-hover:text-[#3B82F6] transition-colors" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">Connect your Pass</h2>
            <p className="text-slate-400 text-xs font-semibold leading-relaxed max-w-sm mx-auto">
              Enter your local gym's custom gateway code or scan their QR poster to claim your active membership pass.
            </p>
          </div>

          {scannedGymLoading ? (
            <div className="bg-[#1A1F2B] border border-white/5 rounded-3xl p-8 text-center space-y-4">
              <div className="w-8 h-8 border-2 border-[#3B82F6]/20 border-t-[#3B82F6] rounded-full animate-spin mx-auto" />
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Verifying gym poster...</p>
            </div>
          ) : scannedGym ? (
            /* PRE-FILLED SCANNED GYM CONFIRMATION PANEL */
            <div className="bg-[#1A1F2B] border border-white/5 rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden">
              <div className="relative z-10 space-y-6">
                <div className="w-16 h-16 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto shadow-inner">
                  <Building className="w-8 h-8 text-slate-400" />
                </div>

                <div className="space-y-2">
                  <span className="px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400">Gym Poster Detected</span>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight pt-1">
                    {scannedGym.gym_name}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto font-medium">
                    You scanned the QR poster. Click below to immediately submit your connection request to the receptionist terminal.
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                    <span>Terminal Code</span>
                    <span className="text-[#3B82F6] font-mono font-black tracking-widest bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">{scannedGym.unique_code}</span>
                  </div>

                  <button
                    onClick={() => handleConnect()}
                    disabled={submittingReq}
                    className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
                    className="block mx-auto text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-wider transition-colors pt-1 cursor-pointer"
                  >
                    Enter code manually instead
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* MANUAL GYM CODE ENTRY */
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="relative group">
                <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3B82F6] transition-colors" />
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
                className="w-full py-4.5 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-xs font-black uppercase tracking-widest rounded-2xl active:scale-95 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
          )}
        </div>
      ) : (
        /* CASE 2: CONNECTION REQUEST PENDING (Awaiting Approval) */
        <div className="bg-[#1A1F2B] border border-white/5 rounded-[2.5rem] p-8 text-center space-y-6 relative overflow-hidden pt-10">
          <div className="relative space-y-6 z-10">
            <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-[#3B82F6]" />
            </div>

            <div className="space-y-2">
              <span className="px-3.5 py-1 rounded-full bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[9px] font-black uppercase tracking-widest text-[#3B82F6]">Pending Reception Approval</span>
              <h3 className="text-xl font-black text-white uppercase italic tracking-tight pt-1">
                Awaiting Activation
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                Your request to connect to <strong className="text-white">"{connectionReq.gyms?.gym_name}"</strong> has been queued. Ask the gym desk to activate your gate pass.
              </p>
            </div>

            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2">
                <span>Gym Code</span>
                <span className="text-white font-mono font-black">{connectionReq.gyms?.unique_code}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={loadMemberSystem}
                  className="flex-1 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] text-white text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Sync Pass
                </button>

                <button
                  onClick={handleCancelRequest}
                  className="flex-1 py-3.5 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase tracking-widest transition-all border border-rose-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
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
