import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

/**
 * Toast.jsx
 * High-performance, high-contrast notification toast.
 * Complies with human-ui-standard.md & AI_RESTRICTIONS_MANIFESTO.md:
 * - 90% neutral canvas with 1px razor border
 * - Standalone borderless SVG icons (no squircle boxes)
 * - Proportional rounded-xl corners & snappy physics
 * - High readability across Light Modern, OLED Dark & Midnight Navy
 */
export default function Toast({ message, type = 'success', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isError = type === 'error' || type === 'danger';
  const isWarning = type === 'warning';
  const isInfo = type === 'info';
  const isSuccess = !isError && !isWarning && !isInfo;

  // Semantic Icon selection
  const Icon = isSuccess
    ? CheckCircle2
    : isError
    ? AlertCircle
    : isWarning
    ? AlertTriangle
    : Info;

  const iconColor = isSuccess
    ? 'text-emerald-600 dark:text-emerald-400'
    : isError
    ? 'text-rose-600 dark:text-rose-400'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-violet-600 dark:text-violet-400';

  const accentBorder = isSuccess
    ? 'border-l-emerald-500'
    : isError
    ? 'border-l-rose-500'
    : isWarning
    ? 'border-l-amber-500'
    : 'border-l-violet-500';

  const badgeLabel = isSuccess
    ? 'Success'
    : isError
    ? 'Attention'
    : isWarning
    ? 'Notice'
    : 'System Info';

  return createPortal(
    <aside 
      aria-live="polite"
      role="status"
      className="fixed top-4 right-4 left-4 sm:left-auto sm:right-6 sm:top-6 z-[99999] sm:min-w-[340px] sm:max-w-md animate-in slide-in-from-top-3 fade-in duration-200 pointer-events-auto"
    >
      <div 
        className={`bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800/90 border-l-4 ${accentBorder} rounded-xl shadow-xl p-3.5 sm:p-4 flex items-start justify-between gap-3 text-slate-900 dark:text-zinc-100 backdrop-blur-xs`}
      >
        <div className="flex items-start gap-3 min-w-0">
          <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} strokeWidth={2.2} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 leading-none">
              {badgeLabel}
            </p>
            <p className="text-xs font-semibold text-slate-900 dark:text-zinc-100 mt-1 leading-snug break-words">
              {message}
            </p>
          </div>
        </div>

        <button 
          onClick={onClose}
          type="button"
          aria-label="Dismiss notification"
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer active:scale-95 shrink-0 -mr-1 -mt-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>,
    document.body
  );
}
