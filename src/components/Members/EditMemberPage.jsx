import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, ShieldCheck, AlertCircle } from 'lucide-react'
import { getMemberById } from '../../services/memberService'
import { useMembers } from '../../hooks/useMembers'
import MemberForm from './MemberForm'
import StatusBadge from '../UI/StatusBadge'

export default function EditMemberPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { editMember } = useMembers()

  const [member, setMember] = useState(null)
  const [loadingMember, setLoadingMember] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  useEffect(() => {
    let active = true
    getMemberById(id)
      .then((data) => { if (active) setMember(data) })
      .catch((err) => { if (active) setFetchError(err.message) })
      .finally(() => { if (active) setLoadingMember(false) })
    return () => { active = false }
  }, [id])

  const handleSubmit = async (formData) => {
    // Only pass editable fields to the update
    const { full_name, phone_number, membership_plan, expiry_date, notes, gender } = formData
    await editMember(id, { full_name, phone_number, membership_plan, expiry_date, notes, gender })
    navigate('/members')
  }

  if (loadingMember) {
    return (
      <div className="p-12 flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (fetchError || !member) {
    return (
      <div className="p-12 text-center max-w-md mx-auto">
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <AlertCircle className="w-10 h-10 text-rose-400" />
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Access Error</h3>
        <p className="text-slate-500 mb-8 font-medium leading-relaxed">{fetchError || "Athlete profile not found in our encrypted records."}</p>
        <button
          onClick={() => navigate('/members')}
          className="w-full py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs font-black uppercase tracking-widest transition-all border border-white/5 shadow-xl"
        >
          Return to Ledger
        </button>
      </div>
    )
  }

  // Map DB fields → form defaults
  const initialValues = {
    full_name: member.full_name ?? '',
    phone_number: member.phone_number ?? '',
    gender: member.gender ?? '',
    membership_plan: member.membership_plan ?? '',
    join_date: member.join_date ?? '',
    expiry_date: member.expiry_date ?? '',
    notes: member.notes ?? '',
  }

  return (
    <div className="p-6 sm:p-10 lg:p-12 max-w-3xl mx-auto space-y-10 pb-28 sm:pb-10">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/members')}
          className="group w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl"
          aria-label="Back to members"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">Profile Modification</p>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-white tracking-tighter truncate max-w-[200px] sm:max-w-none">
              {member.full_name}
            </h1>
            <StatusBadge status={member.status} />
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 sm:p-12 relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <MemberForm
            mode="edit"
            initialValues={initialValues}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/members')}
          />
        </div>
      </div>
    </div>
  )
}
