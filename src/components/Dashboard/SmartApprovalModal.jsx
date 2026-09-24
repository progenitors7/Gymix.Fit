import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Check, AlertCircle, Award, Calendar, 
  CreditCard, Sparkles, UserCheck 
} from 'lucide-react'
import DatePicker from '../UI/DatePicker'
import { planService } from '../../services/planService'
import { useCurrentGym } from '../../hooks/useCurrentGym'

const inputCls = 'w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs'

function Field({ label, required, children, error }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative group">
        {children}
      </div>
      {error && <p className="text-[11px] font-medium text-rose-500">{error}</p>}
    </div>
  )
}

export default function SmartApprovalModal({ open, request, onClose, onApproved }) {
  const { gym } = useCurrentGym()
  
  // Plans & setup states
  const [plans, setPlans] = useState([])
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Form Fields
  const [form, setForm] = useState({
    membership_plan: '',
    join_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    phone_number: '',
    gender: '',
    notes: ''
  })
  
  // Payment Fields
  const [recordPayment, setRecordPayment] = useState(true)
  const [amountPaid, setAmountPaid] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')

  // Load plans when modal opens
  useEffect(() => {
    if (open && gym?.id) {
      setLoadingPlans(true)
      planService.getPlans(gym.id)
        .then((data) => {
          setPlans(data)
          // Default to first plan if available
          if (data && data.length > 0) {
            const first = data[0]
            setForm(f => ({ ...f, membership_plan: first.name }))
          }
        })
        .catch(console.error)
        .finally(() => setLoadingPlans(false))
    }
  }, [open, gym?.id])

  // Pre-fill phone_number and gender from the request's profile details when modal opens
  useEffect(() => {
    if (open && request?.profiles) {
      setForm(f => ({
        ...f,
        phone_number: request.profiles.phone_number || '',
        gender: request.profiles.gender || ''
      }))
    }
  }, [open, request])

  // Calculate Expiry Date based on Plan selection
  useEffect(() => {
    if (!form.join_date || !form.membership_plan || plans.length === 0) return

    const selectedPlan = plans.find(p => p.name === form.membership_plan)
    if (!selectedPlan) return

    const date = new Date(form.join_date)
    if (isNaN(date.getTime())) return

    date.setDate(date.getDate() + selectedPlan.duration_days)
    const expiry = date.toISOString().split('T')[0]

    setForm(f => ({ ...f, expiry_date: expiry }))
    setAmountPaid(selectedPlan.price.toString())
  }, [form.join_date, form.membership_plan, plans])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.membership_plan || !form.expiry_date) {
      setError('Membership Plan and Expiry Date are required')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const memberData = {
        ...form,
        recordPayment,
        amountPaid: recordPayment && amountPaid ? parseFloat(amountPaid) : 0
      }
      const paymentData = {
        payment_method: paymentMethod,
        notes: `Initial onboarding setup fee`
      }

      await onApproved(request, memberData, paymentData)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to approve connection request.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || !request) return null

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-7 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col justify-between"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header with Athlete Identity */}
          <div className="pb-4 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {request.profiles?.avatar_url ? (
                <img
                  src={request.profiles.avatar_url}
                  alt={request.profiles?.full_name || 'Athlete'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-slate-700 dark:text-zinc-300 text-sm font-bold uppercase">
                  {request.profiles?.full_name?.slice(0, 2) || 'AT'}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider leading-none">
                Onboarding Request
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate mt-0.5">
                {request.profiles?.full_name || 'Athlete Profile'}
              </h3>
              <p className="text-slate-500 dark:text-zinc-400 text-xs truncate">
                {request.profiles?.email}
              </p>
            </div>
          </div>

          {/* Scrollable form body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-4 pr-1 hide-scrollbar">
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {loadingPlans ? (
              <div className="py-12 flex justify-center">
                <div className="w-7 h-7 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Row 1: Plan Selection */}
                <Field label="Membership Plan" required>
                  <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <select
                    value={form.membership_plan}
                    onChange={set('membership_plan')}
                    required
                    className={inputCls}
                  >
                    <option value="" disabled>Choose a plan...</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name} (₹{p.price})
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Row 2: Join Date & Calculated Expiry */}
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <Field label="Membership Start Date" required>
                    <DatePicker
                      value={form.join_date}
                      onChange={(val) => setForm(f => ({ ...f, join_date: val }))}
                    />
                  </Field>

                  <Field label="Calculated Expiry Date" required>
                    <DatePicker
                      value={form.expiry_date}
                      onChange={(val) => setForm(f => ({ ...f, expiry_date: val }))}
                    />
                  </Field>
                </div>

                {/* Optional profile updates */}
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <Field label="Phone Number">
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={set('phone_number')}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs"
                    />
                  </Field>

                  <Field label="Gender">
                    <select
                      value={form.gender}
                      onChange={set('gender')}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs cursor-pointer"
                    >
                      <option value="">Choose gender...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>

                {/* Initial Payment Panel */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white">Record Initial Payment</h4>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400">Collect membership fee upon approval</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={recordPayment}
                        onChange={e => setRecordPayment(e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-slate-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  {recordPayment && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid sm:grid-cols-2 gap-3.5 pt-1 border-t border-slate-200/60 dark:border-zinc-800/80"
                    >
                      <Field label="Amount Paid (₹)" required>
                        <input
                          type="number"
                          value={amountPaid}
                          onChange={e => setAmountPaid(e.target.value)}
                          placeholder="0"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs"
                        />
                      </Field>

                      <Field label="Payment Method">
                        <select
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-medium focus:outline-none focus:border-violet-500 transition-colors shadow-xs cursor-pointer"
                        >
                          <option value="cash">Cash / Physical</option>
                          <option value="upi">UPI / Online Transfer</option>
                          <option value="card">Card Payment</option>
                        </select>
                      </Field>
                    </motion.div>
                  )}
                </div>
              </>
            )}
          </form>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingPlans}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve & Activate</span>
                </>
              )}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
