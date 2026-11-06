import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import GymixScene from '../components/Marketing/GymixScene'
import { ArrowDown, ArrowUpRight, Users, CreditCard, ScanLine, ArrowRight } from 'lucide-react'

export function MotionHero() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target:ref, offset:['start start','end end'] })
  const titleY = useTransform(scrollYProgress,[0,.6],[0,-80])
  const titleOpacity = useTransform(scrollYProgress,[0,.3,.55],[1,1,0])
  const sceneX = useTransform(scrollYProgress,[0,.45,1],['0%','-7%','-40%'])
  const sceneScale = useTransform(scrollYProgress,[0,.5,1],[1,1.05,1.16])
  const closingOpacity = useTransform(scrollYProgress,[0,.65,.9],[0,0,1])
  const progressWidth = useTransform(scrollYProgress,[0,1],['0%','100%'])
  return <section ref={ref} className="gx-dimension-hero">
    <div className="gx-dimension-pin">
      <div className="gx-dimension-grid"/><div className="gx-dimension-watermark" aria-hidden="true">gymix.</div>
      <motion.div className="gx-dimension-copy" style={reduce ? {} : {y:titleY,opacity:titleOpacity}}><div className="gx-dimension-intro"><span/> THE GYM MANAGEMENT WORKSPACE</div><h1>Your gym.<br/>In full<br/><em>control.</em></h1><p>Members. Money. Momentum.<br/>A new perspective on your everyday.</p><div><Link to="/signup?role=owner" className="gx-button">Step inside Gymix <ArrowUpRight size={19}/></Link><a href="#how-it-works" className="gx-dimension-demo">Explore the demo <ArrowRight size={15}/></a></div></motion.div>
      <motion.div className="gx-dimension-object" style={reduce ? {} : {x:sceneX,scale:sceneScale}}><GymixScene progress={scrollYProgress}/></motion.div>
      <motion.div className="gx-dimension-closing" style={reduce ? {display:'none'} : {opacity:closingOpacity}}><span>ONE CONNECTED WORKSPACE.</span><h2>All the pieces.<br/><em>Finally together.</em></h2><p>Scroll into a simpler way to run your gym.</p><span className="gx-closing-arrow" aria-hidden="true"><ArrowDown size={20}/></span></motion.div>
      <div className="gx-dimension-bottom"><span><ArrowDown size={14}/> SCROLL TO CHANGE YOUR PERSPECTIVE</span><span>MOVE YOUR MOUSE. EXPLORE THE DEPTH.</span></div><div className="gx-dimension-progress"><motion.span style={reduce?{width:'100%'}:{width:progressWidth}}/></div>
    </div>
  </section>
}

export function MotionFeatures() {
  const ref = useRef(null)
  const steps = useRef([])
  const [active, setActive] = useState(0)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.08, 1])
  const features = [
    { Icon: Users, title: 'Know your people.', label: 'Members', copy: 'The person, the plan and the next renewal. All the details for a better member experience, together.', points: ['Member profiles and contact details', 'Membership plans and expiry dates', 'Review new connection requests'], number: '148', metric: 'active members', photo: 'photo-1517836357463-d25dfeac3438', alt: 'Athlete preparing for a strength workout' },
    { Icon: CreditCard, title: 'Every rupee. In view.', label: 'Payments', copy: 'Start the day knowing what’s collected, what’s due and who needs a follow-up. Leave the monthly guessing behind.', points: ['Record membership payments', 'Keep renewal and payment history', 'See pending fees in your dashboard'], number: '₹84,500', metric: 'recorded this month', photo: 'photo-1534438327276-14e5300c3a48', alt: 'Dumbbells and training equipment in a gym' },
    { Icon: ScanLine, title: 'Show up. Check in.', label: 'Attendance', copy: 'A clear record of who came in and when. Member attendance lives alongside the rest of your gym’s daily work.', points: ['QR and manual check-in', 'Daily attendance records', 'Member attendance history'], number: '32', metric: 'check-ins today', photo: 'photo-1571019613454-1cb2f99b2d8b', alt: 'Athlete working out on the gym floor' },
  ]
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(Number(entry.target.dataset.feature)) })
    }, { rootMargin: '-35% 0px -35% 0px', threshold: 0 })
    steps.current.forEach(step => step && observer.observe(step))
    return () => observer.disconnect()
  }, [])
  return <section className="gx-feature-story" ref={ref} id="capabilities">
    <div className="gx-wrap">
      <div className="gx-feature-story-heading"><h2>Every part of your gym.<br/><span>Moving together.</span></h2><p>Three daily essentials.<br/>One connected workspace.</p></div>
      <div className="gx-feature-story-layout">
        <div className="gx-feature-stage">
          <div className="gx-feature-image-stack">{features.map((feature, i) => <motion.img key={feature.label} src={`https://images.unsplash.com/${feature.photo}?auto=format&fit=crop&w=1200&q=85`} alt={feature.alt} className={active === i ? 'is-active' : ''} style={reduce ? {} : { scale: imageScale }} loading="lazy"/>)}</div>
          <div className="gx-feature-stage-top"><img src="/logo-transparent.png" alt=""/><span>THE EVERYDAY / GYMIX</span><span>0{active + 1} / 03</span></div>
          <div className="gx-feature-stage-bottom"><div><strong>{features[active].number}</strong><span>{features[active].metric}</span><small>Illustrative demo</small></div><div className="gx-feature-scene-tabs" aria-label="Explore gym features">{features.map(({ Icon, label }, i) => <button key={label} aria-label={`Explore ${label.toLowerCase()}`} aria-pressed={active === i} onClick={() => { setActive(i); if (window.matchMedia('(min-width: 761px)').matches) steps.current[i]?.scrollIntoView({ behavior: reduce ? 'instant' : 'smooth', block: 'center' }) }}><Icon size={17}/><span>{label}</span></button>)}</div></div>
        </div>
        <div className="gx-feature-narrative">{features.map((feature, i) => <article key={feature.label} data-feature={i} ref={el => { steps.current[i] = el }} className={active === i ? 'is-active' : ''}><span className="gx-feature-chapter">0{i + 1} / {feature.label.toUpperCase()}</span><h3>{feature.title}</h3><p>{feature.copy}</p><ul>{feature.points.map(point => <li key={point}><ArrowRight size={14}/>{point}</li>)}</ul><a href="#how-it-works">See it in the demo <ArrowUpRight size={16}/></a></article>)}</div>
      </div>
    </div>
  </section>
}

export function MotionIntro() {
 const ref=useRef(null)
 const reduce=useReducedMotion()
 const {scrollYProgress}=useScroll({target:ref,offset:['start .85','end .4']})
 const fill=useTransform(scrollYProgress,[0,1],['inset(0 100% 0 0)','inset(0 0% 0 0)'])
 return <section id="motion-intro" className="gx-motion-intro gx-wrap" ref={ref}><span>YOU DIDN’T OPEN A GYM TO CHASE SPREADSHEETS.</span><div className="gx-reveal-sentence"><h2>More coaching.<br/>More connection.<br/>Less catching up.</h2><motion.div aria-hidden="true" style={reduce?{clipPath:'none'}:{clipPath:fill}}>More coaching.<br/>More connection.<br/>Less catching up.</motion.div></div><p>From opening the shutters to the last check-in.<br/>Gymix gives your daily work a little more flow.</p></section>
}
