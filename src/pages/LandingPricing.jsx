import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, ArrowRight, Users, Info } from 'lucide-react'

const plans = [
  { id: '1', name: 'Monthly', months: 1, total: 599, description: 'Start small. Find your routine.', label: 'Lowest upfront cost', action: 'Start monthly' },
  { id: '3', name: 'Quarterly', months: 3, total: 1499, description: 'A little more runway to settle in.', label: 'A balanced commitment', action: 'Choose quarterly' },
  { id: '12', name: 'Annual', months: 13, total: 4999, description: 'For the gym you’re building long term.', label: 'Lowest monthly equivalent', action: 'Choose annual', recommended: true },
]
const format = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
const included = ['Member profiles & membership plans', 'Fee records & renewal history', 'Attendance & QR check-in', 'Member connection requests']

export default function LandingPricing({ members = 150, onMembersChange }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const [view, setView] = useState('monthly')
  const [selected, setSelected] = useState('12')
  const plan = plans.find(item => item.id === selected)
  const monthlyEquivalent = plan.total / plan.months
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start .9', 'center center'] })
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  return <section id="pricing" className="gx-price-section" ref={ref}>
    <div className="gx-wrap">
      <div className="gx-price-intro"><div><h2>Big on the everyday.<br/><span>Small on the overhead.</span></h2><p>One workspace for the work you already do.<br/>Choose a commitment that feels right for your gym.</p></div><div className="gx-price-daily"><span>Annual plan works out to about</span><strong>₹13<span>/day</span></strong><small>₹4,999 paid upfront for 13 months.<br/>Daily equivalent rounded; based on 30-day months.</small></div></div>
      <div className="gx-pricing-toolbar"><div className="gx-price-view" aria-label="Price display"><button aria-pressed={view === 'monthly'} onClick={() => setView('monthly')}>Monthly equivalent</button><button aria-pressed={view === 'total'} onClick={() => setView('total')}>Total payable</button></div><p><Info size={13}/> Same features. Your choice of duration.</p></div>
      <motion.div className="gx-pricing-reveal" aria-hidden="true" style={reduce ? { scaleX: 1 } : { scaleX }}/>
      <div className="gx-pricing-cards">
        {plans.map(item => {
          const saving = item.months * 599 - item.total
          const equivalent = Math.round(item.total / item.months)
          return <article key={item.id} className={`gx-plan ${item.recommended ? 'gx-plan-featured' : ''}`}>
            <div className="gx-plan-label"><span>{item.label}</span>{item.recommended && <ArrowUpRight size={15}/>}</div>
            <div className="gx-plan-main"><h3>{item.name}</h3><p>{item.description}</p><div className="gx-plan-amount" aria-live="polite"><strong>₹{format(view === 'monthly' ? equivalent : item.total)}</strong><span>{view === 'monthly' ? '/ month' : `/ ${item.months} ${item.months === 1 ? 'month' : 'months'}`}</span></div><p className="gx-plan-billing">{item.id === '1' ? '₹599 for 1 month' : `₹${format(item.total)} paid upfront for ${item.months} months`}</p><div className="gx-plan-saving">{saving > 0 ? <><Check size={13}/>Save ₹{format(saving)} vs {item.months} monthly payments</> : <><Check size={13}/>Get started with a smaller payment</>}</div><Link to={`/signup?role=owner&plan=${item.id}`} className="gx-plan-cta">{item.action}<ArrowUpRight size={16}/></Link></div>
            <div className="gx-plan-footer"><span>{item.id === '12' ? '12 months + 1 extra month included' : `${item.months} ${item.months === 1 ? 'month' : 'months'} of Gymix access`}</span><span>GYMIX / {item.id === '12' ? 'ANNUAL' : item.name.toUpperCase()}</span></div>
          </article>
        })}
      </div>
      <p className="gx-price-disclosure">Monthly equivalents are rounded for comparison. You pay the full duration amount shown above, not monthly instalments. Final charges are shown at billing.</p>
      <div className="gx-price-context"><div><Users size={19}/><h3>Put it in your gym’s perspective.</h3><p>Spread the software cost across your members.<br/>This is a cost comparison, not a revenue promise.</p></div><div className="gx-cost-controls"><label htmlFor="pricing-members">Your member count <strong>{members}</strong></label><input id="pricing-members" type="range" min="50" max="300" step="10" value={members} onChange={event => onMembersChange?.(Number(event.target.value))}/><div className="gx-cost-plan"><label htmlFor="cost-plan">Compare a plan</label><select id="cost-plan" value={selected} onChange={event => setSelected(event.target.value)}>{plans.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div></div><div className="gx-per-member" aria-live="polite"><span>About</span><strong>₹{(monthlyEquivalent / members).toFixed(2)}</strong><p>per member / month</p><small>{plan.name} · ₹{format(plan.total)} / {plan.months} {plan.months === 1 ? 'month' : 'months'}</small></div></div>
      <div className="gx-included"><div><h3>The daily essentials.<br/><span>In every plan.</span></h3><Link to="/signup?role=owner">Make room for a better routine <ArrowRight size={15}/></Link></div><ul>{included.map(feature => <li key={feature}><Check size={15}/>{feature}</li>)}</ul><p>Automated WhatsApp is not included in these prices. Biometric compatibility is still being verified.</p></div>
    </div>
  </section>
}
