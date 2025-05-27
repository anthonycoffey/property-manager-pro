// Converts a hex color string and an alpha value to an rgba string.
export function varAlpha(color: string, alpha: number): string {
  if (!color.startsWith("#")) {
    // If it's already a channel or something else, return as is (or handle error)
    // For now, assuming 'color' might be a 'channel' string like "R,G,B"
    if (color.includes(",")) {
      return `rgba(${color}, ${alpha})`;
    }
    // Fallback or error for unexpected format
    console.warn(`varAlpha: Unexpected color format "${color}". Returning opaque black.`);
    return `rgba(0,0,0,${alpha})`; // Corrected: no space before alpha
  }

  const hex = color.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Import types from their source files
import type { PaletteColorNoChannels } from '../theme-config';
import type { PaletteColorWithChannels as ExportedPaletteColorWithChannels } from '../types';

// Helper function to convert a hex color string to an "R, G, B" string
function hexToChannels(hexColor: string | undefined): string | undefined {
  if (hexColor && hexColor.startsWith("#")) {
    let hex = hexColor.replace("#", "");
    // Expand 3-digit hex to 6-digit hex
    if (hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }

    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        return `${r}, ${g}, ${b}`;
      }
    }
  }
  return undefined;
}

// Takes a palette color specification (PaletteColorNoChannels)
// and returns a new object conforming to PaletteColorWithChannels.
export function createPaletteChannel(colorSpec: PaletteColorNoChannels): ExportedPaletteColorWithChannels {
  const lightChannel = hexToChannels(colorSpec.light);
  const mainChannel = hexToChannels(colorSpec.main);
  const darkChannel = hexToChannels(colorSpec.dark);

  // PaletteColorNoChannels requires light, main, dark to be strings.
  // If they are not valid hex for some reason, hexToChannels will return undefined.
  // The type PaletteColorWithChannels requires these channels to be strings.
  if (lightChannel === undefined) {
    throw new Error(`Could not derive lightChannel for color: ${JSON.stringify(colorSpec.light)}`);
  }
  if (mainChannel === undefined) {
    throw new Error(`Could not derive mainChannel for color: ${JSON.stringify(colorSpec.main)}`);
  }
  if (darkChannel === undefined) {
    throw new Error(`Could not derive darkChannel for color: ${JSON.stringify(colorSpec.dark)}`);
  }

  return {
    // Spread the original color spec
    ...colorSpec,
    // Add channel properties
    lighterChannel: hexToChannels(colorSpec.lighter),
    lightChannel: lightChannel, // Ensured to be string
    mainChannel: mainChannel,   // Ensured to be string
    darkChannel: darkChannel,   // Ensured to be string
    darkerChannel: hexToChannels(colorSpec.darker),
    // contrastText is required in PaletteColorNoChannels.
    // contrastTextChannel is optional in ExportedPaletteColorWithChannels.
    contrastTextChannel: hexToChannels(colorSpec.contrastText),
  };
}

// Specific for grey scale or common colors which might not have full light/main/dark structure
interface SimpleColorSpec {
  [key: string]: string;
}

// This type should represent the original spec PLUS the channel versions.
// So, if Spec has { black: '#000' }, Result has { black: '#000', blackChannel: '0,0,0' }
type SimpleColorWithChannels<T extends SimpleColorSpec> = T & {
  [K in keyof T as `${string & K}Channel`]?: string;
};

export function createSimplePaletteChannel<T extends SimpleColorSpec>(simpleColorSpec: T): SimpleColorWithChannels<T> {
  const result = { ...simpleColorSpec } as SimpleColorWithChannels<T>;

  for (const key in simpleColorSpec) {
    if (Object.prototype.hasOwnProperty.call(simpleColorSpec, key)) {
      const channelKey = `${key}Channel` as keyof SimpleColorWithChannels<T>;
      const hexColor = simpleColorSpec[key];
      if (hexColor && hexColor.startsWith("#")) {
        const hex = hexColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        // @ts-expect-error: TypeScript expects the channelKey to be a valid key of SimpleColorWithChannels<T>
        (result as SimpleColorWithChannels<T>)[channelKey as string] = `${r}, ${g}, ${b}`;
      }
    }
  }
  return result;
}
