import React from 'react';
import { Sun, Moon, Laptop, Compass } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ variant = 'segmented', className = '' }) {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const options = [
    { id: 'system', label: 'Auto', icon: Laptop, title: 'Follow system appearance' },
    { id: 'light', label: 'Light', icon: Sun, title: 'Clean Light mode' },
    { id: 'dark', label: 'OLED', icon: Moon, title: 'Pure Dark mode' },
    { id: 'abyss', label: 'Classic', icon: Compass, title: 'Classic Dark mode' }
  ];

  if (variant === 'compact') {
    const cycle = ['system', 'light', 'dark', 'abyss'];
    const currentIndex = cycle.indexOf(theme);
    const nextTheme = cycle[(currentIndex + 1) % cycle.length] || 'system';

    return (
      <button
        type="button"
        onClick={() => setTheme(nextTheme)}
        className={`w-9 h-9 p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer flex items-center justify-center shrink-0 ${className}`}
        title={`Theme: ${theme.toUpperCase()} (Click to switch)`}
        aria-label="Toggle theme"
      >
        {theme === 'abyss' ? (
          <Compass className="w-4 h-4 text-blue-500" />
        ) : effectiveTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-zinc-300" />
        ) : theme === 'system' ? (
          <Laptop className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>
    );
  }

  // Segmented 4-button control
  const isFullWidth = className.includes('w-full');

  return (
    <div 
      className={`p-1 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-medium shadow-inner ${
        isFullWidth ? 'grid grid-cols-4 gap-1 w-full' : 'inline-flex items-center gap-1'
      } ${className}`}
      role="group"
      aria-label="Theme selector"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            title={opt.title}
            className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-lg text-[11px] font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 shrink-0 ${
              isActive 
                ? opt.id === 'light' 
                  ? 'text-amber-500' 
                  : opt.id === 'dark' 
                    ? 'text-emerald-500 dark:text-emerald-400' 
                    : opt.id === 'abyss'
                      ? 'text-blue-500'
                      : 'text-slate-800 dark:text-slate-200'
                : 'text-slate-400 dark:text-zinc-500'
            }`} />
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
