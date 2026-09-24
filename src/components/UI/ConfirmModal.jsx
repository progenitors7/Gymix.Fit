import { AlertTriangle } from 'lucide-react'

/**
 * ConfirmModal.jsx
 * Generic confirmation dialog used for destructive actions.
 */
export default function ConfirmModal({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel, loading }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-6 overflow-hidden">
        {/* Icon */}
        <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <h3 className="text-slate-900 dark:text-white font-bold text-center text-base mb-1.5 tracking-tight">{title}</h3>
        <p className="text-slate-500 dark:text-zinc-400 text-xs text-center mb-6 leading-relaxed font-medium">{message}</p>

        <div className="flex items-center gap-2.5">
          <button
            id="confirm-modal-cancel"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-modal-confirm"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold transition-all active:scale-95 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Wait…
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
