import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Tag } from 'lucide-react';
import { useMembers } from '../../hooks/useMembers';
import DatePicker from '../UI/DatePicker';
import { planService } from '../../services/planService';
import { useCurrentGym } from '../../hooks/useCurrentGym';

export default function SubscriptionForm({ onSubmit, initialData = null, isSubmitting = false }) {
  const navigate = useNavigate();
  const { members, fetchMembers } = useMembers();

  const [plans, setPlans] = useState([]);
  const { gym } = useCurrentGym();

  useEffect(() => {
    if (gym?.id) {
      planService.getPlans(gym.id).then(setPlans).catch(console.error);
    }
  }, [gym?.id]);

  const [formData, setFormData] = useState({
    member_id: initialData?.member_id || '',
    plan_name: initialData?.plan_name || '',
    duration_type: initialData?.duration_type || 'monthly',
    amount: initialData?.amount || '',
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    expiry_date: initialData?.expiry_date || '', 
  });

  useEffect(() => {
    if (members.length === 0) {
      fetchMembers();
    }
  }, [fetchMembers, members.length]);

  // Auto-calculate expiry date
  useEffect(() => {
    if (!formData.start_date || !formData.duration_type || formData.duration_type === 'custom') return;

    const calculateExpiry = (startDate, type) => {
      const date = new Date(startDate);
      if (isNaN(date.getTime())) return null;

      switch (type) {
        case 'monthly': date.setDate(date.getDate() + 30); break;
        case 'quarterly': date.setDate(date.getDate() + 90); break;
        case 'yearly': date.setDate(date.getDate() + 365); break;
        default: return null;
      }
      return date.toISOString().split('T')[0];
    };

    const newExpiry = calculateExpiry(formData.start_date, formData.duration_type);
    if (newExpiry && newExpiry !== formData.expiry_date) {
      setFormData(prev => ({ ...prev, expiry_date: newExpiry }));
    }
  }, [formData.start_date, formData.duration_type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      
      // Auto-fill if member is selected
      if (name === 'member_id') {
        const member = members.find(m => m.id === value);
        if (member && member.membership_plan) {
          next.plan_name = member.membership_plan;
          const matchedPlan = plans.find(p => p.name === member.membership_plan);
          if (matchedPlan) {
            next.amount = matchedPlan.price;
            next.duration_type = 'custom'; // Custom since we use dynamic days
            const date = new Date(next.start_date);
            date.setDate(date.getDate() + matchedPlan.duration_days);
            next.expiry_date = date.toISOString().split('T')[0];
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="space-y-10">
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

        {/* Plan Selection (Dynamic) */}
        <div className="space-y-3 md:col-span-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Pre-defined Plans</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {plans.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => {
                  setFormData(prev => ({
                    ...prev,
                    plan_name: plan.name,
                    amount: plan.price,
                    duration_type: 'custom', // We will set expiry manually based on days
                  }));
                  // Calculate expiry right away
                  const date = new Date(formData.start_date);
                  date.setDate(date.getDate() + plan.duration_days);
                  setFormData(prev => ({ ...prev, expiry_date: date.toISOString().split('T')[0] }));
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  formData.plan_name === plan.name ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                }`}
              >
                <p className="text-[10px] font-black uppercase text-slate-400">{plan.name}</p>
                <p className="text-xs font-bold text-white">₹{plan.price}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Plan Name */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Plan Display Name</label>
          <div className="relative group">
            <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              name="plan_name"
              required
              value={formData.plan_name}
              onChange={handleChange}
              placeholder="e.g. Platinum Elite"
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Amount Paid (₹)</label>
          <div className="relative group">
            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs group-focus-within:text-emerald-400 transition-colors">₹</div>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0"
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>

        {/* Duration Type */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Lifecycle Duration</label>
          <div className="relative group">
            <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <select
              name="duration_type"
              value={formData.duration_type}
              onChange={handleChange}
              required
              className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white text-sm font-medium appearance-none focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all"
            >
              <option value="monthly">Monthly Cycle (+30 Days)</option>
              <option value="quarterly">Quarterly Cycle (+90 Days)</option>
              <option value="yearly">Annual Cycle (+365 Days)</option>
              <option value="custom">Custom Term / Manual</option>
            </select>
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Activation Date</label>
          <DatePicker
            value={formData.start_date}
            onChange={(val) => setFormData(prev => ({ ...prev, start_date: val }))}
          />
        </div>

        {/* Expiry Date Display/Input */}
        <div className="space-y-3 md:col-span-2">
          <label className={`block text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${formData.duration_type === 'custom' ? 'text-rose-500' : 'text-slate-500'}`}>
            {formData.duration_type === 'custom' ? 'Custom Termination Date' : 'Estimated Expiry Date'}
          </label>
          {formData.duration_type === 'custom' ? (
            <DatePicker
              value={formData.expiry_date}
              onChange={(val) => setFormData(prev => ({ ...prev, expiry_date: val }))}
            />
          ) : (
            <div className="w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.01] border border-white/5 text-slate-400 text-sm font-medium flex items-center relative">
              <Calendar className="absolute left-5 w-4 h-4 text-slate-600" />
              {formData.expiry_date ? new Date(formData.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Select duration first'}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-white/5">
        <button
          type="button"
          onClick={() => navigate('/subscriptions')}
          className="order-2 sm:order-1 flex-1 py-4 px-6 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/5"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="order-1 sm:order-2 flex-1 py-4 px-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 hover:scale-[1.02] active:scale-95"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing…
            </span>
          ) : (
            <span>{initialData ? 'Update Record' : 'Activate Subscription'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
