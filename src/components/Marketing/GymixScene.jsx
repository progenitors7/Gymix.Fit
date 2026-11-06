import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import { Users, CreditCard, ScanLine, ArrowUpRight, Check, Activity, LayoutDashboard, Settings } from 'lucide-react'
import './GymixScene.css'

// Every panel occupies a different Z plane. The scroll timeline assembles them
// into one dashboard; pointer input rotates the whole scene, not individual text.
export default function GymixScene({ progress, compact = false }) {
  const still = useMotionValue(0)
  const timeline = progress || still
  const reduce = useReducedMotion()
  const pointerX = useMotionValue(0), pointerY = useMotionValue(0)
  const rx = useSpring(pointerX, { stiffness: 100, damping: 24 })
  const ry = useSpring(pointerY, { stiffness: 100, damping: 24 })
  const rotateX = useTransform(timeline, [0,.48,1], [18,42,0])
  const rotateY = useTransform(timeline, [0,.48,1], [-22,-32,0])
  const rotateZ = useTransform(timeline, [0,.48,1], [-9,-14,0])
  const passZ = useTransform(timeline, [0,.48,1], [100,250,18])
  const receiptZ = useTransform(timeline, [0,.48,1], [65,170,12])
  const scanZ = useTransform(timeline, [0,.48,1], [145,320,25])
  const spread = useTransform(timeline, [0,.48,1], [0,-45,12])
  return <div className={`gx3-scene ${compact ? 'gx3-compact' : ''}`} onPointerMove={event=>{if(reduce || event.pointerType==='touch')return;const rect=event.currentTarget.getBoundingClientRect();pointerX.set(-(event.clientY-rect.top-rect.height/2)/rect.height*12);pointerY.set((event.clientX-rect.left-rect.width/2)/rect.width*18)}} onPointerLeave={()=>{pointerX.set(0);pointerY.set(0)}} role="img" aria-label="Interactive 3D Gymix dashboard with floating membership, payment and attendance panels. Illustrative demo.">
    <div className="gx3-orbit gx3-orbit-a"/><div className="gx3-orbit gx3-orbit-b"/><div className="gx3-floor"/>
    <motion.div className="gx3-pointer" style={reduce ? {} : {rotateX:rx,rotateY:ry}}>
      <motion.div className="gx3-world" style={reduce ? {rotateX:12,rotateY:-15,rotateZ:-5} : {rotateX,rotateY,rotateZ}}>
        <div className="gx3-base-edge"/>
        <div className="gx3-dashboard">
          <div className="gx3-sidebar"><img src="/logo-transparent.png" alt=""/><LayoutDashboard/><Users/><CreditCard/><ScanLine/><Settings/></div>
          <div className="gx3-board"><header><span>IRON HOUSE / WORKSPACE</span><span>GYMIX OS <i/></span></header><div className="gx3-board-title"><div><small>MONDAY, 6:00 AM</small><h3>Let’s make it a good one.</h3></div><span>RK</span></div><div className="gx3-numbers"><div><span>Members</span><strong>148</strong><small>Active memberships</small></div><div><span>Collections</span><strong>₹84,500</strong><small>Recorded this month</small></div><div><span>Check-ins</span><strong>32</strong><small>On the floor today</small></div></div><div className="gx3-chart"><div><span>YOUR WEEK, IN MOTION</span><Activity size={15}/></div><svg viewBox="0 0 360 95" fill="none" aria-hidden="true"><path d="M0 75H360M0 40H360M0 5H360" stroke="#ffffff0d"/><path d="M0 82L30 69L60 75L90 48L120 53L150 29L180 42L210 15L240 31L270 12L300 21L330 5L360 11" stroke="#af8af7" strokeWidth="3" strokeLinejoin="round"/><path d="M0 82L30 69L60 75L90 48L120 53L150 29L180 42L210 15L240 31L270 12L300 21L330 5L360 11V95H0Z" fill="#8b5cf618"/></svg></div><div className="gx3-board-footer"><span><span className="gx3-dot"/> YOUR DAILY WORKSPACE</span><span>Demo data <ArrowUpRight size={11}/></span></div></div>
        </div>
        <motion.div className="gx3-member-pass" style={reduce?{}:{z:passZ,y:spread}}><div><img src="/logo-transparent.png" alt=""/><span>MEMBER ACCESS</span><ArrowUpRight size={14}/></div><span className="gx3-pass-name">AARAV<br/>SHARMA<span>GX—0148</span></span><div className="gx3-pass-bottom"><span>MONTHLY PLAN<br/><strong>ALL SET. GO TRAIN.</strong></span><div className="gx3-barcode"/></div><span className="gx3-pass-edge">GYMIX / MEMBER</span></motion.div>
        <motion.div className="gx3-receipt" style={reduce?{}:{z:receiptZ}}><div><CreditCard size={18}/><span>PAYMENT RECORDED</span><Check size={15}/></div><strong>₹1,500<span>.00</span></strong><p>Monthly membership</p><footer><span>Aarav Sharma</span><span>UPI <ArrowUpRight size={11}/></span></footer></motion.div>
        <motion.div className="gx3-attendance" style={reduce?{}:{z:scanZ}}><div className="gx3-scan-grid">{Array.from({length:25},(_,i)=><span key={i} className={[0,1,3,4,5,7,9,11,12,13,15,17,19,20,21,23,24].includes(i)?'filled':''}/>)}</div><div><span>CHECK-IN COMPLETE</span><strong>You’re in.</strong><small><span className="gx3-dot"/> 06:42 AM · Today</small></div><Check size={20}/></motion.div>
        <div className="gx3-chip"><img src="/logo-transparent.png" alt=""/></div>
      </motion.div>
    </motion.div>
    <span className="gx3-scene-caption">MEMBERS / MONEY / MOMENTUM<span>ILLUSTRATIVE DEMO</span></span>
  </div>
}
