import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, DollarSign, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PendingPaymentsWidget({ payments }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="glass-card rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group">
        <h3 className="text-[#F8FAFC] font-extrabold text-lg mb-4 flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center border border-[#EF4444]/20 shadow-inner">
            <Wallet className="w-5 h-5 text-[#EF4444]" />
          </div>
          Pending Payments
        </h3>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <p className="text-[#64748B] text-xs font-semibold uppercase tracking-widest text-center">All payments cleared</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-3xl p-6 h-full flex flex-col relative overflow-hidden group">
      
      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-[#F8FAFC] font-extrabold text-lg flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center border border-[#EF4444]/20 shadow-inner">
            <AlertCircle className="w-5 h-5 text-[#EF4444]" />
          </div>
          Action Needed
        </h3>
        <Link to="/payments" className="p-2 bg-white/5 border border-white/10 rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/10 transition-all shadow-sm">
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="space-y-3 relative z-10">
        {payments.map((payment, i) => (
          <div 
            key={payment.id} 
            className="group/item flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.06] rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-[#1E293B] flex items-center justify-center border border-white/10 shadow-sm group-hover/item:border-[#EF4444]/30 transition-colors">
                <DollarSign className="w-4 h-4 text-[#94A3B8] group-hover/item:text-[#EF4444] transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#F8FAFC] group-hover/item:text-[#EF4444] transition-colors">{payment.members?.full_name || 'Unknown'}</p>
                <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${payment.payment_status === 'overdue' ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                  {payment.payment_status === 'overdue' ? 'Overdue' : 'Awaiting'}
                </p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end justify-center">
              <p className="text-[14px] font-extrabold text-[#F8FAFC] mb-1.5 tracking-tight">₹{payment.amount_paid.toLocaleString()}</p>
              <Link to="/payments" className="text-[10px] font-bold text-[#3B82F6] hover:text-[#60A5FA] uppercase tracking-widest transition-colors">
                Settle
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

