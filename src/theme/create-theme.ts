import type { Theme as MuiTheme } from '@mui/material/styles'; // Added MuiThemeOptions
import { createTheme as createMuiThemeInternal, responsiveFontSizes } from '@mui/material/styles';

import { themeConfig } from './theme-config';
import { palette as appPalette } from './core/palette'; // Contains appPalette.light
import { typography as appTypography } from './core/typography';
import { shadows as appShadows } from './core/shadows';
import { customShadows as appCustomShadows } from './core/custom-shadows';
import { components as appComponents } from './core/components';
import { createPaletteChannel, createSimplePaletteChannel } from './utils/colorManipulator'; // Added createSimplePaletteChannel

// Ensure PaletteColorWithChannels is imported for dark mode casts
import type { ThemeOptions, ThemeColorScheme } from './types';

interface CreateAppThemeProps {
  mode?: ThemeColorScheme;
  themeOverrides?: Partial<ThemeOptions>;
}

export function createAppTheme({ mode = 'light', themeOverrides = {} }: CreateAppThemeProps = {}): MuiTheme {
  // Use the extended palette type from our ThemeOptions
  let paletteOptionsForMode: ThemeOptions['palette']; 

  if (mode === 'light') {
    // For light mode, use our fully defined light palette.
    // appPalette.light is already typed as FullyDefinedLightPalette which extends MuiPaletteOptions.
    // Deep clone to prevent modification of the original appPalette.light
    const lightPaletteParsed = JSON.parse(JSON.stringify(appPalette.light!));
    paletteOptionsForMode = lightPaletteParsed;
    if (paletteOptionsForMode) { // Check to satisfy TS that it's not undefined before assigning to .mode
        paletteOptionsForMode.mode = 'light'; // Ensure mode is explicitly set
    }
  } else {
    // For dark mode, provide a simpler palette structure based on themeConfig.
    // MUI's createTheme will use these to generate the full dark palette,
    // including appropriate text, background, and shades for primary/secondary etc.
    paletteOptionsForMode = {
      mode: 'dark',
      // Use createPaletteChannel to generate full PaletteColorWithChannels objects
      primary: createPaletteChannel(themeConfig.palette.primary),
      secondary: createPaletteChannel(themeConfig.palette.secondary),
      info: createPaletteChannel(themeConfig.palette.info),
      success: createPaletteChannel(themeConfig.palette.success),
      warning: createPaletteChannel(themeConfig.palette.warning),
      error: createPaletteChannel(themeConfig.palette.error),
      common: createSimplePaletteChannel(themeConfig.palette.common), // Process common colors
      grey: createSimplePaletteChannel(themeConfig.palette.grey),       // Process grey scale
      // IMPORTANT: Do NOT provide text, background, divider, or action here for dark mode.
      // Let MUI generate them based on the mode and the primary/secondary/etc. colors.
      // contrastThreshold and tonalOffset are important for MUI's color calculations.
      contrastThreshold: 3, // MUI default
      tonalOffset: 0.2,   // MUI default
    };
  }

  // Construct the initial theme options using this mode-specific palette
  const initialThemeOptions: ThemeOptions = {
    palette: paletteOptionsForMode as ThemeOptions['palette'], // Assert type after conditional assignment
    typography: appTypography,
    shadows: appShadows.light, // For dark mode, MUI might adjust these based on the new dark palette.
                               // If specific dark shadows are needed, they'd be appShadows.dark
    customShadows: appCustomShadows.light, // Custom shadows are not auto-adjusted by MUI for dark mode.
                                          // Define appCustomShadows.dark if needed.
    components: appComponents,
    shape: { borderRadius: 8 },
    cssVariables: themeConfig.cssVariables, // For potential CssVarsProvider use
  };

  // Merge with external overrides.
  const finalMergedOptions: ThemeOptions = {
    ...initialThemeOptions,
    ...themeOverrides, // Apply top-level overrides
    palette: { // Deep merge palette specifically
      ...initialThemeOptions.palette,
      ...(themeOverrides.palette || {}),
      mode: mode, // Ensure mode is correctly set after all merges
    },
  };

  // Explicitly remove colorSchemes if it somehow got onto finalMergedOptions via themeOverrides,
  // as it's for CssVarsProvider, not standard ThemeProvider.
  if ('colorSchemes' in finalMergedOptions && finalMergedOptions.colorSchemes !== undefined) {
    delete (finalMergedOptions as Partial<ThemeOptions>).colorSchemes;
  }

  let theme = createMuiThemeInternal(finalMergedOptions as ThemeOptions);

  // Apply responsive font sizes
  theme = responsiveFontSizes(theme);

  return theme;
}
