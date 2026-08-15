import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, UserPlus, Check, X, ShieldAlert, Sparkles, UserCheck,
  Eye, Phone, Mail, Clock, MessageSquare, ExternalLink, Calendar
} from 'lucide-react'
import { connectionService } from '../../services/connectionService'
import SmartApprovalModal from './SmartApprovalModal'
import { toast } from 'react-hot-toast'
import ConfirmModal from '../UI/ConfirmModal'

function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Recently'
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  } catch {
    return 'Recently'
  }
}

export default function PendingRequestsWidget({ gymId, gymCode, onRefreshStats, refreshKey }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReq, setSelectedReq] = useState(null)
  const [previewReq, setPreviewReq] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [processingId, setProcessingId] = useState(null)
  const [rejectTargetId, setRejectTargetId] = useState(null)

  // Fetch pending connection requests
  const fetchRequests = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    try {
      const data = await connectionService.getConnectionRequests(gymId)
      setRequests(data)
    } catch (err) {
      console.error('Error fetching connection requests:', err)
    } finally {
      setLoading(false)
    }
  }, [gymId])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests, refreshKey])

  // Handle request rejection
  const handleReject = (requestId) => {
    setRejectTargetId(requestId)
  }

  const executeReject = async () => {
    if (!rejectTargetId) return
    
    setProcessingId(rejectTargetId)
    try {
      await connectionService.rejectConnectionRequest(rejectTargetId)
      setRequests(prev => prev.filter(r => r.id !== rejectTargetId))
      setRejectTargetId(null)
      if (previewReq?.id === rejectTargetId) {
        setPreviewReq(null)
      }
      toast.success('Connection request rejected')
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      toast.error(err.message || 'Failed to reject request')
    } finally {
      setProcessingId(null)
    }
  }

  // Handle request approval submit
  const handleApproveSubmit = async (request, memberData, paymentData) => {
    try {
      await connectionService.approveConnectionRequest(request, memberData, paymentData)
      setRequests(prev => prev.filter(r => r.id !== request.id))
      if (previewReq?.id === request.id) {
        setPreviewReq(null)
      }
      toast.success('Athlete connection approved! 🎉')
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      throw err
    }
  }

  if (loading) {
    return (
      <div className="glass-card rounded-3xl p-6 relative overflow-hidden flex items-center justify-center min-h-[160px]">
        <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden group border border-white/5">
        <div className="flex items-center gap-4 mb-5 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center border border-white/5 text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-[#F8FAFC] font-bold text-base">Connection Requests</h3>
            <p className="text-slate-500 text-xs font-medium">0 Awaiting Approval</p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white/[0.01] border border-dashed border-white/5 text-center space-y-2">
          <p className="text-[#94A3B8] text-xs font-semibold">Ready to onboard new athletes?</p>
          <p className="text-slate-500 text-[10px] leading-relaxed max-w-[280px] mx-auto uppercase tracking-wide">
            Share your gym code <strong className="text-emerald-400 font-mono tracking-widest">{gymCode || 'active'}</strong> with members. When they enter the code in their app, their requests will appear here for you to review and approve!
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="glass-card rounded-3xl p-5 sm:p-7 relative overflow-hidden group border-2 border-emerald-500/30 bg-gradient-to-b from-[#1A1F2B] to-[#121620] shadow-2xl">
        
        {/* Header with active pulse */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-inner">
              <UserPlus className="w-6 h-6 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <h3 className="text-[#F8FAFC] font-extrabold text-base sm:text-lg tracking-tight">Connection Requests</h3>
              <p className="text-emerald-400 text-[10px] sm:text-xs font-black uppercase tracking-wider mt-0.5">
                {requests.length} Athlete{requests.length === 1 ? '' : 's'} Awaiting Approval
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black text-[10px] uppercase tracking-wider">
            Review
          </span>
        </div>

        {/* Requests List Cards */}
        <div className="space-y-4 relative z-10 max-h-[420px] overflow-y-auto pr-1 hide-scrollbar">
          {requests.map((req) => {
            const profile = req.profiles || {}
            const timeAgo = formatTimeAgo(req.created_at)

            return (
              <div
                key={req.id}
                className="p-4 rounded-2xl bg-[#151922] border border-white/10 hover:border-emerald-500/30 transition-all duration-200 space-y-3.5 shadow-md"
              >
                {/* Athlete Profile Header */}
                <div className="flex items-start gap-3.5">
                  {/* Zoomable Avatar */}
                  <div 
                    onClick={() => setPreviewReq(req)}
                    className="group relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800 border-2 border-white/10 overflow-hidden flex-shrink-0 cursor-pointer shadow-inner flex items-center justify-center transition-transform active:scale-95 hover:border-emerald-400/60"
                    title="Tap to preview full photo & identity"
                  >
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name || 'Athlete'} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-white text-base sm:text-lg font-black uppercase">
                        {profile.full_name?.slice(0, 2) || 'M'}
                      </span>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Name and Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 
                        onClick={() => setPreviewReq(req)}
                        className="text-sm sm:text-base font-extrabold text-white leading-snug break-words cursor-pointer hover:text-emerald-400 transition-colors"
                      >
                        {profile.full_name || 'Unknown Athlete'}
                      </h4>
                      <span className="flex-shrink-0 text-[9px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo}
                      </span>
                    </div>

                    {/* Meta information tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {profile.email && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300 text-[10px] font-medium max-w-[200px] truncate">
                          <Mail className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{profile.email}</span>
                        </span>
                      )}

                      {profile.phone_number ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[10px] font-bold">
                          <Phone className="w-2.5 h-2.5 text-sky-400" />
                          <span>{profile.phone_number}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/[0.03] text-slate-500 text-[9px] font-bold uppercase">
                          No phone
                        </span>
                      )}

                      {profile.gender && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400 text-[9px] font-bold uppercase">
                          {profile.gender}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setPreviewReq(req)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-slate-300 hover:text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#3B82F6]" />
                    <span>Inspect</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                    title="Reject Request"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReq(req)
                      setModalOpen(true)
                    }}
                    disabled={processingId === req.id}
                    className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    <span>Approve</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Athlete Full Identity Preview Modal ── */}
      <AnimatePresence>
        {previewReq && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewReq(null)}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#151922] border border-white/10 rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full text-center space-y-6 shadow-2xl relative"
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewReq(null)}
                className="absolute top-5 right-5 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-left space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                  Athlete Identity Inspection
                </span>
                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">
                  Verify Profile Details
                </h3>
              </div>

              {/* Large High-Res Avatar */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 mx-auto rounded-3xl bg-slate-900 border-4 border-emerald-500/30 overflow-hidden shadow-2xl flex items-center justify-center">
                {previewReq.profiles?.avatar_url ? (
                  <img
                    src={previewReq.profiles.avatar_url}
                    alt={previewReq.profiles?.full_name || 'Athlete'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white text-3xl font-black uppercase">
                    {previewReq.profiles?.full_name?.slice(0, 2) || 'M'}
                  </span>
                )}
              </div>

              {/* Profile Details List */}
              <div className="space-y-2 text-left bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Full Name</p>
                  <p className="text-base font-extrabold text-white">{previewReq.profiles?.full_name || 'Not Provided'}</p>
                </div>

                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Google Email</p>
                    <p className="text-xs font-bold text-slate-300 break-all">{previewReq.profiles?.email || '—'}</p>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-2 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Phone Number</p>
                    <p className="text-xs font-bold text-slate-300">{previewReq.profiles?.phone_number || 'Not Linked Yet'}</p>
                  </div>
                  {previewReq.profiles?.phone_number && (
                    <div className="flex gap-1.5">
                      <a
                        href={`tel:${previewReq.profiles.phone_number}`}
                        className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-black uppercase flex items-center gap-1 hover:bg-sky-500/20"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                      <a
                        href={`https://api.whatsapp.com/send?phone=${previewReq.profiles.phone_number.replace(/\D/g, '')}&text=${encodeURIComponent(`Hi ${previewReq.profiles.full_name}, regarding your Gymix gym connection request:`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-1 hover:bg-emerald-500/20"
                      >
                        <MessageSquare className="w-3 h-3" />
                        WhatsApp
                      </a>
                    </div>
                  )}
                </div>

                <div className="border-t border-white/5 pt-2 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Gender</p>
                    <p className="font-bold text-slate-300 uppercase">{previewReq.profiles?.gender || 'Unspecified'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Requested</p>
                    <p className="font-bold text-slate-300">{formatTimeAgo(previewReq.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons in Modal */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleReject(previewReq.id)
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = previewReq
                    setPreviewReq(null)
                    setSelectedReq(target)
                    setModalOpen(true)
                  }}
                  className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Approve & Setup Plan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Onboarding Dialog */}
      <SmartApprovalModal
        open={modalOpen}
        request={selectedReq}
        onClose={() => {
          setModalOpen(false)
          setSelectedReq(null)
        }}
        onApproved={handleApproveSubmit}
      />

      <ConfirmModal
        open={!!rejectTargetId}
        title="Reject Connection Request"
        message="Are you sure you want to reject this connection request? The athlete will need to re-submit their connection code."
        confirmLabel="Reject Request"
        loading={processingId === rejectTargetId}
        onConfirm={executeReject}
        onCancel={() => setRejectTargetId(null)}
      />
    </>
  )
}
