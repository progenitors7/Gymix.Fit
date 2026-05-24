import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Sparkles } from 'lucide-react';
import SubscriptionForm from './SubscriptionForm';
import { useSubscriptions } from '../../hooks/useSubscriptions';
import { unifiedService } from '../../services/unifiedService';
import { useCurrentGym } from '../../hooks/useCurrentGym';

export default function AddSubscriptionPage() {
  const navigate = useNavigate();
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
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/subscriptions')}
          className="group w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all duration-300 hover:scale-110 active:scale-95 shadow-xl"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-emerald-400" />
            <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em]">Deployment</p>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">Activate Plan</h1>
        </div>
      </div>

      {/* Form Card */}
      <div className="glass-card border border-white/5 rounded-[2.5rem] p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          {(error || submitError) && (
            <div className="mb-10 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-2xl text-xs font-bold uppercase tracking-wider animate-shake">
              {error || submitError}
            </div>
          )}
          
          <SubscriptionForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 max-w-sm mx-auto sm:mx-0">
        <Sparkles className="w-4 h-4 text-amber-400" />
        <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Subscription syncs across all devices</p>
      </div>
    </div>
  );
}
