import { varAlpha } from '../utils';
import { palette } from './palette'; // To access specific color channels
import type { CustomShadows as CustomShadowsInterface, ThemeColorScheme } from '../types';

// --- Helper to Create Shadow Color String ---
function createShadowColor(colorChannel: string): string {
  // material-kit-react definition:
  return `0 8px 16px 0 ${varAlpha(colorChannel, 0.24)}`;
}

// --- Create Custom Shadows Function ---
// This function will generate the set of custom shadows based on a base color channel.
function createCustomShadowsSet(baseColorChannel: string): CustomShadowsInterface {
  // Access specific color channels from the imported palette.
  // Ensure palette.light and its properties are defined before use.
  const p = palette.light;

  // Helper to safely get a channel or fallback
  const getChannel = (colorObj: any, channelName: string, fallbackHex: string): string => {
    if (colorObj && typeof colorObj === 'object' && channelName in colorObj) {
      return colorObj[channelName] as string;
    }
    // If fallbackHex is a full hex, convert to channel. Otherwise, assume it's already a channel string or simple color.
    if (fallbackHex.startsWith('#')) {
        const hex = fallbackHex.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `${r},${g},${b}`; // No spaces for consistency with varAlpha if it expects no spaces
    }
    return fallbackHex; // Assuming fallback is already a channel string like "0,0,0" or a direct color for varAlpha
  };

  const primaryChannel = getChannel(p?.primary, 'mainChannel', themeConfig.palette.primary.main);
  const secondaryChannel = getChannel(p?.secondary, 'mainChannel', themeConfig.palette.secondary.main);
  const infoChannel = getChannel(p?.info, 'mainChannel', themeConfig.palette.info.main);
  const successChannel = getChannel(p?.success, 'mainChannel', themeConfig.palette.success.main);
  const warningChannel = getChannel(p?.warning, 'mainChannel', themeConfig.palette.warning.main);
  const errorChannel = getChannel(p?.error, 'mainChannel', themeConfig.palette.error.main);
  const commonBlackChannel = getChannel(p?.common, 'blackChannel', '0,0,0');


  return {
    z1: `0 1px 2px 0 ${varAlpha(baseColorChannel, 0.16)}`,
    z4: `0 4px 8px 0 ${varAlpha(baseColorChannel, 0.16)}`,
    z8: `0 8px 16px 0 ${varAlpha(baseColorChannel, 0.16)}`,
    z12: `0 12px 24px -4px ${varAlpha(baseColorChannel, 0.16)}`,
    z16: `0 16px 32px -4px ${varAlpha(baseColorChannel, 0.16)}`,
    z20: `0 20px 40px -4px ${varAlpha(baseColorChannel, 0.16)}`,
    z24: `0 24px 48px 0 ${varAlpha(baseColorChannel, 0.16)}`,
    // Specific shadows from material-kit-react
    card: `0 0 2px 0 ${varAlpha(baseColorChannel, 0.2)}, 0 12px 24px -4px ${varAlpha(baseColorChannel, 0.12)}`,
    dialog: `-40px 40px 80px -8px ${varAlpha(commonBlackChannel, 0.24)}`,
    dropdown: `0 0 2px 0 ${varAlpha(baseColorChannel, 0.24)}, -20px 20px 40px -4px ${varAlpha(baseColorChannel, 0.24)}`,
    // Colored shadows
    primary: createShadowColor(primaryChannel),
    secondary: createShadowColor(secondaryChannel),
    info: createShadowColor(infoChannel),
    success: createShadowColor(successChannel),
    warning: createShadowColor(warningChannel),
    error: createShadowColor(errorChannel),
  };
}

// --- Export Custom Shadows for Light and Dark Mode ---
// For light mode, material-kit-react uses grey['500Channel'] as the base.
const lightGrey = palette.light?.grey;
const baseLightColorChannel = lightGrey && '500Channel' in lightGrey ? lightGrey['500Channel'] as string : '145, 158, 171'; // Fallback

export const customShadows: Partial<Record<ThemeColorScheme, CustomShadowsInterface>> = {
  light: createCustomShadowsSet(baseLightColorChannel),
  // dark: createCustomShadowsSet(darkBaseColorChannel) // Would use a different base for dark mode
};

// Re-import themeConfig for direct fallback if palette channels are not ready.
// This is a bit of a workaround for potential initialization order issues if this file
// is processed before palette.ts fully resolves its exports in some bundler scenarios.
// Ideally, palette.ts is structured to avoid this.
import { themeConfig } from '../theme-config';
