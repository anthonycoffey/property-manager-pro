import React, { useState, useMemo, useEffect, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline, useMediaQuery } from '@mui/material';
import { ThemeContext } from '../hooks/useThemeMode';
import { createAppTheme } from '../theme';
import type { ThemeColorScheme } from '../theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  const [mode, setMode] = useState<ThemeColorScheme>(() => {
    try {
      const storedMode = window.localStorage.getItem('themeMode') as ThemeColorScheme | null;
      if (storedMode && (storedMode === 'light' || storedMode === 'dark')) {
        return storedMode;
      }
    } catch (error) {
      // localStorage is not available or other error
      console.error('Error reading themeMode from localStorage:', error);
    }
    return prefersDarkMode ? 'dark' : 'light';
  });

  useEffect(() => {
    // Update mode based on system preference ONLY if no user preference is stored
    try {
      const storedMode = window.localStorage.getItem('themeMode');
      if (!storedMode) {
        setMode(prefersDarkMode ? 'dark' : 'light');
      }
    } catch (error) {
      // If localStorage is not available, follow system preference
      console.error('Error reading themeMode from localStorage for system preference update:', error);
      setMode(prefersDarkMode ? 'dark' : 'light');
    }
  }, [prefersDarkMode]);

  useEffect(() => {
    // Save mode to localStorage whenever it changes
    try {
      window.localStorage.setItem('themeMode', mode);
    } catch (error) {
      console.error('Error saving themeMode to localStorage:', error);
    }
  }, [mode]);

  const toggleColorMode = React.useCallback(() => {
    setMode((prevMode) => {
      const newMode = prevMode === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem('themeMode', newMode);
      } catch (error) {
        console.error('Error saving themeMode to localStorage on toggle:', error);
      }
      return newMode;
    });
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
