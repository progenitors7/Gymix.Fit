import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Hourglass, ArrowUpRight, User } from 'lucide-react';
import QuickRenewModal from '../UI/QuickRenewModal';

export default function ExpiringWidget({ members, onRefresh }) {
  const [selectedMember, setSelectedMember] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRenewClick = (member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  if (!members || members.length === 0) {
    return (
      <div className="bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 text-left shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Hourglass className="w-4 h-4 text-amber-500" />
          <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Expiring Soon</h3>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono ml-auto">0 alerts</span>
        </div>
        <p className="text-slate-400 dark:text-zinc-500 text-xs py-2 text-center">No upcoming expirations in the next 3 days</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white/60 dark:bg-zinc-900/30 border border-slate-200/80 dark:border-white/[0.06] rounded-2xl p-4.5 text-left shadow-xs">
        
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-amber-500" />
            <h3 className="text-slate-900 dark:text-white font-semibold text-sm">Expiring Soon</h3>
          </div>
          <Link to="/members" className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="space-y-2.5">
          {members.map((member) => (
            <div 
              key={member.id} 
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-700 flex items-center justify-center shrink-0 text-slate-600 dark:text-zinc-300">
                  <User className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{member.full_name}</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">{member.phone_number || 'No phone'}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  new Date(member.expiry_date) < new Date() 
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {(() => {
                    const d = new Date(member.expiry_date);
                    return member.expiry_date && !isNaN(d.getTime()) ? format(d, 'MMM d') : 'N/A';
                  })()}
                </span>
                <button 
                  onClick={() => handleRenewClick(member)}
                  className="block text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline mt-1 cursor-pointer"
                >
                  Renew
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <QuickRenewModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        member={selectedMember}
        onSuccess={onRefresh}
      />
    </>
  );
}
