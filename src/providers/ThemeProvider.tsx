import React, { useState, useMemo, useEffect, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { ThemeContext } from '../hooks/useThemeMode';
// import type { PaletteMode } from '@mui/material'; // Removed unused import
import { createAppTheme } from '../theme';
import type { ThemeColorScheme } from '../theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');
  const [mode, setMode] = useState<ThemeColorScheme>(prefersDarkMode ? 'dark' : 'light');

  useEffect(() => {
    // This effect updates the theme if the OS preference changes,
    // assuming the user hasn't manually toggled the theme.
    // For a more robust solution, we'd also check if the user
    // has made an explicit choice (e.g., stored in localStorage)
    // and only update if they are on a "system" or "auto" setting.
    // For now, this will react to OS changes directly.
    setMode(prefersDarkMode ? 'dark' : 'light');
  }, [prefersDarkMode]);

  const toggleColorMode = React.useCallback(() => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    // Future: If persisting choice, save to localStorage here.
  }, []);

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
