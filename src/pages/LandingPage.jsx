import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Users, CreditCard, TrendingUp, MessageSquare, 
  Sparkles, ShieldCheck, Zap, ArrowRight, Download, Share, 
  Plus, Check, X, Smartphone, ArrowUpRight, BarChart3, QrCode,
  Menu, ChevronDown, Award, Star, Search, Calendar, Lock, Info, CheckCircle2,
  Fingerprint, ShoppingBag, ExternalLink
} from 'lucide-react'
import Logo from '../components/UI/Logo'

export default function LandingPage() {
  const navigate = useNavigate()
  
  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  
  // Interactive Simulator State
  const [activeDemoTab, setActiveDemoTab] = useState('members') // 'members' | 'payments' | 'scanner' | 'analytics'
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [mockMembers, setMockMembers] = useState([
    { id: 1, name: 'Amit Sharma', plan: '3-Month Standard', active: true, checkedIn: '10 mins ago', avatar: 'A' },
    { id: 2, name: 'Pooja Patil', plan: '12-Month Gold Plus', active: true, checkedIn: '1 hr ago', avatar: 'P' },
    { id: 3, name: 'Rahul Sen', plan: 'Monthly Special', active: false, checkedIn: 'Yesterday', avatar: 'R' },
    { id: 4, name: 'Sneha Reddy', plan: '3-Month Premium', active: true, checkedIn: '3 hrs ago', avatar: 'S' }
  ])
  
  // Simulated scanner states
  const [isScanning, setIsScanning] = useState(false)
  const [scanSuccess, setScanSuccess] = useState(false)
  const [scannedUser, setScannedUser] = useState(null)
  
  // Simulated payments state
  const [mockInvoices, setMockInvoices] = useState([
    { id: 'INV-2026-004', name: 'Pooja Patil', amount: '₹2,499', method: 'UPI', date: 'May 25', status: 'Paid' },
    { id: 'INV-2026-003', name: 'Amit Sharma', amount: '₹699', method: 'UPI', date: 'May 24', status: 'Paid' },
    { id: 'INV-2026-002', name: 'Rahul Sen', amount: '₹299', method: 'Cash', date: 'May 10', status: 'Unpaid' }
  ])
  
  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isSafari, setIsSafari] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [pwaGuideTab, setPwaGuideTab] = useState('android') // 'android' | 'ios'
  
  // Pricing states
  const [selectedDuration, setSelectedDuration] = useState('3') // '1' | '3' | '12'
  const [promoApplied, setPromoApplied] = useState(false)
  const [inputCode, setInputCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('')
  const [showVoucherSuccessEffect, setShowVoucherSuccessEffect] = useState(false)
  
  // FAQ state
  const [activeFaqIndex, setActiveFaqIndex] = useState(null)

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
      const safari = ios && !/crios|fxios|opios|mercury/.test(userAgent) && /safari/.test(userAgent);
      
      setIsIOS(ios);
      setIsSafari(safari);
      if (ios) {
        setPwaGuideTab('ios');
      }
    }

    checkStandalone();
    checkDevice();

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
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
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const safari = ios && !/crios|fxios|opios|mercury/.test(userAgent) && /safari/.test(userAgent);
    
    if (ios && safari && !isStandaloneMode && !iosDismissed) {
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

  const triggerInstallFlow = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        localStorage.setItem('gym_pwa_dismissed', 'true');
        setShowInstallPrompt(false);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallPrompt(true);
    }
  };

  // Pricing calculations
  const planData = {
    '1': { name: 'Growth Trial Plan', price: 299, desc: 'Ideal for small gyms starting out' },
    '3': { name: 'Growth Elite Plan', price: 699, desc: 'Best value for active gyms' },
    '12': { name: 'Growth Premium Plan', price: 2499, desc: 'Unlimited scaling for empires' }
  };
  const activePlan = planData[selectedDuration];
  const originalPrice = activePlan.price;
  const computedDiscount = promoApplied ? originalPrice : 0;
  const netTotal = originalPrice - computedDiscount;

  const handleApplyPromo = (e) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (cleanCode === 'GYMIX1FREE' || cleanCode === 'GYMOS1FREE') {
      // Auto-switch to 1-Month growth tier if not already selected
      if (selectedDuration !== '1') {
        setSelectedDuration('1');
      }
      setPromoApplied(true);
      setCodeError('');
      setPromoSuccessMsg(`Promo code "${cleanCode}" Applied! You unlocked 1 Month 100% Free!`);
      setShowVoucherSuccessEffect(true);
      setTimeout(() => setShowVoucherSuccessEffect(false), 5000);
    } else {
      setCodeError('Invalid promo code. Try "GYMIX1FREE"');
    }
  };

  const handleRemovePromo = () => {
    setPromoApplied(false);
    setInputCode('');
    setCodeError('');
    setPromoSuccessMsg('');
  };

  // Simulated Scanner function
  const runScannerDemo = () => {
    if (isScanning) return;
    setIsScanning(true);
    setScanSuccess(false);
    setScannedUser(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      // Grab a random active user to scan
      const activeOnes = mockMembers.filter(m => m.active);
      const randomUser = activeOnes[Math.floor(Math.random() * activeOnes.length)];
      setScannedUser(randomUser);
      
      // Auto reset success screen
      setTimeout(() => {
        setScanSuccess(false);
        setScannedUser(null);
      }, 5000);
    }, 1800);
  };

  // Simulate collecting a custom cash payment in tab
  const addSimulatedInvoice = () => {
    const names = ['Rahul Sen', 'Karan Johar', 'Neha Gupta', 'Vikram Malhotra'];
    const selectedName = names[Math.floor(Math.random() * names.length)];
    const prices = ['₹299', '₹699', '₹2,499'];
    const chosenPrice = prices[Math.floor(Math.random() * prices.length)];
    const isPaid = Math.random() > 0.35;
    
    const newInvoice = {
      id: `INV-2026-00${mockInvoices.length + 5}`,
      name: selectedName,
      amount: chosenPrice,
      method: isPaid ? 'UPI' : 'Cash',
      date: 'May 25',
      status: isPaid ? 'Paid' : 'Unpaid'
    };
    
    setMockInvoices([newInvoice, ...mockInvoices]);
  };

  // Toggle member status dynamically
  const toggleMemberStatus = (id) => {
    setMockMembers(prev => prev.map(m => {
      if (m.id === id) {
        return { ...m, active: !m.active };
      }
      return m;
    }));
  };

  const filteredMembers = mockMembers.filter(m => 
    m.name.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // FAQ Data
  const faqData = [
    {
      q: "What exactly is Gymix?",
      a: "Gymix is an ultra-modern platform engineered specifically to help gym owners manage membership cards, subscription renewals, automated payments, QR scanner entry gates, and messaging alert campaigns. It acts as the command center for your entire physical workspace."
    },
    {
      q: "How does the standalone PWA installation work?",
      a: "Unlike heavy mobile apps on traditional app stores, our Progressive Web App (PWA) installs instantly through your browser. On Android/Chrome, tap 'Install Now' inside our guide banner. On iOS/Safari, simply tap the browser 'Share' sheet and select 'Add to Home Screen'. This occupies zero bloat storage and loads offline at lightning speeds."
    },
    {
      q: "How does the Interactive Scanner Gate system integrate?",
      a: "Gymix features built-in QR scanner views. You can mount any tablet or low-cost smartphone at your gym's entrance turnstile or front desk. Members scan their digital QR membership card directly to automatically validate check-ins and log attendance in your owner dashboard instantly."
    },
    {
      q: "Can I cancel my operational growth cycle plan at any time?",
      a: "Absolutely. There are zero locked contracts or surprise hidden developer fees. You can modify, upgrade, or cancel your gym operational subscription whenever you choose, and easily download a clean, complete Excel/CSV database backup of all member records."
    },
    {
      q: "How do I claim the 1 Month Free Trial?",
      a: "Claiming early access is effortless! Choose the 1 Month Plan in our Pricing calculator, enter the elite promo code 'GYMIX1FREE' in the voucher box, and watch your total instantly calculate to ₹0. Create your administrative account to lock in lifetime access rates."
    }
  ];

  // Helper variables for navigation
  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#090C10] text-slate-100 overflow-x-hidden selection:bg-[#863BFF]/30 font-sans relative">
      
      {/* Background radiant glowing effects */}
      <div className="absolute top-[-100px] left-[5%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-[#863BFF]/8 blur-[100px] md:blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#10B981]/6 blur-[90px] md:blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[15%] w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-[#863BFF]/5 blur-[120px] md:blur-[150px] rounded-full pointer-events-none" />

      {/* Futuristic subtle matrix/grid lines decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none mask-image-[radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      {/* ── STICKY GLASSMORPHIC NAVBAR ── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-[#090C10]/75 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative group">
              <div className="absolute inset-0 bg-[#863BFF]/50 blur-md rounded-xl opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
              <Logo className="w-9 h-9 sm:w-10 sm:h-10 relative z-10 text-white drop-shadow-[0_0_10px_rgba(134,59,255,0.5)]" />
            </div>
            <span className="font-black text-white text-base sm:text-lg md:text-xl tracking-tighter uppercase italic">
              GYMIX <span className="text-[#863BFF] drop-shadow-[0_0_8px_rgba(134,59,255,0.6)]">.FIT</span>
            </span>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-black uppercase tracking-wider text-slate-400">
            <button onClick={() => scrollToId('features')} className="hover:text-white transition-colors">Core Features</button>
            <button onClick={() => scrollToId('simulator')} className="hover:text-white transition-colors">Interactive Demo</button>
            <button onClick={() => scrollToId('pwa-installer')} className="hover:text-white transition-colors">PWA Mobile</button>
            <button onClick={() => scrollToId('hardware-store')} className="hover:text-white transition-colors">Hardware Store</button>
            <button onClick={() => scrollToId('roadmap')} className="hover:text-white transition-colors">Technological Roadmap</button>
            <button onClick={() => scrollToId('pricing')} className="hover:text-white transition-colors">Pricing Calculator</button>
            <button onClick={() => scrollToId('faq')} className="hover:text-slate-200 transition-colors">FAQ</button>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Direct header PWA installer indicator if installable */}
            {deferredPrompt && (
              <button 
                onClick={handleInstallClick}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider text-[#10B981] bg-[#10B981]/15 border border-[#10B981]/25 hover:bg-[#10B981]/25 rounded-xl transition-all duration-300"
              >
                <Download className="w-3.5 h-3.5" />
                Install OS
              </button>
            )}

            <button 
              onClick={() => navigate('/login')} 
              className="text-xs font-black uppercase tracking-wider text-slate-300 hover:text-[#863BFF] transition-all duration-200 px-3 py-2 whitespace-nowrap"
            >
              Sign In
            </button>

            <button 
              onClick={() => {
                setSelectedDuration('1');
                setPromoApplied(true);
                scrollToId('pricing');
              }} 
              className="hidden sm:flex px-4.5 py-2.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#863BFF] to-[#601bdf] hover:from-[#9c5eff] hover:to-[#863BFF] text-white shadow-lg shadow-[#863BFF]/20 rounded-xl transition-all duration-300 items-center gap-1.5 hover:scale-105 active:scale-95 border border-[#863BFF]/30"
            >
              Claim 1 Month Free
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Mobile Burger Menu Button */}
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE SLIDE-OUT DRAWER ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Overlay backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Sliding Panel */}
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-[#090C10]/95 backdrop-blur-2xl border-l border-white/5 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Logo className="w-8 h-8 text-white" />
                    <span className="font-black text-white text-sm tracking-tighter uppercase italic">
                      GYMIX <span className="text-[#863BFF]">.FIT</span>
                    </span>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 hover:bg-white/10"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div className="flex flex-col gap-4 mt-8">
                  {[
                    { label: 'Core Features', target: 'features' },
                    { label: 'Interactive Demo', target: 'simulator' },
                    { label: 'PWA Mobile App', target: 'pwa-installer' },
                    { label: 'Hardware Store', target: 'hardware-store' },
                    { label: 'Technological Roadmap', target: 'roadmap' },
                    { label: 'Pricing Calculator', target: 'pricing' },
                    { label: 'Frequently Asked Questions', target: 'faq' }
                  ].map((link, index) => (
                    <button
                      key={index}
                      onClick={() => scrollToId(link.target)}
                      className="text-left py-2.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-white/5">
                {deferredPrompt && (
                  <button
                    onClick={() => {
                      handleInstallClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full py-3.5 bg-[#10B981]/10 border border-[#10B981]/20 hover:bg-[#10B981]/25 text-[#10B981] text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Install Standing PWA
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setSelectedDuration('1');
                    setPromoApplied(true);
                    scrollToId('pricing');
                  }}
                  className="w-full py-3.5 bg-gradient-to-r from-[#863BFF] to-[#601bdf] hover:from-[#9c5eff] hover:to-[#863BFF] text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#863BFF]/10 text-center block border border-[#863BFF]/20"
                >
                  Get 1 Month Free
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CINEMATIC HERO SECTION ── */}
      <section className="relative pt-10 pb-20 md:pt-20 md:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        {/* Promotion Pill */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#863BFF]/10 border border-[#863BFF]/25 text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-[#863BFF] mb-8 relative group"
        >
          <div className="absolute inset-0 bg-[#863BFF]/5 rounded-full blur-md opacity-75 animate-pulse" />
          <Sparkles className="w-3.5 h-3.5 relative z-10 animate-spin" style={{ animationDuration: '6s' }} />
          <span className="relative z-10 text-white">LIMITED OFFER:</span> 
          <span className="relative z-10 text-[#10B981] animate-pulse">1 MONTH FREE TRIAL</span>
        </motion.div>

        {/* Hero Title Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] tracking-tight uppercase italic max-w-5xl py-2"
        >
          UNLEASH YOUR <br className="hidden sm:inline" />
          GYM'S <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#863BFF] via-[#a87cff] to-[#10B981] drop-shadow-[0_0_30px_rgba(134,59,255,0.2)]">REVENUE</span> POTENTIAL
        </motion.h1>

        {/* Description Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-slate-400 text-sm sm:text-base md:text-lg lg:text-xl font-semibold max-w-3xl mt-6 sm:mt-8 leading-relaxed px-4"
        >
          The next-generation operating system engineered exclusively for growth-oriented gym owners. 
          Automate billing cycles, enable QR check-in barriers, send WhatsApp reminders, and watch metrics scale instantly.
        </motion.p>

        {/* Actions Button Row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 sm:mt-10 w-full px-4 sm:w-auto"
        >
          <button
            onClick={() => {
              setSelectedDuration('1');
              setPromoApplied(true);
              scrollToId('pricing');
            }}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#863BFF] to-[#601bdf] hover:from-[#9c5eff] hover:to-[#863BFF] text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#863BFF]/25 transition-all duration-300 hover:scale-[1.03] active:scale-95 flex items-center justify-center gap-2.5 border border-[#863BFF]/30 cursor-pointer"
          >
            Get 1 Month Free Access
            <ArrowRight className="w-4 h-4 text-white" />
          </button>
          
          <button
            onClick={() => scrollToId('simulator')}
            className="w-full sm:w-auto px-8 py-4 bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 hover:border-white/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            Explore Dashboard Simulator
          </button>
        </motion.div>

        {/* Dynamic Metric Numbers (Staggered hover animation) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl mt-16 sm:mt-24 p-6 sm:p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 backdrop-blur-md relative z-10"
        >
          {[
            { label: 'Gym Owners Active', value: '109+', desc: 'Engineered across major fitness zones', glow: 'text-[#863BFF]' },
            { label: 'Annual Revenue Monitored', value: '₹4.2 Crore+', desc: 'Secured via instant direct invoices', glow: 'text-white' },
            { label: 'Active Gym Check-Ins', value: '21K+', desc: 'Logged through contactless scanning', glow: 'text-[#10B981]' },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1 relative px-4 py-2 group">
              {i > 0 && <div className="hidden sm:block absolute left-0 top-[20%] bottom-[20%] w-[1px] bg-white/10" />}
              <p className={`text-3xl sm:text-4xl font-black tracking-tighter ${stat.glow} transition-transform group-hover:scale-105 duration-300`}>
                {stat.value}
              </p>
              <p className="text-white text-xs font-black uppercase tracking-wide leading-none pt-1">{stat.label}</p>
              <p className="text-slate-500 text-[10px] font-bold leading-normal pt-1">{stat.desc}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── INTERACTIVE ECOSYSTEM SIMULATOR (DASHBOARD DEMO WIDGET) ── */}
      <section id="simulator" className="py-20 md:py-28 border-y border-white/5 bg-[#0C0E13] relative overflow-hidden">
        <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-[#863BFF]/4 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header text */}
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <span className="text-[#863BFF] text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#863BFF]" />
              Live Interactive Widget
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
              EXPLORE THE ECOSYSTEM SIMULATOR
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-2xl mx-auto leading-relaxed">
              Click the interactive module selector tabs below. Watch how beautifully simple the Gymix operational panels represent information for members, instant payments, automatic entrance gates, and growth statistics.
            </p>
          </div>

          {/* Simulator Card Box Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch max-w-6xl mx-auto">
            
            {/* Left Side Tab Controls (Col-span 4) */}
            <div className="lg:col-span-4 flex flex-row lg:flex-col justify-start gap-3 overflow-x-auto pb-4 lg:pb-0 scrollbar-none snap-x whitespace-nowrap">
              {[
                { id: 'members', title: 'Member Records', sub: 'Control active memberships', icon: Users, color: '#863BFF' },
                { id: 'payments', title: 'Invoices Ledger', sub: 'Collect cash & UPI receipts', icon: CreditCard, color: '#10B981' },
                { id: 'scanner', title: 'Entrance Scanner', sub: 'Simulate automated gates', icon: QrCode, color: '#3b82f6' },
                { id: 'analytics', title: 'Growth Metrics', sub: 'Predict MRR & client churn', icon: TrendingUp, color: '#ec4899' }
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = activeDemoTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDemoTab(tab.id)}
                    className={`snap-center w-64 lg:w-full p-4.5 rounded-[1.75rem] text-left transition-all border flex items-center gap-4 cursor-pointer flex-shrink-0 ${
                      isSelected
                        ? 'bg-white/[0.04] border-white/10 shadow-lg shadow-[#000]/40'
                        : 'bg-transparent border-transparent hover:bg-white/[0.01]'
                    }`}
                  >
                    {/* Glowing Icon Base */}
                    <div 
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300"
                      style={{ 
                        backgroundColor: isSelected ? `${tab.color}15` : 'rgba(255,255,255,0.02)',
                        border: isSelected ? `1px solid ${tab.color}35` : '1px solid rgba(255,255,255,0.05)',
                      }}
                    >
                      <IconComponent 
                        className="w-5 h-5 transition-transform" 
                        style={{ color: isSelected ? tab.color : '#64748b' }}
                      />
                    </div>

                    <div className="min-w-0">
                      <p className={`text-xs font-black uppercase tracking-wider leading-none transition-colors ${
                        isSelected ? 'text-white' : 'text-slate-400'
                      }`}>
                        {tab.title}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold leading-normal pt-1.5 truncate">
                        {tab.sub}
                      </p>
                    </div>

                    {/* Desktop bullet active indicator */}
                    {isSelected && (
                      <motion.div 
                        layoutId="activeTabBullet"
                        className="hidden lg:block w-1.5 h-1.5 rounded-full ml-auto"
                        style={{ backgroundColor: tab.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Side Dashboard View Wrapper (Col-span 8) */}
            <div className="lg:col-span-8 glass-card bg-slate-950/70 border border-white/5 rounded-[2.5rem] p-5 sm:p-7 shadow-2xl relative flex flex-col min-h-[440px] justify-between overflow-hidden">
              
              {/* Fake Dashboard Top Header */}
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                  </div>
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-ping" />
                    SIMULATED ADMIN SYSTEM // GYMIX_FIT_V2
                  </span>
                </div>
                
                <span className="text-[9px] px-2.5 py-1 rounded-md bg-[#863BFF]/10 border border-[#863BFF]/20 text-[#863BFF] font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Activity className="w-3 h-3" /> Live Feed
                </span>
              </div>

              {/* Dynamic Viewport Container */}
              <div className="flex-1 py-6 flex flex-col justify-start relative">
                <AnimatePresence mode="wait">
                  {activeDemoTab === 'members' && (
                    <motion.div
                      key="members-demo"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Search and control bar */}
                      <div className="flex flex-col sm:flex-row gap-3 items-stretch justify-between">
                        <div className="relative flex-1">
                          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="text"
                            placeholder="Search active members by name..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-white/[0.02] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-[#863BFF] transition-all font-semibold"
                          />
                        </div>
                        <div className="px-3.5 py-2 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] text-slate-400 font-black uppercase tracking-widest flex items-center justify-between gap-2.5">
                          <span>Total Tracked:</span>
                          <span className="text-white bg-[#863BFF]/25 px-1.5 py-0.5 rounded-md border border-[#863BFF]/30">{filteredMembers.length} Members</span>
                        </div>
                      </div>

                      {/* Members ledger table wrapper */}
                      <div className="overflow-x-auto">
                        <div className="min-w-[450px] space-y-2.5 pr-2">
                          {filteredMembers.length > 0 ? (
                            filteredMembers.map((member) => (
                              <div
                                key={member.id}
                                className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-black text-white border border-white/5">
                                    {member.avatar}
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-white">{member.name}</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{member.plan}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-5">
                                  <div className="text-right">
                                    <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">Checked-in</p>
                                    <p className="text-[10px] text-slate-400 font-bold">{member.checkedIn}</p>
                                  </div>
                                  
                                  {/* Interactive Action: Toggle status onClick */}
                                  <button
                                    onClick={() => toggleMemberStatus(member.id)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                                      member.active
                                        ? 'bg-[#10B981]/15 border-[#10B981]/25 text-[#10B981] hover:bg-[#10B981]/25'
                                        : 'bg-red-500/15 border-red-500/25 text-red-400 hover:bg-red-500/25'
                                    }`}
                                    title="Click to toggle status"
                                  >
                                    {member.active ? 'Active' : 'Expired'}
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-xs text-slate-500 font-bold uppercase">No members match search query</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-400 leading-normal">
                        <Info className="w-4 h-4 text-[#863BFF] flex-shrink-0" />
                        <p><strong>Interactive tip:</strong> Try typing in the search box to filter records, or click the <strong>Active/Expired</strong> pills to instantly toggle their simulated membership statuses!</p>
                      </div>
                    </motion.div>
                  )}

                  {activeDemoTab === 'payments' && (
                    <motion.div
                      key="payments-demo"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      {/* Controls header */}
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-white uppercase tracking-wider">Operational Transactions Ledger</h4>
                          <p className="text-[10px] text-slate-500">Live subscription logs & cash flow recordings</p>
                        </div>

                        <button
                          onClick={addSimulatedInvoice}
                          className="px-4 py-2 bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-[#10B981]/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Simulate Payment
                        </button>
                      </div>

                      {/* Invoice Rows list */}
                      <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                        {mockInvoices.map((invoice, index) => (
                          <motion.div
                            key={invoice.id}
                            initial={index === 0 ? { opacity: 0, x: -10 } : false}
                            animate={{ opacity: 1, x: 0 }}
                            className="p-3 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between hover:bg-white/[0.02]"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-[#10B981]" />
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white">{invoice.name}</h4>
                                <div className="flex items-center gap-2 pt-0.5">
                                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{invoice.id}</span>
                                  <span className="text-[8px] text-slate-600">•</span>
                                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{invoice.date}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-xs font-black text-white">{invoice.amount}</p>
                                <p className="text-[8px] text-slate-500 font-semibold uppercase tracking-wider">{invoice.method} billing</p>
                              </div>
                              
                              <span className={`px-2.5 py-1 rounded-md text-[8px] font-black uppercase tracking-wider border ${
                                invoice.status === 'Paid'
                                  ? 'bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]'
                                  : 'bg-yellow-500/10 border-yellow-500/25 text-yellow-400'
                              }`}>
                                {invoice.status}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] text-slate-400">
                        <Info className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                        <p><strong>Interactive tip:</strong> Click the <strong>Simulate Payment</strong> button to record a brand-new mock invoice in the database stream in real-time!</p>
                      </div>
                    </motion.div>
                  )}

                  {activeDemoTab === 'scanner' && (
                    <motion.div
                      key="scanner-demo"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="grid grid-cols-1 md:grid-cols-2 gap-6"
                    >
                      {/* Left: scanner camera viewfinder mockup */}
                      <div className="p-4 rounded-3xl bg-black/60 border border-white/5 flex flex-col items-center justify-between relative overflow-hidden min-h-[220px]">
                        {/* Neon Scan border */}
                        <div className={`absolute inset-0 border-2 transition-all duration-300 pointer-events-none rounded-3xl ${
                          isScanning 
                            ? 'border-blue-500/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.2)]'
                            : scanSuccess
                              ? 'border-[#10B981]/50 shadow-[inset_0_0_20px_rgba(16,185,129,0.2)]'
                              : 'border-white/5'
                        }`} />

                        {/* Top viewfinder text */}
                        <div className="w-full flex items-center justify-between relative z-10">
                          <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${isScanning ? 'bg-blue-500 animate-ping' : 'bg-red-500'}`} />
                            SCANNER_CAMERA_ONLINE
                          </span>
                          <span className="text-[8px] text-slate-600 font-bold uppercase">1080P // AUTOFOCUS</span>
                        </div>

                        {/* Middle Viewfinder target overlay */}
                        <div className="relative my-4 flex items-center justify-center">
                          <QrCode className={`w-20 h-20 transition-all ${
                            isScanning 
                              ? 'text-blue-500/40 scale-105 blur-[0.5px]' 
                              : scanSuccess 
                                ? 'text-[#10B981]/50 scale-100'
                                : 'text-slate-700'
                          }`} />
                          
                          {/* Holographic Laser Bar */}
                          {isScanning && (
                            <motion.div
                              initial={{ y: -45 }}
                              animate={{ y: 45 }}
                              transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.8 }}
                              className="absolute left-[-15px] right-[-15px] h-0.5 bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                            />
                          )}
                          
                          {/* Checkmark overlay upon success */}
                          {scanSuccess && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute p-2.5 rounded-full bg-[#10B981] text-black border border-emerald-400/40"
                            >
                              <Check className="w-6 h-6 stroke-[3]" />
                            </motion.div>
                          )}
                        </div>

                        {/* Bottom action trigger */}
                        <button
                          onClick={runScannerDemo}
                          disabled={isScanning}
                          className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all relative z-10 flex items-center justify-center gap-1.5 cursor-pointer text-white"
                        >
                          <QrCode className="w-3.5 h-3.5 text-blue-400" />
                          {isScanning ? 'Scanning Card...' : 'Scan Member Check-In'}
                        </button>
                      </div>

                      {/* Right: scan verification feedback console */}
                      <div className="p-4 rounded-3xl bg-white/[0.01] border border-white/5 flex flex-col justify-between min-h-[220px]">
                        <div>
                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest pb-3 border-b border-white/5">Gate Authentication status</p>
                          
                          <div className="pt-4 flex flex-col items-center text-center justify-center h-full">
                            {isScanning ? (
                              <div className="space-y-2 py-4">
                                <div className="w-8 h-8 rounded-full border-2 border-slate-600 border-t-blue-500 animate-spin mx-auto" />
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Decoding biometric credentials...</p>
                              </div>
                            ) : scanSuccess && scannedUser ? (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-3 w-full"
                              >
                                <div className="w-12 h-12 rounded-full bg-[#10B981]/15 border border-[#10B981]/30 flex items-center justify-center text-sm font-black text-[#10B981] mx-auto">
                                  {scannedUser.avatar}
                                </div>
                                
                                <div className="space-y-1">
                                  <h4 className="text-sm font-black text-white leading-none">{scannedUser.name}</h4>
                                  <p className="text-[9px] text-[#10B981] font-black uppercase tracking-wider">{scannedUser.plan}</p>
                                </div>

                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[8px] font-black uppercase tracking-widest text-[#10B981]">
                                  <ShieldCheck className="w-3.5 h-3.5" /> ACCESS GRANTED
                                </div>
                              </motion.div>
                            ) : (
                              <div className="space-y-2 py-6">
                                <Lock className="w-8 h-8 text-slate-700 mx-auto" />
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Scanner Gate Idle</p>
                                <p className="text-[9px] text-slate-600 leading-normal font-semibold max-w-xs mx-auto">Trigger the scan simulation simulator to verify attendance database log actions.</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {scanSuccess && (
                          <p className="text-[8px] text-[#10B981] font-bold text-center leading-none">✓ Check-in successfully compiled inside dashboard lists!</p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeDemoTab === 'analytics' && (
                    <motion.div
                      key="analytics-demo"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6 animate-fade-in"
                    >
                      {/* Top metric blocks */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { title: 'Est. Monthly Revenue', value: '₹1,84,500', trend: '+12.3%', color: 'text-emerald-400' },
                          { title: 'Check-ins (Today)', value: '242 Members', trend: 'Peak Hour Now', color: 'text-blue-400' },
                          { title: 'Client Retention Rate', value: '94.2%', trend: 'Elite operational tier', color: 'text-pink-400' }
                        ].map((metric, i) => (
                          <div key={i} className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 space-y-1">
                            <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">{metric.title}</span>
                            <p className="text-base font-black text-white">{metric.value}</p>
                            <p className={`text-[8px] font-black uppercase tracking-wider ${metric.color}`}>{metric.trend}</p>
                          </div>
                        ))}
                      </div>

                      {/* Growth chart visual simulation */}
                      <div className="p-4 rounded-3xl bg-white/[0.01] border border-white/5 h-44 flex flex-col justify-between">
                        <div className="flex justify-between items-center pb-2">
                          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Monthly Growth Curves (₹)</span>
                          <span className="text-[8px] text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">Fiscal Year 2026</span>
                        </div>
                        
                        {/* Bar graph bars */}
                        <div className="flex-1 flex items-end gap-2.5 sm:gap-4 px-2 pt-4">
                          {[
                            { month: 'Oct', h: '35%' },
                            { month: 'Nov', h: '45%' },
                            { month: 'Dec', h: '30%' },
                            { month: 'Jan', h: '55%' },
                            { month: 'Feb', h: '70%' },
                            { month: 'Mar', h: '60%' },
                            { month: 'Apr', h: '80%' },
                            { month: 'May', h: '95%' }
                          ].map((item, index) => (
                            <div key={index} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: item.h }}
                                transition={{ duration: 1.2, ease: 'easeOut', delay: index * 0.05 }}
                                className={`w-full rounded-t-md transition-all duration-300 relative group cursor-pointer ${
                                  index === 7
                                    ? 'bg-gradient-to-t from-[#863BFF] to-[#b18eff] shadow-[0_0_12px_rgba(134,59,255,0.4)]'
                                    : 'bg-white/10 hover:bg-[#863BFF]/30'
                                }`}
                              >
                                {/* Tooltip on hover */}
                                <div className="absolute top-[-25px] left-1/2 -translate-x-1/2 bg-black/80 text-[7px] font-black text-white px-1 py-0.5 rounded border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {item.h}
                                </div>
                              </motion.div>
                              <span className="text-[8px] text-slate-500 font-black uppercase">{item.month}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Fake Dashboard Bottom Bar Status */}
              <div className="pt-4 border-t border-white/5 flex items-center justify-between text-[8px] text-slate-500 font-bold uppercase tracking-wider mt-4">
                <span>SQL SERVER: CLOUD_SECURE</span>
                <span>JWT ENCRYPTION SYNCED</span>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ── STANDALONE PWA INSTALLATION MODULE ── */}
      <section id="pwa-installer" className="py-20 md:py-28 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-r from-[#863BFF]/3 to-[#10B981]/3 rounded-[3.5rem] blur-2xl pointer-events-none" />
        
        {/* Core Layout Box */}
        <div className="glass-card border border-white/5 rounded-[3rem] p-6 sm:p-10 lg:p-14 bg-white/[0.01] relative overflow-hidden flex flex-col lg:flex-row items-stretch justify-between gap-12">
          
          <div className="absolute top-[-50px] right-[-50px] w-80 h-80 bg-[#10B981]/4 blur-[100px] rounded-full pointer-events-none" />
          
          {/* Left Text & Toggles */}
          <div className="flex-1 flex flex-col justify-between space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[10px] font-black uppercase tracking-widest text-[#10B981] relative">
                <Smartphone className="w-3.5 h-3.5 text-[#10B981]" />
                Progressive Web App
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.05]">
                STANDALONE PWA APPLIANCE
              </h2>
              
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed font-semibold max-w-xl">
                Install Gymix instantly as a lightweight, supercharged app directly on your iPhone, Android dashboard, or desktop system. 
                Enjoy ultra-rapid startup times, zero app store updates, minimal battery drag, and automatic instant push announcements.
              </p>
            </div>

            {/* Guide Platform Toggle selector tabs */}
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Choose your device platform instructions:</p>
              
              <div className="flex gap-2.5">
                <button
                  onClick={() => setPwaGuideTab('android')}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
                    pwaGuideTab === 'android'
                      ? 'bg-white/5 border-white/10 text-[#10B981]'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Android / Chrome OS
                </button>
                
                <button
                  onClick={() => setPwaGuideTab('ios')}
                  className={`px-4.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all border flex items-center gap-2 cursor-pointer ${
                    pwaGuideTab === 'ios'
                      ? 'bg-white/5 border-white/10 text-[#863BFF]'
                      : 'bg-transparent border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Share className="w-4 h-4 text-[#863BFF]" />
                  iOS / Apple Safari
                </button>
              </div>
            </div>
          </div>

          {/* Right Platform Step Guides representation */}
          <div className="w-full lg:w-[460px] flex-shrink-0 flex flex-col justify-center">
            <div className="p-6 rounded-[2.5rem] bg-black/50 border border-white/5 backdrop-blur-xl relative">
              
              {/* Dynamic steps showing based on toggle */}
              <AnimatePresence mode="wait">
                {pwaGuideTab === 'android' ? (
                  <motion.div
                    key="android-steps"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5.5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#10B981]">Chrome direct installation</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase">Standard Engine</span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { step: '1', title: 'Trigger Install Prompt', desc: 'Tap the "Install Standalone OS" button below or click the trigger inside your navigation bar header.' },
                        { step: '2', title: 'Confirm Chrome Action', desc: 'In the system popup prompt that appears on your screen, click the green "Install" button.' },
                        { step: '3', title: 'Access Mobile Grid', desc: 'The Gymix icon compiles on your home screen grid. Launch it to run fullscreen with total speed.' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 border border-[#10B981]/25 flex items-center justify-center text-[#10B981] text-xs font-black flex-shrink-0">
                            {item.step}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">{item.title}</h4>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-1">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={triggerInstallFlow}
                        className="flex-1 py-3.5 bg-gradient-to-r from-[#10B981] to-[#0d9466] hover:from-[#1bc58c] hover:to-[#10B981] text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#10B981]/15 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Install Standalone OS
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="ios-steps"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5.5"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#863BFF]">Safari manual installation</span>
                      <span className="text-[8px] text-slate-500 font-bold uppercase">Apple iOS Core</span>
                    </div>

                    <div className="space-y-4">
                      {[
                        { step: '1', title: 'Open in Native Safari', desc: 'Launch Safari browser on your iPhone or iPad and navigate to our platform URL.' },
                        { step: '2', title: 'Tap browser share icon', desc: 'Tap the rectangular "Share" button situated on the bottom system navigation panel of your device screen.' },
                        { step: '3', title: 'Add to Home Screen', desc: 'Scroll down the Safari action list and select "Add to Home Screen" with the square plus icon.' }
                      ].map((item, idx) => (
                        <div key={idx} className="flex gap-4">
                          <div className="w-7 h-7 rounded-lg bg-[#863BFF]/15 border border-[#863BFF]/25 flex items-center justify-center text-[#863BFF] text-xs font-black flex-shrink-0">
                            {item.step}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">{item.title}</h4>
                            <p className="text-[11px] text-slate-400 font-medium leading-relaxed pt-1">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex gap-2 items-center bg-[#863BFF]/5 p-3 rounded-2xl border-[#863BFF]/10 text-[10px] text-slate-400 leading-normal">
                      <Info className="w-4 h-4 text-[#863BFF] flex-shrink-0" />
                      <p><strong>iOS Notice:</strong> Apple Safari restricts direct script installation triggers. Follow the physical share manual steps detailed above to add Gymix.fit successfully!</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

        </div>
      </section>

      {/* ── CORE FEATURES LISTING ── */}
      <section id="features" className="py-20 md:py-28 border-t border-white/5 bg-[#090C10] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Title header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <span className="text-[#10B981] text-[10px] font-black uppercase tracking-[0.3em]">
              Gym Operational Command
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
              BUILT FOR ULTIMATE GYM EFFICIENCY
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-xl mx-auto leading-relaxed">
              Consolidate spreadsheets, check-in registries, and invoice ledgers. Gymix manages every core structural asset so you can focus entirely on training members.
            </p>
          </div>

          {/* Features Grid column (Collapsible responsive grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6.5 mt-12">
            {[
              {
                icon: Users,
                title: 'Premium Member Hub',
                desc: 'Access client folders with complete contact logs, photo ID catalogs, subscription timelines, active/expired signals, and emergency health notes.',
                glow: 'group-hover:text-[#863BFF] bg-[#863BFF]/10 border-[#863BFF]/20 hover:border-[#863BFF]/45',
                tag: 'Active Module'
              },
              {
                icon: CreditCard,
                title: 'Seamless Payments',
                desc: 'Record cash transactions or direct client UPI transfers. Instantly log billing events, generate custom digital PDF receipts, and track tax reports.',
                glow: 'group-hover:text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20 hover:border-[#10B981]/45',
                tag: 'Active Module'
              },
              {
                icon: Activity,
                title: 'Dynamic Renewals',
                desc: 'Create highly customizable plans, group coaching packs, or daily guest passes. The platform tracks expirations and alerts you automatically.',
                glow: 'group-hover:text-blue-400 bg-blue-500/10 border-blue-500/20 hover:border-blue-500/45',
                tag: 'Active Module'
              },
              {
                icon: MessageSquare,
                title: 'Broadcast Blaster',
                desc: 'Draft alerts, holiday bulletins, or special promotion codes. Broadcast them to your entire member directory via email notification instantly.',
                glow: 'group-hover:text-pink-400 bg-pink-500/10 border-pink-500/20 hover:border-pink-500/45',
                tag: 'Active Module'
              }
            ].map((feat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass-card border border-white/5 rounded-[2.5rem] p-6.5 flex flex-col justify-between hover:-translate-y-2 transition-all duration-300 relative group overflow-hidden bg-white/[0.01]"
              >
                {/* Visual Glow background on card hover */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                <div className="space-y-5 relative z-10">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${feat.glow}`}>
                    <feat.icon className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white uppercase italic tracking-tight">{feat.title}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-semibold">{feat.desc}</p>
                </div>

                <div className="pt-6 relative z-10 flex items-center justify-between border-t border-white/5 mt-5">
                  <span className="text-[9px] font-black uppercase text-[#10B981] group-hover:translate-x-1.5 transition-transform inline-flex items-center gap-1">
                    Live System Code
                    <ArrowRight className="w-3 h-3" />
                  </span>
                  <span className="text-[8px] text-slate-500 font-bold uppercase">{feat.tag}</span>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── FUTURISTIC TECHNOLOGICAL ROADMAP ── */}
      <section id="roadmap" className="py-20 md:py-28 border-t border-white/5 relative overflow-hidden bg-[#0C0E13]">
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-[#863BFF]/4 blur-[130px] rounded-full pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Header section with tag */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 pb-10 border-b border-white/5">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[#863BFF] text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#863BFF] animate-pulse" />
                Next-Gen Integrations
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
                OS TECHNOLOGICAL ROADMAP
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed">
                We build relentlessly. The upcoming advanced core hardware and software integrations detailed below will deploy automatically to all operational gym owners for free during their plan cycles.
              </p>
            </div>
            
            <div className="px-4.5 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-[10px] font-black uppercase text-slate-300 tracking-widest whitespace-nowrap">
              Release Phase: 2026 Grid
            </div>
          </div>

          {/* Timeline Grid (Vertical layout on mobile, 4 column grid on desktop) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6.5 mt-16 relative">
            
            {[
              {
                quarter: 'Q2 2026',
                title: 'AI Face Gate Scan Barriers',
                desc: 'Connect advanced facial recognition turnstiles directly into the OS. Auto unlock gym entrance locks once an active member profile scans successfully.',
                icon: QrCode,
                status: 'Beta Testing',
                statusColor: 'text-[#863BFF] bg-[#863BFF]/10 border-[#863BFF]/20',
                border: 'hover:border-[#863BFF]/30'
              },
              {
                quarter: 'Q3 2026',
                title: 'WhatsApp Automation Dispatch',
                desc: 'Deploy instant official WhatsApp messages with transaction details, monthly PDF receipts, and renewal countdowns without sending manually.',
                icon: MessageSquare,
                status: 'Active Dev',
                statusColor: 'text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20',
                border: 'hover:border-[#10B981]/30'
              },
              {
                quarter: 'Q4 2026',
                title: 'Predictive Revenue Analytics',
                desc: 'Identify cash flow curves with custom machine learning. Get dashboard triggers identifying potential client renewal dropouts 14 days early.',
                icon: BarChart3,
                status: 'Prototyping',
                statusColor: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                border: 'hover:border-blue-500/30'
              },
              {
                quarter: 'Q1 2027',
                title: 'Diet & Workout Portal',
                desc: 'Provide added member incentives. Coaches build custom calorie splits, macros target sheets, and heavy workout tracking tables for client mobile view.',
                icon: Activity,
                status: 'Design Phase',
                statusColor: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
                border: 'hover:border-pink-500/30'
              }
            ].map((node, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`glass-card bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 relative group ${node.border}`}
              >
                {/* Staggered connection lines on desktop */}
                {index < 3 && (
                  <div className="hidden lg:block absolute right-[-15px] top-1/2 -translate-y-1/2 w-8 h-[1px] bg-gradient-to-r from-white/10 to-transparent z-10 pointer-events-none" />
                )}

                <div className="space-y-6">
                  {/* Top Header Card Info */}
                  <div className="flex items-center justify-between pb-3 border-b border-white/5">
                    <span className="text-xs font-black text-white italic tracking-wider uppercase">{node.quarter}</span>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${node.statusColor}`}>
                      {node.status}
                    </span>
                  </div>

                  {/* Body Info */}
                  <div className="space-y-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 group-hover:scale-105 transition-transform duration-300">
                      <node.icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight">{node.title}</h3>
                    <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-semibold">{node.desc}</p>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-white/5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Operational Roadmap Node // 0{index + 1}</span>
                </div>
              </motion.div>
            ))}

          </div>
        </div>
      </section>

      {/* ── COMPATIBLE BIOMETRIC HARDWARE STORE ── */}
      <section id="hardware-store" className="py-20 md:py-28 border-t border-white/5 bg-[#090C10] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Headers */}
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <span className="text-[#10B981] text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-[#10B981]" />
              Official Hardware Partners
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
              COMPATIBLE HARDWARE STORE
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-2xl mx-auto leading-relaxed">
              Skip complex API setups. The biometric devices below are verified to run out of the box with Gymix's ADMS cloud push webhook integration. Click to buy directly on Amazon.
            </p>
          </div>

          {/* Hardware Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6.5 mt-12">
            {[
              {
                name: "eSSL Identix K30 Pro",
                badge: "Best Seller & Entry-Level",
                desc: "Extremely popular, cost-effective biometric scanner. Perfect for small to mid-sized gyms.",
                specs: [
                  "1,000 Fingerprint Capacity",
                  "1,000 RFID Card Storage",
                  "ADMS Cloud Webhook Ready",
                  "TCP/IP Network Interface"
                ],
                link: "https://amzn.to/49qHIBE",
                color: "from-[#10B981]/20 to-transparent",
                borderColor: "group-hover:border-[#10B981]/40",
                badgeColor: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20"
              },
              {
                name: "eSSL K90 Pro ADMS",
                badge: "Reliable Classic",
                desc: "Upgraded version of K90 with native cloud ADMS integration. Standard for Indian gyms.",
                specs: [
                  "800 Fingerprint Capacity",
                  "800 Card & Password Capacity",
                  "SSR Excel Report Engine",
                  "Optional Backup Battery Support"
                ],
                link: "https://www.amazon.in/s?k=essl+k90+pro+adms",
                color: "from-blue-500/10 to-transparent",
                borderColor: "group-hover:border-blue-500/30",
                badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20"
              },
              {
                name: "BioMax N-Col 700",
                badge: "Face + Fingerprint",
                desc: "High-speed face recognition and fingerprint attendance terminal, ideal for contact-free entry.",
                specs: [
                  "1,500 Face Templates",
                  "2,000 Fingerprint Capacity",
                  "TCP/IP & USB Host",
                  "Cloud Push Webhook Active"
                ],
                link: "https://www.amazon.in/s?k=biomax+n-col+700",
                color: "from-[#863BFF]/10 to-transparent",
                borderColor: "group-hover:border-[#863BFF]/30",
                badgeColor: "text-[#863BFF] bg-[#863BFF]/10 border-[#863BFF]/20"
              },
              {
                name: "Realtime T302 ADMS",
                badge: "Heavy Duty Capacity",
                desc: "Designed for high-traffic gym chains. Sturdy build with large verification capacity.",
                specs: [
                  "3,000 User Capacity",
                  "3,000 Card & Fingerprint",
                  "High-Speed ARM Processor",
                  "Native ADMS Push Support"
                ],
                link: "https://www.amazon.in/s?k=realtime+t302+adms",
                color: "from-pink-500/10 to-transparent",
                borderColor: "group-hover:border-pink-500/30",
                badgeColor: "text-pink-400 bg-pink-500/10 border-pink-500/20"
              }
            ].map((prod, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={`glass-card border border-white/5 rounded-[2.5rem] p-6.5 flex flex-col justify-between hover:-translate-y-2 transition-all duration-300 relative group overflow-hidden bg-white/[0.01]`}
              >
                {/* Neon glow effect */}
                <div className={`absolute inset-0 bg-gradient-to-tr ${prod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${prod.badgeColor}`}>
                      {prod.badge}
                    </span>
                    <Fingerprint className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                  </div>
                  
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight">{prod.name}</h3>
                    <p className="text-slate-400 text-[11px] leading-relaxed pt-1.5 font-medium">{prod.desc}</p>
                  </div>

                  {/* Specs List */}
                  <ul className="space-y-1.5 pt-2">
                    {prod.specs.map((spec, sIdx) => (
                      <li key={sIdx} className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-[#10B981]" />
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 relative z-10 flex flex-col gap-3 border-t border-white/5 mt-5">
                  <a
                    href={prod.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-white/5 hover:bg-[#10B981] hover:text-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 text-center flex items-center justify-center gap-1.5 border border-white/10 hover:border-[#10B981] cursor-pointer"
                  >
                    View on Amazon
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Affiliate Disclaimer Banner */}
          <div className="mt-12 p-5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-start gap-4 max-w-4xl mx-auto">
            <Info className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-400 font-semibold leading-relaxed">
              <span className="text-white font-bold">Affiliate Disclosure:</span> As an Amazon Associate, we earn a small commission from qualifying purchases made through these links. This has <span className="text-[#10B981] font-bold">zero extra cost</span> for you, and it directly helps us fund, maintain, and upgrade our cloud biometric integration servers. Thank you for your support! 💚
            </div>
          </div>

        </div>
      </section>

      {/* Confetti celebration shower for applying voucher successfully */}
      {showVoucherSuccessEffect && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[#10B981]/5 backdrop-blur-[1px] transition-all duration-500" />
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="p-8 rounded-[2.5rem] bg-[#090C10] border-2 border-[#10B981] shadow-[0_0_50px_rgba(16,185,129,0.3)] max-w-sm text-center relative z-50"
          >
            <div className="w-16 h-16 rounded-full bg-[#10B981]/15 border-2 border-[#10B981] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
            </div>
            <h3 className="text-xl font-black text-white uppercase italic">Voucher Activated!</h3>
            <p className="text-xs text-slate-300 font-semibold leading-relaxed mt-2.5">
              The promotional coupon code <strong className="text-[#10B981]">GYMIX1FREE</strong> has been applied to your checkout.
            </p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4">
              Order Total discounted to ₹0
            </p>
          </motion.div>
        </div>
      )}

      {/* ── INTERACTIVE PRICING ENGINE & ORDER SUMMARY CALCULATOR ── */}
      <section id="pricing" className="py-20 md:py-28 border-t border-white/5 bg-[#090C10] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section text headers */}
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-14">
            <span className="text-[#10B981] text-[10px] font-black uppercase tracking-[0.3em]">
              Checkout Engine
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
              PRICING CALCULATOR CARD
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-xl mx-auto leading-relaxed">
              Design your system access duration. Select a custom billing cycle below and watch the real-time order summary calculation update. Enter an elite promo coupon to claim your trial.
            </p>
          </div>

          {/* Checkout Grid Wrapper (Collapses beautifully on mobile, grid columns on desktop) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto mt-12">
            
            {/* Left: Interactive Duration Selectors (Col-span 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#10B981]" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Choose Duration billing</h3>
              </div>

              {/* Selector Option cards */}
              <div className="space-y-4.5">
                
                {/* 1 Month Option */}
                <div 
                  onClick={() => {
                    setSelectedDuration('1');
                    setPromoApplied(false);
                    setCodeError('');
                  }}
                  className={`p-5.5 rounded-[2rem] cursor-pointer transition-all border flex items-center justify-between relative overflow-hidden group ${
                    selectedDuration === '1'
                      ? 'bg-white/[0.03] border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                      : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                  }`}
                >
                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Growth Starter</span>
                    <h4 className="text-lg sm:text-xl font-black text-white italic uppercase">1 Month Access</h4>
                    <p className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider">Eligible for voucher GYMIX1FREE</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl sm:text-3xl font-black text-white">₹299</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none pt-1">Charged Monthly</p>
                  </div>
                </div>

                {/* 3 Months Option (Launch Favorite) */}
                <div 
                  onClick={() => {
                    setSelectedDuration('3');
                    setPromoApplied(false);
                    setCodeError('');
                  }}
                  className={`p-5.5 rounded-[2rem] cursor-pointer transition-all border flex items-center justify-between relative overflow-hidden group ${
                    selectedDuration === '3'
                      ? 'bg-white/[0.03] border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                      : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                  }`}
                >
                  {/* Neon ribbon */}
                  <div className="absolute top-0 right-6 px-3 py-1 bg-[#863BFF] text-white text-[7px] font-black uppercase tracking-widest rounded-b-md">
                    Recommended
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-[#863BFF] tracking-widest">Growth Elite</span>
                    <h4 className="text-lg sm:text-xl font-black text-white italic uppercase">3 Months Access</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Frictionless operational value</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl sm:text-3xl font-black text-white">₹699</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none pt-1">Frictionless Value</p>
                  </div>
                </div>

                {/* 12 Months Option (Ultimate Saver) */}
                <div 
                  onClick={() => {
                    setSelectedDuration('12');
                    setPromoApplied(false);
                    setCodeError('');
                  }}
                  className={`p-5.5 rounded-[2rem] cursor-pointer transition-all border flex items-center justify-between relative overflow-hidden group ${
                    selectedDuration === '12'
                      ? 'bg-white/[0.03] border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.08)]'
                      : 'bg-transparent border-white/5 hover:border-white/10 hover:bg-white/[0.01]'
                  }`}
                >
                  <div className="absolute top-0 right-6 px-3 py-1 bg-[#10B981] text-black text-[7px] font-black uppercase tracking-widest rounded-b-md">
                    Best Savings
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Gym Empire Pack</span>
                    <h4 className="text-lg sm:text-xl font-black text-white italic uppercase">12 Months Access</h4>
                    <p className="text-[10px] text-[#10B981] font-bold uppercase tracking-wider">Massive 40% long-term discount rate</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl sm:text-3xl font-black text-white">₹2,499</p>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest leading-none pt-1">Charged Annually</p>
                  </div>
                </div>

              </div>

              {/* Founding Gym early access message block */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-[#863BFF]/10 to-[#10B981]/5 border border-[#863BFF]/15 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg bg-[#863BFF]/15 border border-[#863BFF]/25 flex items-center justify-center flex-shrink-0 text-[#863BFF]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wide text-white">Founding Gym Partner Scheme</h4>
                  <p className="text-slate-400 text-xs font-semibold leading-normal pt-1">Early adopter license rates lock for life. Get 1 Month 100% Free inside the checkout calculator by entering voucher <strong className="text-emerald-400">GYMIX1FREE</strong> below.</p>
                </div>
              </div>
            </div>

            {/* Right: Dynamic Summary Card & Promo Engine (Col-span 5) */}
            <div className="lg:col-span-5">
              <div className="glass-card bg-slate-950/70 border border-white/10 rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                
                {/* Header text info */}
                <h3 className="text-base sm:text-lg font-black text-white uppercase italic tracking-tight pb-4 border-b border-white/5">Order Summary</h3>

                {/* Sub calculations */}
                <div className="space-y-4 pt-5">
                  
                  {/* Selected Plan description row */}
                  <div className="flex justify-between items-start text-xs sm:text-sm font-semibold">
                    <div className="space-y-0.5">
                      <p className="text-white font-black">{activePlan.name}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{selectedDuration} Months access cycle</p>
                    </div>
                    <span className="text-white font-black">₹{originalPrice}</span>
                  </div>

                  {/* Promo Input / Applied Box code */}
                  <div className="py-4.5 px-4 rounded-2xl bg-black/40 border border-white/5 space-y-3.5">
                    
                    {promoApplied ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black bg-[#10B981]/15 text-[#10B981] px-2 py-0.5 rounded-md border border-[#10B981]/25 uppercase tracking-widest">
                            Voucher Applied
                          </span>
                          <button
                            onClick={handleRemovePromo}
                            className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        
                        <div className="flex justify-between items-center text-xs font-black text-[#10B981] pt-1">
                          <span>3 Months Promo Discount</span>
                          <span>-₹{originalPrice}</span>
                        </div>
                        
                        <p className="text-[9px] text-[#10B981] font-semibold leading-normal pt-1">
                          {promoSuccessMsg}
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyPromo} className="space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black uppercase text-slate-500 tracking-wider">
                          <span>Apply Operational Coupon</span>
                          <span className="text-[#10B981] animate-pulse">Try: GYMIX1FREE</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            placeholder="Enter voucher code"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value)}
                            className="min-w-0 flex-1 px-3 py-2 text-xs rounded-xl bg-white/[0.02] border border-white/10 text-white placeholder-slate-600 focus:outline-none focus:border-[#863BFF] font-semibold uppercase"
                          />
                          <button 
                            type="submit"
                            className="flex-shrink-0 px-4 py-2 bg-[#863BFF] hover:bg-[#601bdf] text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-[#863BFF]/30"
                          >
                            Apply
                          </button>
                        </div>

                        {codeError && (
                          <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider pt-0.5">{codeError}</p>
                        )}
                      </form>
                    )}

                  </div>

                  {/* Calculations Line and net Payable */}
                  <div className="pt-4.5 border-t border-white/5 space-y-2.5">
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-500">Net Payable</span>
                      
                      <div className="text-right">
                        {promoApplied && (
                          <span className="text-xs text-slate-600 line-through font-bold pr-2.5">₹{originalPrice}</span>
                        )}
                        <span className="text-2.5xl sm:text-3xl font-black text-white">
                          ₹{netTotal}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[8px] text-slate-500 font-bold uppercase tracking-widest">
                      <span>18% SGST + CGST</span>
                      <span>₹0 (Waived)</span>
                    </div>
                  </div>

                  {/* Pricing success badge banner */}
                  {promoApplied && (
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="p-3.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-center"
                    >
                      <p className="text-[9px] text-[#10B981] font-black uppercase tracking-widest">
                        🎉 Operational Cycle 100% Free!
                      </p>
                    </motion.div>
                  )}

                  {/* Checkout CTA button action */}
                  <button
                    onClick={() => {
                      const promoUrl = promoApplied ? '&promo=GYMIX1FREE' : '';
                      navigate(`/signup?plan=${selectedDuration}${promoUrl}`);
                    }}
                    className="w-full py-4.5 bg-[#10B981] hover:bg-[#1bc58c] text-black text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-[#10B981]/15 hover:shadow-[#10B981]/25 transition-all duration-300 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer font-bold mt-2"
                  >
                    Confirm Access Tiers
                    <ArrowUpRight className="w-4 h-4 text-black stroke-[3]" />
                  </button>

                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS SECTION ── */}
      <section className="py-20 border-t border-white/5 bg-[#0C0E13] relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 max-w-3xl mx-auto mb-16">
            <span className="text-[#863BFF] text-[10px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-[#863BFF]" />
              Elite User Feedback
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
              TRUSTED BY PREMIUM FITNESS LABS
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-xl mx-auto leading-relaxed">
              Read how high-end gym spaces and operational teams scale membership databases with Gymix.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6.5">
            {[
              {
                quote: "Gymix completely saved our check-in registry gates. Mounting simple Amazon tablets at our main entry point allowed members to scan QR code cards directly. Expirations dropped by 24% in two cycles.",
                author: "Vikram Malhotra",
                role: "Director, Iron & Steel Gyms",
                rating: 5,
                glow: 'hover:border-[#863BFF]/30'
              },
              {
                quote: "The interactive order summary invoice log runs so smoothly. Collecting cash or recording UPI receipts compiles instantly. Our members love receiving automatic download links directly to their devices.",
                author: "Sneha Rao",
                role: "Operations Head, Peak Fitness",
                rating: 5,
                glow: 'hover:border-[#10B981]/30'
              },
              {
                quote: "Installed the Progressive Web App (PWA) straight to our administration tablet. It launches fullscreen and manages records with complete offline speed. Genuinely elite operating system software.",
                author: "Karan Johar",
                role: "Founder, Titan Fitness Labs",
                rating: 5,
                glow: 'hover:border-blue-500/30'
              }
            ].map((testi, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className={`glass-card bg-white/[0.01] border border-white/5 rounded-[2.5rem] p-6.5 sm:p-8 flex flex-col justify-between transition-all duration-300 ${testi.glow}`}
              >
                <div className="space-y-4">
                  {/* Star reviews */}
                  <div className="flex gap-1">
                    {[...Array(testi.rating)].map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-[#10B981] text-[#10B981]" />
                    ))}
                  </div>
                  
                  <p className="text-slate-300 text-xs sm:text-sm font-semibold leading-relaxed italic">
                    "{testi.quote}"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-6 mt-6 border-t border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-slate-900 border border-white/5 flex items-center justify-center text-xs font-black text-white">
                    {testi.author[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white leading-none">{testi.author}</h4>
                    <p className="text-[9px] text-[#863BFF] font-black uppercase tracking-wider pt-1">{testi.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* ── ACCORDION FAQ SECTION ── */}
      <section id="faq" className="py-20 md:py-28 border-t border-white/5 relative bg-[#090C10]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          
          <div className="text-center space-y-4 mb-16">
            <span className="text-[#10B981] text-[10px] font-black uppercase tracking-[0.3em]">
              Support Registry
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tighter uppercase italic leading-[1.1]">
              FREQUENTLY ASKED QUESTIONS
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-xl mx-auto">
              Got administrative inquiries? Browse answers concerning app deployment, biometric gate setups, and invoice structures.
            </p>
          </div>

          <div className="space-y-4">
            {faqData.map((faq, index) => {
              const isOpen = activeFaqIndex === index;
              
              return (
                <div 
                  key={index} 
                  className="rounded-3xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all duration-300 hover:border-white/15"
                >
                  {/* Clickable Header */}
                  <button
                    onClick={() => setActiveFaqIndex(isOpen ? null : index)}
                    className="w-full p-5 sm:p-6 text-left flex justify-between items-center gap-4 cursor-pointer text-white"
                  >
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider leading-relaxed">
                      {faq.q}
                    </span>
                    <motion.div
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0"
                    >
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    </motion.div>
                  </button>

                  {/* Collapsible Answer Body */}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="px-5 pb-5 sm:px-6 sm:pb-6 text-slate-400 text-xs sm:text-sm font-semibold leading-relaxed border-t border-white/5 pt-4 bg-[#090C10]/40">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 border-t border-white/5 relative z-10 bg-[#07090D]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <Logo className="w-8 h-8 opacity-70" />
            <span className="font-black text-slate-400 text-sm tracking-tighter uppercase italic">
              GYMIX <span className="text-[#863BFF]/75">.FIT</span>
            </span>
          </div>
          
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em] text-center md:text-right">
            © 2026 GYMIX SYSTEMS. ALL RIGHTS RESERVED. SECURED OPERATING ENVIRONMENT.
          </p>
        </div>
      </footer>

      {/* ── STANDALONE APP INSTALL PROMPT FLOATER ── */}
      <AnimatePresence>
        {showInstallPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-5 rounded-[2rem] bg-slate-950/95 border border-[#10B981]/30 shadow-2xl backdrop-blur-xl"
          >
            <div className="relative">
              <button 
                onClick={dismissPrompt} 
                className="absolute top-0 right-0 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-2xl bg-[#10B981]/15 border border-[#10B981]/25 flex items-center justify-center flex-shrink-0 text-[#10B981]">
                  <Smartphone className="w-6 h-6" />
                </div>
                
                <div className="space-y-1 pr-6">
                  <h4 className="text-xs font-black text-white uppercase italic tracking-tight">Install Standing Gymix.fit</h4>
                  <p className="text-[11px] text-slate-400 leading-normal font-semibold">
                    {isIOS 
                      ? 'Install on your Apple iPhone to activate high-performance database offline check-ins and direct push warnings.' 
                      : 'Add our next-gen utility dashboard directly to your home screen with a single tap.'}
                  </p>
                </div>
              </div>

              {/* Install guide buttons or IOS sheet instructions */}
              <div className="mt-4 pt-4 border-t border-white/5">
                {isIOS ? (
                  <div className="space-y-2.5">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Safari iOS Setup Action:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-center">
                        <span className="text-[8px] font-black text-[#863BFF] uppercase">Step 1</span>
                        <p className="text-[9px] text-slate-400">Tap browser share icon <span className="text-[#863BFF] font-bold">⎙</span></p>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1 text-center">
                        <span className="text-[8px] font-black text-[#10B981] uppercase">Step 2</span>
                        <p className="text-[9px] text-slate-400">Tap "Add to Home Screen" <span className="text-[#10B981] font-bold">+</span></p>
                      </div>
                    </div>
                  </div>
                ) : deferredPrompt ? (
                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={dismissPrompt} 
                      className="px-3 py-2 text-[9px] font-black uppercase text-slate-500 hover:text-white transition-colors cursor-pointer"
                    >
                      Maybe Later
                    </button>
                    
                    <button 
                      onClick={handleInstallClick} 
                      className="px-5 py-2 bg-[#10B981] hover:bg-[#1bc58c] text-black text-[9px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Install Now
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Browser Setup Actions (Manual):</p>
                    <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                      <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                        Direct installation is restricted by this browser. Follow these steps to install:
                      </p>
                      <ol className="text-[10px] text-slate-300 pl-4 list-decimal space-y-1 pt-0.5 font-medium">
                        <li>Tap your browser's menu (three dots <span className="font-bold text-[#10B981]">⋮</span> in the top-right corner).</li>
                        <li>Select <span className="font-black text-white">"Install app"</span> or <span className="font-black text-white">"Add to Home Screen"</span>.</li>
                      </ol>
                    </div>
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
