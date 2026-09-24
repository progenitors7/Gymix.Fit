import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Zap, Sparkles } from 'lucide-react';
import SubscriptionForm from './SubscriptionForm';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { unifiedService } from '../../services/unifiedService';
import { useCurrentGym } from '../../hooks/useCurrentGym';

export default function AddSubscriptionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedMemberId = searchParams.get('memberId') || searchParams.get('member');
  const { error } = useSubscriptions();
  const { gym } = useCurrentGym();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (!gym?.id) throw new Error('Gym not loaded');

      await unifiedService.smartRenew(
        gym.id,
        formData.member_id,
        {
          plan_name: formData.plan_name,
          duration_type: formData.duration_type,
          amount: Number(formData.amount) || 0,
          start_date: formData.start_date,
          expiry_date: formData.expiry_date
        },
        {
          amount_paid: Number(formData.amount) || 0,
          payment_date: formData.start_date,
          payment_method: 'cash',
          payment_status: 'paid',
          notes: `Subscription payment for ${formData.plan_name}`
        }
      );
      navigate('/subscriptions');
    } catch (err) {
      setSubmitError(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 lg:p-12 max-w-3xl mx-auto space-y-10 pb-28 sm:pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/subscriptions')}
          className="group w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">Membership Cycle</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Activate Plan</h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-10 bg-white dark:bg-zinc-900 shadow-xs relative overflow-hidden">
        <div className="relative z-10">
          {(error || submitError) && (
            <div className="mb-8 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider animate-shake">
              {error || submitError}
            </div>
          )}
          
          <SubscriptionForm 
            onSubmit={handleSubmit} 
            isSubmitting={isSubmitting} 
            initialData={preSelectedMemberId ? { member_id: preSelectedMemberId } : null}
          />
        </div>
      </div>


    </div>
  );
}
