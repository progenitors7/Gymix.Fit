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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0F172A] border border-white/10 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-transparent">
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                Quick Renew
              </h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">
                Athlete: <span className="text-emerald-400">{member?.full_name}</span>
              </p>
            </div>
            <button onClick={onClose} className="p-3 rounded-2xl hover:bg-white/5 text-slate-500 hover:text-white transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-8 space-y-8">
            {/* Plan Selection */}
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Choose Plan</label>
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`p-4 rounded-2xl border transition-all text-left group ${
                      selectedPlan?.id === plan.id 
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50' 
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    <p className={`text-[11px] font-black uppercase tracking-widest ${selectedPlan?.id === plan.id ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {plan.name}
                    </p>
                    <p className="text-lg font-bold text-white mt-1">₹{plan.price}</p>
                  </button>
                ))}
                {plans.length === 0 && (
                  <p className="text-[10px] text-slate-500 italic col-span-full">No plans defined in Settings</p>
                )}
              </div>
            </div>

            {/* Payment & Expiry */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> New Expiry
                </label>
                <input 
                  type="date" 
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-emerald-500/50 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                  <CreditCard className="w-3 h-3" /> Payment Method
                </label>
                <select 
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl p-4 text-white text-sm font-medium focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                  <option value="upi">UPI</option>
                </select>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-8 bg-white/[0.02] border-t border-white/5">
            <button
              onClick={handleRenew}
              disabled={loading}
              className="w-full py-5 rounded-[1.5rem] bg-emerald-500 hover:bg-emerald-400 text-white font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Activate
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
