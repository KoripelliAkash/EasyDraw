import { useEffect, useState, useMemo } from 'react';
import { THEMES } from '../types/index.js';
import { getThemePreference, setThemePreference } from '../storage/index.js';
import { ThemeContext } from './ThemeContextDefinition.js';

export const ThemeProvider = ({ children }) => {
  const [theme, setInternalTheme] = useState(() => getThemePreference());
  const [systemDark, setSystemDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Watch for system OS theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Compute active theme ('light' or 'dark')
  const resolvedTheme = useMemo(() => {
    if (theme === THEMES.SYSTEM) {
      return systemDark ? THEMES.DARK : THEMES.LIGHT;
    }
    return theme;
  }, [theme, systemDark]);

  // Apply to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = (newTheme) => {
    setInternalTheme(newTheme);
    setThemePreference(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
