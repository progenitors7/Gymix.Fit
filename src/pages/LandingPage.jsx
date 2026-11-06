import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowUpRight, Check, ChevronDown, Users, CreditCard, ScanLine, LayoutDashboard, Settings, Menu, X, Bell } from 'lucide-react'
import './LandingPage.css'
import LandingPricing from './LandingPricing'
import { ScrollFrame, SetupSequence, ClosingSequence } from './LandingSequences'
import { MotionHero, MotionIntro, MotionFeatures } from './LandingMotion'
import './LandingMotion.css'
import './LandingSections.css'

const stages = [
  { title: 'Know who needs a follow-up.', copy: 'No digging through registers. See upcoming expiries and pending fees before the day gets busy.', label: 'Membership expiring', detail: 'Aarav’s monthly plan ends tomorrow.', action: 'Review membership' },
  { title: 'Keep the conversation personal.', copy: 'Member details, their plan and outstanding fees come together. You have the context for the next conversation.', label: 'Ready for a follow-up', detail: 'Monthly plan · ₹1,500 renewal', action: 'Record payment' },
  { title: 'Payment in. Membership renewed.', copy: 'Record the payment and renew the plan. A clear member history means less guesswork next month.', label: 'Membership renewed', detail: '₹1,500 recorded · Monthly plan active', action: 'Payment recorded' },
]
const money = value => new Intl.NumberFormat('en-IN').format(value)

function ProductDemo({ stage = 0, mode = 'overview', onModeChange }) {
  const renewed = stage === 2
  return <div className="gx-product">
    <aside className="gx-product-side"><img src="/logo-transparent.png" alt="Gymix" /><span className="gx-side-active"><LayoutDashboard size={18} /></span><Users size={18} /><CreditCard size={18} /><ScanLine size={18} /><Settings size={18} className="gx-side-bottom" /></aside>
    <div className="gx-product-main">
      <div className="gx-product-top"><span>IRON HOUSE <ChevronDown size={12} /></span><span className="gx-demo-label">Interactive demo</span><span className="gx-avatar">RK</span></div>
      <div className="gx-product-heading"><div><p>Your gym, at a glance</p><h3>{mode === 'attendance' ? 'The floor is filling up.' : mode === 'dues' ? 'Every payment, accounted for.' : 'A good day starts here.'}</h3></div><Bell size={18} /></div>
      <div className="gx-demo-tabs" aria-label="Explore dashboard">{[['overview','Overview'],['dues','Pending fees'],['attendance','Attendance']].map(([key,label]) => <button key={key} onClick={() => onModeChange?.(key)} aria-pressed={mode === key}>{label}</button>)}</div>
      <div className="gx-stats"><div><span>Active members</span><strong>148<small>members</small></strong></div><div><span>Collected this month</span><strong>₹{renewed ? '86,000' : '84,500'}<small className="gx-good">Recorded payments</small></strong></div><div><span>{mode === 'attendance' ? 'Checked in today' : 'Pending fees'}</span><strong>{mode === 'attendance' ? '32' : `₹${renewed ? '6,000' : '7,500'}`}<small>{mode === 'attendance' ? 'Your daily attendance' : `${renewed ? 4 : 5} members to follow up`}</small></strong></div></div>
      <div className="gx-chart-title"><strong>{mode === 'attendance' ? 'Check-ins this week' : 'Collections this week'}</strong><span>Sample week <ChevronDown size={11} /></span></div>
      <div className="gx-chart"><div className="gx-chart-axis"><span>{mode === 'attendance' ? '40' : '₹12k'}</span><span>{mode === 'attendance' ? '20' : '₹6k'}</span><span>0</span></div><div className="gx-bars">{[43,67,51,84,62,96,73].map((height,i) => <div key={i}><span style={{height:`${mode === 'attendance' ? [65,43,80,58,88,70,50][i] : height}%`}} className={i === 5 ? 'gx-bar-focus' : ''} /><small>{['M','T','W','T','F','S','S'][i]}</small></div>)}</div></div>
      <div className="gx-table-head"><strong>{mode === 'attendance' ? 'Latest check-ins' : mode === 'dues' ? 'Follow-up list' : 'Members to keep an eye on'}</strong><span>View members <ArrowUpRight size={12} /></span></div>
      <div className="gx-member"><span className="gx-member-avatar">AS</span><div><strong>Aarav Sharma</strong><span>Monthly membership</span></div><span className={renewed ? 'gx-status gx-status-good' : 'gx-status'}>{mode === 'attendance' ? 'Checked in' : renewed ? 'Active' : 'Expires tomorrow'}</span><span className="gx-member-amount">{mode === 'attendance' ? '6:42 AM' : '₹1,500'}</span></div>
      <div className="gx-member gx-member-secondary"><span className="gx-member-avatar">PM</span><div><strong>Priya Mehta</strong><span>Quarterly membership</span></div><span className="gx-status gx-status-good">{mode === 'attendance' ? 'Checked in' : 'Active'}</span><span className="gx-member-amount">{mode === 'attendance' ? '6:38 AM' : '₹4,000'}</span></div>
    </div>
  </div>
}

export default function LandingPage() {
  const [menuOpen,setMenuOpen] = useState(false)
  const [mode,setMode] = useState('overview')
  const [stage,setStage] = useState(0)
  const [members,setMembers] = useState(150)
  const [fee,setFee] = useState(1500)
  const steps = useRef([])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 761px)')
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if(desktop.matches && entry.isIntersecting) setStage(Number(entry.target.dataset.step)) })
    }, { rootMargin: '-25% 0px -35% 0px', threshold: 0 })
    steps.current.forEach(step => step && observer.observe(step))
    return () => observer.disconnect()
  }, [])
  return <div className="gx-site">
    <header className="gx-nav"><Link to="/?landing=true" className="gx-brand" aria-label="Gymix home"><img src="/logo-transparent.png" alt="" /><span>gymix<span>.</span></span></Link><nav className={menuOpen ? 'gx-nav-links is-open' : 'gx-nav-links'} aria-label="Main navigation"><a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a><a href="#your-gym" onClick={() => setMenuOpen(false)}>Your gym</a><a href="#pricing" onClick={() => setMenuOpen(false)}>Pricing</a></nav><div className="gx-nav-actions"><Link to="/login" className="gx-login">Log in</Link><Link to="/signup?role=owner" className="gx-button gx-button-small">Get started <ArrowUpRight size={15}/></Link><button className="gx-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Toggle navigation">{menuOpen ? <X/> : <Menu/>}</button></div></header>
    <main>
      <MotionHero/><MotionIntro/><MotionFeatures/>
      <section id="how-it-works" className="gx-tour gx-wrap"><div className="gx-section-intro"><h2>One member.<br/><span>A whole lot simpler.</span></h2><p>Follow a renewal from “expiring soon” to “all sorted”. Scroll to see it happen.</p></div><div className="gx-tour-grid"><div className="gx-story">{stages.map((step,i) => <article data-step={i} ref={el => {steps.current[i]=el}} key={step.title} className={stage === i ? 'gx-story-step is-current' : 'gx-story-step'}><span className="gx-step-count">{i+1} / 3</span><h3>{step.title}</h3><p>{step.copy}</p><button className="gx-text-link" aria-label={`Step ${i+1}: ${step.title}`} aria-pressed={stage === i} onClick={() => {setStage(i); if(window.matchMedia('(min-width: 761px)').matches) steps.current[i]?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',block:'center'})}}>Show this step <ArrowRight size={17}/></button></article>)}</div><div className="gx-demo-sticky"><div className="gx-mobile-story"><h3>{stages[stage].title}</h3><p>{stages[stage].copy}</p></div><ScrollFrame className="gx-tour-frame"><ProductDemo stage={stage} mode={mode} onModeChange={setMode}/></ScrollFrame><div className={`gx-demo-event ${stage === 2 ? 'is-complete' : ''}`} role="status" aria-live="polite"><span className="gx-event-icon">{stage === 2 ? <Check size={20}/> : <CreditCard size={20}/>}</span><div><strong>{stages[stage].label}</strong><p>{stages[stage].detail}</p></div><span className="gx-event-step">{stage+1}/3</span></div><p className="gx-demo-footnote">Illustrative demo · Sample members and payments · Try the tabs above</p></div></div></section>
      <section id="your-gym" className="gx-calculator"><div className="gx-wrap gx-calculator-grid"><div><h2>Your numbers.<br/><span>A clearer picture.</span></h2><p>A gym with 80 members runs differently from one with 250. Try your numbers in this sample monthly view.</p><div className="gx-range-group"><label htmlFor="gym-members">Members <strong>{members}</strong></label><input id="gym-members" type="range" min="50" max="300" step="10" value={members} onChange={e=>setMembers(Number(e.target.value))}/><div><span>50 members</span><span>300 members</span></div></div><div className="gx-fee"><label htmlFor="gym-fee">Monthly membership fee</label><div><span>₹</span><input id="gym-fee" type="number" min="100" max="50000" step="100" value={fee} onChange={e=>setFee(e.target.value === '' ? '' : Math.max(0,Number(e.target.value)))}/></div></div></div><ScrollFrame className="gx-calculator-frame"><div className="gx-month-sheet"><div className="gx-sheet-top"><span>Your monthly snapshot</span><span>Sample calculation</span></div><strong className="gx-sheet-total">₹{money(members * Number(fee))}</strong><p>If all {members} members pay ₹{money(Number(fee))} this month</p><div className="gx-sheet-line"><span>Memberships to keep track of</span><strong>{members}</strong></div><div className="gx-sheet-line"><span>One place for fees & attendance</span><Check size={18}/></div><p className="gx-sheet-disclaimer">This is a planning example, not a revenue forecast. Actual collections depend on your members and plans.</p><Link className="gx-text-link" to="/signup?role=owner">Bring your gym into Gymix <ArrowUpRight size={18}/></Link></div></ScrollFrame></div></section>
      <SetupSequence/>
      <LandingPricing members={members} onMembersChange={setMembers}/>
      <section className="gx-faq gx-wrap"><h2>A few things you might ask.</h2>{[['How does the annual price work?', 'The annual option includes 13 months of access for ₹4,999 paid upfront. The displayed ₹385 monthly equivalent is rounded from ₹4,999 ÷ 13; it is not a monthly payment option.'],['What are the savings compared with?', 'Savings compare the chosen duration with the same number of ₹599 monthly payments. Quarterly saves ₹298 across 3 months; annual saves ₹2,788 across 13 months.'],['Will this work for a small gym?','Gymix is built around the everyday work of independent gyms: member records, fees, renewals and attendance. You can start by adding your current members and plans.'],['Can members connect to my gym?','Yes. Share your gym connection code. Members can request to join, and you review and approve their membership from your dashboard.'],['Can I use it on my phone?','Yes. Gymix has a responsive web interface so you can manage your gym from a phone or computer.'],['Does it support automatic WhatsApp or biometric devices?','Those integrations are still being improved and verified. The experience shown here focuses on member management, payments and attendance. Contact founder@gymix.fit for your setup requirements.']].map(([q,a])=><details key={q}><summary>{q}<ChevronDown size={18}/></summary><p>{a}</p></details>)}</section>
      <ClosingSequence/>
    </main><footer className="gx-footer gx-wrap"><Link to="/?landing=true" className="gx-brand"><img src="/logo-transparent.png" alt=""/><span>gymix<span>.</span></span></Link><span>For the people behind the gym.</span><Link to="/privacy-policy">Privacy policy</Link><span>© {new Date().getFullYear()} Gymix</span></footer><nav className="gx-mobile-bottom" aria-label="Quick actions"><a href="#how-it-works">Explore demo <ArrowRight size={16}/></a><Link to="/signup?role=owner">Get started <ArrowUpRight size={16}/></Link></nav>
  </div>
}
