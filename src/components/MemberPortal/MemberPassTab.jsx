import { Flame, Activity, Sparkles, ChevronRight } from 'lucide-react'
import RollingPassCard from '../Dashboard/RollingPassCard'

export default function MemberPassTab({ membership, streakCount, setActiveTab }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Expiry Header */}
      <div className="bg-[#1A1F2B] border border-white/5 p-5 rounded-[2rem] flex items-center justify-between shadow-lg">
        <div className="space-y-0.5">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Active Gym</p>
          <h4 className="text-base font-black text-white uppercase italic tracking-tight">
            {membership?.gyms?.gym_name || 'My Gym'}
          </h4>
        </div>
        <div className="text-right space-y-0.5">
          <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Plan Tier</p>
          <span className="text-[9px] font-black uppercase bg-[#3B82F6]/10 border border-[#3B82F6]/20 text-[#3B82F6] px-2.5 py-0.5 rounded-md">
            {membership?.membership_plan || 'No Active Plan'}
          </span>
        </div>
      </div>

      {/* Grid Layout for Pass Key */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Rolling QR Pass Key (Takes 2 columns on desktop) */}
        <div className="lg:col-span-2 flex flex-col justify-between">
          <RollingPassCard membership={membership} />
        </div>

        {/* Quick Info & Stats (Grid of 2 columns on mobile, 1 column on desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 lg:gap-6 lg:col-span-1">
          
          {/* Workout Streak Widget */}
          <div 
            onClick={() => setActiveTab('streaks')}
            className="bg-[#1A1F2B] border border-white/5 p-4.5 rounded-[2rem] text-center space-y-1.5 relative group overflow-hidden transition-all duration-200 hover:border-orange-500/30 hover:bg-orange-500/[0.02] cursor-pointer flex-1 flex flex-col justify-center"
          >
            <Flame className="w-6 h-6 text-orange-500 mx-auto mb-0.5" />
            <p className="text-xl sm:text-2xl font-black text-white">{streakCount} Days 🔥</p>
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-relaxed">Workout Streak</p>
          </div>

          {/* Remaining Days Widget */}
          <div className="bg-[#1A1F2B] border border-white/5 p-4.5 rounded-[2rem] text-center space-y-1.5 relative group overflow-hidden transition-all duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/[0.02] flex-1 flex flex-col justify-center">
            <Activity className="w-6 h-6 text-emerald-400 mx-auto mb-0.5" />
            <p className="text-xl sm:text-2xl font-black text-white">
              {membership?.expiry_date ? Math.max(0, Math.ceil((new Date(membership.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))) : '—'} Days
            </p>
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest leading-relaxed">Access Pass Left</p>
          </div>

          {/* Mobile Quick-Access to Lifts PR (Spans full width at the bottom of the grid) */}
          <div 
            onClick={() => setActiveTab('progress')}
            className="col-span-2 lg:col-span-1 p-4 rounded-[2rem] bg-[#1A1F2B] border border-[#3B82F6]/10 flex items-center justify-between cursor-pointer active:scale-98 transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#3B82F6]/10 flex items-center justify-center border border-[#3B82F6]/20 text-[#3B82F6]">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[8px] font-black uppercase text-[#3B82F6] tracking-widest leading-none">Athlete Logs</span>
                <h4 className="text-[10px] font-bold text-white uppercase tracking-wide mt-0.5">Track Lifts & PR Progress</h4>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>

        </div>

      </div>

    </div>
  )
}
