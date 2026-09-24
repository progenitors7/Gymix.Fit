import React from 'react';
import { Sun, Moon, Laptop, Compass } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

export default function ThemeToggle({ variant = 'segmented', className = '' }) {
  const { theme, setTheme, effectiveTheme } = useTheme();

  const options = [
    { id: 'system', label: 'Auto', icon: Laptop, title: 'Follow phone/system settings (Default)' },
    { id: 'light', label: 'Light', icon: Sun, title: 'Clean Light mode' },
    { id: 'dark', label: 'OLED', icon: Moon, title: 'OLED Dark mode' },
    { id: 'abyss', label: 'Abyss', icon: Compass, title: 'Midnight Abyss (Navy Blue)' }
  ];

  if (variant === 'compact') {
    // Quick toggle cycling between system -> light -> dark -> abyss
    const cycle = ['system', 'light', 'dark', 'abyss'];
    const currentIndex = cycle.indexOf(theme);
    const nextTheme = cycle[(currentIndex + 1) % cycle.length] || 'system';

    return (
      <button
        onClick={() => setTheme(nextTheme)}
        className={`p-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors shadow-xs cursor-pointer flex items-center justify-center ${className}`}
        title={`Theme: ${theme.toUpperCase()} (Tap to switch)`}
        aria-label="Toggle theme"
      >
        {theme === 'abyss' ? (
          <Compass className="w-4 h-4 text-indigo-400" />
        ) : effectiveTheme === 'dark' ? (
          <Moon className="w-4 h-4 text-zinc-200" />
        ) : theme === 'system' ? (
          <Laptop className="w-4 h-4 text-violet-500" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>
    );
  }

  return (
    <div 
      className={`inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800 text-xs font-semibold shadow-inner ${className}`}
      role="group"
      aria-label="Theme selector"
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => setTheme(opt.id)}
            title={opt.title}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors duration-150 cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-white/40 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${
              isActive 
                ? opt.id === 'light' 
                  ? 'text-amber-500' 
                  : opt.id === 'dark' 
                    ? 'text-zinc-200' 
                    : opt.id === 'abyss'
                      ? 'text-indigo-400'
                      : 'text-violet-500'
                : 'text-current'
            }`} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
