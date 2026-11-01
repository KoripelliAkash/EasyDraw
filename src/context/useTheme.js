import { useContext } from 'react';
import { ThemeContext } from './ThemeContextDefinition.js';

export const useTheme = () => useContext(ThemeContext);
