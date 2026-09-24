import { Flame, Activity, TrendingUp, ChevronRight, Share2 } from 'lucide-react'
import RollingPassCard from '../Dashboard/RollingPassCard'

export default function MemberPassTab({ membership, streakCount, setActiveTab }) {
  const handleInviteBuddy = () => {
    const gymCode = membership?.gyms?.unique_code || ''
    const gymName = membership?.gyms?.gym_name || 'our gym'
    const inviteUrl = gymCode ? `https://gymix.fit/join/${gymCode}` : 'https://gymix.fit'
    const text = `Hey! Let's hit the workout together at ${gymName} on Gymix! 🏋️‍♂️🔥\nRegister with gym code: *${gymCode}*\nLink: ${inviteUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Expiry / Gym Info Header Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Active Gym</p>
          <h4 className="text-base font-bold text-slate-900 dark:text-white">
            {membership?.gyms?.gym_name || 'My Gym'}
          </h4>
        </div>
        <div className="flex items-center gap-3">
          {membership?.gyms?.unique_code && (
            <button
              onClick={handleInviteBuddy}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold tracking-wide transition-all cursor-pointer"
              title="Invite Workout Buddy via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              Invite Buddy
            </button>
          )}
          <div className="text-right space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">Plan Tier</p>
            <span className="inline-block text-xs font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 px-2.5 py-0.5 rounded-lg">
              {membership?.membership_plan || 'No Active Plan'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid Layout for Pass Key */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Rolling QR Pass Key (Takes 2 columns on desktop) */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <RollingPassCard membership={membership} />
        </div>

        {/* Quick Info & Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6 lg:col-span-1">
          
          {/* Workout Streak Widget */}
          <div 
            onClick={() => setActiveTab && setActiveTab('streaks')}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl text-center space-y-1.5 relative group overflow-hidden transition-all duration-200 hover:border-amber-500/40 cursor-pointer flex-1 flex flex-col justify-center"
          >
            <Flame className="w-6 h-6 text-amber-500 mx-auto mb-1 transition-transform group-hover:scale-110" />
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{streakCount} Days 🔥</p>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Workout Streak</p>
          </div>

          {/* Remaining Days Widget */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl text-center space-y-1.5 relative group overflow-hidden transition-all duration-200 hover:border-emerald-500/40 flex-1 flex flex-col justify-center">
            <Activity className="w-6 h-6 text-emerald-500 mx-auto mb-1 transition-transform group-hover:scale-110" />
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {membership?.expiry_date ? Math.max(0, Math.ceil((new Date(membership.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) : '—'} Days
            </p>
            <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Access Pass Left</p>
          </div>

          {/* Quick-Access to Lifts PR */}
          <div 
            onClick={() => setActiveTab && setActiveTab('progress')}
            className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-violet-500/30 flex items-center justify-between cursor-pointer transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
              <div className="text-left">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400 leading-none">Athlete Logs</span>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">Track Lifts & PR Progress</h4>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
          </div>

          {/* Mobile Invite Buddy Button */}
          {membership?.gyms?.unique_code && (
            <button
              onClick={handleInviteBuddy}
              className="sm:hidden col-span-2 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer active:scale-98 transition-all"
            >
              <Share2 className="w-4 h-4" />
              <span>Invite Gym Buddy via WhatsApp</span>
            </button>
          )}

        </div>

      </div>

    </div>
  )
}
