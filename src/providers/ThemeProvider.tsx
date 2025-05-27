import React, { useState, useMemo, type ReactNode } from 'react';
import { createTheme, ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { ThemeContext } from '../hooks/useThemeMode';
import type { PaletteMode } from '@mui/material';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<PaletteMode>('light');

  const toggleColorMode = React.useCallback(() => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode, // Essential for light/dark toggle
          primary: {
            main: mode === 'light' ? '#265D97' : '#5C97DB', // Darker blue for light, lighter for dark
            contrastText: '#ffffff',
          },
          secondary: {
            main: mode === 'light' ? '#6C757D' : '#A0A7AD', // Medium gray
            contrastText: mode === 'light' ? '#ffffff' : '#121212',
          },
          background: {
            default: mode === 'light' ? '#F4F6F8' : '#1A1D21', // Light gray / Very dark gray
            paper: mode === 'light' ? '#FFFFFF' : '#2C3034',   // White / Darker gray
          },
          text: {
            primary: mode === 'light' ? '#212529' : '#E9ECEF',
            secondary: mode === 'light' ? '#495057' : '#ADB5BD',
          },
        },
        typography: {
          fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
          h1: { fontSize: '2.2rem', fontWeight: 600 },
          h2: { fontSize: '1.8rem', fontWeight: 600 },
          h3: { fontSize: '1.5rem', fontWeight: 600 },
          h4: { fontSize: '1.25rem', fontWeight: 600 },
          h5: { fontSize: '1.1rem', fontWeight: 600 },
          h6: { fontSize: '1rem', fontWeight: 600 },
          button: {
            textTransform: 'none',
            fontWeight: 500,
          }
        },
        components: {
          MuiAppBar: {
            styleOverrides: {
              root: {
                // Example: Make AppBar flat (no shadow) if desired for a sleeker look
                // boxShadow: 'none',
                // backgroundColor: mode === 'light' ? '#FFFFFF' : '#2C3034', // Or use primary.main
                // color: mode === 'light' ? '#212529' : '#E9ECEF', // Text color on AppBar
              }
            }
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                boxShadow: mode === 'light' 
                  ? '0px 3px 6px rgba(0,0,0,0.05)' 
                  : '0px 3px 6px rgba(0,0,0,0.1)',
                // border: mode === 'dark' ? '1px solid #424242' : 'none',
              }
            }
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 6,
              },
              containedPrimary: {
                // Example: if you want a different shadow for primary buttons
                // boxShadow: '0px 2px 4px rgba(38,93,151,0.3)',
              }
            }
          },
          MuiTextField: {
            defaultProps: {
              variant: 'outlined', // Consistent variant
            },
          },
          MuiOutlinedInput: { // Style the outlined input specifically
            styleOverrides: {
              root: {
                borderRadius: 6,
              }
            }
          }
        }
      }),
    [mode], // The theme will regenerate if the mode changes
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
