import type { CommonColors as MuiCommonColors } from '@mui/material/styles'; // Removed MuiPaletteColor

// Helper types (can be moved to a central types.ts later if needed)
// Adjusted to allow 'lighter' and 'darker' as they are used in the config
export interface PaletteColorNoChannels {
  lighter?: string;
  light: string;
  main: string;
  dark: string;
  darker?: string;
  contrastText: string;
}

export interface ThemeCssVariables {
  cssVarPrefix?: string; // MUI v5 uses this for experimental CSS variables mode
  colorSchemeSelector?: string; // Used by MUI for data-attribute based color schemes
}

interface ThemeConfigValues {
  classesPrefix: string;
  cssVariables: ThemeCssVariables;
  fontFamily: {
    primary: string;
    secondary: string; // We'll keep a secondary, can also be 'Inter' or another sans-serif
  };
  palette: {
    primary: PaletteColorNoChannels;
    secondary: PaletteColorNoChannels;
    info: PaletteColorNoChannels;
    success: PaletteColorNoChannels;
    warning: PaletteColorNoChannels;
    error: PaletteColorNoChannels;
    common: Pick<MuiCommonColors, 'black' | 'white'>;
    grey: Record<
      '50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900',
      string
    >;
  };
}

export const themeConfig: ThemeConfigValues = {
  /** **************************************
   * Base
   *************************************** */
  classesPrefix: 'pmp', // Property Manager Pro prefix
  /** **************************************
   * Typography
   *************************************** */
  fontFamily: {
    primary: 'Inter, sans-serif', // User preference
    secondary: 'Inter, sans-serif', // Using Inter as secondary as well for now
  },
  /** **************************************
   * Palette
   * Values taken from material-kit-react theme-config.ts
   *************************************** */
  palette: {
    primary: {
      lighter: '#D0ECFE',
      light: '#73BAFB',
      main: '#1877F2',
      dark: '#0C44AE',
      darker: '#042174',
      contrastText: '#FFFFFF',
    },
    secondary: {
      lighter: '#CFD8DC', 
      light: '#90A4AE',   
      main: '#607D8B',    
      dark: '#455A64',    
      darker: '#263238',  
      contrastText: '#FFFFFF',
    },
    info: {
      lighter: '#CAFDF5',
      light: '#61F3F3',
      main: '#00B8D9',
      dark: '#006C9C',
      darker: '#003768',
      contrastText: '#FFFFFF',
    },
    success: {
      lighter: '#D3FCD2',
      light: '#77ED8B',
      main: '#22C55E',
      dark: '#118D57',
      darker: '#065E49',
      contrastText: '#ffffff', // Note: material-kit-react had #ffffff, ensuring consistency
    },
    warning: {
      lighter: '#FFF5CC',
      light: '#FFD666',
      main: '#FFAB00',
      dark: '#B76E00',
      darker: '#7A4100',
      contrastText: '#1C252E',
    },
    error: {
      lighter: '#FFE9D5',
      light: '#FFAC82',
      main: '#FF5630',
      dark: '#B71D18',
      darker: '#7A0916',
      contrastText: '#FFFFFF',
    },
    grey: {
      '50': '#FCFDFD',
      '100': '#F9FAFB',
      '200': '#F4F6F8',
      '300': '#DFE3E8',
      '400': '#C4CDD5',
      '500': '#919EAB',
      '600': '#637381',
      '700': '#454F5B',
      '800': '#1C252E',
      '900': '#141A21',
    },
    common: { black: '#000000', white: '#FFFFFF' },
  },
  /** **************************************
   * Css variables (from material-kit-react)
   * For MUI's experimental CSS variables mode and color scheme selector
   *************************************** */
  cssVariables: {
    cssVarPrefix: '', // MUI default is 'mui' if not set, '' means no prefix for vars like --mui-palette-primary-main
    colorSchemeSelector: 'data-color-scheme', // Default MUI attribute for switching themes
  },
};
