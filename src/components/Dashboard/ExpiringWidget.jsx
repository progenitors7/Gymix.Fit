import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Hourglass, ArrowUpRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
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
      <div className="glass-card rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group">
        <h3 className="text-[#F8FAFC] font-extrabold text-lg mb-4 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/20 shadow-inner">
            <Hourglass className="w-5 h-5 text-[#F59E0B]" />
          </div>
          Expiring Soon
        </h3>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <p className="text-[#64748B] text-xs font-semibold uppercase tracking-widest text-center">No upcoming expirations</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-card rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group">
        
        <div className="flex items-center justify-between mb-6 relative z-10">
          <h3 className="text-[#F8FAFC] font-extrabold text-lg flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F59E0B]/10 flex items-center justify-center border border-[#F59E0B]/20 shadow-inner">
              <Hourglass className="w-5 h-5 text-[#F59E0B]" />
            </div>
            Expiring Soon
          </h3>
          <Link to="/members" className="p-2 bg-white/5 border border-white/10 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/10 transition-all shadow-sm">
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="space-y-3 relative z-10">
          {members.map((member, i) => (
            <div 
              key={member.id} 
              className="group/item flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.06] rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center border border-white/10 shadow-sm group-hover/item:border-[#3B82F6]/30 transition-colors">
                  <User className="w-4 h-4 text-[#94A3B8] group-hover/item:text-[#3B82F6] transition-colors" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#F8FAFC] group-hover/item:text-[#3B82F6] transition-colors">{member.full_name}</p>
                  <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mt-0.5">{member.phone_number}</p>
                </div>
              </div>
              <div className="text-right flex flex-col items-end justify-center">
                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider mb-1.5 shadow-sm ${
                  new Date(member.expiry_date) < new Date() 
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20'
                }`}>
                  {(() => {
                    const d = new Date(member.expiry_date);
                    return member.expiry_date && !isNaN(d.getTime()) ? format(d, 'MMM d') : 'N/A';
                  })()}
                </span>
                <button 
                  onClick={() => handleRenewClick(member)}
                  className="text-[10px] font-bold text-[#3B82F6] hover:text-[#60A5FA] uppercase tracking-widest transition-colors cursor-pointer"
                >
                  Renew Now
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


