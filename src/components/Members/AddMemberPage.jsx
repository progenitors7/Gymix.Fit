import { useNavigate } from 'react-router-dom'
import { ArrowLeft, UserPlus } from 'lucide-react'
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
            <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">Registration</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">New Athlete</h1>
        </div>
      </div>

      {/* Form card */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-10 bg-white dark:bg-zinc-900 shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          <MemberForm
            mode="add"
            onSubmit={handleSubmit}
            onCancel={() => navigate('/members')}
          />
        </div>
      </div>
    </div>
  )
}
