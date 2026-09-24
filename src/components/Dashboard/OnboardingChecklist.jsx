import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { planService } from '../../services/planService';

const DISMISS_KEY = 'gymix_onboarding_dismissed';

export default function OnboardingChecklist({ profile, gym, stats }) {
  const navigate = useNavigate();
  const [plansCount, setPlansCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (gym?.id) {
      planService.getPlans(gym.id)
        .then(plans => {
          const customPlans = plans.filter(p => p.id !== 'trial_default');
          setPlansCount(customPlans.length);
        })
        .catch(err => {
          console.error('[OnboardingChecklist] Failed to load plans:', err);
        });
    }
  }, [gym?.id, stats]);

  // Determine step completion states
  const isProfileComplete = !!(profile?.full_name && profile?.phone_number);
  const isPlansConfigured = plansCount > 0;
  const isMembersOnboarded = !!(stats?.membership?.total && stats?.membership?.total > 0);
  const isStoreVisited = localStorage.getItem('gymix_store_visited') === 'true';

  const steps = [
    {
      id: 'profile',
      title: 'Complete Profile Details',
      description: 'Add your phone number and contact details.',
      completed: isProfileComplete,
      actionLabel: 'Edit Profile',
      path: '/profile'
    },
    {
      id: 'plans',
      title: 'Create Membership Plans',
      description: 'Configure subscription tiers (e.g. Monthly, Quarterly, Yearly).',
      completed: isPlansConfigured,
      actionLabel: 'Setup Plans',
      path: '/settings'
    },
    {
      id: 'members',
      title: 'Onboard Your First Member',
      description: 'Add a member manually or let them scan your QR code.',
      completed: isMembersOnboarded,
      actionLabel: 'Add Member',
      path: '/members/new'
    },
    {
      id: 'store',
      title: 'Explore Gym Store',
      description: 'Set up supplements, drinks, or gym merchandise for sale.',
      completed: isStoreVisited,
      actionLabel: 'Open Store',
      path: '/store-manager'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // If dismissed or all tasks are complete, do not render
  if (isDismissed || completedCount === steps.length) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {}
  };

  const nextPendingStep = steps.find(s => !s.completed);

  return (
    <div className="rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/40 dark:bg-zinc-950/30 p-3 text-left shadow-xs transition-all">
      {/* Compact Banner Row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                Gym Setup ({completedCount}/{steps.length} completed)
              </p>
              <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 font-mono">
                {progressPercent}%
              </span>
            </div>
            {nextPendingStep && !isExpanded && (
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                Next: <span className="text-slate-700 dark:text-zinc-300 font-medium">{nextPendingStep.title}</span>
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {nextPendingStep && !isExpanded && (
            <button
              onClick={() => navigate(nextPendingStep.path)}
              className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer active:scale-95 shadow-xs"
            >
              <span>{nextPendingStep.actionLabel}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse setup" : "Expand setup steps"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Dismiss setup banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Step Details */}
      {isExpanded && (
        <div className="mt-4 pt-3.5 border-t border-slate-200/60 dark:border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 animate-in fade-in duration-200">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all flex flex-col justify-between gap-2 ${
                step.completed
                  ? 'bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-white/60 dark:bg-zinc-900/60 border-slate-200/80 dark:border-zinc-800 hover:border-violet-500/30'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5">
                  {step.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
                  )}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className={`text-xs font-bold truncate ${step.completed ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                    {idx + 1}. {step.title}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2 leading-tight">
                    {step.description}
                  </p>
                </div>
              </div>

              {!step.completed && (
                <button
                  onClick={() => navigate(step.path)}
                  className="self-end px-2.5 py-1 bg-violet-600/10 hover:bg-violet-600 text-violet-600 hover:text-white dark:text-violet-400 dark:hover:text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{step.actionLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
