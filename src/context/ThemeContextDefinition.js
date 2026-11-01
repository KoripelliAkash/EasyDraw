import { createContext } from 'react';
import { THEMES } from '../types/index.js';

export const ThemeContext = createContext({
  theme: THEMES.SYSTEM,
  resolvedTheme: THEMES.LIGHT,
  setTheme: () => {},
});
