/**
 * StatusBadge.jsx
 * Displays a premium, modern pill for member status.
 */
export default function StatusBadge({ status }) {
  const map = {
    active: {
      label: 'Active',
      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    },
    expiring_soon: {
      label: 'Expiring Soon',
      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    },
    expired: {
      label: 'Expired',
      cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/5',
      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]',
    },
    left: {
      label: 'Left',
      cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20 shadow-lg shadow-slate-500/5',
      dot: 'bg-slate-400 shadow-[0_0_8px_rgba(148,163,184,0.6)]',
    },
    // Payment Statuses
    paid: {
      label: 'Paid',
      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-lg shadow-emerald-500/5',
      dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]',
    },
    pending: {
      label: 'Pending',
      cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-lg shadow-amber-500/5',
      dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]',
    },
    overdue: {
      label: 'Overdue',
      cls: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-lg shadow-rose-500/5',
      dot: 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]',
    },
  }

  const normalizedStatus = status?.toLowerCase()
  const cfg = map[normalizedStatus] ?? {
    label: status || 'Unknown',
    cls: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dot: 'bg-slate-400',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border backdrop-blur-sm transition-all hover:scale-105 ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />
      {cfg.label}
    </span>
  )
}
