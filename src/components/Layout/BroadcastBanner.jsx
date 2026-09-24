import React, { useState, useEffect } from 'react';
import { Megaphone, X, Info, AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';
import { superAdminService } from '../../services/superAdminService';

export default function BroadcastBanner() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => {
    const saved = localStorage.getItem('dismissed_broadcasts');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    try {
      const data = await superAdminService.getActiveBroadcasts();
      // Filter out dismissed ones
      const active = data.filter(b => !dismissedIds.includes(b.id));
      setBroadcasts(active);
      if (active.length > 0) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error fetching broadcasts:', error);
    }
  };

  const dismissBroadcast = (id) => {
    const newDismissed = [...dismissedIds, id];
    setDismissedIds(newDismissed);
    localStorage.setItem('dismissed_broadcasts', JSON.stringify(newDismissed));
    
    // Remove from local state
    const remaining = broadcasts.filter(b => b.id !== id);
    setBroadcasts(remaining);
    
    if (remaining.length === 0) {
      setIsVisible(false);
    } else {
      // Show next one if available
      setCurrentIndex(0);
    }
  };

  if (!isVisible || broadcasts.length === 0) return null;

  const current = broadcasts[currentIndex];

  const getTypeStyles = (type) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/20',
          text: 'text-amber-400',
          icon: <AlertTriangle className="w-4 h-4" />
        };
      case 'success':
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-400',
          icon: <CheckCircle className="w-4 h-4" />
        };
      case 'update':
        return {
          bg: 'bg-indigo-500/10',
          border: 'border-indigo-500/20',
          text: 'text-indigo-400',
          icon: <Sparkles className="w-4 h-4" />
        };
      default:
        return {
          bg: 'bg-emerald-500/10',
          border: 'border-emerald-500/20',
          text: 'text-emerald-600 dark:text-emerald-400',
          icon: <Info className="w-4 h-4" />
        };
    }
  };

  const styles = getTypeStyles(current.type);

  return (
    <div className={`relative z-40 px-4 py-3 border-b ${styles.bg} ${styles.border} backdrop-blur-md animate-in fade-in slide-in-from-top duration-500`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-lg bg-black/5 dark:bg-white/5 ${styles.text}`}>
            <Megaphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${styles.text}`}>
              System Announcement
            </p>
            <p className="text-sm text-slate-800 dark:text-white/90 font-medium leading-relaxed">
              <span className="font-bold">{current.title}:</span> {current.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {broadcasts.length > 1 && (
            <div className="flex items-center gap-1 mr-4">
              {broadcasts.map((_, idx) => (
                <div 
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${idx === currentIndex ? 'bg-slate-900 dark:bg-white w-3' : 'bg-slate-300 dark:bg-white/20'}`}
                />
              ))}
            </div>
          )}
          
          <button 
            onClick={() => dismissBroadcast(current.id)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all active:scale-95"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
