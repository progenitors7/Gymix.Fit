import { useState, useEffect } from 'react';
import { X, Calendar, CreditCard, Award, CheckCircle2, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from './DatePicker';
import { unifiedService } from '../../services/unifiedService';
import { useCurrentGym } from '../../hooks/useCurrentGym';
import { planService } from '../../services/planService';
import { toast } from 'react-hot-toast';

export default function QuickRenewModal({ isOpen, onClose, member, onSuccess }) {
  const { gym } = useCurrentGym();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [amount, setAmount] = useState(0);
  const [expiryDate, setExpiryDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');

  useEffect(() => {
    if (gym?.id) {
      planService.getPlans(gym.id).then(data => {
        setPlans(data);
        if (data.length > 0) {
          setSelectedPlan(data[0]);
          setAmount(data[0].price);
        }
      }).catch(console.error);
    }
  }, [gym?.id]);

  useEffect(() => {
    if (selectedPlan) {
      const date = new Date();
      // If member is not expired, start from current expiry
      const baseDate = member?.expiry_date && new Date(member.expiry_date) > new Date() 
        ? new Date(member.expiry_date) 
        : new Date();
      
      baseDate.setDate(baseDate.getDate() + selectedPlan.duration_days);
      setExpiryDate(baseDate.toISOString().split('T')[0]);
      setAmount(selectedPlan.price);
    }
  }, [selectedPlan, member]);

  const handleRenew = async () => {
    if (!gym || !member) return;
    
    setLoading(true);
    try {
      await unifiedService.smartRenew(
        gym.id,
        member.id,
        {
          plan_name: selectedPlan.name,
          duration_type: 'custom',
          amount: amount,
          expiry_date: expiryDate
        },
        {
          amount_paid: amount,
          payment_method: paymentMethod,
          payment_status: 'paid'
        }
      );
      
      toast.success(`Membership for ${member.full_name} renewed successfully! 🎉`);
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Error renewing membership: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div 
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                Quick Renew
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                Athlete: <span className="font-semibold text-slate-900 dark:text-white">{member?.full_name}</span>
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            {/* Plan Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">Choose Plan</label>
              <div className="grid grid-cols-2 gap-2.5">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                      selectedPlan?.id === plan.id 
                        ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-500/40 text-violet-950 dark:text-violet-200 shadow-xs' 
                        : 'bg-slate-50 dark:bg-zinc-800/50 border-slate-200 dark:border-zinc-700/60 hover:border-slate-300 dark:hover:border-zinc-600 text-slate-700 dark:text-zinc-300'
                    }`}
                  >
                    <p className={`text-[11px] font-bold uppercase tracking-wider ${selectedPlan?.id === plan.id ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500 dark:text-zinc-400'}`}>
                      {plan.name}
                    </p>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">₹{plan.price}</p>
                  </button>
                ))}
                {plans.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-zinc-500 italic col-span-full py-2">No plans configured in Settings</p>
                )}
              </div>
            </div>

            {/* Payment & Expiry */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-slate-400" /> New Expiry
                </label>
                <input 
                  type="date" 
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <CreditCard className="w-3 h-3 text-slate-400" /> Payment Method
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs cursor-pointer"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online / UPI</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleRenew}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm & Renew</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
