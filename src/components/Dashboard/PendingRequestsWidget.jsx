import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users, UserPlus, Check, X, ShieldAlert, Sparkles, UserCheck 
} from 'lucide-react'
import { connectionService } from '../../services/connectionService'
import SmartApprovalModal from './SmartApprovalModal'
import { toast } from 'react-hot-toast'
import ConfirmModal from '../UI/ConfirmModal'

export default function PendingRequestsWidget({ gymId, gymCode, onRefreshStats, refreshKey }) {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReq, setSelectedReq] = useState(null)
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
      // Remove from local list
      setRequests(prev => prev.filter(r => r.id !== rejectTargetId))
      setRejectTargetId(null)
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
      // Remove from local list
      setRequests(prev => prev.filter(r => r.id !== request.id))
      // Trigger dashboard/athletes stats sync
      if (onRefreshStats) {
        onRefreshStats()
      }
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
          <p className="text-slate-500 text-[10px] leading-relaxed max-w-[240px] mx-auto uppercase">
            Share your gym code <strong className="text-emerald-400 font-mono tracking-widest">{gymCode || 'active'}</strong> with members. When they enter the code in their app, their requests will appear here for you to approve or reject!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 relative overflow-hidden group border-2 border-emerald-500/30">

      <div className="flex items-center gap-4 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shadow-inner">
          <UserPlus className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="text-[#F8FAFC] font-bold text-lg">Connection Requests</h3>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-0.5">{requests.length} Athlete{requests.length === 1 ? '' : 's'} Awaiting Approval</p>
        </div>
      </div>

      {/* Roster list */}
      <div className="space-y-3 relative z-10 max-h-[300px] overflow-y-auto hide-scrollbar">
        {requests.map((req) => (
          <div
            key={req.id}
            className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4 group/item hover:border-emerald-500/20 transition-all duration-200"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-white text-xs font-black uppercase shadow-inner">
                {req.profiles?.avatar_url ? (
                  <img src={req.profiles.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  req.profiles?.full_name?.slice(0, 1) || 'M'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate leading-tight">{req.profiles?.full_name}</p>
                <p className="text-[#94A3B8] text-[10px] truncate mt-0.5">{req.profiles?.email}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleReject(req.id)}
                disabled={processingId === req.id}
                className="w-9 h-9 rounded-xl bg-white/[0.02] hover:bg-rose-500/10 border border-white/5 hover:border-rose-500/15 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                title="Reject Connection"
              >
                <X className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => {
                  setSelectedReq(req)
                  setModalOpen(true)
                }}
                disabled={processingId === req.id}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-emerald-500/10 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>

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
        title="Reject Connection"
        message="Are you sure you want to reject and delete this request?"
        confirmLabel="Reject"
        loading={processingId === rejectTargetId}
        onConfirm={executeReject}
        onCancel={() => setRejectTargetId(null)}
      />
    </div>
  )
}
