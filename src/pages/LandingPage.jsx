import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Users, CreditCard, TrendingUp, MessageSquare, 
  Sparkles, ShieldCheck, Zap, ArrowRight, Download, Share, 
  Plus, Check, X, Smartphone, ArrowUpRight, BarChart3, QrCode
} from 'lucide-react'
import Logo from '../components/UI/Logo'

export default function LandingPage() {
  const navigate = useNavigate()
  
  // PWA & Installation states
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  
  // Pricing & Widget states
  const [selectedDuration, setSelectedDuration] = useState('3') // '1' | '3' | '12'
  const [promoApplied, setPromoApplied] = useState(true)
  const [inputCode, setInputCode] = useState('')
  const [codeError, setCodeError] = useState('')

  useEffect(() => {
    // Detect Standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator.standalone === true);
      setIsStandalone(isStandaloneMode);
    }
    
    // Detect iOS & Safari
    const checkDevice = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const ios = /iphone|ipad|ipod/.test(userAgent);
      // Safari detection (avoiding Chrome/Firefox on iOS triggers)
      const safari = ios && !/crios|fxios|opios|mercury/.test(userAgent) && /safari/.test(userAgent);
      
      setIsIOS(ios);
      setIsSafari(safari);
    }

    checkStandalone();
    checkDevice();

    // Listen for standard PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // If not dismissed before and not in standalone, show prompt
      const dismissed = localStorage.getItem('gym_pwa_dismissed');
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
      
      if (!dismissed && !isStandaloneMode) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS Safari & not standalone & not dismissed, show custom iOS tip
    const iosDismissed = localStorage.getItem('gym_pwa_ios_dismissed');
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator.standalone === true);
    
    // Make sure we check device first
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const safari = ios && !/crios|fxios|opios|mercury/.test(userAgent) && /safari/.test(userAgent);
    
    if (ios && safari && !isStandaloneMode && !iosDismissed) {
      // Delay iOS banner slightly for better UX
      const timer = setTimeout(() => {
        setShowInstallPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('gym_pwa_dismissed', 'true');
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const dismissPrompt = () => {
    if (isIOS) {
      localStorage.setItem('gym_pwa_ios_dismissed', 'true');
    } else {
      localStorage.setItem('gym_pwa_dismissed', 'true');
    }
    setShowInstallPrompt(false);
  };

  return (
    <div className="min-h-screen bg-[#0F1117] text-slate-100 overflow-x-hidden selection:bg-emerald-500/30 font-sans relative">
      
      {/* Background glowing decorations */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-emerald-500/5 blur-[140px] rounded-full pointer-events-none" />
      
      {/* Decorative Grid Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none mask-image-[radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      {/* ── STICKY HEADER ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-white/5 bg-[#0F1117]/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10 drop-shadow-[0_0_12px_rgba(167,112,255,0.4)] cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
            <span className="font-black text-white text-xl tracking-tighter italic uppercase">
              Gym Revenue <span className="text-[#A770FF]">OS</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Core Features</a>
            <a href="#upcoming" className="hover:text-white transition-colors">Upcoming Roadmap</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Direct PWA download if installable */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 rounded-xl transition-all duration-300"
              >
                <Download className="w-3.5 h-3.5" />
                Install App
              </button>
            )}

            <button 
              onClick={() => navigate('/login')} 
              className="text-sm font-bold text-white hover:text-emerald-400 transition-all duration-200 px-3 py-2"
            >
              Sign In
            </button>

            <button 
              onClick={() => navigate('/signup')} 
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-lg shadow-emerald-500/10 rounded-xl transition-all duration-300 flex items-center gap-2 hover:scale-105 active:scale-95"
            >
              Start Free Trial
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-12 pb-24 md:pt-20 md:pb-36 max-w-7xl mx-auto px-6 flex flex-col items-center text-center">
        
        {/* Promotion Pill */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2.5 px-4.5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-8"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          Limited Time Promo: 3 Months Free Trial
        </motion.div>

        {/* Hero Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[0.95] tracking-tight uppercase italic max-w-5xl"
        >
          UNLEASH YOUR <br className="hidden sm:inline" />
          GYM'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-[#A770FF]">REVENUE</span> POTENTIAL
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-slate-400 text-lg md:text-xl font-medium max-w-3xl mt-8 leading-relaxed"
        >
          The elite Operating System engineered exclusively for gym owners. Automate subscription cycles, process secure payments, analyze growth metrics, and manage your community in one seamless interface.
        </motion.p>

        {/* Dual Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-5 mt-10 w-full sm:w-auto"
        >
          <button
            onClick={() => navigate('/signup')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/15 hover:shadow-emerald-400/25 transition-all duration-300 hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-3"
          >
            Get 3 Months Free Access
            <ArrowRight className="w-4 h-4" />
          </button>
          
          <a
            href="#pricing"
            className="w-full sm:w-auto px-8 py-4 bg-white/[0.03] border border-white/10 hover:bg-white/[0.06] text-white text-sm font-black uppercase tracking-widest rounded-2xl transition-all duration-300 hover:border-white/20 flex items-center justify-center gap-2.5"
          >
            Explore Plan Tiers
          </a>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mt-20 p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-sm relative z-10"
        >
          {[
            { label: 'Gym Owners Onboarded', value: '1.2K+', desc: 'Across India & Southeast Asia', color: 'text-emerald-400' },
            { label: 'Total Revenue Tracked', value: '₹48Cr+', desc: 'Direct secure invoice systems', color: 'text-white' },
            { label: 'Active Gym Members', value: '2.4L+', desc: 'Frictionless subscription flows', color: 'text-emerald-400' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1 relative px-4">
              {i > 0 && <div className="hidden sm:block absolute left-0 top-1/4 bottom-1/4 w-[1px] bg-white/10" />}
              <p className={`text-4xl font-black tracking-tighter ${stat.color}`}>{stat.value}</p>
              <p className="text-white text-xs font-bold leading-none pt-1">{stat.label}</p>
              <p className="text-slate-500 text-[10px] font-medium leading-tight pt-1">{stat.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Premium OS UI Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="w-full max-w-5xl mt-20 relative p-3.5 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 via-purple-600/5 to-transparent blur-xl opacity-80 group-hover:scale-105 transition-transform duration-[10s]" />
          
          <div className="relative rounded-[2rem] overflow-hidden border border-white/5 bg-slate-950/80 aspect-[16/10] p-6 flex flex-col justify-between">
            {/* Mock Dashboard Top Header */}
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="h-4 w-28 bg-white/5 rounded-md" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-white/5 rounded-lg" />
                <div className="h-6 w-8 bg-emerald-500/10 border border-emerald-500/20 rounded-lg" />
              </div>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="flex-1 grid grid-cols-3 gap-4 pt-6">
              <div className="col-span-2 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                      <div className="flex justify-between">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          {num === 1 ? <Users className="w-4 h-4 text-emerald-400" /> : num === 2 ? <CreditCard className="w-4 h-4 text-purple-400" /> : <TrendingUp className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div className="w-8 h-3.5 bg-white/5 rounded-full" />
                      </div>
                      <div className="h-6 w-16 bg-white/10 rounded-lg" />
                      <div className="h-3 w-10 bg-white/5 rounded-full" />
                    </div>
                  ))}
                </div>

                {/* Graph mockup */}
                <div className="p-4 rounded-[2rem] bg-white/[0.02] border border-white/5 h-44 flex flex-col justify-between">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-white/10 rounded-md" />
                    <div className="h-4 w-12 bg-white/5 rounded-md" />
                  </div>
                  <div className="h-24 w-full flex items-end gap-3 px-2">
                    {[35, 45, 30, 55, 75, 60, 85, 90, 100].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div 
                          style={{ height: `${h}%` }}
                          className={`w-full rounded-t-md transition-all duration-1000 ${
                            i === 8 ? 'bg-gradient-to-t from-emerald-600 to-emerald-400' : 'bg-white/10'
                          }`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Members Sidebar mock */}
              <div className="col-span-1 p-4 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4 flex flex-col">
                <div className="h-4 w-28 bg-white/10 rounded-md" />
                <div className="flex-1 space-y-3">
                  {[
                    { name: 'Amit Sharma', status: 'Active', plan: 'Gold Plus', time: '10 mins ago', active: true },
                    { name: 'Pooja Patil', status: 'Active', plan: 'Monthly Standard', time: '1 hr ago', active: true },
                    { name: 'Rahul Sen', status: 'Expired', plan: 'Gold Plus', time: 'Yesterday', active: false },
                  ].map((user, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-white">
                          {user.name[0]}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-white">{user.name}</p>
                          <p className="text-[8px] text-slate-500">{user.plan}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${
                          user.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {user.status}
                        </span>
                        <p className="text-[6px] text-slate-500 pt-1">{user.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── CORE FEATURES SECTION ── */}
      <section id="features" className="py-24 border-t border-white/5 relative bg-[#0C0E13]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">
              Premium Operating System
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
              ENGINEERED FOR MODERN GYM DOMINANCE
            </h2>
            <p className="text-slate-400 font-medium">
              Say goodbye to messy spreadsheets. Gym Revenue OS consolidates every business operational pillar into a supercharged, high-performing environment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
            {[
              {
                icon: Users,
                title: 'Core Member Hub',
                desc: 'Organize members with complete profiles, digital ID generation, subscription active/inactive visual cues, check-in history, and emergency contact storage.',
                color: 'group-hover:text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              },
              {
                icon: CreditCard,
                title: 'Seamless Payments',
                desc: 'Collect revenue without manual headaches. Record incoming cash/UPI transactions, tracking billing logs, download invoices, and send instant transaction alerts.',
                color: 'group-hover:text-purple-400 bg-purple-500/10 border-purple-500/20'
              },
              {
                icon: Activity,
                title: 'Dynamic Subscription Control',
                desc: 'Design standard tiers, group packages, premium packages, or trial sessions. System automatically flags expiration status so you never lose a membership cycle.',
                color: 'group-hover:text-blue-400 bg-blue-500/10 border-blue-500/20'
              },
              {
                icon: MessageSquare,
                title: 'Direct Broadcast Engine',
                desc: 'Send urgent notifications, holiday alerts, subscription discount schemes, or community challenge updates directly to your entire membership base in seconds.',
                color: 'group-hover:text-teal-400 bg-teal-500/10 border-teal-500/20'
              }
            ].map((feature, i) => (
              <div key={i} className="glass-card border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-between hover:-translate-y-2 hover:border-white/10 transition-all duration-300 relative group overflow-hidden">
                <div className="space-y-6">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${feature.color} transition-all`}>
                    <feature.icon className="w-5 h-5 text-white transition-all group-hover:scale-110" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{feature.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed font-medium">{feature.desc}</p>
                </div>
                <div className="pt-6">
                  <span className="text-[10px] font-black uppercase text-emerald-400 group-hover:translate-x-1.5 transition-transform inline-flex items-center gap-1.5">
                    Live Active Module
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── UPCOMING FEATURES (Futuristic Grid Showcase) ── */}
      <section id="upcoming" className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-600/5 blur-[150px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-12 border-b border-white/5">
            <div className="space-y-4 max-w-2xl">
              <span className="text-purple-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" style={{ animationDuration: '4s' }} />
                OS Technological Roadmap
              </span>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
                UPCOMING PREMIUM MODULES
              </h2>
              <p className="text-slate-400 font-medium">
                We are constantly building modern power-ups. These upcoming integrations will be rolled out to all existing users for free during their current operational subscription cycles.
              </p>
            </div>
            
            <span className="px-5 py-2.5 rounded-full bg-white/[0.03] border border-white/10 text-xs font-black uppercase text-slate-300 tracking-wider">
              Release Phase: Q3-Q4 2026
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
            {/* Card 1: AI Biometric Attendance */}
            <div className="glass-card border border-purple-500/10 bg-gradient-to-br from-slate-900/50 via-[#1A1F2B]/60 to-purple-950/20 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between hover:border-purple-500/20 transition-all duration-300 group relative">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[8px] font-black uppercase tracking-widest text-purple-400">
                In Beta Testing
              </div>
              
              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight flex items-center gap-2">
                  AI Biometric Attendance Hub
                </h3>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
                  Connect high-end biometric scanners or tablets directly. Support facial recognition check-ins, fingerprint reader syncing, and instant auto-lock validation triggers at your gym entrance gates.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-purple-400 flex items-center gap-1.5">
                  Hardware Synced Module
                </span>
                <span className="text-[10px] font-bold text-slate-500">Coming Soon</span>
              </div>
            </div>

            {/* Card 2: Automated WhatsApp Receipts */}
            <div className="glass-card border border-teal-500/10 bg-gradient-to-br from-slate-900/50 via-[#1A1F2B]/60 to-emerald-950/10 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between hover:border-teal-500/20 transition-all duration-300 group relative">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-[8px] font-black uppercase tracking-widest text-teal-400">
                In Development
              </div>

              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-teal-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                  Automated WhatsApp Invoice Alerts
                </h3>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
                  Zero manual sending. Once a transaction succeeds or a subscription is created, the system triggers official WhatsApp messages with download links for receipt PDFs and payment logs.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-teal-400 flex items-center gap-1.5">
                  100% Automated API
                </span>
                <span className="text-[10px] font-bold text-slate-500">Coming Soon</span>
              </div>
            </div>

            {/* Card 3: Predictive Revenue Projection */}
            <div className="glass-card border border-blue-500/10 bg-gradient-to-br from-slate-900/50 via-[#1A1F2B]/60 to-blue-950/20 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between hover:border-blue-500/20 transition-all duration-300 group relative">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[8px] font-black uppercase tracking-widest text-blue-400">
                Prototyping
              </div>

              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                  Predictive Growth & Churn Analytics
                </h3>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
                  Our advanced forecasting models project Monthly Recurring Revenue (MRR), track payment drop trends, and warn you about potential client churn cycles 14 days before their plans lapse.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-1.5">
                  Machine Learning Engine
                </span>
                <span className="text-[10px] font-bold text-slate-500">Coming Soon</span>
              </div>
            </div>

            {/* Card 4: Diet & Workout Builder */}
            <div className="glass-card border border-[#A770FF]/10 bg-gradient-to-br from-slate-900/50 via-[#1A1F2B]/60 to-purple-950/15 rounded-[2.5rem] p-8 sm:p-10 flex flex-col justify-between hover:border-[#A770FF]/20 transition-all duration-300 group relative">
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-[#A770FF]/10 border border-[#A770FF]/20 text-[8px] font-black uppercase tracking-widest text-[#A770FF]">
                Planning Phase
              </div>

              <div className="space-y-6">
                <div className="w-14 h-14 rounded-2xl bg-[#A770FF]/10 border border-[#A770FF]/20 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-[#A770FF] group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">
                  Premium Diet & Workout Hub
                </h3>
                <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-medium">
                  Add massive value for members. Build highly customized workout schedules, daily diet sheets, and calorie logs directly within the system. Make your gym stand out from nearby competitors.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#A770FF] flex items-center gap-1.5">
                  Client Engagement Portal
                </span>
                <span className="text-[10px] font-bold text-slate-500">Coming Soon</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PREMIUM PRICING SECTION (With 3 Months Free Promo Code Special) ── */}
      <section id="pricing" className="py-24 border-t border-white/5 bg-[#0C0E13] relative">
        {/* Helper pricing states inside the component layout */}
        {(() => {
          const durations = {
            '1': { name: 'Growth Plan (1 Month)', price: 299, tag: 'Less than ₹10/day', badge: 'Founding Special' },
            '3': { name: 'Growth Plan (3 Months)', price: 699, tag: 'Only ₹7/day', badge: 'Most Popular' },
            '12': { name: 'Growth Plan (12 Months)', price: 2499, tag: 'Best long-term value', badge: 'Best Value' }
          };

          const currentPlan = durations[selectedDuration];
          const promoCode = 'GYMOS3FREE';

          const handleApplyPromo = (e) => {
            e.preventDefault();
            if (inputCode.trim().toUpperCase() === promoCode) {
              if (selectedDuration === '3') {
                setPromoApplied(true);
                setCodeError('');
              } else {
                setCodeError('This promo code is only valid for the 3-Month Growth Plan');
              }
            } else {
              setCodeError('Invalid promo code. Try "GYMOS3FREE"');
            }
          };

          return (
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center space-y-4 max-w-3xl mx-auto">
                <span className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.3em]">
                  Pricing & Access
                </span>
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tighter uppercase italic">
                  GYM OS GROWTH PLAN
                </h2>
                <p className="text-slate-400 font-medium">
                  Unlock unlimited potential. One plan, everything included. Choose a duration and start growing your fitness empire.
                </p>
              </div>

              {/* Founding Gym Offer Header Callout */}
              <div className="max-w-4xl mx-auto mt-12 p-5.5 rounded-2xl bg-gradient-to-r from-blue-500/10 to-[#A770FF]/5 border border-blue-500/20 flex items-center gap-4.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">Founding Gym Offer</h4>
                  <p className="text-slate-400 text-xs font-medium pt-0.5">Early access pricing for limited gyms. Get 3 Months 100% Free with promo code below!</p>
                </div>
              </div>

              {/* Interactive Widget Container */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-10 max-w-4xl mx-auto items-start">
                
                {/* Left Side: Select Duration (Col-span 7) */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Select Duration</h3>
                  </div>

                  <div className="space-y-4">
                    {/* Option 1: 1 Month */}
                    <div 
                      onClick={() => {
                        setSelectedDuration('1');
                        setPromoApplied(false);
                        setCodeError('');
                      }}
                      className={`p-6 rounded-[2rem] cursor-pointer transition-all border flex items-center justify-between relative overflow-hidden ${
                        selectedDuration === '1'
                          ? 'bg-white/[0.03] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Growth Trial</span>
                        <h4 className="text-xl font-black text-white italic uppercase">1 Month</h4>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{durations['1'].tag}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-white">₹299</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none pt-1">Single Month Access</p>
                      </div>
                    </div>

                    {/* Option 2: 3 Months (Most Popular) */}
                    <div 
                      onClick={() => {
                        setSelectedDuration('3');
                        setPromoApplied(true);
                        setCodeError('');
                      }}
                      className={`p-6 rounded-[2rem] cursor-pointer transition-all border flex items-center justify-between relative overflow-hidden ${
                        selectedDuration === '3'
                          ? 'bg-white/[0.03] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="absolute top-0 right-8 px-3 py-1 bg-yellow-500 text-black text-[7px] font-black uppercase tracking-widest rounded-b-md">
                        {durations['3'].badge}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-yellow-500 tracking-wider">Launch Favorite</span>
                        <h4 className="text-xl font-black text-white italic uppercase">3 Months</h4>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{durations['3'].tag}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-white">₹699</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none pt-1">Highly Recommended</p>
                      </div>
                    </div>

                    {/* Option 3: 12 Months (Best Value) */}
                    <div 
                      onClick={() => {
                        setSelectedDuration('12');
                        setPromoApplied(false);
                        setCodeError('');
                      }}
                      className={`p-6 rounded-[2rem] cursor-pointer transition-all border flex items-center justify-between relative overflow-hidden ${
                        selectedDuration === '12'
                          ? 'bg-white/[0.03] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="absolute top-0 right-8 px-3 py-1 bg-blue-500 text-white text-[7px] font-black uppercase tracking-widest rounded-b-md">
                        {durations['12'].badge}
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] font-black uppercase text-blue-400 tracking-wider">Ultimate Saver</span>
                        <h4 className="text-xl font-black text-white italic uppercase">12 Months</h4>
                        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">{durations['12'].tag}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-white">₹2499</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none pt-1">Best Long-term Value</p>
                      </div>
                    </div>
                  </div>

                  {/* Included features list */}
                  <div className="pt-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Every plan includes unlimited access to:</p>
                    <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-400">
                      {[
                        'Core Member Hub Records',
                        'Automatic Renewal Alerts',
                        'UPI/Cash Invoice Receipts',
                        'Broadcast Bulletin Blaster',
                        'All-in-One Growth Analytics',
                        'Premium Mobile PWA Engine'
                      ].map((item, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side: Order Summary Card (Col-span 5) */}
                <div className="lg:col-span-5">
                  <div className="glass-card border border-white/10 bg-slate-900/60 rounded-[2.5rem] p-6.5 sm:p-8 shadow-2xl relative overflow-hidden">
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight pb-4 border-b border-white/5">Order Summary</h3>

                    <div className="space-y-5 pt-5">
                      {/* Description */}
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-slate-400">{currentPlan.name}</span>
                        <span className="text-white font-black">₹{currentPlan.price}</span>
                      </div>

                      {/* Promo Code Input / Display */}
                      <div className="py-4.5 px-4 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                        {promoApplied ? (
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/20 uppercase tracking-widest">Code Applied</span>
                              <button 
                                onClick={() => setPromoApplied(false)}
                                className="text-[9px] font-black text-red-400 uppercase tracking-wider hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold text-emerald-400 pt-1">
                              <span>3-Month Launch Free Trial</span>
                              <span>-₹{currentPlan.price}</span>
                            </div>
                            <p className="text-[9px] text-slate-500 font-medium leading-relaxed pt-0.5">
                              Promo code <strong className="text-slate-300">GYMOS3FREE</strong> is successfully active on your account!
                            </p>
                          </div>
                        ) : (
                          <form onSubmit={handleApplyPromo} className="space-y-2.5">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Have a Promo Code?</span>
                              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest animate-pulse">Try: GYMOS3FREE</span>
                            </div>
                            <div className="flex gap-2">
                              <input 
                                type="text"
                                placeholder="Enter code"
                                value={inputCode}
                                onChange={(e) => setInputCode(e.target.value)}
                                className="flex-1 px-3 py-2 text-xs rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-[#A770FF]"
                              />
                              <button 
                                type="submit"
                                className="px-4 py-2 bg-[#A770FF] hover:bg-[#863BFF] text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                              >
                                Apply
                              </button>
                            </div>
                            {codeError && <p className="text-[9px] text-red-400 font-bold">{codeError}</p>}
                          </form>
                        )}
                      </div>

                      {/* Total Divider */}
                      <div className="pt-4 border-t border-white/5 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs font-black uppercase tracking-widest text-slate-500">Total</span>
                          <div className="text-right">
                            {promoApplied && <span className="text-xs text-slate-600 line-through font-bold pr-2">₹{currentPlan.price}</span>}
                            <span className="text-3xl font-black text-white">₹{promoApplied ? '0' : currentPlan.price}</span>
                          </div>
                        </div>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest text-right leading-none">Inclusive of all taxes</p>
                      </div>

                      {/* Promoted Free trial notice badge */}
                      {promoApplied && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                          <p className="text-[9px] text-emerald-400 font-black uppercase tracking-wider">
                            You get 3 Months Free Early Access!
                          </p>
                        </div>
                      )}

                      {/* Call to Action */}
                      <button
                        onClick={() => {
                          const promoParam = promoApplied ? '&promo=GYMOS3FREE' : '';
                          navigate(`/signup?plan=${selectedDuration}${promoParam}`);
                        }}
                        className="w-full py-4.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/15 hover:shadow-emerald-400/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                      >
                        Start Growing
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-white/5 relative z-10 bg-[#0A0C10]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo className="w-8 h-8 opacity-70" />
            <span className="font-black text-slate-400 text-sm tracking-tighter italic uppercase">
              Gym Revenue <span className="text-[#A770FF]/70">OS</span>
            </span>
          </div>
          
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.2em] text-center md:text-right">
            © 2026 GYM REVENUE OS. All Rights Reserved. Built for ultimate physical excellence.
          </p>
        </div>
      </footer>

      {/* ── PWA PREMIUM INSTALL PROMPT ── */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-6 left-6 right-6 md:left-auto md:right-8 md:max-w-md z-50 p-6 rounded-[2rem] bg-[#1A1F2B]/95 border border-emerald-500/25 shadow-2xl backdrop-blur-lg"
          >
            <div className="relative">
              <button 
                onClick={dismissPrompt} 
                className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="w-6 h-6 text-emerald-400" />
                </div>
                
                <div className="space-y-1.5 pr-8">
                  <h4 className="text-sm font-black text-white uppercase italic tracking-tight">Install Gym Revenue OS</h4>
                  <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                    {isIOS 
                      ? 'Install on your iPhone for offline performance, full-screen mode, and automated check-ins.' 
                      : 'Add this premium OS directly to your phone dashboard for instant access and alerts.'}
                  </p>
                </div>
              </div>

              {/* Action Rows */}
              <div className="mt-5.5 pt-4 border-t border-white/5 flex flex-col gap-3">
                {isIOS ? (
                  /* Custom iOS Share-sheet instruction guide */
                  <div className="space-y-3">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Instructions for Safari on iPhone:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <div className="flex items-center gap-1.5 text-white font-black text-[10px] uppercase">
                          <Share className="w-3.5 h-3.5 text-blue-400" />
                          Step 1
                        </div>
                        <p className="text-[10px] text-slate-400">Tap browser share icon <span className="text-blue-400">⎙</span></p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                        <div className="flex items-center gap-1.5 text-white font-black text-[10px] uppercase">
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          Step 2
                        </div>
                        <p className="text-[10px] text-slate-400">Select "Add to Home Screen" <span className="text-emerald-400">+</span></p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Android/Chrome direct click installer */
                  <div className="flex gap-3 justify-end">
                    <button 
                      onClick={dismissPrompt} 
                      className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors"
                    >
                      Maybe Later
                    </button>
                    
                    <button 
                      onClick={handleInstallClick} 
                      className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
