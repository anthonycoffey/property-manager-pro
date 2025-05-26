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

interface PaletteColorSpec {
  lighter?: string;
  light: string;
  main: string;
  dark: string;
  darker?: string;
  contrastText: string;
}

interface PaletteColorWithChannels extends PaletteColorSpec {
  lighterChannel?: string;
  lightChannel: string;
  mainChannel: string;
  darkChannel: string;
  darkerChannel?: string;
}

// Takes a palette color specification and adds "Channel" versions (R,G,B string).
export function createPaletteChannel(colorSpec: PaletteColorSpec): PaletteColorWithChannels {
  const result: Partial<PaletteColorWithChannels> = { ...colorSpec };

  const shades: (keyof PaletteColorSpec)[] = ["lighter", "light", "main", "dark", "darker"];

  shades.forEach(shade => {
    const hexColor = colorSpec[shade];
    if (hexColor && hexColor.startsWith("#")) {
      const hex = hexColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      (result as any)[`${shade}Channel`] = `${r}, ${g}, ${b}`;
    }
  });
  // Ensure all required channel properties are present, even if undefined initially from colorSpec
  if (!result.lighterChannel && result.lighter) result.lighterChannel = ""; // Or derive if possible
  if (!result.lightChannel) result.lightChannel = "";
  if (!result.mainChannel) result.mainChannel = "";
  if (!result.darkChannel) result.darkChannel = "";
  if (!result.darkerChannel && result.darker) result.darkerChannel = "";


  return result as PaletteColorWithChannels;
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
        result[channelKey] = `${r}, ${g}, ${b}` as any; // Cast as any to assign to dynamic key
      }
    }
  }
  return result;
}
