import type { Theme as MuiTheme } from '@mui/material/styles'; // Added MuiThemeOptions
import {
  createTheme as createMuiThemeInternal,
  responsiveFontSizes,
} from '@mui/material/styles';

import { themeConfig } from './theme-config';
import { palette as appPalette } from './core/palette'; // Contains appPalette.light
import { typography as appTypography } from './core/typography';
import { shadows as appShadows } from './core/shadows';
import { customShadows as appCustomShadows } from './core/custom-shadows';
import { components as appComponents } from './core/components';
// Ensure PaletteColorWithChannels is imported for dark mode casts
import type { ThemeOptions, ThemeColorScheme } from './types';

interface CreateAppThemeProps {
  mode?: ThemeColorScheme;
  themeOverrides?: Partial<ThemeOptions>;
}

export function createAppTheme({
  mode = 'light',
  themeOverrides = {},
}: CreateAppThemeProps = {}): MuiTheme {
  // Use the extended palette type from our ThemeOptions
  let paletteOptionsForMode: ThemeOptions['palette'];

  if (mode === 'light') {
    // For light mode, use our fully defined light palette.
    // appPalette.light is now typed as AppPaletteOptions.
    // Deep clone to prevent modification of the original appPalette.light
    const lightPaletteParsed = JSON.parse(JSON.stringify(appPalette.light!));
    paletteOptionsForMode = lightPaletteParsed;
    // Ensure mode is explicitly set (already done in appPalette.light but good for safety)
    if (paletteOptionsForMode) paletteOptionsForMode.mode = 'light';

  } else { // mode === 'dark'
    // For dark mode, use our fully defined dark palette.
    // appPalette.dark is now available and typed as AppPaletteOptions.
    // Deep clone to prevent modification of the original appPalette.dark
    const darkPaletteParsed = JSON.parse(JSON.stringify(appPalette.dark!));
    paletteOptionsForMode = darkPaletteParsed;
    // Ensure mode is explicitly set (already done in appPalette.dark but good for safety)
    if (paletteOptionsForMode) paletteOptionsForMode.mode = 'dark';
  }

  // Construct the initial theme options using this mode-specific palette
  const initialThemeOptions: ThemeOptions = {
    palette: paletteOptionsForMode as ThemeOptions['palette'], // Assert type after conditional assignment
    typography: appTypography,
    shadows: mode === 'light' ? appShadows.light : appShadows.dark,
    customShadows: mode === 'light' ? appCustomShadows.light : appCustomShadows.dark,
    components: appComponents,
    shape: { borderRadius: 8 },
    cssVariables: themeConfig.cssVariables, // For potential CssVarsProvider use
  };

  // Merge with external overrides.
  const finalMergedOptions: ThemeOptions = {
    ...initialThemeOptions,
    ...themeOverrides, // Apply top-level overrides
    palette: {
      // Deep merge palette specifically
      ...initialThemeOptions.palette,
      ...(themeOverrides.palette || {}),
      mode: mode, // Ensure mode is correctly set after all merges
    },
  };

  // Explicitly remove colorSchemes if it somehow got onto finalMergedOptions via themeOverrides,
  // as it's for CssVarsProvider, not standard ThemeProvider.
  if (
    'colorSchemes' in finalMergedOptions &&
    finalMergedOptions.colorSchemes !== undefined
  ) {
    delete (finalMergedOptions as Partial<ThemeOptions>).colorSchemes;
  }

  let theme = createMuiThemeInternal(finalMergedOptions as ThemeOptions);

  // Apply responsive font sizes
  theme = responsiveFontSizes(theme);

  return theme;
}
