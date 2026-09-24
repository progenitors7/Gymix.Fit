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
import { useRealtimeSync } from '../../hooks/useRealtimeSync'

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

  // Live Supabase Realtime Sync for connection requests
  useRealtimeSync({
    gymId,
    tables: ['connection_requests'],
    onUpdate: () => {
      fetchRequests()
      if (onRefreshStats) onRefreshStats()
    }
  })

  // Handle request rejection
  const handleReject = (reqId) => {
    setRejectTargetId(reqId)
  }

  const executeReject = async () => {
    if (!rejectTargetId) return
    setProcessingId(rejectTargetId)
    try {
      await connectionService.rejectConnectionRequest(rejectTargetId)
      toast.success('Connection request rejected.')
      setRejectTargetId(null)
      if (previewReq?.id === rejectTargetId) {
        setPreviewReq(null)
      }
      fetchRequests()
      if (onRefreshStats) onRefreshStats()
    } catch (err) {
      console.error('Error rejecting request:', err)
      toast.error('Failed to reject connection request.')
    } finally {
      setProcessingId(null)
    }
  }

  // Handle smart approval complete
  const handleApproveSubmit = async () => {
    setModalOpen(false)
    setSelectedReq(null)
    fetchRequests()
    if (onRefreshStats) onRefreshStats()
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center justify-center min-h-[140px]">
        <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 text-left shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Connection Requests</h3>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono ml-auto">0 pending</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-950/40 border border-slate-200/60 dark:border-white/[0.04] text-center space-y-1">
          <p className="text-slate-600 dark:text-zinc-300 text-xs font-medium">Ready to onboard athletes?</p>
          <p className="text-slate-400 dark:text-zinc-500 text-[11px] leading-relaxed max-w-[280px] mx-auto">
            Share code <strong className="text-violet-600 dark:text-violet-400 font-mono">{gymCode || 'active'}</strong> with members.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white/80 dark:bg-zinc-900/40 border border-violet-500/30 rounded-2xl p-4.5 text-left shadow-xs space-y-3.5">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-violet-500" />
            <div>
              <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Connection Requests</h3>
              <p className="text-violet-600 dark:text-violet-400 text-xs font-medium">
                {requests.length} Athlete{requests.length === 1 ? '' : 's'} waiting
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 font-semibold text-[10px] uppercase tracking-wider">
            Action Needed
          </span>
        </div>

        {/* Requests List Cards */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-0.5 hide-scrollbar">
          {requests.map((req) => {
            const profile = req.profiles || {}
            const timeAgo = formatTimeAgo(req.created_at)

            return (
              <div
                key={req.id}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 hover:border-emerald-500/40 transition-colors space-y-2.5"
              >
                {/* Athlete Profile Header */}
                <div className="flex items-start gap-2.5">
                  <div 
                    onClick={() => setPreviewReq(req)}
                    className="relative w-10 h-10 rounded-xl bg-slate-200 dark:bg-zinc-700 overflow-hidden shrink-0 cursor-pointer flex items-center justify-center"
                    title="Tap to preview full photo"
                  >
                    {profile.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt={profile.full_name || 'Athlete'} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-slate-700 dark:text-zinc-200 text-xs font-bold uppercase">
                        {profile.full_name?.slice(0, 2) || 'M'}
                      </span>
                    )}
                  </div>

                  {/* Name and Badges */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <h4 
                        onClick={() => setPreviewReq(req)}
                        className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {profile.full_name || 'Athlete'}
                      </h4>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 shrink-0">
                        {timeAgo}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {profile.email && (
                        <span className="text-[10px] text-slate-500 dark:text-zinc-400 truncate max-w-full">
                          {profile.email}
                        </span>
                      )}
                      {profile.phone_number && (
                        <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                          • {profile.phone_number}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-zinc-700/60">
                  <button
                    type="button"
                    onClick={() => setPreviewReq(req)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                    <span>View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReject(req.id)}
                    disabled={processingId === req.id}
                    className="py-1.5 px-2.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Reject
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReq(req)
                      setModalOpen(true)
                    }}
                    disabled={processingId === req.id}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
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
          <div 
            onClick={() => setPreviewReq(null)}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-xl relative"
            >
              <button
                onClick={() => setPreviewReq(null)}
                className="absolute top-4 right-4 w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-left">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                  Athlete Profile
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Verify Athlete Details
                </h3>
              </div>

              {/* Avatar */}
              <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center">
                {previewReq.profiles?.avatar_url ? (
                  <img
                    src={previewReq.profiles.avatar_url}
                    alt={previewReq.profiles?.full_name || 'Athlete'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-slate-700 dark:text-zinc-200 text-2xl font-bold uppercase">
                    {previewReq.profiles?.full_name?.slice(0, 2) || 'M'}
                  </span>
                )}
              </div>

              {/* Profile Details List */}
              <div className="space-y-2 text-left bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">Name</p>
                  <p className="font-bold text-slate-900 dark:text-white">{previewReq.profiles?.full_name || 'Not Provided'}</p>
                </div>

                <div className="border-t border-slate-200 dark:border-zinc-700/60 pt-2">
                  <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">Email</p>
                  <p className="text-slate-700 dark:text-zinc-300 break-all">{previewReq.profiles?.email || '—'}</p>
                </div>

                <div className="border-t border-slate-200 dark:border-zinc-700/60 pt-2 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-zinc-500">Phone</p>
                    <p className="text-slate-700 dark:text-zinc-300">{previewReq.profiles?.phone_number || 'None'}</p>
                  </div>
                  {previewReq.profiles?.phone_number && (
                    <div className="flex gap-1.5">
                      <a
                        href={`tel:${previewReq.profiles.phone_number}`}
                        className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        Call
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleReject(previewReq.id)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = previewReq
                    setPreviewReq(null)
                    setSelectedReq(target)
                    setModalOpen(true)
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  Approve Plan
                </button>
              </div>
            </motion.div>
          </div>
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
        message="Are you sure you want to reject this connection request?"
        confirmLabel="Reject Request"
        loading={processingId === rejectTargetId}
        onConfirm={executeReject}
        onCancel={() => setRejectTargetId(null)}
      />
    </>
  )
}
