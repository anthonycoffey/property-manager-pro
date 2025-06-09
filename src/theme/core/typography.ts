import type { Breakpoint, TypographyVariantsOptions as MuiTypographyVariantsOptions } from '@mui/material/styles'; // Removed CSSObject
import { createTheme as createMuiTheme } from '@mui/material/styles'; // For accessing breakpoints

import { pxToRem, setFont } from '../utils';
import { themeConfig } from '../theme-config';
import type { TypographyCustom } from '../types'; // Import only TypographyCustom

// --- Responsive Font Sizes Helper ---
// (Adapted from material-kit-react)
type ResponsiveFontSizesInput = Partial<Record<Breakpoint, number>>;
type ResponsiveFontSizesResult = Record<string, { fontSize: string }>;

const defaultMuiSystemTheme = createMuiTheme(); // Create a default theme to access its breakpoints

function responsiveFontSizes(obj: ResponsiveFontSizesInput): ResponsiveFontSizesResult {
  const breakpoints: Breakpoint[] = defaultMuiSystemTheme.breakpoints.keys;

  return breakpoints.reduce((acc, breakpointKey) => {
    const value = obj[breakpointKey];

    if (value !== undefined && value >= 0) {
      acc[defaultMuiSystemTheme.breakpoints.up(breakpointKey)] = {
        fontSize: pxToRem(value),
      };
    }
    return acc;
  }, {} as ResponsiveFontSizesResult);
}

// --- Font Definitions ---
const primaryFont = setFont(themeConfig.fontFamily.primary); // Should be "Inter, sans-serif"
const secondaryFont = setFont(themeConfig.fontFamily.secondary); // Also "Inter, sans-serif" for now

// --- Typography Configuration ---
export const typography: MuiTypographyVariantsOptions & TypographyCustom = { // Use MuiTypographyVariantsOptions
  fontFamily: primaryFont,
  fontSecondaryFamily: secondaryFont, // Custom property
  fontWeightLight: 300,
  fontWeightRegular: 400,
  fontWeightMedium: 500,
  fontWeightSemiBold: 600, // Custom property
  fontWeightBold: 700,

  h1: {
    fontFamily: secondaryFont, // material-kit-react uses secondary for h1-h3
    fontWeight: 800, // from material-kit-react
    lineHeight: 80 / 64,
    fontSize: pxToRem(40),
    ...responsiveFontSizes({ sm: 52, md: 58, lg: 64 }),
  },
  h2: {
    fontFamily: secondaryFont,
    fontWeight: 800,
    lineHeight: 64 / 48,
    fontSize: pxToRem(32),
    ...responsiveFontSizes({ sm: 40, md: 44, lg: 48 }),
  },
  h3: {
    fontFamily: secondaryFont,
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(24),
    ...responsiveFontSizes({ sm: 26, md: 30, lg: 32 }),
  },
  h4: {
    // fontFamily: primaryFont, // Default to primary if not specified
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(20),
    ...responsiveFontSizes({ md: 24 }),
  },
  h5: {
    // fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(18),
    ...responsiveFontSizes({ sm: 19 }),
  },
  h6: {
    // fontFamily: primaryFont,
    fontWeight: 600, // material-kit-react uses 600
    lineHeight: 28 / 18,
    fontSize: pxToRem(17),
    ...responsiveFontSizes({ sm: 18 }),
  },
  subtitle1: {
    // fontFamily: primaryFont,
    fontWeight: 600,
    lineHeight: 1.5,
    fontSize: pxToRem(16),
    ...responsiveFontSizes({ xs: 14, sm: 15 }),
  },
  subtitle2: {
    // fontFamily: primaryFont,
    fontWeight: 600,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
    ...responsiveFontSizes({ xs: 13, sm: 13 }),
  },
  body1: {
    // fontFamily: primaryFont,
    lineHeight: 1.5,
    fontSize: pxToRem(16),
    ...responsiveFontSizes({ xs: 14, sm: 15 }),
  },
  body2: {
    // fontFamily: primaryFont,
    lineHeight: 22 / 14,
    fontSize: pxToRem(14),
    ...responsiveFontSizes({ xs: 13, sm: 13 }),
  },
  caption: {
    // fontFamily: primaryFont,
    lineHeight: 1.5,
    fontSize: pxToRem(12),
    ...responsiveFontSizes({ xs: 11 }),
  },
  overline: {
    // fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 1.5,
    fontSize: pxToRem(12),
    textTransform: 'uppercase',
    ...responsiveFontSizes({ xs: 11 }),
  },
  button: {
    // fontFamily: primaryFont,
    fontWeight: 700,
    lineHeight: 24 / 14,
    fontSize: pxToRem(14),
    textTransform: 'unset', // material-kit-react has this
    ...responsiveFontSizes({ xs: 13 }),
  },
};
