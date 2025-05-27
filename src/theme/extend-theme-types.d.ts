import '@mui/material/styles';
import type { CustomShadows, TypographyCustom, ThemeColorScheme, PaletteColorWithChannels, CommonColorsWithChannels, GreyColorsWithChannels, TypeTextWithChannels, TypeBackgroundWithChannels, ActionColorsWithChannels, PaletteColorKey } from './types'; // Ensure all necessary extended types are imported

declare module '@mui/material/styles' {
  // Allow configuration using `createTheme`
  interface ThemeOptions {
    customShadows?: CustomShadows;
    typography?: TypographyVariantsOptions & TypographyCustom; // Already in our ./types.ts ThemeOptions, but good for module augmentation clarity
    // For MUI's experimental CSS variables and color schemes
    colorSchemes?: Partial<Record<ThemeColorScheme, {
      palette?: PaletteOptions & { // Use PaletteOptions here
        [key in PaletteColorKey]?: PaletteColorWithChannels;
      } & {
        common?: CommonColorsWithChannels;
        grey?: GreyColorsWithChannels;
        text?: Partial<TypeTextWithChannels>;
        background?: Partial<TypeBackgroundWithChannels>;
        action?: Partial<ActionColorsWithChannels>;
        divider?: string;
      };
      shadows?: Shadows;
      customShadows?: CustomShadows;
    }>>;
    // cssVariables is already part of MuiThemeOptions if experimental_sx is true,
    // but we can ensure our specific structure is known.
    // cssVariables?: { cssVarPrefix?: string; colorSchemeSelector?: string; };
  }

  // Allow access through `theme.customShadows`
  interface Theme {
    customShadows: CustomShadows;
  }

  // Allow access through `theme.typography.fontSecondaryFamily` etc.
  // These are removed as TypographyCustom is already merged at the ThemeOptions.typography and Theme.typography level in types.ts
  // interface TypographyVariants extends TypographyCustom {}
  // interface TypographyVariantsOptions extends TypographyCustom {}


  // Extend Palette and PaletteOptions for channel colors and neutral background
  interface Palette {
    [key in PaletteColorKey]: PaletteColorWithChannels;
    common: CommonColorsWithChannels;
    grey: GreyColorsWithChannels;
    text: TypeTextWithChannels;
    background: TypeBackgroundWithChannels & { neutral: string; neutralChannel?: string };
    action: ActionColorsWithChannels;
    divider: string;
  }

  interface PaletteOptions {
    [key in PaletteColorKey]?: Partial<PaletteColorWithChannels>;
    common?: Partial<CommonColorsWithChannels>;
    grey?: Partial<GreyColorsWithChannels>;
    text?: Partial<TypeTextWithChannels>;
    background?: Partial<TypeBackgroundWithChannels & { neutral?: string; neutralChannel?: string }>;
    action?: Partial<ActionColorsWithChannels>;
    divider?: string;
  }

  // Extend individual palette color types if direct access to channels is needed on them
  // e.g. theme.palette.primary.mainChannel
  interface PaletteColor {
    // Add channel properties directly to MUI's PaletteColor
    mainChannel: string;
    lightChannel: string;
    darkChannel: string;
    contrastTextChannel?: string;
    lighterChannel?: string;
    darkerChannel?: string;
  }
  interface SimplePaletteColorOptions {
    // Add channel properties directly to MUI's SimplePaletteColorOptions
    mainChannel?: string;
    lightChannel?: string;
    darkChannel?: string;
    contrastTextChannel?: string;
    lighterChannel?: string;
    darkerChannel?: string;
  }


  // Extend TypeBackground for neutral color
  interface TypeBackground {
    neutral: string;
    neutralChannel?: string;
  }
  interface TypeBackgroundOptions {
    neutral?: string;
    neutralChannel?: string;
  }
}
