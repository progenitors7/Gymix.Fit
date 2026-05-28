import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  Star,
  RefreshCw,
  Ticket,
  Clock,
  Gift
} from 'lucide-react';
import { useCurrentGym } from '../hooks/useCurrentGym';
import { supabase } from '../lib/supabaseClient';
import { razorpayService } from '../services/razorpayService';
import Toast from '../components/UI/Toast';

const PRO_PLAN_ID = '770f855a-535c-44f1-9604-0ba7a74c6f59';
const BILLING_FUNCTION = 'razorpay-subscription-v2';
const FREE_PROMO_DURATION_MONTHS = 1;

const DURATIONS = [
  { months: 1, label: '1 Month', price: 999, dailyText: 'Only ₹33/day', discount: 0 },
  { months: 3, label: '3 Months', price: 2499, dailyText: 'Only ₹27/day', discount: 16, badge: 'MOST POPULAR', badgeColor: 'bg-amber-400 text-black' },
  { months: 12, label: '12 Months + 1 Month Free', price: 9990, dailyText: 'Best value (13 months total)', discount: 23, badge: 'BEST VALUE', badgeColor: 'bg-[#3390ec] text-white' },
];

export default function BillingPage() {
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
              return {
                ...dur,
                price: Number(dbPlan.price)
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
        // Try to get the detailed error message from the response if possible
        const errorMsg = error.message || 'Failed to create payment order';
        setToastState({ message: `Billing Error: ${errorMsg}`, type: 'error' });
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
          color: '#3390ec', // Premium Brand Accent Color
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
      setToastState({ message: err.message || 'Action failed', type: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-[#3390ec] animate-spin" />
          <p className="text-gray-500 font-medium">Loading subscription details...</p>
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-10 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center space-y-4">
        {isPending ? (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400/10 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest">
              <Zap className="w-3 h-3" />
              Activate Your Account
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
              Welcome to <span className="text-[#3390ec]">Gymix</span>
            </h1>
            <p className="text-gray-400 max-w-xl mx-auto text-sm font-medium leading-relaxed">
              You're one step away from managing your gym like a pro.
              Choose a plan below to unlock all features and start growing your fitness empire.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 text-[11px] font-black uppercase tracking-widest">
              <CreditCard className="w-3.5 h-3.5" />
              Subscription required to access the platform
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#3390ec]/10 text-[#3390ec] rounded-full text-[10px] font-black uppercase tracking-widest">
              Used by growing gyms across India
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
              Gymix <span className="text-[#3390ec]">Growth Plan</span>
            </h1>
            <p className="text-gray-500 max-w-xl mx-auto text-sm font-medium leading-relaxed">
              Unlock unlimited potential. One plan, everything included. 
              Choose a duration and start growing your fitness empire.
            </p>
            {(expiryDate || isExpired) && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest ${
                isExpired
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  : isExpiringSoon
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Duration Selection & Pricing */}
        <div className="lg:col-span-2 space-y-6">
          {/* Founding Gym Offer Banner */}
          <div className="bg-gradient-to-r from-[#3390ec]/10 to-transparent border border-[#3390ec]/20 rounded-2xl p-4 flex items-center gap-4 animate-in slide-in-from-left duration-700">
            <div className="w-10 h-10 rounded-xl bg-[#3390ec]/20 flex items-center justify-center text-[#3390ec] flex-shrink-0 shadow-lg shadow-[#3390ec]/20">
              <Star className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="text-[#3390ec] font-black uppercase tracking-widest text-xs">Founding Gym Offer</h4>
              <p className="text-gray-400 text-sm font-medium">Early access pricing for limited gyms</p>
            </div>
          </div>

          <div className="bg-[#212121] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Zap className="w-32 h-32 text-[#3390ec]" />
            </div>

            <h3 className="text-white font-black uppercase italic tracking-tight mb-8 flex items-center gap-2 text-xl">
              <Clock className="w-5 h-5 text-[#3390ec]" />
              Select Duration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {durationsList.map((dur) => (
                <button
                  key={dur.months}
                  onClick={() => !isDurationDisabled && setSelectedDuration(dur)}
                  disabled={isDurationDisabled}
                  className={`relative p-6 rounded-3xl border-2 transition-all duration-300 text-left group active:scale-[0.98] ${
                    selectedDuration.months === dur.months
                      ? 'bg-[#3390ec]/5 border-[#3390ec] shadow-xl shadow-[#3390ec]/20'
                      : 'bg-[#1c1c1c] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                  } ${isDurationDisabled && selectedDuration.months !== dur.months ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {dur.badge && (
                    <div className={`absolute -top-3 right-4 px-3 py-1 text-[8px] font-black uppercase tracking-widest rounded-full shadow-lg ${dur.badgeColor}`}>
                      {dur.badge}
                    </div>
                  )}
                  <div className="flex flex-col mb-4">
                    <span className={`text-sm font-black uppercase tracking-widest mb-1 ${
                      selectedDuration.months === dur.months ? 'text-[#3390ec]' : 'text-gray-500 group-hover:text-gray-400'
                    }`}>
                      {dur.label}
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white transition-colors">₹{dur.price}</span>
                    </div>
                    <span className={`text-xs mt-2 font-medium ${
                      selectedDuration.months === dur.months ? 'text-[#3390ec]' : 'text-gray-500'
                    }`}>
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
               { icon: Star, text: "Made for Indian Gym Owners", color: "text-amber-400", bg: "bg-amber-400/10" },
               { icon: Zap, text: "Simple. Fast. Reliable.", color: "text-[#3390ec]", bg: "bg-[#3390ec]/10" },
               { icon: CheckCircle2, text: "Manage members, fees and attendance easily.", color: "text-emerald-400", bg: "bg-emerald-400/10" }
             ].map((item, i) => (
               <div key={i} className="flex flex-col items-start gap-3 p-5 bg-[#212121] backdrop-blur-md rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                 <div className={`w-8 h-8 rounded-xl ${item.bg} flex items-center justify-center ${item.color} flex-shrink-0`}>
                   <item.icon className="w-4 h-4" />
                 </div>
                 <span className="text-gray-300 text-sm font-medium leading-relaxed">{item.text}</span>
               </div>
             ))}
          </div>
        </div>

        {/* Right: Summary & Checkout */}
        <div className="space-y-6">
          <div className="bg-[#212121]/80 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl sticky top-8">
            <h3 className="text-white font-black uppercase italic tracking-tight mb-8 text-xl">Order Summary</h3>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400 font-medium">Growth Plan ({selectedDuration.label})</span>
                <span className="text-white font-bold">₹{selectedDuration.price}</span>
              </div>
              
              {appliedPromo && (
                <div className="flex justify-between text-sm animate-in slide-in-from-top-2">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Ticket className="w-3 h-3" />
                    Promo: {appliedPromo.code}
                  </span>
                  <span className="text-emerald-400 font-bold">
                    -{appliedPromo.discount_type === 'full_free' ? '₹' + selectedDuration.price : 
                      appliedPromo.discount_type === 'percentage' ? appliedPromo.discount_value + '%' : 
                      '₹' + appliedPromo.discount_value}
                  </span>
                </div>
              )}
              
              <div className="h-px bg-white/5 my-4" />
              
              <div className="flex justify-between items-baseline">
                <span className="text-white font-black uppercase italic text-lg">Total</span>
                <div className="text-right">
                  <span className="text-3xl font-black text-[#3390ec]">₹{finalAmount}</span>
                  <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mt-1">Inclusive of all taxes</p>
                </div>
              </div>
            </div>

            {/* Promo Code Input */}
            <div className="space-y-3 mb-8">
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text"
                  placeholder="HAVE A PROMO CODE?"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={appliedPromo || verifyingPromo}
                  className="w-full bg-[#1c1c1c] border border-white/5 rounded-2xl pl-11 pr-4 py-4 text-xs font-black tracking-widest text-white focus:outline-none focus:border-[#3390ec]/50 transition-all uppercase disabled:opacity-50"
                />
                {appliedPromo ? (
                  <button 
                    onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 text-[10px] font-black uppercase hover:underline"
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    onClick={handleVerifyPromo}
                    disabled={!promoCode || verifyingPromo}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3390ec] text-[10px] font-black uppercase hover:underline disabled:opacity-50"
                  >
                    {verifyingPromo ? '...' : 'Apply'}
                  </button>
                )}
              </div>
              {promoError && <p className="text-rose-500 text-[10px] font-bold ml-2">{promoError}</p>}
            </div>

            <button
              disabled={processing}
              onClick={handleSubscribe}
              className="w-full py-5 bg-gradient-to-r from-[#3390ec] to-[#2b83d6] hover:from-[#4aa1fa] hover:to-[#3390ec] text-white rounded-2xl text-sm font-black uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-[#3390ec]/30 hover:shadow-[#3390ec]/50 active:scale-[0.98] disabled:opacity-50 group"
            >
              {processing ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : finalAmount === 0 ? (
                <>
                  <Gift className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Redeem Now
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Start Growing
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Support Info */}
      <div className="flex flex-col md:flex-row gap-8 items-center justify-between p-8 bg-white/5 border border-white/5 rounded-[2.5rem]">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 flex items-center justify-center text-amber-400">
            <Star className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-white font-black uppercase italic text-lg tracking-tight">Need help choosing?</h4>
            <p className="text-gray-500 text-sm font-medium">Contact our support team for any billing related queries.</p>
          </div>
        </div>
        <button className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/5 transition-all">
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

