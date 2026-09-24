import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  Star,
  RefreshCw,
  Ticket,
  Clock,
  Gift,
  ArrowRight
} from 'lucide-react';
import { useCurrentGym } from '../hooks/useCurrentGym';
import { supabase } from '../lib/supabaseClient';
import { razorpayService } from '../services/razorpayService';
import Toast from '../components/UI/Toast';
import { isNativeCapacitorApp } from '../utils/platform';

const PRO_PLAN_ID = '770f855a-535c-44f1-9604-0ba7a74c6f59';
const BILLING_FUNCTION = 'razorpay-subscription-v2';
const FREE_PROMO_DURATION_MONTHS = 1;

const DURATIONS = [
  { 
    months: 1, 
    label: '1 Month', 
    originalPrice: 999, 
    price: 599, 
    discountPercent: 40, 
    savings: 400, 
    dailyText: 'Only ₹20/day (~₹599/mo)',
    badge: '40% OFF',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
  },
  { 
    months: 3, 
    label: '3 Months', 
    originalPrice: 2499, 
    price: 1499, 
    discountPercent: 40, 
    savings: 1000, 
    dailyText: 'Only ₹16/day (~₹500/mo)', 
    badge: 'MOST POPULAR (40% OFF)', 
    badgeColor: 'bg-amber-400 text-black' 
  },
  { 
    months: 12, 
    label: '12 Months + 1 Month Free', 
    originalPrice: 9990, 
    price: 4999, 
    discountPercent: 50, 
    savings: 4991, 
    dailyText: 'Best value (13 mos, ~₹416/mo)', 
    badge: 'SAVE 50% (BEST VALUE)', 
    badgeColor: 'bg-emerald-500 text-black' 
  },
];

export default function BillingPage() {
  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true' || isNativeCapacitorApp();
  const { gym, gymName, ownerEmail, isReady, refreshGym } = useCurrentGym();
  const [processing, setProcessing] = useState(false);
  const [toastState, setToastState] = useState({ message: '', type: 'success' });
  
  // Selection State
  const [durationsList, setDurationsList] = useState(DURATIONS);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[0]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  useEffect(() => {
    async function loadDbPrices() {
      try {
        const { data, error } = await supabase
          .from('saas_plans')
          .select('*');
        if (!error && data && data.length > 0) {
          const updated = DURATIONS.map(dur => {
            let dbPlan;
            if (dur.months === 1) {
              dbPlan = data.find(p => p.id === PRO_PLAN_ID || p.name.includes('1 Month'));
            } else if (dur.months === 3) {
              dbPlan = data.find(p => p.id === '43b2c470-7e88-4976-bee1-9fa66d247d40' || p.name.includes('3 Months'));
            } else if (dur.months === 12) {
              dbPlan = data.find(p => p.id === '81ba6dad-524b-4bd6-9987-e5759c3e11d4' || p.name.includes('12 Months'));
            }
            if (dbPlan) {
              const currentPrice = Number(dbPlan.price);
              return {
                ...dur,
                price: currentPrice,
                savings: (dur.originalPrice || currentPrice) - currentPrice
              };
            }
            return dur;
          });
          setDurationsList(updated);
          // Sync selected duration with new price
          setSelectedDuration(prev => {
            const found = updated.find(u => u.months === prev.months);
            return found || prev;
          });
        }
      } catch (err) {
        console.error('Error loading DB prices:', err);
      }
    }
    loadDbPrices();
  }, []);

  const handleVerifyPromo = async () => {
    if (!promoCode) return;
    try {
      setVerifyingPromo(true);
      setPromoError('');
      
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setPromoError('Invalid or expired code');
        setAppliedPromo(null);
        return;
      }

      // Check usage limits
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setPromoError('This code has reached its usage limit');
        return;
      }

      // Check expiry
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        setPromoError('This code has expired');
        return;
      }

      setAppliedPromo(data);
      if (data.discount_type === 'full_free') {
        const freeDuration = durationsList.find((duration) => duration.months === FREE_PROMO_DURATION_MONTHS);
        if (freeDuration) setSelectedDuration(freeDuration);
      }
      setPromoError('');
    } catch {
      setPromoError('Error verifying code');
    } finally {
      setVerifyingPromo(false);
    }
  };

  const calculateFinalAmount = () => {
    let amount = selectedDuration.price;
    if (appliedPromo) {
      if (appliedPromo.discount_type === 'full_free') {
        return 0;
      } else if (appliedPromo.discount_type === 'percentage') {
        amount = amount * (1 - appliedPromo.discount_value / 100);
      } else if (appliedPromo.discount_type === 'fixed') {
        amount = Math.max(0, amount - appliedPromo.discount_value);
      }
    }
    return Math.round(amount);
  };

  const handleSubscribe = async () => {
    const finalAmount = calculateFinalAmount();
    
    try {
      if (isPlaystoreApp) {
        setToastState({ 
          message: 'Opening secure payment gateway...', 
          type: 'success' 
        });
        setTimeout(async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const tokenHash = `#access_token=${encodeURIComponent(session.access_token)}&refresh_token=${encodeURIComponent(session.refresh_token)}`;
              window.open(`https://gymix.fit/billing?source=app${tokenHash}`, '_system');
            } else {
              window.open('https://gymix.fit/billing?source=app', '_system');
            }
          } catch (e) {
            window.open('https://gymix.fit/billing?source=app', '_system');
          }
        }, 800);
        return;
      }

      setProcessing(true);

      // Handle 100% Discount / Offline Payment logic
      if (finalAmount === 0) {
        if (!appliedPromo) throw new Error('A valid promo code is required for free activation.');
        if (appliedPromo.discount_type !== 'full_free') {
          throw new Error('Only 1-month free promo codes can activate a free subscription.');
        }

        const { error: redeemError } = await supabase.functions.invoke(BILLING_FUNCTION, {
          body: {
            action: 'redeem-promo',
            promoId: appliedPromo.id,
            durationMonths: FREE_PROMO_DURATION_MONTHS,
            planId: PRO_PLAN_ID
          }
        });

        if (redeemError) throw redeemError;

        setToastState({ message: '1 month free subscription activated successfully!', type: 'success' });
        await refreshGym();
        window.location.reload();
        return;
      }
      
      // Standard Razorpay Flow
      const isLoaded = await razorpayService.loadScript();
      if (!isLoaded) throw new Error('Razorpay SDK failed to load');

      // Create Order
      const { data, error } = await supabase.functions.invoke(BILLING_FUNCTION, {
        body: { 
          action: 'create-order', 
          amount: finalAmount,
          durationMonths: selectedDuration.months,
          planId: PRO_PLAN_ID,
          promoId: appliedPromo?.id
        }
      });

      if (error) {
        console.error('Edge Function Error:', error);
        const rawMsg = error.message || '';
        let errorMsg = 'Failed to create payment order. Please try again.';
        if (rawMsg.includes('Failed to fetch') || rawMsg.includes('network')) {
          errorMsg = 'Network connection issue. Please check your internet connection.';
        } else if (rawMsg) {
          errorMsg = rawMsg;
        }
        setToastState({ message: `Billing: ${errorMsg}`, type: 'error' });
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency,
        name: 'Gymix',
        description: `Pro Plan - ${selectedDuration.label}`,
        order_id: data.id,
        prefill: {
          name: gymName || '',
          email: ownerEmail || '',
        },
        theme: {
          color: '#059669', // Brand Accent Color
        },
        modal: {
          confirm_close: true, // Prevents users from accidentally closing the payment popup
          ondismiss: () => {
            setProcessing(false);
          }
        },
        handler: async (response) => {
          // Verify Payment
          const { error: verifyErr } = await supabase.functions.invoke(BILLING_FUNCTION, {
            body: { 
              action: 'verify-payment', 
              paymentData: response,
              promoId: appliedPromo?.id
            }
          });

          if (verifyErr) throw verifyErr;
          setToastState({ message: 'Payment successful! Subscription active.', type: 'success' });
          await refreshGym();
          window.location.reload();
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      const rawMsg = err.message || '';
      let errMsg = 'Payment action failed. Please try again.';
      if (rawMsg.includes('Failed to fetch') || rawMsg.includes('network') || rawMsg.includes('offline')) {
        errMsg = 'Connection lost. Please check your internet and try again.';
      } else if (rawMsg) {
        errMsg = rawMsg;
      }
      setToastState({ message: errMsg, type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (isPlaystoreApp) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xs relative overflow-hidden animate-in fade-in duration-500">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-2xl mx-auto mb-4 border border-emerald-500/20">
            🔒
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">In-App Purchases Disabled</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 leading-relaxed font-medium">
            To comply with app store guidelines, subscription upgrades and renewals are not supported inside this application. 
            <br/><br/>
            Please manage your account online to proceed.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
          <p className="text-slate-500 dark:text-zinc-400 text-xs font-semibold">Loading subscription details...</p>
        </div>
      </div>
    );
  }

  const finalAmount = calculateFinalAmount();
  const expiryDate = gym?.subscription_expires_at ? new Date(gym.subscription_expires_at) : null;
  const isExpired = gym?.billing_status === 'expired';
  const isPending = gym?.billing_status === 'pending' || gym?.status === 'pending';
  const isExpiringSoon = Number.isFinite(gym?.billing_days_left) && gym.billing_days_left >= 0 && gym.billing_days_left <= 7;
  const isDurationDisabled = appliedPromo?.discount_type === 'full_free';

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const source = params ? params.get('source') : null;
  const showReturnToApp = source === 'app' && gym?.billing_status === 'active';

  if (showReturnToApp) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-12 text-center space-y-5 max-w-md w-full shadow-xs relative overflow-hidden">
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-2xl mx-auto mb-2">
            🎉
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Payment Successful!</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium leading-relaxed">
              Your Gymix subscription for <strong className="text-slate-900 dark:text-white">"{gymName}"</strong> is now active. You can close this window and return to the app.
            </p>
          </div>
          
          <a
            href="com.gymix.fit://dashboard"
            className="block w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all text-xs shadow-xs text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to Mobile App</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-3">
        {isPending ? (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full text-xs font-semibold">
              <Zap className="w-3.5 h-3.5" />
              Activate Your Account
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Welcome to <span className="text-emerald-600 dark:text-emerald-400">Gymix</span>
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
              You're one step away from managing your gym like a pro. Choose a plan below to unlock all features.
            </p>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
              <CreditCard className="w-3.5 h-3.5" />
              Subscription required to access the platform
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-semibold">
              Used by growing gyms across India
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gymix <span className="text-emerald-600 dark:text-emerald-400">Growth Plan</span>
            </h1>
            <p className="text-slate-500 dark:text-zinc-400 max-w-xl mx-auto text-sm leading-relaxed">
              Unlock unlimited potential. One plan, everything included. Choose a duration to begin.
            </p>
            {(expiryDate || isExpired) && (
              <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold ${
                isExpired
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  : isExpiringSoon
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              }`}>
                <Clock className="w-3.5 h-3.5" />
                {isExpired
                  ? 'Your plan has expired. Renew to continue.'
                  : `Current access valid until ${expiryDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`}
              </div>
            )}
          </>
        )}
      </div>

      {isPlaystoreApp && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl p-4 sm:p-5 text-xs font-medium leading-relaxed space-y-1.5 max-w-5xl mx-auto">
          <p className="text-xs font-bold flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5" />
            Google Play Policy Notice
          </p>
          <p>
            To comply with Google Play Developer Guidelines, subscription billing updates cannot be completed directly inside the app. 
            Please open **gymix.fit** on your browser to complete your renewal.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Duration Selection & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Founding Gym Offer Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Star className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h4 className="text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider text-xs">Founding Gym Launch Offer</h4>
              <p className="text-slate-600 dark:text-zinc-400 text-xs font-medium">Up to 50% introductory discount unlocked on all plans!</p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs relative overflow-hidden">
            <h3 className="text-slate-900 dark:text-white font-bold tracking-tight mb-6 flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Select Duration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {durationsList.map((dur) => (
                <button
                  key={dur.months}
                  onClick={() => !isDurationDisabled && setSelectedDuration(dur)}
                  disabled={isDurationDisabled}
                  className={`relative p-5 rounded-2xl border-2 transition-all duration-200 text-left group active:scale-[0.98] cursor-pointer ${
                    selectedDuration.months === dur.months
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-600 dark:border-emerald-500 shadow-xs'
                      : 'bg-slate-50/60 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  } ${isDurationDisabled && selectedDuration.months !== dur.months ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {dur.badge && (
                    <div className={`absolute -top-2.5 right-3 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shadow-xs ${dur.badgeColor}`}>
                      {dur.badge}
                    </div>
                  )}
                  <div className="flex flex-col mb-3">
                    <span className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                      selectedDuration.months === dur.months ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-white'
                    }`}>
                      {dur.label}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-slate-400 line-through">₹{dur.originalPrice}</span>
                      <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white transition-colors">₹{dur.price}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        SAVE {dur.discountPercent}% OFF
                      </span>
                    </div>
                    <span className="text-xs mt-2 text-slate-500 dark:text-zinc-400 font-medium">
                      {dur.dailyText}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Trust Building Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             {[
               { icon: Star, text: "Made for Indian Gym Owners", color: "text-amber-500", bg: "bg-amber-500/10" },
               { icon: Zap, text: "Simple. Fast. Reliable.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
               { icon: CheckCircle2, text: "Manage members, fees and attendance easily.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" }
             ].map((item, i) => (
               <div key={i} className="flex flex-col items-start gap-2.5 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs">
                 <div className={`w-8 h-8 rounded-lg ${item.bg} flex items-center justify-center ${item.color} shrink-0`}>
                   <item.icon className="w-4 h-4" />
                 </div>
                 <span className="text-slate-600 dark:text-zinc-300 text-xs font-medium leading-relaxed">{item.text}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Right: Summary & Checkout */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs sticky top-8">
            <h3 className="text-slate-900 dark:text-white font-bold tracking-tight mb-6 text-lg">Order Summary</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 dark:text-zinc-400 font-medium">Growth Plan ({selectedDuration.label})</span>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 line-through block">₹{selectedDuration.originalPrice}</span>
                  <span className="text-slate-900 dark:text-white font-bold">₹{selectedDuration.price}</span>
                </div>
              </div>

              <div className="flex justify-between text-xs py-1.5 px-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Launch Discount ({selectedDuration.discountPercent}% OFF)</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">-₹{selectedDuration.savings}</span>
              </div>
              
              {appliedPromo && (
                <div className="flex justify-between text-xs animate-in slide-in-from-top-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Ticket className="w-3.5 h-3.5" />
                    Promo: {appliedPromo.code}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                    -{appliedPromo.discount_type === 'full_free' ? '₹' + selectedDuration.price : 
                      appliedPromo.discount_type === 'percentage' ? appliedPromo.discount_value + '%' : 
                      '₹' + appliedPromo.discount_value}
                  </span>
                </div>
              )}
              
              <div className="h-px bg-slate-100 dark:bg-zinc-800 my-3" />
              
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="text-slate-900 dark:text-white font-bold text-base block">Total</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    You save ₹{(selectedDuration.savings || 0) + (selectedDuration.price - finalAmount)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 line-through font-medium pr-1.5">₹{selectedDuration.originalPrice}</span>
                  <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">₹{finalAmount}</span>
                  <p className="text-slate-400 text-[10px] font-medium mt-0.5">Inclusive of all taxes</p>
                </div>
              </div>
            </div>

            {/* Promo Code Input */}
            <div className="space-y-2 mb-6">
              <div className="relative">
                <Ticket className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="HAVE A PROMO CODE?"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={appliedPromo || verifyingPromo}
                  className="w-full bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl pl-10 pr-16 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all uppercase disabled:opacity-50 shadow-xs"
                />
                {appliedPromo ? (
                  <button 
                    onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-500 text-xs font-bold uppercase hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    onClick={handleVerifyPromo}
                    disabled={!promoCode || verifyingPromo}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {verifyingPromo ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {promoError && <p className="text-rose-500 text-xs font-medium ml-1">{promoError}</p>}
            </div>

            <button
              disabled={processing}
              onClick={handleSubscribe}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 group"
            >
              {processing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : finalAmount === 0 ? (
                <>
                  <Gift className="w-4 h-4 group-hover:scale-105 transition-transform" />
                  Redeem on Web
                </>
              ) : isPlaystoreApp ? (
                <>
                  <CreditCard className="w-4 h-4 group-hover:scale-105 transition-transform" />
                  Open Payment on Web
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 group-hover:scale-105 transition-transform" />
                  Start Growing
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Support Info */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-slate-900 dark:text-white font-bold text-base tracking-tight">Need help choosing?</h4>
            <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Contact our support team for any billing related queries.</p>
          </div>
        </div>
        <button className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer">
          Contact Support
        </button>
      </div>

      <Toast 
        message={toastState.message} 
        type={toastState.type} 
        onClose={() => setToastState({ message: '', type: 'success' })} 
      />
    </div>
  );
}

