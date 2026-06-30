import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { planService } from '../../services/planService';
import { toast } from 'react-hot-toast';

export default function OnboardingChecklist({ profile, gym, stats }) {
  const navigate = useNavigate();
  const [plansCount, setPlansCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (gym?.id) {
      planService.getPlans(gym.id)
        .then(plans => {
          // Exclude default system trial plan from owner-configured plans count if needed
          const customPlans = plans.filter(p => p.id !== 'trial_default');
          setPlansCount(customPlans.length);
          setLoading(false);
        })
        .catch(err => {
          console.error('[OnboardingChecklist] Failed to load plans:', err);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [gym?.id]);

  // Determine step completion states
  const isProfileComplete = !!(profile?.full_name && profile?.phone_number);
  const isPlansConfigured = plansCount > 0;
  const isMembersOnboarded = !!(stats?.membership?.total && stats?.membership?.total > 0);
  const isStoreVisited = localStorage.getItem('gymix_store_visited') === 'true';

  const steps = [
    {
      id: 'profile',
      title: 'Complete Profile Details',
      description: 'Fill in your name and contact phone number.',
      completed: isProfileComplete,
      actionLabel: 'Edit Profile',
      path: '/profile'
    },
    {
      id: 'plans',
      title: 'Create Membership Plans',
      description: 'Configure your subscription tiers (e.g. Monthly, Yearly) in settings.',
      completed: isPlansConfigured,
      actionLabel: 'Configure Plans',
      path: '/settings'
    },
    {
      id: 'members',
      title: 'Onboard Your First Member',
      description: 'Add a member manually or let them scan your QR Connection Poster.',
      completed: isMembersOnboarded,
      actionLabel: 'Add Member',
      path: '/members/new'
    },
    {
      id: 'store',
      title: 'Explore Gym Store',
      description: 'Set up supplements, drinks, or gym gear catalog for sales.',
      completed: isStoreVisited,
      actionLabel: 'Open Store Manager',
      path: '/store-manager'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Hide the checklist if all tasks are complete
  if (completedCount === steps.length) {
    return null;
  }

  return (
    <div className="onboarding-checklist-card relative overflow-hidden bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border border-blue-500/15 rounded-3xl p-6 sm:p-8 text-left space-y-6 animate-in fade-in duration-300">
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full pointer-events-none" />
      
      {/* Header and Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 relative z-10">
        <div className="space-y-1">
          <h2 className="text-white font-extrabold text-lg sm:text-xl uppercase tracking-tight flex items-center gap-2">
            🚀 Complete Your Gym Setup
          </h2>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
            Follow these easy steps to get your gym up and running
          </p>
        </div>
        
        {/* Progress Circle & Text */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-white font-black text-sm">{progressPercent}%</span>
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mt-0.5">Progress</p>
          </div>
          <div className="w-12 h-12 rounded-full border-2 border-white/10 flex items-center justify-center relative">
            <svg className="w-10 h-10 transform -rotate-90">
              <circle
                cx="20"
                cy="20"
                r="16"
                className="text-white/5"
                strokeWidth="3"
                stroke="currentColor"
                fill="transparent"
              />
              <circle
                cx="20"
                cy="20"
                r="16"
                className="text-blue-500 transition-all duration-500"
                strokeWidth="3"
                strokeDasharray={100}
                strokeDashoffset={100 - progressPercent}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Checklist List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
        {steps.map((step, idx) => (
          <div 
            key={step.id}
            className={`p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between gap-3 ${
              step.completed 
                ? 'bg-emerald-500/5 border-emerald-500/10' 
                : 'bg-white/[0.01] border-white/5 hover:border-white/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="shrink-0 mt-0.5">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600" />
                )}
              </span>
              <div className="space-y-1">
                <p className={`text-xs font-bold ${step.completed ? 'text-emerald-400 line-through' : 'text-white'}`}>
                  {idx + 1}. {step.title}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>

            {!step.completed && (
              <button
                onClick={() => navigate(step.path)}
                className="self-end px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-[#60A5FA] hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{step.actionLabel}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
