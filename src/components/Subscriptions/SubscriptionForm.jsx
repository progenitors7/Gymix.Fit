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
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Modern Searchable Athlete Selector */}
        <div className="space-y-2 md:col-span-2" ref={searchContainerRef}>
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-1">
            Select Athlete <span className="text-red-500">*</span>
          </label>

          {selectedMember ? (
            /* Selected Athlete Card */
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-emerald-500/30 flex items-center justify-between gap-4 animate-in fade-in duration-200 shadow-xs">
              <div className="flex items-center gap-3.5 min-w-0">
                {selectedMember.avatar_url ? (
                  <img
                    src={selectedMember.avatar_url}
                    alt={selectedMember.full_name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-zinc-800 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-base font-bold flex-shrink-0">
                    {selectedMember.full_name?.slice(0, 1) || '?'}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-900 dark:text-white font-bold text-sm tracking-tight truncate">{selectedMember.full_name}</p>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                      Selected
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 dark:text-zinc-400 text-xs mt-0.5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {selectedMember.phone_number || 'No Phone'}
                    </span>
                    {selectedMember.expiry_date && (
                      <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
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
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                  title="Change Member"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            /* Search Input & Interactive Dropdown */
            <div className="relative">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={memberSearch}
                  onFocus={() => setIsSearchOpen(true)}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  placeholder="Search athlete by name or phone number..."
                  className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-10 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
                />
                {memberSearch && (
                  <button
                    type="button"
                    onClick={() => setMemberSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Suggestions Dropdown */}
              {isSearchOpen && (
                <div className="absolute z-50 left-0 right-0 mt-2 max-h-60 overflow-y-auto rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800 shadow-xl animate-in fade-in zoom-in-95 duration-150 custom-scrollbar">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-zinc-400 text-xs">
                      No matching athletes found.
                    </div>
                  ) : (
                    filteredMembers.slice(0, 15).map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleSelectMember(member)}
                        className="w-full p-3.5 text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 flex items-center justify-between transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-200 text-xs font-bold group-hover:border-emerald-500">
                            {member.full_name?.slice(0, 1) || '?'}
                          </div>
                          <div>
                            <p className="text-slate-900 dark:text-white text-xs font-bold group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{member.full_name}</p>
                            <p className="text-slate-500 dark:text-zinc-400 text-[11px] font-medium">{member.phone_number || 'No Phone'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 font-semibold uppercase tracking-wider">
                            {member.membership_plan || 'No Plan'}
                          </span>
                          {member.expiry_date && (
                            <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">Exp: {formatDate(member.expiry_date)}</p>
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
        <div className="space-y-2 md:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-1">Gym Plans</label>
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
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer shadow-xs ${
                  formData.plan_name === plan.name 
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500' 
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-zinc-400">{plan.name}</p>
                  {formData.plan_name === plan.name && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">₹{plan.price}</p>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5">{plan.duration_days} Days</p>
              </button>
            ))}
          </div>
        </div>

        {/* Plan Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-1">Plan Display Name</label>
          <div className="relative group">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input
              type="text"
              name="plan_name"
              required
              value={formData.plan_name}
              onChange={handleChange}
              placeholder="e.g. Monthly Standard"
              className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-1">Amount Paid (₹)</label>
          <div className="relative group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm group-focus-within:text-emerald-500 transition-colors">₹</div>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="0.01"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0"
              className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
            />
          </div>
        </div>

        {/* Duration Type */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-1">Lifecycle Duration</label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <select
              name="duration_type"
              value={formData.duration_type}
              onChange={handleChange}
              required
              className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-slate-900 dark:text-white text-sm font-medium appearance-none focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-xs"
            >
              <option value="monthly">Monthly Cycle (+1 Month)</option>
              <option value="quarterly">Quarterly Cycle (+3 Months)</option>
              <option value="yearly">Annual Cycle (+1 Year)</option>
              <option value="custom">Custom Term / Manual Days</option>
            </select>
          </div>
        </div>

        {/* Start Date */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 ml-1">Activation Date</label>
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
        <div className="space-y-1.5 md:col-span-2">
          <label className={`block text-xs font-semibold ml-1 ${formData.duration_type === 'custom' ? 'text-red-500' : 'text-slate-700 dark:text-zinc-300'}`}>
            {formData.duration_type === 'custom' ? 'Custom Expiry Date' : 'Estimated Expiry Date'}
          </label>
          {formData.duration_type === 'custom' ? (
            <DatePicker
              value={formData.expiry_date}
              onChange={(val) => setFormData(prev => ({ ...prev, expiry_date: val }))}
            />
          ) : (
            <div className="w-full pl-11 pr-5 py-3 rounded-xl bg-slate-100 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-sm font-medium flex items-center relative shadow-xs">
              <Calendar className="absolute left-4 w-4 h-4 text-slate-400" />
              {formData.expiry_date ? new Date(formData.expiry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Select duration first'}
            </div>
          )}
        </div>

        {/* Overlap Warning Info Tip */}
        {hasOverlap && (
          <div className="md:col-span-2 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-medium space-y-2">
            <p className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse" />
              <span>
                Athlete has an active plan until <strong>{formatDate(selectedMember.expiry_date)}</strong>. 
                Activating the new plan on <strong>{formatDate(formData.start_date)}</strong> will overlap with their current active plan.
              </span>
            </p>
            <button
              type="button"
              onClick={handleAutoSchedule}
              className="text-emerald-600 dark:text-emerald-400 font-semibold underline transition-colors cursor-pointer text-left block"
            >
              Click here to auto-schedule starting the day after (starts {formatDate(getNextDayDateString(selectedMember.expiry_date))}).
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-slate-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => navigate('/subscriptions')}
          className="order-2 sm:order-1 flex-1 py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-zinc-700 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.member_id}
          className="order-1 sm:order-2 flex-1 py-3 px-5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
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
