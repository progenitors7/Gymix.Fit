import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { 
  Smartphone, 
  Download, 
  ArrowRight, 
  Check, 
  Compass, 
  Sparkles,
  Building,
  AlertCircle
} from 'lucide-react';
import Logo from '../components/UI/Logo';

export default function JoinGymPage() {
  const { gymCode } = useParams();
  const navigate = useNavigate();
  
  const [gymName, setGymName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [copied, setCopied] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isiOS, setIsiOS] = useState(false);

  const getNormalizedCode = (code) => {
    if (!code) return '';
    return code.toUpperCase().trim()
      .replace(/I/g, '1')
      .replace(/O/g, '0')
      .replace(/L/g, '1');
  };

  // Fetch gym details on load
  useEffect(() => {
    async function fetchGymDetails() {
      if (!gymCode) {
        setError('No gym code provided');
        setLoading(false);
        return;
      }
      
      try {
        const normalized = getNormalizedCode(gymCode);
        const { data, error: dbError } = await supabase
          .from('gyms')
          .select('gym_name')
          .eq('unique_code', normalized)
          .single();
          
        if (dbError || !data) {
          setError('Gym code invalid or not found');
        } else {
          setGymName(data.gym_name);
        }
      } catch (err) {
        console.error('[JoinGym] Error fetching gym:', err);
        setError('Failed to load invitation details');
      } finally {
        setLoading(false);
      }
    }
    
    fetchGymDetails();
    
    // Platform Detection
    const ua = navigator.userAgent.toLowerCase();
    setIsAndroid(/android/i.test(ua));
    setIsiOS(/iphone|ipad|ipod/i.test(ua));
  }, [gymCode]);

  const handleAction = async () => {
    const normalized = getNormalizedCode(gymCode);
    // 1. Copy the gym connection bridge code to clipboard
    const bridgeText = `gymix-connect:${normalized}`;
    try {
      await navigator.clipboard.writeText(bridgeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('[JoinGym] Clipboard copy failed:', err);
    }

    if (isAndroid) {
      // Android: Attempt to launch app, fallback to Play Store
      const appUri = `com.gymix.fit://signup?gym=${normalized}&role=member`;
      window.location.href = appUri;
      
      // If page is still in focus after 2 seconds, redirect to Play Store app directly
      const start = Date.now();
      setTimeout(() => {
        if (Date.now() - start < 2500) {
          window.location.href = 'market://details?id=com.gymix.fit';
        }
      }, 2000);
    } else {
      // iOS / Desktop: Redirect to web signup with prefilled params
      navigate(`/signup?gym=${normalized}&role=member`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#13161F] flex flex-col items-center justify-center p-6 text-white">
        <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Verifying Invite Link…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#13161F] flex flex-col items-center justify-center p-6 text-white text-center space-y-6">
        <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] flex items-center justify-center text-rose-500 mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase italic tracking-tight">Oops! Link Expired</h2>
          <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed">
            {error}. Please check the QR code or ask your gym owner for a new link.
          </p>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 font-bold text-xs uppercase tracking-widest text-slate-300 transition-all active:scale-[0.98]"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#13161F] text-white flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans">
      
      {/* Background neon glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[#3B82F6]/5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center z-10">
        <div className="flex items-center gap-2.5">
          <Logo className="w-8 h-8 drop-shadow-[0_0_10px_rgba(16,185,129,0.2)]" />
          <span className="font-black italic tracking-widest uppercase text-sm">GYMIX<span className="text-emerald-500">.FIT</span></span>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" />
          VIP Invite
        </div>
      </div>

      {/* Main invitation card */}
      <div className="max-w-md w-full mx-auto my-auto py-12 space-y-8 z-10">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 mx-auto shadow-inner shadow-emerald-500/10">
            <Building className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">You have been invited to join</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight italic uppercase">{gymName}</h1>
          </div>
        </div>

        {/* Central interactive panel */}
        <div className="glass-card border border-white/5 bg-white/[0.02] rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden">
          
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">Connection Instructions:</h3>
            
            <div className="space-y-3.5">
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">1</div>
                <p className="text-slate-300 text-xs leading-relaxed font-semibold">
                  Tap <span className="text-white font-bold">"Connect & Install"</span> below to copy your invite token: <code className="bg-black/30 border border-white/5 px-2 py-0.5 rounded text-emerald-400 font-bold">{gymCode.toUpperCase()}</code>.
                </p>
              </div>
              <div className="flex items-start gap-3.5">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5">2</div>
                <p className="text-slate-300 text-xs leading-relaxed font-semibold">
                  {isAndroid 
                    ? 'The Play Store will open. Install the app, sign up, and we will auto-detect this gym from your clipboard!' 
                    : 'Fill out the simple form to create your Athlete account. No owner options will interfere!'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleAction}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 hover:opacity-95 text-black font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/15 active:scale-[0.98] flex items-center justify-center gap-3.5 cursor-pointer"
          >
            {isAndroid ? <Download className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
            {isAndroid ? 'Connect & Install App' : 'Connect & Sign Up'}
            <ArrowRight className="w-4 h-4" />
          </button>

          {copied && (
            <p className="text-[10px] text-emerald-400 font-bold text-center uppercase tracking-widest flex items-center justify-center gap-1.5 animate-pulse">
              <Check className="w-3.5 h-3.5" />
              Invite Token Copied to Clipboard!
            </p>
          )}
        </div>

        {/* PWA / iPhone Guide */}
        {isiOS && (
          <div className="glass-card border border-white/5 bg-white/[0.02] rounded-3xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 text-sky-400">
              <Compass className="w-4 h-4" />
              <h4 className="text-xs font-black uppercase tracking-wider">iPhone / Safari Install Guide:</h4>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed font-semibold">
              To keep this app on your screen like a native app: Tap the <strong className="text-white">Share</strong> button in Safari, scroll down, and select <strong className="text-white">"Add to Home Screen"</strong>!
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center space-y-1.5 z-10">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
          Powered by Gymix.Fit Engine v1.3
        </p>
        <div className="flex justify-center gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
          <button onClick={() => navigate('/login')} className="hover:text-slate-300 transition-colors">Login Fallback</button>
          <span>•</span>
          <button onClick={() => navigate('/privacy')} className="hover:text-slate-300 transition-colors">Privacy Policy</button>
        </div>
      </div>

    </div>
  );
}
