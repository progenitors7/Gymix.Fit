import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { ArrowUpRight, Check, Users, SlidersHorizontal, Activity } from 'lucide-react'

export function ScrollFrame({ children, className = '' }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotateX = useTransform(scrollYProgress, [0, .4, 1], [10, 0, -3])
  const rotateY = useTransform(scrollYProgress, [0, .45, 1], [-7, 0, 4])
  const y = useTransform(scrollYProgress, [0, .4, 1], [45, 0, -25])
  return <div ref={ref} className={`gx-scroll-frame ${className}`}><motion.div className="gx-frame-depth" aria-hidden="true" style={reduce ? {} : { rotateX, rotateY, y }}/><div className="gx-frame-content">{children}</div></div>
}

export function SetupSequence() {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({target:ref,offset:['start .8','end .6']})
  const scaleX = useTransform(scrollYProgress,[0,1],[0,1])
  return <section ref={ref} className="gx-new-setup gx-wrap"><div className="gx-setup-heading"><h2>A fresh start.<br/><span>Without starting over.</span></h2><p>Your gym is already running.<br/>Give its daily work a place to come together.</p></div><div className="gx-setup-rail"><motion.span style={reduce ? {scaleX:1} : {scaleX}}/></div><div className="gx-setup-stages">{[
    {Icon:SlidersHorizontal,title:'Make it yours.',copy:'Create your gym profile and set up the membership plans you already offer.',meta:'YOUR GYM / YOUR PLANS'},
    {Icon:Users,title:'Bring your people.',copy:'Add members or share your gym connection code. Review requests as they come in.',meta:'CONNECTED / TOGETHER'},
    {Icon:Activity,title:'Find your flow.',copy:'Record fees, track check-ins and keep upcoming renewals in sight.',meta:'YOUR NEW / EVERYDAY'},
  ].map(({Icon,title,copy,meta},i)=><article key={title}><div className="gx-setup-marker"><span>{i+1}</span><Icon size={21}/></div><h3>{title}</h3><p>{copy}</p><span>{meta}</span></article>)}</div></section>
}

export function ClosingSequence() {
  const ref=useRef(null)
  const reduce=useReducedMotion()
  const {scrollYProgress}=useScroll({target:ref,offset:['start end','end end']})
  const rotateY=useTransform(scrollYProgress,[0,1],[-38,0])
  const rotateZ=useTransform(scrollYProgress,[0,1],[-14,4])
  const y=useTransform(scrollYProgress,[0,1],[100,0])
  return <section className="gx-closing-sequence" ref={ref}><div className="gx-wrap gx-closing-layout"><div className="gx-closing-copy"><span><Check size={13}/> MADE FOR THE PEOPLE BEHIND THE GYM.</span><h2>You build the gym.<br/><em>We’ll help with<br/>the everyday.</em></h2><p>A little more clarity. A little less chasing.<br/>A workspace that moves with you.</p><Link to="/signup?role=owner" className="gx-button">Step inside Gymix <ArrowUpRight size={18}/></Link><a href="mailto:founder@gymix.fit">Or talk to the founder <ArrowUpRight size={13}/></a></div><div className="gx-closing-art" aria-hidden="true"><div className="gx-closing-orbit"/><motion.div className="gx-brand-slab" style={reduce ? {} : {rotateY,rotateZ,y}}><img src="/logo-transparent.png" alt=""/><strong>gymix.</strong><span>MEMBERS. MONEY. MOMENTUM.</span><div><span>YOUR NEXT CHAPTER</span><ArrowUpRight size={25}/></div></motion.div></div></div></section>
}
