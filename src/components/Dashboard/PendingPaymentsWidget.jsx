import { Link } from 'react-router-dom';
import { AlertCircle, ArrowUpRight, Wallet } from 'lucide-react';

export default function PendingPaymentsWidget({ payments }) {
  if (!payments || payments.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 h-full flex flex-col text-left">
        <h3 className="text-slate-900 dark:text-white font-bold text-sm mb-4 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Wallet className="w-4 h-4" />
          </div>
          <span>Fee Collections</span>
        </h3>
        <div className="flex-1 flex items-center justify-center py-6">
          <p className="text-slate-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-wider text-center">All payments cleared</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 h-full flex flex-col text-left">
      
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-900 dark:text-white font-bold text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-4 h-4" />
          </div>
          <span>Pending Dues</span>
        </h3>
        <Link to="/payments" className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>
      
      <div className="space-y-2.5">
        {payments.map((payment) => (
          <div 
            key={payment.id} 
            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-zinc-800/50 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl border border-slate-200 dark:border-zinc-800 transition-colors"
          >
            <div className="min-w-0 pr-2">
              <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">{payment.members?.full_name || 'Member'}</p>
              <p className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${payment.payment_status === 'overdue' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {payment.payment_status === 'overdue' ? 'Overdue' : 'Awaiting'}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white font-mono">₹{payment.amount_paid.toLocaleString()}</p>
              <Link to="/payments" className="block text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline mt-0.5">
                Settle
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
