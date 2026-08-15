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

const inputCls = 'w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all'

function Field({ label, required, children, error }) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative group">
        {children}
      </div>
      {error && <p className="mt-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider ml-1">{error}</p>}
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-[#151922] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col justify-between"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-slate-500 hover:text-white rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer z-10"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header with High-Res Athlete Identity */}
          <div className="pb-5 border-b border-white/5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-emerald-500/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-lg">
              {request.profiles?.avatar_url ? (
                <img
                  src={request.profiles.avatar_url}
                  alt={request.profiles?.full_name || 'Athlete'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-white text-lg font-black uppercase">
                  {request.profiles?.full_name?.slice(0, 2) || 'M'}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] leading-none">
                Smart Onboarding Approval
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight pt-0.5 break-words">
                {request.profiles?.full_name || 'Athlete Profile'}
              </h3>
              <p className="text-slate-400 text-xs truncate mt-0.5">
                {request.profiles?.email}
              </p>
            </div>
          </div>

          {/* Scrollable form body */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-6 space-y-6 pr-2 -mr-2 hide-scrollbar">
            {error && (
              <div className="px-4.5 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider animate-shake">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {error}
              </div>
            )}

            {loadingPlans ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Row 1: Plan Selection */}
                <Field label="Membership Plan" required>
                  <Award className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
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
                <div className="grid sm:grid-cols-2 gap-4">
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
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Phone Number">
                    <input
                      type="tel"
                      value={form.phone_number}
                      onChange={set('phone_number')}
                      placeholder="e.g. 9876543210"
                      className={inputCls}
                    />
                  </Field>

                  <Field label="Gender">
                    <select
                      value={form.gender}
                      onChange={set('gender')}
                      className={inputCls}
                    >
                      <option value="">Choose gender...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>

                {/* Initial Payment Panel */}
                <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                        <CreditCard className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Record Initial Payment</h4>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Collect subscription fee now?</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={recordPayment}
                        onChange={e => setRecordPayment(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {recordPayment && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="grid sm:grid-cols-2 gap-4 pt-2"
                    >
                      <Field label="Amount Paid (₹)" required>
                        <input
                          type="number"
                          value={amountPaid}
                          onChange={e => setAmountPaid(e.target.value)}
                          placeholder="0"
                          className={inputCls}
                        />
                      </Field>

                      <Field label="Payment Method">
                        <select
                          value={paymentMethod}
                          onChange={e => setPaymentMethod(e.target.value)}
                          className={inputCls}
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
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="order-2 sm:order-1 flex-1 py-4 bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest border border-white/5 cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || loadingPlans}
              className="order-1 sm:order-2 flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Approve & Activate
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
