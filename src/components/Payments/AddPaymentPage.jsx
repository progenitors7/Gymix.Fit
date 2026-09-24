import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import PaymentForm from './PaymentForm';
import { usePayments } from '../../hooks/usePayments';
import { unifiedService } from '../../services/unifiedService';
import { useCurrentGym } from '../../hooks/useCurrentGym';

export default function AddPaymentPage() {
  const navigate = useNavigate();
  const { addPayment, error } = usePayments();
  const { gym } = useCurrentGym();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      if (formData.smart_renew) {
        await unifiedService.smartRenew(
          gym.id,
          formData.member_id,
          formData.smart_renew,
          {
            amount_paid: formData.amount_paid,
            payment_date: formData.payment_date,
            payment_method: formData.payment_method,
            payment_status: formData.payment_status,
            notes: formData.notes
          }
        );
      } else {
        const dataToSubmit = {
          ...formData,
          subscription_id: formData.subscription_id || null
        };
        await addPayment(dataToSubmit);
      }
      navigate('/payments');
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
          onClick={() => navigate('/payments')}
          className="group w-10 h-10 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        </button>
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CreditCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider">Transaction</p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Record Deposit</h1>
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
          
          <PaymentForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 dark:border-emerald-500/10 max-w-sm mx-auto sm:mx-0">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Payments update revenue metrics in real-time</p>
      </div>
    </div>
  );
}
