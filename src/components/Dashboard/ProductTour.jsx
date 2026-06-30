import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sparkles, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../hooks/useAuth';

const TOUR_STEPS = [
  {
    id: 'welcome',
    path: '/dashboard',
    selector: '.onboarding-checklist-card',
    title: 'Welcome to Gymix! 🏋️‍♂️',
    content: "We're excited to have you! Let's complete a quick 4-step setup to launch your gym terminal. First, let's head to your profile to complete your details.",
    nextLabel: 'Start Setup',
    redirect: '/profile',
    nextStep: 'profile_name'
  },
  {
    id: 'profile_name',
    path: '/profile',
    selector: '.onboarding-profile-name',
    title: 'Complete Profile Name 📝',
    content: 'Enter your full name so members can identify you as the gym owner/administrator.',
    nextLabel: 'Next',
    nextStep: 'profile_phone'
  },
  {
    id: 'profile_phone',
    path: '/profile',
    selector: '.onboarding-profile-phone',
    title: 'Contact Number 📞',
    content: 'Add your contact number. This allows members to reach out to you directly when connecting. Make sure to click "Save Owner Details" below when you are done!',
    nextLabel: 'Next Step',
    redirect: '/settings',
    nextStep: 'settings_plans'
  },
  {
    id: 'settings_plans',
    path: '/settings',
    selector: '.onboarding-add-plan-btn',
    title: 'Configure Membership Plans 💳',
    content: 'Create your membership plans (e.g. Monthly, Quarterly) with price and duration. You must have at least one active plan to assign to your members!',
    nextLabel: 'Next Step',
    redirect: '/dashboard',
    nextStep: 'dashboard_members'
  },
  {
    id: 'dashboard_members',
    path: '/dashboard',
    selector: '.onboarding-add-member-btn',
    title: 'Onboard Members (Manual/QR) 👥',
    content: "Onboard members manually by clicking 'Add Member' here, or let them scan your Wall QR Poster. Their requests will appear in your 'Pending Requests' widget for 1-click approval!",
    nextLabel: 'Next Step',
    nextStep: 'dashboard_renew'
  },
  {
    id: 'dashboard_renew',
    path: '/dashboard',
    selector: '.onboarding-expiring-widget',
    title: 'Smart Membership Renewals ⏳',
    content: "Members whose plans are expired or expiring soon will appear here. Click 'Renew Now' to instantly extend their subscription and record their payment.",
    nextLabel: 'Next Step',
    nextStep: 'dashboard_payments'
  },
  {
    id: 'dashboard_payments',
    path: '/dashboard',
    selector: '.onboarding-payments-widget',
    title: 'Dues & Outstanding Payments 💰',
    content: 'Track and collect pending membership dues from members here. Let\'s check the Gym Store next!',
    nextLabel: 'See Gym Store',
    redirect: '/store-manager',
    nextStep: 'store_intro'
  },
  {
    id: 'store_intro',
    path: '/store-manager',
    selector: '.onboarding-store-container',
    title: 'Gym Supplement Store 🛍️',
    content: 'Manage your gym store inventory. Add protein shakes, supplements, or shirts. Members can order these directly from their mobile portal!',
    nextLabel: 'Finish Tour 🎉',
    nextStep: 'finish'
  }
];

export default function ProductTour() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [active, setActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);
  const [targetFound, setTargetFound] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  // Initialize tour if owner is not onboarded
  useEffect(() => {
    const isTourActive = localStorage.getItem('gymix_onboarding_active') === 'true';
    if (profile?.role === 'owner' && profile?.onboarding_completed === false && !isTourActive) {
      localStorage.setItem('gymix_onboarding_active', 'true');
      localStorage.setItem('gymix_onboarding_step', 'welcome');
      setActive(true);
      setCurrentStepIndex(0);
    } else if (isTourActive && profile?.role === 'owner') {
      setActive(true);
      const savedStep = localStorage.getItem('gymix_onboarding_step') || 'welcome';
      const idx = TOUR_STEPS.findIndex(s => s.id === savedStep);
      setCurrentStepIndex(idx >= 0 ? idx : 0);
    } else {
      setActive(false);
    }
  }, [profile]);

  // Handle step-specific logic on route change
  useEffect(() => {
    if (!active || !step) return;

    // Check if the current route matches the step's expected route
    if (location.pathname !== step.path) {
      // Find a step matching this route
      const idx = TOUR_STEPS.findIndex(s => s.path === location.pathname && s.id === step.id);
      if (idx === -1) {
        // If navigation was manual, adjust the step index to match the current path
        const nextPathIdx = TOUR_STEPS.findIndex(s => s.path === location.pathname);
        if (nextPathIdx >= 0) {
          setCurrentStepIndex(nextPathIdx);
          localStorage.setItem('gymix_onboarding_step', TOUR_STEPS[nextPathIdx].id);
        }
      }
    }
  }, [location.pathname, active, step]);

  // Calculate target element position
  useEffect(() => {
    if (!active || !step) return;

    let attempts = 0;
    const findElement = () => {
      const el = document.querySelector(step.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setHighlightRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
        setTargetFound(true);
      } else {
        attempts++;
        if (attempts < 20) {
          setTimeout(findElement, 100);
        } else {
          setHighlightRect(null);
          setTargetFound(false);
        }
      }
    };

    findElement();

    // Listen for resize/scroll
    window.addEventListener('resize', findElement);
    window.addEventListener('scroll', findElement);
    return () => {
      window.removeEventListener('resize', findElement);
      window.removeEventListener('scroll', findElement);
    };
  }, [currentStepIndex, location.pathname, active, step]);

  const handleNext = async () => {
    if (step.nextStep === 'finish') {
      handleClose(true);
      return;
    }

    const nextIdx = TOUR_STEPS.findIndex(s => s.id === step.nextStep);
    if (nextIdx >= 0) {
      if (step.redirect) {
        navigate(step.redirect);
      }
      setCurrentStepIndex(nextIdx);
      localStorage.setItem('gymix_onboarding_step', TOUR_STEPS[nextIdx].id);
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      const prevStep = TOUR_STEPS[currentStepIndex - 1];
      if (prevStep.path !== location.pathname) {
        navigate(prevStep.path);
      }
      setCurrentStepIndex(currentStepIndex - 1);
      localStorage.setItem('gymix_onboarding_step', prevStep.id);
    }
  };

  const handleClose = async (completed = false) => {
    localStorage.removeItem('gymix_onboarding_active');
    localStorage.removeItem('gymix_onboarding_step');
    setActive(false);

    if (completed && profile) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ onboarding_completed: true })
          .eq('id', profile.id);

        if (error) throw error;
        if (refreshProfile) {
          await refreshProfile();
        }
      } catch (err) {
        console.error('Failed to save onboarding completion state:', err);
      }
    }
  };

  if (!active || !step) return null;

  // Custom tooltips positioning
  const getTooltipStyle = () => {
    if (!highlightRect || !targetFound) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed'
      };
    }

    const spaceBottom = window.innerHeight - (highlightRect.top - window.scrollY + highlightRect.height);
    
    let top = highlightRect.top + highlightRect.height + 15;
    let left = highlightRect.left;

    // Adjust left/right alignment to fit in screen
    if (left + 350 > window.innerWidth) {
      left = Math.max(10, window.innerWidth - 370);
    }

    // Flip to top if not enough space below
    if (spaceBottom < 220) {
      top = Math.max(10, highlightRect.top - 240);
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'absolute'
    };
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* SVG backdrop overlay with cut-out hole */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.5))' }}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {highlightRect && targetFound && (
              <rect
                x={highlightRect.left - window.scrollX - 5}
                y={highlightRect.top - window.scrollY - 5}
                width={highlightRect.width + 10}
                height={highlightRect.height + 10}
                rx={12}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0, 0, 0, 0.75)" mask="url(#tour-mask)" />
      </svg>

      {/* Floating Tooltip Card */}
      <div 
        style={getTooltipStyle()}
        className="pointer-events-auto w-full max-w-[340px] bg-[#151922] border border-blue-500/30 rounded-3xl p-6 shadow-2xl text-left flex flex-col gap-4 animate-in zoom-in-95 duration-200"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5 relative z-10">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Gym Setup Guide</span>
          </div>
          <button 
            onClick={() => handleClose(false)}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
            title="Skip Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-1.5 relative z-10">
          <h4 className="text-white text-sm font-black uppercase tracking-wide">{step.title}</h4>
          <p className="text-slate-400 text-xs leading-relaxed font-semibold">{step.content}</p>
        </div>

        {/* Footer & Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 relative z-10">
          {/* Step Indicator */}
          <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">
            Step {currentStepIndex + 1} of {TOUR_STEPS.length}
          </span>

          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button 
                onClick={handleBack}
                className="px-3 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" /> Back
              </button>
            )}
            <button 
              onClick={handleNext}
              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl text-[10px] font-black uppercase text-white tracking-widest transition-all shadow-md shadow-blue-500/10 flex items-center gap-1 cursor-pointer"
            >
              {step.nextLabel} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
