import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus, Sparkles } from 'lucide-react'
import { useMembers } from '../../hooks/useMembers'
import MemberForm from './MemberForm'

export default function AddMemberPage() {
  const navigate = useNavigate()
  const { addMember } = useMembers()

  const handleSubmit = async (formData) => {
    await addMember(formData)
    navigate('/members')
  }

  return (
    <div className="p-6 sm:p-10 lg:p-12 max-w-3xl mx-auto space-y-10 pb-28 sm:pb-10">
      {/* Header */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/members')}
          className="group w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all duration-300"
          aria-label="Back to members"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">Registration</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">New Athlete</h1>
        </div>
      </div>

      {/* Form card */}
      <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <MemberForm
            mode="add"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/members')}
          />
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 max-w-sm mx-auto sm:mx-0">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Verification required for access</p>
      </div>
    </div>
  )
}
