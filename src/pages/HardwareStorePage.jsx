import React, { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Fingerprint, ShoppingBag, ExternalLink, Search, ArrowLeft, 
  Cpu, ShieldCheck, Check, Info, X, Star, Calendar, Settings
} from 'lucide-react'
import Logo from '../components/UI/Logo'

const HARDWARE_PRODUCTS = [
  {
    id: "essl-k30-pro",
    name: "eSSL Identix K30 Pro",
    brand: "eSSL",
    category: "Fingerprint",
    badge: "Best Seller & Entry-Level",
    desc: "The most cost-effective and popular biometric attendance machine in India. Highly recommended for small and mid-sized gyms due to its robust build and simplicity.",
    price: "₹5,850",
    rating: 5,
    specs: [
      "1,000 Fingerprint Capacity",
      "1,000 RFID Card Storage",
      "Inbuilt Battery Backup (Up to 2-3 hours)",
      "ADMS Cloud Webhook Ready",
      "TCP/IP Ethernet & USB Host ports"
    ],
    link: "https://amzn.to/49qHIBE",
    color: "from-[#10B981]/15 to-transparent",
    borderColor: "hover:border-[#10B981]/30",
    badgeColor: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/20",
    icon: Fingerprint
  },
  {
    id: "essl-k90-pro",
    name: "eSSL K90 Pro ADMS",
    brand: "eSSL",
    category: "Fingerprint",
    badge: "Reliable Classic",
    desc: "An upgraded classic terminal featuring native cloud ADMS integration. Comes with advanced access control features and a rugged layout built to last.",
    price: "₹6,400",
    rating: 4.8,
    specs: [
      "800 Fingerprint Capacity",
      "800 Card & Password Storage",
      "SSR Excel Report Engine built-in",
      "ADMS Cloud Push Protocol Enabled",
      "Optional Backup Battery Support"
    ],
    link: "https://www.amazon.in/s?k=essl+k90+pro+adms",
    color: "from-blue-500/10 to-transparent",
    borderColor: "hover:border-blue-500/30",
    badgeColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    icon: Fingerprint
  },
  {
    id: "biomax-ncol-700",
    name: "BioMax N-Col 700",
    brand: "BioMax",
    category: "Face Recognition",
    badge: "Face + Fingerprint",
    desc: "High-speed face recognition and fingerprint attendance terminal, perfect for contact-free entry. Solves fingerprint read issues for members with worn-out prints.",
    price: "₹12,500",
    rating: 4.9,
    specs: [
      "1,500 Face Templates",
      "2,000 Fingerprint Capacity",
      "High Speed Dual Camera Recognition",
      "TCP/IP & USB Host connectivity",
      "Cloud Push ADMS Webhook Protocol"
    ],
    link: "https://www.amazon.in/s?k=biomax+n-col+700",
    color: "from-[#863BFF]/10 to-transparent",
    borderColor: "hover:border-[#863BFF]/30",
    badgeColor: "text-[#863BFF] bg-[#863BFF]/10 border-[#863BFF]/20",
    icon: Cpu
  },
  {
    id: "realtime-t302",
    name: "Realtime T302 ADMS",
    brand: "Realtime",
    category: "Fingerprint",
    badge: "Heavy Duty Capacity",
    desc: "Designed for high-traffic gym chains. Sturdy casing with large user capacity and ultra-responsive verification scanner.",
    price: "₹5,200",
    rating: 4.7,
    specs: [
      "3,000 Fingerprint Capacity",
      "3,000 RFID Card Storage",
      "High-Speed ARM Processor",
      "Native ADMS Push Support",
      "TCP/IP Ethernet & USB Host"
    ],
    link: "https://www.amazon.in/s?k=realtime+t302+adms",
    color: "from-pink-500/10 to-transparent",
    borderColor: "hover:border-pink-500/30",
    badgeColor: "text-pink-400 bg-pink-500/10 border-pink-500/20",
    icon: Fingerprint
  },
  {
    id: "zkteco-mb160",
    name: "ZKTeco MB160 Multi-Biometric",
    brand: "ZKTeco",
    category: "Face Recognition",
    badge: "Advanced Multi-Biometric",
    desc: "Premium touchless face recognition, fingerprint, card, and password biometric terminal. Features high verification speed and inbuilt battery backup.",
    price: "₹8,095",
    rating: 4.3,
    specs: [
      "1,500 Face Templates",
      "2,000 Fingerprint Capacity",
      "Inbuilt Battery Backup included",
      "ADMS Cloud Webhook pre-installed",
      "TCP/IP Ethernet & USB Host ports"
    ],
    link: "https://amzn.to/4e7Cqxu",
    color: "from-amber-500/10 to-transparent",
    borderColor: "hover:border-amber-500/30",
    badgeColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    icon: Cpu
  },
  {
    id: "zkteco-mb20",
    name: "ZKTeco MB20 Face & Fingerprint",
    brand: "ZKTeco",
    category: "Face Recognition",
    badge: "Compact Face & Finger",
    desc: "Compact facial and fingerprint terminal, featuring advanced algorithm technology. Great for budget-conscious gyms requiring face scan.",
    price: "₹7,200",
    rating: 4.6,
    specs: [
      "200 Face Templates",
      "500 Fingerprint Capacity",
      "Sleek and compact footprint",
      "TCP/IP Network communication",
      "ADMS Cloud Push Ready"
    ],
    link: "https://www.amazon.in/s?k=zkteco+mb20",
    color: "from-indigo-500/10 to-transparent",
    borderColor: "hover:border-indigo-500/30",
    badgeColor: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    icon: Cpu
  }
];

export default function HardwareStorePage() {
  const navigate = useNavigate()
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All') // 'All' | 'Fingerprint' | 'Face Recognition'
  const [selectedBrand, setSelectedBrand] = useState('All') // 'All' | 'eSSL' | 'BioMax' | 'Realtime' | 'ZKTeco'

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])

  // Filter logic
  const filteredProducts = useMemo(() => {
    return HARDWARE_PRODUCTS.filter(prod => {
      const matchesSearch = prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            prod.desc.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = selectedCategory === 'All' || prod.category === selectedCategory
      const matchesBrand = selectedBrand === 'All' || prod.brand === selectedBrand
      return matchesSearch && matchesCategory && matchesBrand
    })
  }, [searchQuery, selectedCategory, selectedBrand])

  return (
    <div className="min-h-screen bg-[#090C10] text-slate-100 overflow-x-hidden selection:bg-[#863BFF]/30 font-sans relative pb-20">
      
      {/* Background radiant glowing effects */}
      <div className="absolute top-[-100px] left-[5%] w-[350px] md:w-[600px] h-[350px] md:h-[600px] bg-[#863BFF]/8 blur-[100px] md:blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-[#10B981]/5 blur-[90px] md:blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[15%] w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-[#863BFF]/4 blur-[120px] md:blur-[150px] rounded-full pointer-events-none" />

      {/* Grid background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.012)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.012)_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] pointer-events-none mask-image-[radial-gradient(ellipse_at_center,black,transparent_80%)]" />

      {/* Sticky Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/5 bg-[#090C10]/75 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/')} 
              className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-gray-400 hover:text-white transition-all transform active:scale-95 cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
              <Logo className="w-8 h-8 text-white" />
              <span className="font-black text-white text-sm tracking-tighter uppercase italic">
                GYMIX <span className="text-[#863BFF]">.FIT</span>
              </span>
            </div>
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#863BFF] bg-[#863BFF]/10 border border-[#863BFF]/20 px-3.5 py-1.5 rounded-xl">
            Official Hardware Store
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 relative z-10 space-y-12">
        
        {/* Banner Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/25 text-[10px] font-black uppercase tracking-widest text-[#10B981]">
            <ShoppingBag className="w-3.5 h-3.5" />
            Verified Hardware Directory
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-none tracking-tight uppercase italic">
            COMPATIBLE BIOMETRIC HARDWARE
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold max-w-2xl mx-auto leading-relaxed">
            All devices listed below use standard ADMS/push data protocol and connect directly to Gymix Cloud Server. Purchase via our affiliate links below to get verified compatible hardware.
          </p>
        </div>

        {/* Filter Controls (Search + Category + Brand) */}
        <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 backdrop-blur-md max-w-5xl mx-auto space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search by name, specs or brand..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/5 rounded-xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-[#863BFF] transition-all font-semibold"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/5 rounded text-gray-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['All', 'Fingerprint', 'Face Recognition'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer whitespace-nowrap ${
                    selectedCategory === cat 
                      ? 'bg-[#863BFF]/25 border-[#863BFF]/40 text-white' 
                      : 'bg-black/20 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Brand Filter */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {['All', 'eSSL', 'ZKTeco', 'BioMax', 'Realtime'].map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer whitespace-nowrap ${
                    selectedBrand === brand 
                      ? 'bg-[#10B981]/20 border-[#10B981]/30 text-white' 
                      : 'bg-black/20 border-white/5 text-slate-400 hover:text-white hover:border-white/10'
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <AnimatePresence mode="popLayout">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((prod) => {
                const IconComp = prod.icon;
                return (
                  <motion.div
                    key={prod.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className={`glass-card border border-white/5 rounded-[2.5rem] p-6.5 flex flex-col justify-between hover:-translate-y-1.5 transition-all duration-300 relative group overflow-hidden bg-white/[0.01] ${prod.borderColor}`}
                  >
                    {/* Glowing background */}
                    <div className={`absolute inset-0 bg-gradient-to-tr ${prod.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

                    <div className="space-y-5 relative z-10">
                      
                      {/* Header Badge */}
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${prod.badgeColor}`}>
                          {prod.badge}
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-[10px] text-slate-300 font-black">{prod.rating}</span>
                        </div>
                      </div>

                      {/* Schematic Visual Blueprint Placeholder */}
                      <div className="w-full h-36 rounded-2xl border-2 border-dashed border-white/5 bg-black/40 flex flex-col items-center justify-center relative group-hover:border-white/10 transition-all">
                        {/* Schematic lines */}
                        <div className="absolute inset-x-4 top-1/2 h-[1px] bg-white/5 pointer-events-none" />
                        <div className="absolute inset-y-4 left-1/2 w-[1px] bg-white/5 pointer-events-none" />
                        
                        <IconComp className="w-12 h-12 text-slate-600 group-hover:text-white transition-colors duration-500 relative z-10" />
                        <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest pt-2.5 relative z-10">
                          {prod.category} hardware module
                        </span>
                        <span className="text-[7px] text-slate-600 font-mono absolute bottom-2 right-3">
                          DEV_SCHEMATIC // {prod.id.toUpperCase()}
                        </span>
                      </div>

                      {/* Name & Desc */}
                      <div>
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{prod.name}</h3>
                        <p className="text-slate-400 text-xs leading-relaxed pt-2 font-semibold">{prod.desc}</p>
                      </div>

                      {/* Specifications List */}
                      <div className="space-y-2 pt-1 border-t border-white/5">
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Technical Specifications:</p>
                        <ul className="space-y-1.5">
                          {prod.specs.map((spec, sIdx) => (
                            <li key={sIdx} className="text-[10px] text-slate-300 font-semibold flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-[#10B981] flex-shrink-0" />
                              {spec}
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>

                    <div className="pt-6 relative z-10 flex items-center justify-between border-t border-white/5 mt-6">
                      <div className="text-left">
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none">Est. Price</p>
                        <p className="text-base font-black text-white pt-1">{prod.price}</p>
                      </div>
                      <a
                        href={prod.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-5 py-2.5 bg-white/5 hover:bg-[#10B981] hover:text-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all duration-300 text-center flex items-center justify-center gap-1.5 border border-white/10 hover:border-[#10B981] cursor-pointer"
                      >
                        Buy on Amazon 🛒
                      </a>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-[2.5rem]">
                <Info className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">No matching devices found</h3>
                <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mt-1.5">
                  Try adjusting your search query or removing brand/category filters to find compatible biometric scanners.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Affiliate Disclaimer Banner */}
        <div className="p-6 rounded-[2rem] bg-white/[0.01] border border-white/5 flex items-start gap-4 max-w-4xl mx-auto">
          <Info className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400 font-semibold leading-relaxed">
            <span className="text-white font-bold">Affiliate Program Disclosure:</span> As an Amazon Associate, we earn a small commission from qualifying purchases. This has <span className="text-[#10B981] font-bold">zero extra cost</span> for you, and it directly supports our cloud integration server endpoints, maintenance, and platform upgrades. Thank you for using our official links! 💚
          </div>
        </div>

      </main>
    </div>
  )
}
