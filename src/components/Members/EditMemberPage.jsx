import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, User, ShieldCheck, AlertCircle } from 'lucide-react'
import { getMemberById } from '../../services/memberService'
import { useMembers } from '../../hooks/useMembers'
import MemberForm from './MemberForm'
import StatusBadge from '../UI/StatusBadge'
import MemberAttendanceCard from './MemberAttendanceCard'

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
    // Only pass editable identity/profile fields to the update
    const { full_name, phone_number, notes, gender, biometric_user_id, avatar_url, status } = formData
    await editMember(id, { full_name, phone_number, notes, gender, biometric_user_id, avatar_url, status })
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
        <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="w-10 h-10 text-rose-400" />
        </div>
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Access Error</h3>
        <p className="text-slate-500 mb-8 font-medium leading-relaxed">{fetchError || "Athlete profile not found in our encrypted records."}</p>
        <button
          onClick={() => navigate('/members')}
          className="w-full py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-white text-xs font-black uppercase tracking-widest transition-all border border-white/5"
        >
          Return to Members
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
    biometric_user_id: member.biometric_user_id ?? '',
    avatar_url: member.avatar_url ?? '',
    status: member.status ?? 'active',
  }

  return (
    <div className="p-6 sm:p-10 lg:p-12 max-w-[1400px] mx-auto space-y-10 pb-28 sm:pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/members')}
          className="group w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
          aria-label="Back to members"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">Profile Modification</p>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[200px] sm:max-w-none">
              {member.full_name}
            </h1>
            <StatusBadge status={member.status} />
          </div>
        </div>
      </div>

      {/* Two Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        {/* Column 1: Form card (spans 3) */}
        <div className="lg:col-span-3 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-10 bg-white dark:bg-zinc-900 shadow-xs relative overflow-hidden">
          <div className="relative z-10">
            <MemberForm
              mode="edit"
              initialValues={initialValues}
              onSubmit={handleSubmit}
              onCancel={() => navigate('/members')}
            />
          </div>
        </div>

        {/* Column 2: Reusable MemberAttendanceCard (spans 2) */}
        <div className="lg:col-span-2">
          <MemberAttendanceCard 
            memberId={member.id} 
            memberName={member.full_name} 
            joinDate={member.join_date} 
          />
        </div>

      </div>
    </div>
  )
}
