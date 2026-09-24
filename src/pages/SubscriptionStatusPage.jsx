import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Clock, 
  Calendar, 
  ShieldCheck, 
  Globe
} from 'lucide-react';
import { useCurrentGym } from '../hooks/useCurrentGym';

export default function SubscriptionStatusPage() {
  const { gym, gymName, ownerEmail, isReady } = useCurrentGym();

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-2" />
        <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Loading account status...</p>
      </div>
    );
  }

  const expiryDate = gym?.subscription_expires_at ? new Date(gym.subscription_expires_at) : null;
  const daysLeft = gym?.billing_days_left;
  const isExpired = gym?.billing_status === 'expired';
  const isPending = gym?.billing_status === 'pending' || gym?.status === 'pending';
  const isExpiringSoon = Number.isFinite(daysLeft) && daysLeft >= 0 && daysLeft <= 7;

  let statusText = 'Active';
  let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (isExpired) {
    statusText = 'Expired';
    statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (isPending) {
    statusText = 'Setup Pending';
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (isExpiringSoon) {
    statusText = 'Expiring Soon';
    statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  const handleContactSupport = () => {
    const message = `Hello Gymix Support,\n\nI want to renew my gym subscription for:\n- Gym Name: ${gymName}\n- Gym Code: ${gym?.unique_code}\n- Owner Email: ${ownerEmail}`;
    const url = `https://wa.me/918423926608?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 pb-28 lg:pb-10">
      
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <ShieldCheck className="w-4 h-4" />
          Secure Account Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Subscription Status
        </h1>
        <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">
          View your Gymix membership status and account limits
        </p>
      </div>

      {/* Main Status Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{gymName || 'My Gym'}</h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">Gym Code: {gym?.unique_code}</p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase tracking-wider shadow-xs ${statusColor}`}>
            {statusText}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          {/* Left Column: Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Active Plan</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {gym?.saas_plans?.name || 'Standard Premium Plan'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Expiry Date</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {expiryDate 
                    ? expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
                    : 'N/A'}
                </p>
              </div>
            </div>

            {Number.isFinite(daysLeft) && (
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                  isExpired 
                    ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                }`}>
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-slate-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Remaining Period</p>
                  <p className={`text-sm font-bold mt-0.5 ${isExpired ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {isExpired ? 'Expired' : `${daysLeft} Days Left`}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Visual Indicator */}
          <div className="flex items-center justify-center p-4 bg-slate-50 dark:bg-zinc-950/60 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <div className="text-center space-y-2">
              <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Billing Cycle Status</p>
              <div className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                {isExpired ? '0' : Math.max(0, daysLeft || 0)}
              </div>
              <p className="text-slate-400 dark:text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Days Remaining</p>
              <div className="w-24 h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden mx-auto">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isExpired ? 'bg-rose-500' : isExpiringSoon ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                  style={{ width: `${Math.min(100, Math.max(0, ((daysLeft || 0) / 30) * 100))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Play Store Safe instructions card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs"
      >
        <div className="space-y-1">
          <h3 className="text-slate-900 dark:text-white font-bold text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            How to Renew or Upgrade?
          </h3>
          <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">
            In compliance with app store guidelines regarding digital transactions, payment gateways are disabled in the mobile application. You can manage your account online:
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-zinc-950/60 p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2">
          <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-zinc-400 tracking-wider">Web Portal Registration</p>
          <p className="text-slate-700 dark:text-zinc-300 text-xs font-medium leading-relaxed">
            1. Visit our web dashboard on your computer or mobile browser: <strong className="text-emerald-600 dark:text-emerald-400 select-all">https://gymix.fit</strong>
            <br />
            2. Log in using your owner credentials: <strong className="text-slate-900 dark:text-white select-all">{ownerEmail}</strong>
            <br />
            3. Open the **Billing** tab to renew your cycle or change plans instantly.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <button 
            onClick={handleContactSupport}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg viewBox="0 0 175.216 175.552" className="w-4 h-4 flex-shrink-0">
              <path fill="#FFF" d="M90.134 162.138c-12.084 0-23.941-3.142-34.404-9.083L14.316 163.66l10.829-39.517c-6.523-11.309-9.957-24.15-9.953-37.309C15.209 46.262 48.7 12.766 89.28 12.766c19.664 0 38.15 7.66 52.039 21.558 13.889 13.896 21.539 32.388 21.531 52.046-.017 40.579-33.518 73.768-72.716 75.768z" />
              <path fill="#25D366" d="M90.134 23.99c-33.82 0-61.341 27.525-61.353 61.347a61.1 61.1 0 0 0 9.37 32.61l1.458 2.318-6.195 22.61 23.136-6.068 2.241 1.33A61.05 61.05 0 0 0 89.92 146.47h.023c33.81 0 61.332-27.524 61.348-61.348a61.13 61.13 0 0 0-17.951-43.375C121.849 30.197 106.524 23.99 90.134 23.99z" />
              <path fill="#FFF" d="M118.91 103.88c-1.58-.79-9.35-4.61-10.79-5.14-1.44-.53-2.5-.79-3.56.79-1.06 1.58-4.09 5.14-5.01 6.2-.92 1.06-1.84 1.18-3.42.39-1.58-.79-6.67-2.46-12.71-7.85-4.7-4.19-7.87-9.37-8.79-10.95-.92-1.58-.1-2.44.69-3.22.71-.7 1.58-1.84 2.37-2.76.79-.92 1.06-1.58 1.58-2.63.53-1.06.26-1.97-.13-2.76-.39-.79-3.56-8.58-4.88-11.77-1.28-3.11-2.59-2.69-3.56-2.74-.92-.05-1.97-.05-3.03-.05-1.06 0-2.77.39-4.22 1.97-1.45 1.58-5.54 5.41-5.54 13.19s5.67 15.29 6.46 16.34c.79 1.06 11.16 17.04 27.04 23.9 3.78 1.63 6.72 2.61 9.02 3.35 3.8 1.21 7.26 1.04 10 0.63 3.05-.46 9.35-3.82 10.66-7.51 1.32-3.69 1.32-6.85 0.92-7.51-.39-.66-1.44-1.06-3.03-1.85z" />
            </svg>
            <span>Contact WhatsApp Support</span>
          </button>
        </div>
      </motion.div>

    </div>
  );
}
