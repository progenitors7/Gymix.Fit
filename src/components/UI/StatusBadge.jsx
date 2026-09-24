/**
 * StatusBadge.jsx
 * Displays a premium, modern pill for member status.
 */
export default function StatusBadge({ status }) {
  const map = {
    active: {
      label: 'Active',
      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
      dot: 'bg-emerald-500',
    },
    expiring_soon: {
      label: 'Expiring Soon',
      cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
      dot: 'bg-amber-500',
    },
    expired: {
      label: 'Expired',
      cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
      dot: 'bg-rose-500',
    },
    left: {
      label: 'Left',
      cls: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
      dot: 'bg-slate-400',
    },
    // Payment Statuses
    paid: {
      label: 'Paid',
      cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50',
      dot: 'bg-emerald-500',
    },
    pending: {
      label: 'Pending',
      cls: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
      dot: 'bg-amber-500',
    },
    overdue: {
      label: 'Overdue',
      cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800/50',
      dot: 'bg-rose-500',
    },
  }

  const normalizedStatus = status?.toLowerCase()
  const cfg = map[normalizedStatus] ?? {
    label: status || 'Unknown',
    cls: 'bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300 border-slate-200 dark:border-zinc-700',
    dot: 'bg-slate-400',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
