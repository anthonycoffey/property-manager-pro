import React, { useState, useMemo, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeContext } from '../hooks/useThemeMode';
import type { PaletteMode } from '@mui/material';
import { createAppTheme } from '../theme'; // Import our new theme creator
import type { ThemeColorScheme } from '../theme'; // Import ThemeColorScheme

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // PaletteMode from MUI is 'light' | 'dark' | undefined. Our ThemeColorScheme is 'light' | 'dark'.
  const [mode, setMode] = useState<ThemeColorScheme>('light');

  const toggleColorMode = React.useCallback(() => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  }, []);

  // Use our new createAppTheme
  const theme = useMemo(
    () => createAppTheme({ mode }),
    [mode]
  );

  const value = useMemo(
    () => ({
      toggleColorMode,
      mode,
    }),
    [toggleColorMode, mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};
