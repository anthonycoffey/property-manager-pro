import type { ColorSystemOptions } from '@mui/material/styles';
import { themeConfig } from '../theme-config';
import { varAlpha, createPaletteChannel, createSimplePaletteChannel } from '../utils';
import type {
  ThemeColorScheme,
  PaletteColorKey,
  PaletteColorWithChannels,
  CommonColorsWithChannels,
  GreyColorsWithChannels,
  TypeTextWithChannels,
  TypeBackgroundWithChannels,
  ActionColorsWithChannels,
  FullyDefinedLightPalette, // Import the new specific type
} from '../types';


// --- Define Base Colors with Channels ---
const primary: PaletteColorWithChannels = createPaletteChannel(themeConfig.palette.primary);
const secondary: PaletteColorWithChannels = createPaletteChannel(themeConfig.palette.secondary);
const info: PaletteColorWithChannels = createPaletteChannel(themeConfig.palette.info);
const success: PaletteColorWithChannels = createPaletteChannel(themeConfig.palette.success);
const warning: PaletteColorWithChannels = createPaletteChannel(themeConfig.palette.warning);
const error: PaletteColorWithChannels = createPaletteChannel(themeConfig.palette.error);

const common: CommonColorsWithChannels = createSimplePaletteChannel(themeConfig.palette.common);
const grey: GreyColorsWithChannels = createSimplePaletteChannel(themeConfig.palette.grey);


// --- Define Text, Background, Action for Light Mode ---
// (Dark mode would have its own definitions if we were doing a custom dark theme)

const textLight: TypeTextWithChannels = {
  primary: grey[800],
  secondary: grey[600],
  disabled: grey[500],
  // Channels (assuming createSimplePaletteChannel or manual creation if needed for text)
  primaryChannel: grey['800Channel'],
  secondaryChannel: grey['600Channel'],
  disabledChannel: grey['500Channel'],
};

const backgroundLight: TypeBackgroundWithChannels = {
  paper: '#FFFFFF',
  default: grey[100],
  neutral: grey[200], // As defined in material-kit-react
  // Channels
  paperChannel: common.whiteChannel, // Assuming white is #FFFFFF -> 255,255,255
  defaultChannel: grey['100Channel'],
  neutralChannel: grey['200Channel'],
};

const actionLight: ActionColorsWithChannels = {
  active: grey[600],
  hover: varAlpha(grey['500Channel'] || '145, 158, 171', 0.08), // Fallback for channel
  selected: varAlpha(grey['500Channel'] || '145, 158, 171', 0.16),
  disabled: varAlpha(grey['500Channel'] || '145, 158, 171', 0.8),
  disabledBackground: varAlpha(grey['500Channel'] || '145, 158, 171', 0.24),
  focus: varAlpha(grey['500Channel'] || '145, 158, 171', 0.24),
  hoverOpacity: 0.08,
  disabledOpacity: 0.48,
  // activeChannel: grey['600Channel'], // if needed
};


// --- Assemble Light Palette ---
const lightPalette: FullyDefinedLightPalette = { // Use the specific type
  mode: 'light',
  primary,
  secondary,
  info,
  success,
  warning,
  error,
  common,
  grey,
  text: textLight,
  background: backgroundLight,
  divider: varAlpha(grey['500Channel'] || '145, 158, 171', 0.2),
  action: actionLight,
};

// --- Export Palette for Theme Creation ---
// We are only defining a light palette for now, as per Option A for dark mode.
// MUI will auto-generate dark mode from this light palette.
export const palette: Partial<Record<ThemeColorScheme, ColorSystemOptions['palette']>> = {
  light: lightPalette,
  // dark: darkPalette, // Would be defined here if doing custom dark theme
};
