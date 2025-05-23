import { createContext, useContext } from 'react';
import { type PaletteMode } from '@mui/material';

interface ThemeContextType {
  toggleColorMode: () => void;
  mode: PaletteMode;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeMode must be used within a ThemeProvider');
  }
  return context;
};

// This is the context object itself, which will be used by ThemeProvider
export { ThemeContext };
