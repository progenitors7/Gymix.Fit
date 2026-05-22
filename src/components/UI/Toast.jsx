import React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export default function Toast({ message, type, onClose }) {
  if (!message) return null;

  return createPortal(
    <div className="fixed top-8 right-8 z-[9999] min-w-[320px] animate-in slide-in-from-top-4 fade-in duration-300">
      <div className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${
        type === 'success' 
          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
          : 'bg-red-500/10 border-red-500/20 text-red-400'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg ${
            type === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}>
            {type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-widest leading-none">
              {type === 'success' ? 'Success' : 'Attention'}
            </p>
            <p className="text-xs font-medium opacity-80 mt-1">{message}</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className="p-2 hover:bg-white/5 rounded-xl transition-all active:scale-90"
        >
          <X className="w-4 h-4 opacity-50" />
        </button>
      </div>
    </div>,
    document.body
  );
}

