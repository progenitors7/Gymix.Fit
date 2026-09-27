import { useState, useEffect } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Zap, 
  RefreshCw, 
  Ticket, 
  Clock, 
  Gift, 
  ArrowRight,
  ShieldCheck,
  Check,
  Receipt,
  HelpCircle
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
    billedText: 'Billed monthly',
    perMonthText: '₹599 / month',
    badge: null
  },
  { 
    months: 3, 
    label: '3 Months', 
    originalPrice: 2499, 
    price: 1499, 
    discountPercent: 40, 
    savings: 1000, 
    billedText: 'Billed ₹1,499 quarterly',
    perMonthText: '₹500 / month',
    badge: 'Most Popular',
    isPopular: true
  },
  { 
    months: 12, 
    label: 'Annual', 
    subtitle: '12 Months + 1 Mo Free',
    originalPrice: 9990, 
    price: 4999, 
    discountPercent: 50, 
    savings: 4991, 
    billedText: '13 months total access',
    perMonthText: '₹385 / month',
    badge: 'Save 50%',
    isBestValue: true
  },
];

const PLAN_FEATURES = [
  { title: 'Unlimited Members', desc: 'No cap on active gym members or member records' },
  { title: 'WhatsApp Automation', desc: 'Auto fee reminders, welcome alerts & PDF bills' },
  { title: 'QR Code Attendance', desc: 'Fast digital kiosk & member phone scan check-ins' },
  { title: 'POS & Store Inventory', desc: 'Manage supplements, shakes, drinks & locker rentals' },
  { title: 'Revenue & GST Reports', desc: 'Monthly cash-flow, dues ledger & financial exports' },
  { title: 'Cloud Sync & Backups', desc: 'Multi-device real-time sync with 99.9% uptime' },
];

export default function BillingPage() {
  const isPlaystoreApp = sessionStorage.getItem('is_playstore_app') === 'true' || isNativeCapacitorApp();
  const { gym, gymName, ownerEmail, isReady, refreshGym } = useCurrentGym();
  const [processing, setProcessing] = useState(false);
  const [toastState, setToastState] = useState({ message: '', type: 'success' });
  
  // Selection State
  const [durationsList, setDurationsList] = useState(DURATIONS);
  const [selectedDuration, setSelectedDuration] = useState(DURATIONS[1] || DURATIONS[0]);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoError, setPromoError] = useState('');
  const [verifyingPromo, setVerifyingPromo] = useState(false);

  // Billing History
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

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
              const perMonthVal = dur.months === 12 ? Math.round(currentPrice / 13) : Math.round(currentPrice / dur.months);
              return {
                ...dur,
                price: currentPrice,
                perMonthText: `₹${perMonthVal} / month`,
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

  // Fetch past invoices for gym
  useEffect(() => {
    async function loadInvoices() {
      if (!gym?.id) return;
      try {
        setLoadingInvoices(true);
        const { data, error } = await supabase
          .from('saas_subscriptions')
          .select('id, amount, currency, status, payment_status, duration_months, current_period_start, current_period_end, created_at')
          .eq('gym_id', gym.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (!error && data) {
          setInvoices(data);
        }
      } catch (err) {
        console.error('Error loading invoices:', err);
      } finally {
        setLoadingInvoices(false);
      }
    }
    loadInvoices();
  }, [gym?.id]);

  const handleVerifyPromo = async () => {
    if (!promoCode) return;
    try {
      setVerifyingPromo(true);
      setPromoError('');
      
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', promoCode.toUpperCase().trim())
        .eq('is_active', true)
        .single();

      if (error || !data) {
        setPromoError('Invalid or expired coupon code');
        setAppliedPromo(null);
        return;
      }

      // Check usage limits
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setPromoError('This coupon has reached its maximum usage limit');
        return;
      }

      // Check expiry
      if (data.expiry_date && new Date(data.expiry_date) < new Date()) {
        setPromoError('This coupon code has expired');
        return;
      }

      setAppliedPromo(data);
      if (data.discount_type === 'full_free') {
        const freeDuration = durationsList.find((duration) => duration.months === FREE_PROMO_DURATION_MONTHS);
        if (freeDuration) setSelectedDuration(freeDuration);
      }
      setPromoError('');
    } catch {
      setPromoError('Unable to verify code. Please try again.');
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
      if (!isLoaded) throw new Error('Razorpay payment gateway failed to load. Please check your internet connection.');

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
        name: 'Gymix.fit',
        description: `Pro Plan - ${selectedDuration.label}`,
        order_id: data.id,
        prefill: {
          name: gymName || '',
          email: ownerEmail || '',
        },
        theme: {
          color: '#059669', // Emerald 600
        },
        modal: {
          confirm_close: true,
          ondismiss: () => {
            setProcessing(false);
          }
        },
        handler: async (response) => {
          const { error: verifyErr } = await supabase.functions.invoke(BILLING_FUNCTION, {
            body: { 
              action: 'verify-payment', 
              paymentData: response,
              promoId: appliedPromo?.id
            }
          });

          if (verifyErr) throw verifyErr;
          setToastState({ message: 'Payment verified! Subscription activated.', type: 'success' });
          await refreshGym();
          window.location.reload();
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      const rawMsg = err.message || '';
      let errMsg = 'Payment process encountered an issue. Please try again.';
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
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xs relative overflow-hidden">
          <div className="w-12 h-12 bg-slate-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-slate-700 dark:text-zinc-300 text-xl mx-auto mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">In-App Purchases Disabled</h2>
          <p className="text-slate-500 dark:text-zinc-400 text-xs mb-6 leading-relaxed font-normal">
            To comply with app store guidelines, subscription upgrades and renewals are managed directly on the web portal.
          </p>
          <button
            onClick={() => window.open('https://gymix.fit/billing', '_system')}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer"
          >
            Open Web Portal
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400 animate-spin" />
          <p className="text-slate-500 dark:text-zinc-400 text-xs font-medium">Loading subscription details...</p>
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
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 sm:p-12 text-center space-y-5 max-w-md w-full shadow-xs">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Payment Confirmed</h2>
            <p className="text-slate-500 dark:text-zinc-400 text-xs leading-relaxed">
              Your Gymix subscription for <span className="font-semibold text-slate-900 dark:text-white">{gymName}</span> is active. You can now return to the mobile application.
            </p>
          </div>
          
          <a
            href="com.gymix.fit://dashboard"
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-all text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Return to Mobile App</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Plans & Billing
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1">
            Manage your Gymix software license, renewals, and invoice history.
          </p>
        </div>

        {/* Current Status Pill */}
        <div className="flex items-center">
          {isPending ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Activation Pending</span>
            </div>
          ) : isExpired ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-lg text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Subscription Expired</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                Active {expiryDate ? `• Renews ${expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Plans (2 cols) & Summary (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Plan Options & Feature Matrix */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Choose Billing Cycle
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  All plans include every pro feature. Save up to 50% with quarterly or annual billing.
                </p>
              </div>
            </div>

            {/* Plan Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {durationsList.map((dur) => {
                const isSelected = selectedDuration.months === dur.months;
                return (
                  <div
                    key={dur.months}
                    onClick={() => !isDurationDisabled && setSelectedDuration(dur)}
                    className={`relative rounded-xl border p-5 transition-all text-left flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'border-emerald-600 dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-slate-300 dark:hover:border-zinc-700'
                    } ${isDurationDisabled && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {dur.badge && (
                      <div className="absolute top-3 right-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                          dur.isPopular 
                            ? 'bg-emerald-600 text-white dark:bg-emerald-500' 
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
                        }`}>
                          {dur.badge}
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-500' 
                            : 'border-slate-300 dark:border-zinc-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">
                          {dur.label}
                        </span>
                      </div>

                      {dur.subtitle && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mb-3">
                          {dur.subtitle}
                        </p>
                      )}

                      <div className="mt-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                            ₹{dur.price.toLocaleString('en-IN')}
                          </span>
                          {dur.originalPrice && dur.originalPrice > dur.price && (
                            <span className="text-xs text-slate-400 line-through">
                              ₹{dur.originalPrice.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 font-medium">
                          {dur.perMonthText}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-zinc-800/60 text-[11px] text-slate-500 dark:text-zinc-400">
                      {dur.billedText}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Included Features Section (Replaces generic squircle cards) */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Included with every plan
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Full access to all Gymix modules with no hidden upgrades or limits.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
              {PLAN_FEATURES.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                      {feature.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-normal">
                      {feature.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Billing & Invoice History */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Payment History
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Past receipts & activations
              </span>
            </div>

            {loadingInvoices ? (
              <div className="py-6 flex items-center justify-center text-xs text-slate-400 gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading records...</span>
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-zinc-400">
                No prior invoices recorded for this account.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-zinc-800">
                {invoices.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">
                        {inv.duration_months ? `${inv.duration_months} Months Access` : 'Pro Subscription'}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        ₹{Number(inv.amount || 0).toLocaleString('en-IN')}
                      </p>
                      <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full capitalize font-medium ${
                        inv.payment_status === 'completed' || inv.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {inv.payment_status || inv.status || 'Processed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order Summary & Checkout */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sticky top-6 shadow-xs">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Order Summary
            </h3>

            <div className="space-y-3 pb-4 border-b border-slate-100 dark:border-zinc-800 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 dark:text-zinc-400">
                  {gymName || 'Gym'} • {selectedDuration.label}
                </span>
                <span className="font-medium text-slate-900 dark:text-white">
                  ₹{selectedDuration.price.toLocaleString('en-IN')}
                </span>
              </div>

              {selectedDuration.savings > 0 && !appliedPromo && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span>Introductory Discount ({selectedDuration.discountPercent}%)</span>
                  <span>-₹{selectedDuration.savings.toLocaleString('en-IN')}</span>
                </div>
              )}

              {appliedPromo && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1 font-medium">
                    <Ticket className="w-3.5 h-3.5" />
                    Coupon: {appliedPromo.code}
                  </span>
                  <span className="font-semibold">
                    -{appliedPromo.discount_type === 'full_free' 
                      ? '₹' + selectedDuration.price.toLocaleString('en-IN')
                      : appliedPromo.discount_type === 'percentage' 
                        ? `${appliedPromo.discount_value}%`
                        : `₹${appliedPromo.discount_value.toLocaleString('en-IN')}`
                    }
                  </span>
                </div>
              )}
            </div>

            {/* Total Row */}
            <div className="py-4 border-b border-slate-100 dark:border-zinc-800 flex justify-between items-baseline">
              <div>
                <span className="text-xs font-medium text-slate-600 dark:text-zinc-400 block">Total Due</span>
                <span className="text-[10px] text-slate-400">Inclusive of all taxes</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  ₹{finalAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Coupon / Promo Input */}
            <div className="py-4 space-y-2">
              <label className="text-xs font-medium text-slate-600 dark:text-zinc-400 block">
                Have a coupon code?
              </label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Enter code"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  disabled={appliedPromo || verifyingPromo}
                  className="flex-1 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs font-medium text-slate-900 dark:text-white uppercase placeholder:normal-case placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-50"
                />
                {appliedPromo ? (
                  <button 
                    onClick={() => { setAppliedPromo(null); setPromoCode(''); }}
                    className="px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-500 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : (
                  <button 
                    onClick={handleVerifyPromo}
                    disabled={!promoCode || verifyingPromo}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-900 dark:text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {verifyingPromo ? 'Checking...' : 'Apply'}
                  </button>
                )}
              </div>
              {promoError && (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                  {promoError}
                </p>
              )}
              {appliedPromo && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  Coupon applied successfully.
                </p>
              )}
            </div>

            {/* Main Action Button */}
            <button
              disabled={processing}
              onClick={handleSubscribe}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
            >
              {processing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Checkout...</span>
                </>
              ) : finalAmount === 0 ? (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Activate 1-Month Free Access</span>
                </>
              ) : isPlaystoreApp ? (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Open Payment on Web</span>
                </>
              ) : (
                <>
                  <span>Proceed to Pay</span>
                  <span className="font-bold">•</span>
                  <span>₹{finalAmount.toLocaleString('en-IN')}</span>
                </>
              )}
            </button>

            {/* Security Notice */}
            <div className="mt-4 pt-3 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-zinc-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Secured by Razorpay • UPI, Cards, NetBanking</span>
            </div>
          </div>

          {/* Help & Support Card */}
          <div className="rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 p-5 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white">
                Questions about plans?
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
                Need GST invoices, custom franchise multi-branch packages, or bank NEFT transfers? Contact our support team.
              </p>
            </div>
          </div>
        </div>
      </div>

      <Toast 
        message={toastState.message} 
        type={toastState.type} 
        onClose={() => setToastState({ message: '', type: 'success' })} 
      />
    </div>
  );
}
