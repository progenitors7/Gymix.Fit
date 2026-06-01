import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Receipt, CreditCard, FileText, Sparkles } from 'lucide-react';
import { useMembers } from '../../hooks/useMembers';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import DatePicker from '../UI/DatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { useCurrentGym } from '../../hooks/useCurrentGym';

import { planService } from '../../services/planService';

const durationTypeFromDays = (days) => {
  if (Number(days) === 30) return 'monthly';
  if (Number(days) === 90) return 'quarterly';
  if (Number(days) === 365) return 'yearly';
  return 'custom';
};

export default function PaymentForm({ onSubmit, initialData = null, isSubmitting = false }) {
  const navigate = useNavigate();
  const { members, fetchMembers } = useMembers();
  const { subscriptions, fetchSubscriptions } = useSubscriptions();

  const [formData, setFormData] = useState({
    member_id: initialData?.member_id || '',
    subscription_id: initialData?.subscription_id || '',
    amount_paid: initialData?.amount_paid || '',
    payment_date: initialData?.payment_date || new Date().toISOString().split('T')[0],
    payment_method: initialData?.payment_method || 'cash',
    payment_status: initialData?.payment_status || 'paid',
    notes: initialData?.notes || ''
  });
  const [shouldRenew, setShouldRenew] = useState(false);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { gym } = useCurrentGym();

  useEffect(() => {
    fetchMembers();
    fetchSubscriptions();
    
    if (gym?.id) {
      planService.getPlans(gym.id).then(setPlans).catch(console.error);
    }
  }, [fetchMembers, fetchSubscriptions, gym?.id]);

  // Filter subscriptions to only those belonging to the selected member
  const memberSubscriptions = subscriptions.filter(sub => sub.member_id === formData.member_id);

  // Auto-fill amount if a subscription is selected
  const handleSubscriptionChange = (e) => {
    const subId = e.target.value;
    const selectedSub = memberSubscriptions.find(s => s.id === subId);
    
    setFormData(prev => ({
      ...prev,
      subscription_id: subId,
      amount_paid: selectedSub ? selectedSub.amount : prev.amount_paid
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    if (shouldRenew && selectedPlan) {
      data.smart_renew = {
        plan_name: selectedPlan.name,
        duration_type: durationTypeFromDays(selectedPlan.duration_days),
        duration_days: selectedPlan.duration_days,
        amount: parseFloat(formData.amount_paid),
        start_date: formData.payment_date
      };
    }
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Member Selection */}
        <div className="space-y-3 md:col-span-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Select Athlete</label>
          <div className="relative group">
            <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <select
              name="member_id"
              value={formData.member_id}
              onChange={handleChange}
              required
              disabled={!!initialData}
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white text-sm font-medium appearance-none focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all disabled:opacity-50"
            >
              <option value="" disabled>Choose an athlete...</option>
              {[...members]
                .sort((a, b) => (a.full_name || '').trim().localeCompare((b.full_name || '').trim(), undefined, { sensitivity: 'base' }))
                .map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.phone_number})
                  </option>
                ))
              }
            </select>
          </div>
        </div>

        {/* Subscription Selection (Optional) */}
        <div className="space-y-3 md:col-span-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Connect Subscription (Optional)</label>
          <div className="relative group">
            <Receipt className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <select
              name="subscription_id"
              value={formData.subscription_id}
              onChange={handleSubscriptionChange}
              disabled={!formData.member_id || !!initialData}
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white text-sm font-medium appearance-none focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all disabled:opacity-50"
            >
              <option value="">Direct Payment / General Deposit</option>
              {memberSubscriptions.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.plan_name} • ₹{sub.amount} ({sub.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Amount Paid */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Received (₹)</label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs group-focus-within:text-emerald-400 transition-colors">₹</div>
            <input
              type="number"
              name="amount_paid"
              required
              min="0"
              step="0.01"
              value={formData.amount_paid}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Payment Date */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Transaction Date</label>
          <DatePicker
            value={formData.payment_date}
            onChange={(val) => setFormData(prev => ({ ...prev, payment_date: val }))}
          />
        </div>

        {/* Payment Method */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Mode</label>
          <div className="relative group">
            <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white text-sm font-medium appearance-none focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
            >
              <option value="cash">Physical Cash</option>
              <option value="upi">UPI Interface</option>
              <option value="card">Credit / Debit Card</option>
              <option value="bank_transfer">Direct Bank Transfer</option>
            </select>
          </div>
        </div>

        {/* Payment Status */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Payment Status</label>
          <div className="relative group">
            <select
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 text-white text-sm font-medium appearance-none focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
            >
              <option value="paid">Verified Paid</option>
              <option value="pending">Pending Verification</option>
              <option value="overdue">Overdue / Failed</option>
            </select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-3 md:col-span-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Internal Reference (Optional)</label>
          <div className="relative group">
            <FileText className="absolute left-5 top-5 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Record transaction ID or specific notes..."
              rows={3}
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all resize-none"
            />
          </div>
        </div>

        {/* Smart Renewal Toggle (Only for New Payments) */}
        {!initialData && (
          <div className="space-y-4 md:col-span-2 p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-wider text-left">Renew Membership?</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 text-left">Automatically extend athlete's validity</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={shouldRenew}
                  onChange={e => setShouldRenew(e.target.checked)}
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            <AnimatePresence>
              {shouldRenew && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-4 border-t border-emerald-500/10"
                >
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Extension Plan</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {plans.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => {
                          setSelectedPlan(plan);
                          setFormData(f => ({ ...f, amount_paid: plan.price }));
                        }}
                        className={`p-3 rounded-xl border transition-all text-left ${
                          selectedPlan?.id === plan.id 
                            ? 'bg-emerald-500/10 border-emerald-500/50' 
                            : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                        }`}
                      >
                        <p className="text-[10px] font-black uppercase text-slate-400">{plan.name}</p>
                        <p className="text-sm font-bold text-white">₹{plan.price}</p>
                      </button>
                    ))}
                    {plans.length === 0 && (
                      <p className="text-[10px] text-slate-500 italic col-span-full">No plans defined in Settings</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-white/5">
        <button
          type="button"
          onClick={() => navigate('/payments')}
          className="order-2 sm:order-1 flex-1 py-4 px-6 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="order-1 sm:order-2 flex-1 py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            <span>{initialData ? 'Update Ledger' : 'Authorize Payment'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
