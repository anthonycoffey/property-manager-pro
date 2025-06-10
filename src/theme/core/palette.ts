// import type { ColorSystemOptions } from '@mui/material/styles'; // Removed unused import
import { themeConfig } from '../theme-config';
import { varAlpha, createPaletteChannel, createSimplePaletteChannel } from '../utils';
import type {
  ThemeColorScheme,
  // PaletteColorKey, // Removed unused import
  PaletteColorWithChannels,
  CommonColorsWithChannels,
  GreyColorsWithChannels,
  TypeTextWithChannels,
  TypeBackgroundWithChannels,
  ActionColorsWithChannels,
  AppPaletteOptions, // Changed from FullyDefinedLightPalette
  // Assuming a similar structure for dark palette or a more generic one if needed
  // For now, let's assume AppPaletteOptions structure is compatible for dark mode too
  // or we can use a more generic MuiPaletteOptions type for the darkPalette object.
  // For simplicity, we'll aim for a compatible structure.
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

// --- Define Text, Background, Action for Dark Mode ---
const textDark: TypeTextWithChannels = {
  primary: '#E0E0E0',
  secondary: '#B0B0B0',
  disabled: '#757575',
  // Channels - these would need to be derived if varAlpha is used with them.
  // For now, direct hex values are used. If channels are needed,
  // we'd need a utility or manual definition like: '224,224,224' for #E0E0E0
  // For simplicity, if varAlpha is used for text, it might be with a common channel like white/black.
  primaryChannel: '224,224,224', // Example for #E0E0E0
  secondaryChannel: '176,176,176', // Example for #B0B0B0
  disabledChannel: '117,117,117', // Example for #757575
};

const backgroundDark: TypeBackgroundWithChannels = {
  paper: '#1E1E1E',
  default: '#121212',
  neutral: '#2C2C2C',
  // Channels
  paperChannel: '30,30,30', // Example for #1E1E1E
  defaultChannel: '18,18,18', // Example for #121212
  neutralChannel: '44,44,44', // Example for #2C2C2C
};

const actionDark: ActionColorsWithChannels = {
  active: '#FFFFFF', // Active icons/text could be pure white or a light primary shade
  hover: 'rgba(255, 255, 255, 0.08)',
  selected: 'rgba(255, 255, 255, 0.16)', // Increased opacity for selection
  disabled: 'rgba(255, 255, 255, 0.3)',
  disabledBackground: 'rgba(255, 255, 255, 0.12)',
  focus: 'rgba(255, 255, 255, 0.12)',
  hoverOpacity: 0.08,
  disabledOpacity: 0.3, // Match disabled text opacity if needed
  // activeChannel: '255,255,255', // if needed
};

const dividerDark = 'rgba(255, 255, 255, 0.12)'; // Standard dark mode divider

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
const lightPalette: AppPaletteOptions = { // Changed from FullyDefinedLightPalette
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
// Use FullyDefinedLightPalette to ensure the extended types are recognized.

// --- Assemble Dark Palette ---
// We'll use the same base colors (primary, secondary, etc.) for now,
// and the new textDark, backgroundDark, actionDark, and dividerDark.
// The type here should ideally be MuiTheme['palette'] or a compatible custom type.
// For now, casting to AppPaletteOptions for structural similarity,
// but this might need refinement if dark palette has different optional/required fields.
const darkPalette: AppPaletteOptions = { // Changed from FullyDefinedLightPalette
  mode: 'dark',
  primary, // Reusing from top, created with themeConfig.palette.primary
  secondary, // Reusing from top
  info,      // Reusing from top
  success,   // Reusing from top
  warning,   // Reusing from top
  error,     // Reusing from top
  common,    // Reusing from top (common.white, common.black)
  grey,      // Reusing from top (full grey scale)
  text: textDark,
  background: backgroundDark,
  divider: dividerDark,
  action: actionDark,
  // Ensure all fields from FullyDefinedLightPalette are covered if necessary,
  // or adjust the type of the exported 'palette' object.
  // contrastThreshold and tonalOffset are typically not set here but in createTheme options.
};

export const palette: Partial<Record<ThemeColorScheme, AppPaletteOptions>> = { // Changed from FullyDefinedLightPalette
  light: lightPalette,
  dark: darkPalette, // Add the new darkPalette
};
