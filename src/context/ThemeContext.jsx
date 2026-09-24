import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

const ThemeContext = createContext({
  theme: 'system', // 'system' | 'light' | 'dark' | 'abyss'
  effectiveTheme: 'dark', // 'light' | 'dark' | 'abyss'
  setTheme: () => {},
  isDark: true,
  isAbyss: false
});

const STORAGE_KEY = 'gymix_theme_preference';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'abyss' || stored === 'system') {
        return stored;
      }
    } catch (e) {
      console.warn('[ThemeProvider] Error reading localStorage:', e);
    }
    // Default: always automatically match phone / OS system setting
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to live OS/phone theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      setSystemIsDark(e.matches);
    };

    // Modern and legacy event listener support
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  const effectiveTheme = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemIsDark]);

  const isDark = effectiveTheme === 'dark' || effectiveTheme === 'abyss';
  const isAbyss = effectiveTheme === 'abyss';

  // Apply classes to <html> root and update meta theme-color
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
      if (isAbyss) {
        root.classList.add('theme-abyss');
        root.setAttribute('data-theme', 'abyss');
      } else {
        root.classList.remove('theme-abyss');
        root.removeAttribute('data-theme');
      }
    } else {
      root.classList.add('light');
      root.classList.remove('dark', 'theme-abyss');
      root.removeAttribute('data-theme');
      root.style.colorScheme = 'light';
    }

    // Dynamic mobile browser address bar color sync
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isAbyss ? '#080C16' : isDark ? '#09090B' : '#FFFFFF');
    }
  }, [isDark, isAbyss]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('[ThemeProvider] Error saving theme:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme, isDark, isAbyss }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
