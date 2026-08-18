import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Tag, AlertTriangle, Search, Check, X, Phone, Sparkles, UserCheck } from 'lucide-react';
import { useMembers } from '../../hooks/useMembers';
import DatePicker from '../UI/DatePicker';
import { planService } from '../../services/planService';
import { subscriptionService } from '../../services/subscriptionService';
import { useCurrentGym } from '../../hooks/useCurrentGym';

export default function SubscriptionForm({ onSubmit, initialData = null, isSubmitting = false }) {
  const navigate = useNavigate();
  const { members, fetchMembers } = useMembers();
  const [plans, setPlans] = useState([]);
  const { gym } = useCurrentGym();

  const [memberSearch, setMemberSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const [formData, setFormData] = useState({
    member_id: initialData?.member_id || '',
    plan_name: initialData?.plan_name || '',
    duration_type: initialData?.duration_type || 'monthly',
    amount: initialData?.amount || '',
    start_date: initialData?.start_date || new Date().toISOString().split('T')[0],
    expiry_date: initialData?.expiry_date || '', 
  });

  useEffect(() => {
    if (gym?.id) {
      planService.getPlans(gym.id).then(setPlans).catch(console.error);
    }
  }, [gym?.id]);

  useEffect(() => {
    if (members.length === 0) {
      fetchMembers();
    }
  }, [fetchMembers, members.length]);

  // Click outside listener to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helper: Populate dates and plan when a member is selected
  const applyMemberDetails = (member, currentPlans = plans) => {
    if (!member) return;
    const todayStr = new Date().toISOString().split('T')[0];
    let suggestedStartDate = todayStr;
    
    if (member.expiry_date && member.expiry_date >= todayStr) {
      const nextDay = new Date(member.expiry_date);
      nextDay.setDate(nextDay.getDate() + 1);
      suggestedStartDate = nextDay.toISOString().split('T')[0];
    }

    const planName = member.membership_plan || '';
    const matchedPlan = currentPlans.find(p => p.name === planName);

    setFormData(prev => {
      const next = {
        ...prev,
        member_id: member.id,
        start_date: suggestedStartDate,
        plan_name: planName || prev.plan_name,
      };

      if (matchedPlan) {
        next.amount = matchedPlan.price;
        next.duration_type = 'custom';
        const date = new Date(suggestedStartDate);
        date.setDate(date.getDate() + matchedPlan.duration_days);
        next.expiry_date = date.toISOString().split('T')[0];
      } else if (prev.duration_type && prev.duration_type !== 'custom') {
        next.expiry_date = subscriptionService.calculateExpiryDate(suggestedStartDate, prev.duration_type);
      }

      return next;
    });
  };

  // Auto-apply pre-selected initialData member when members load
  useEffect(() => {
    if (initialData?.member_id && members.length > 0) {
      const m = members.find(item => item.id === initialData.member_id);
      if (m && (!formData.member_id || formData.member_id !== m.id)) {
        applyMemberDetails(m, plans);
      }
    }
  }, [initialData?.member_id, members, plans]);

  const selectedMember = useMemo(() => {
    return members.find(m => m.id === formData.member_id) || null;
  }, [members, formData.member_id]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter(m => 
      (m.full_name && m.full_name.toLowerCase().includes(q)) ||
      (m.phone_number && m.phone_number.includes(q))
    );
  }, [members, memberSearch]);

  const handleSelectMember = (member) => {
    applyMemberDetails(member, plans);
    setIsSearchOpen(false);
    setMemberSearch('');
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };

      if (name === 'duration_type') {
        if (value !== 'custom') {
          next.expiry_date = subscriptionService.calculateExpiryDate(prev.start_date, value);
        }
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.member_id) {
      setIsSearchOpen(true);
      return;
    }
    onSubmit(formData);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const hasOverlap = selectedMember && 
                     selectedMember.expiry_date && 
                     selectedMember.expiry_date >= todayStr && 
                     formData.start_date <= selectedMember.expiry_date;

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getNextDayDateString = (dateStr) => {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleAutoSchedule = () => {
    if (!selectedMember || !selectedMember.expiry_date) return;
    const nextDayStr = getNextDayDateString(selectedMember.expiry_date);
    
    setFormData(prev => {
      const next = { ...prev, start_date: nextDayStr };
      if (prev.duration_type && prev.duration_type !== 'custom') {
        next.expiry_date = subscriptionService.calculateExpiryDate(nextDayStr, prev.duration_type);
      } else {
        const matchedPlan = plans.find(p => p.name === prev.plan_name);
        if (matchedPlan) {
          const date = new Date(nextDayStr);
          date.setDate(date.getDate() + matchedPlan.duration_days);
          next.expiry_date = date.toISOString().split('T')[0];
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Modern Searchable Athlete Selector */}
        <div className="space-y-3 md:col-span-2" ref={searchContainerRef}>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
            Select Athlete <span className="text-rose-500">*</span>
          </label>

          {selectedMember ? (
            /* Selected Athlete Card */
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-emerald-500/30 flex items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3.5 min-w-0">
                {selectedMember.avatar_url ? (
                  <img
                    src={selectedMember.avatar_url}
                    alt={selectedMember.full_name}
                    className="w-12 h-12 rounded-xl object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#3390ec]/20 to-[#3390ec]/10 border border-[#3390ec]/30 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                    {selectedMember.full_name?.slice(0, 1) || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-black text-sm tracking-tight truncate">{selectedMember.full_name}</p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                      Selected
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 text-xs mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {selectedMember.phone_number || 'No Phone'}
                    </span>
                    {selectedMember.expiry_date && (
                      <span className="text-[10px] font-bold text-slate-400">
                        • Current Exp: {formatDate(selectedMember.expiry_date)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {!initialData?.member_id && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, member_id: '' }));
                    setIsSearchOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-black uppercase tracking-wider transition-all border border-white/5 flex-shrink-0"
                >
                  Change
                </button>
              )}
            </div>
          ) : (
            /* Search Input & Interactive Dropdown */
            <div className="relative">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#3390ec] transition-colors" />
                <input
                  type="text"
                  value={memberSearch}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  placeholder="Search athlete by name or phone number..."
                  className="w-full bg-white/[0.03] border border-white/5 rounded-2xl pl-12 pr-10 py-4 text-white placeholder-slate-500 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-[#3390ec]/50 transition-all shadow-inner"
                />
                {memberSearch && (
                  <button
                    type="button"
                    onClick={() => setMemberSearch('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isSearchOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-[#0f1117] border border-white/10 divide-y divide-white/5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 text-xs">
                      No matching athletes found.
                    </div>
                  ) : (
                    filteredMembers.slice(0, 15).map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleSelectMember(member)}
                        className="w-full p-3.5 text-left hover:bg-white/[0.05] flex items-center justify-between transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-white text-xs font-bold group-hover:border-[#3390ec]/30">
                            {member.full_name?.slice(0, 1) || '?'}
                          </div>
                          <div>
                            <p className="text-white text-xs font-bold group-hover:text-[#3390ec] transition-colors">{member.full_name}</p>
                            <p className="text-slate-500 text-[11px] font-medium">{member.phone_number || 'No Phone'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/[0.03] border border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                            {member.membership_plan || 'No Plan'}
                          </span>
                          {member.expiry_date && (
                            <p className="text-[9px] text-slate-500 mt-0.5">Exp: {formatDate(member.expiry_date)}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Plan Selection (Dynamic Grid) */}
        <div className="space-y-3 md:col-span-2">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Gym Plans</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {plans.map(plan => (
              <button
                key={plan.id}
                type="button"
                onClick={() => {
                  setFormData(prev => {
                    const date = new Date(prev.start_date || new Date());
                    date.setDate(date.getDate() + plan.duration_days);
                    return {
                      ...prev,
                      plan_name: plan.name,
                      amount: plan.price,
                      duration_type: 'custom',
                      expiry_date: date.toISOString().split('T')[0]
                    };
                  });
                }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  formData.plan_name === plan.name 
                    ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' 
                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{plan.name}</p>
                  {formData.plan_name === plan.name && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
                <p className="text-sm font-black text-white mt-1">₹{plan.price}</p>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">{plan.duration_days} Days</p>
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
              placeholder="e.g. Monthly Standard"
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
              <option value="monthly">Monthly Cycle (+1 Month)</option>
              <option value="quarterly">Quarterly Cycle (+3 Months)</option>
              <option value="yearly">Annual Cycle (+1 Year)</option>
              <option value="custom">Custom Term / Manual Days</option>
            </select>
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Activation Date</label>
          <DatePicker
            value={formData.start_date}
            onChange={(val) => {
              setFormData(prev => {
                const next = { ...prev, start_date: val };
                if (prev.duration_type && prev.duration_type !== 'custom') {
                  next.expiry_date = subscriptionService.calculateExpiryDate(val, prev.duration_type);
                } else {
                  const matchedPlan = plans.find(p => p.name === prev.plan_name);
                  if (matchedPlan) {
                    const date = new Date(val);
                    date.setDate(date.getDate() + matchedPlan.duration_days);
                    next.expiry_date = date.toISOString().split('T')[0];
                  }
                }
                return next;
              });
            }}
          />
        </div>

        {/* Expiry Date Display/Input */}
        <div className="space-y-3 md:col-span-2">
          <label className={`block text-[10px] font-black uppercase tracking-[0.2em] ml-1 ${formData.duration_type === 'custom' ? 'text-rose-500' : 'text-slate-500'}`}>
            {formData.duration_type === 'custom' ? 'Custom Expiry Date' : 'Estimated Expiry Date'}
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

        {/* Overlap Warning Info Tip */}
        {hasOverlap && (
          <div className="md:col-span-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-amber-400 text-xs font-semibold space-y-2">
            <p className="flex items-center gap-2">
              <AlertTriangle className="w-4.5 h-4.5 text-amber-400 flex-shrink-0 animate-pulse" />
              <span>
                Athlete has an active plan until <strong>{formatDate(selectedMember.expiry_date)}</strong>. 
                Activating the new plan on <strong>{formatDate(formData.start_date)}</strong> will overlap with their current active plan.
              </span>
            </p>
            <button
              type="button"
              onClick={handleAutoSchedule}
              className="text-emerald-400 hover:text-emerald-300 font-bold underline transition-colors cursor-pointer text-left block"
            >
              Click here to auto-schedule starting the day after (starts {formatDate(getNextDayDateString(selectedMember.expiry_date))}).
            </button>
          </div>
        )}
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
          disabled={isSubmitting || !formData.member_id}
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
