/**
 * MemberForm.jsx
 * Reusable form for creating and editing members.
 * Props:
 *  - initialValues: object (defaults for edit mode)
 *  - onSubmit: async (formData) => void
 *  - onCancel: () => void
 *  - mode: 'add' | 'edit'
 */
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Phone, Activity, Award, Calendar, FileText, CreditCard, Sparkles } from 'lucide-react'
import DatePicker from '../UI/DatePicker'
import { useCurrentGym } from '../../hooks/useCurrentGym'

import { planService } from '../../services/planService';

const DEFAULTS = {
  full_name: '',
  phone_number: '',
  gender: '',
  membership_plan: '',
  join_date: new Date().toISOString().split('T')[0],
  expiry_date: '',
  notes: '',
  biometric_user_id: '',
}

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

const inputCls = 'w-full pl-12 pr-5 py-4 rounded-2xl bg-white/[0.03] border border-white/5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:bg-white/[0.05] focus:border-emerald-500/50 transition-all'

export default function MemberForm({ initialValues = {}, onSubmit, onCancel, mode = 'add' }) {
  const [form, setForm] = useState({ ...DEFAULTS, ...initialValues })
  const [errors, setErrors] = useState({})
  const [globalError, setGlobalError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [recordPayment, setRecordPayment] = useState(mode === 'add')
  const [amountPaid, setAmountPaid] = useState('')
  const [plans, setPlans] = useState([])
  const { gym } = useCurrentGym()

  useEffect(() => {
    if (gym?.id) {
      planService.getPlans(gym.id).then(setPlans).catch(console.error)
    }
  }, [gym?.id])

  // Auto-calculate expiry date based on plan
  useEffect(() => {
    if (!form.join_date || !form.membership_plan) return

    const selectedPlanObj = plans.find(p => p.name === form.membership_plan)
    if (!selectedPlanObj) return

    const date = new Date(form.join_date)
    if (isNaN(date.getTime())) return

    date.setDate(date.getDate() + selectedPlanObj.duration_days)
    const newExpiry = date.toISOString().split('T')[0]
    
    if (newExpiry !== form.expiry_date) {
      setForm(f => ({ ...f, expiry_date: newExpiry }))
    }

    // Also auto-fill amount if recording payment
    if (recordPayment && !amountPaid) {
      setAmountPaid(selectedPlanObj.price.toString())
    }
  }, [form.join_date, form.membership_plan, plans])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const validate = () => {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Name is required'
    if (!form.membership_plan) errs.membership_plan = 'Plan is required'
    if (!form.expiry_date) errs.expiry_date = 'Expiry date is required'
    if (!form.join_date) errs.join_date = 'Join date is required'
    if (form.phone_number && !/^[0-9+\-\s()]{7,15}$/.test(form.phone_number)) {
      errs.phone_number = 'Enter a valid phone number'
    }
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setGlobalError(null)
    setSubmitting(true)
    try {
      // Strip empty strings → null for optional fields
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
      )
      
      // Pass payment details if in add mode
      if (mode === 'add') {
        payload.recordPayment = recordPayment
        payload.amountPaid = amountPaid ? parseFloat(amountPaid) : 0
      }
      
      // Create Member and all related subscription/payment details
      await onSubmit(payload)
    } catch (err) {
      setGlobalError(err.message || 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {globalError && (
        <div className="px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider animate-shake">
          {globalError}
        </div>
      )}

      {/* Row 1: Name + Phone */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Full Name" required error={errors.full_name}>
          <User className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            id="member-full-name"
            type="text"
            value={form.full_name}
            onChange={set('full_name')}
            placeholder="e.g. Rahul Sharma"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            className={inputCls}
          />
        </Field>
        <Field label="Phone Number" error={errors.phone_number}>
          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <input
            id="member-phone"
            type="tel"
            value={form.phone_number}
            onChange={set('phone_number')}
            placeholder="e.g. 9876543210"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Row 2: Gender + Plan */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Gender">
          <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <select id="member-gender" value={form.gender} onChange={set('gender')} className={inputCls}>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Membership Plan" required error={errors.membership_plan}>
          <Award className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
          <select id="member-plan" value={form.membership_plan} onChange={set('membership_plan')} className={inputCls}>
            <option value="">Select plan</option>
            {plans.map((p) => <option key={p.id} value={p.name}>{p.name} (₹{p.price})</option>)}
          </select>
        </Field>
      </div>

      {/* Row 3: Join date + Expiry date */}
      <div className="grid sm:grid-cols-2 gap-5">
        <Field label="Join Date" required error={errors.join_date}>
          <DatePicker
            value={form.join_date}
            onChange={(val) => setForm(f => ({ ...f, join_date: val }))}
          />
        </Field>
        <Field label="Expiry Date" required error={errors.expiry_date}>
          <DatePicker
            value={form.expiry_date}
            onChange={(val) => setForm(f => ({ ...f, expiry_date: val }))}
          />
        </Field>
      </div>

      {/* Biometric ID (Only if enabled in gym settings) */}
      {gym?.biometric_enabled && (
        <div className="grid sm:grid-cols-2 gap-5 animate-in fade-in duration-300">
          <Field label="Biometric Device User ID" error={errors.biometric_user_id}>
            <Activity className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
            <input
              id="member-biometric-id"
              type="text"
              value={form.biometric_user_id || ''}
              onChange={set('biometric_user_id')}
              placeholder="e.g. 105 (Must match machine ID)"
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
              className={inputCls}
            />
          </Field>
          <div className="flex items-center pb-1">
            <p className="text-[10px] font-bold text-amber-500/60 uppercase tracking-widest leading-tight">
              Enter the numeric User ID/Card ID of this member registered on the biometric fingerprint/face scanner.
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      <Field label="Notes">
        <FileText className="absolute left-5 top-5 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
        <textarea
          id="member-notes"
          value={form.notes}
          onChange={set('notes')}
          placeholder="Optional notes about this member…"
          rows={3}
          className={`${inputCls} resize-none pt-4`}
        />
      </Field>

      {/* Quick Payment (Only in Add Mode) */}
      {mode === 'add' && (
        <div className="p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CreditCard className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider">Initial Payment</h4>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Collect fees right now?</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={recordPayment}
                onChange={e => setRecordPayment(e.target.checked)}
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {recordPayment && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="grid sm:grid-cols-2 gap-5 pt-2"
            >
              <Field label="Amount Paid (₹)" required>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                  placeholder="e.g. 500"
                  className={inputCls}
                />
              </Field>
              <div className="flex items-end pb-1">
                <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest leading-tight">
                  Recording this will automatically mark the athlete as <span className="text-emerald-400">Active</span> and create a ledger entry.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="order-2 sm:order-1 px-8 py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all border border-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          id="member-form-submit"
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="order-1 sm:order-2 group relative px-10 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-95"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-3">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              {mode === 'add' ? 'Processing…' : 'Syncing…'}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              {mode === 'add' ? 'Initialize Athlete' : 'Commit Changes'}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
