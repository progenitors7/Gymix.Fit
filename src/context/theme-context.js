import { createContext } from 'react';

export const ThemeContext = createContext({
  theme: 'system',
  effectiveTheme: 'dark',
  setTheme: () => {},
  isDark: true,
  isAbyss: false
});
