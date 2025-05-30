import type { Theme, Components } from '@mui/material/styles';
import SvgIcon from '@mui/material/SvgIcon';
import type { GreyColorsWithChannels } from '../types'; // Changed to GreyColorsWithChannels

import { varAlpha } from '../utils';
// Note: We are not directly importing palette, customShadows, etc. here.
// Instead, the overrides will receive the fully assembled `theme` object at runtime,
// which will contain the processed palette, customShadows, etc.

// --- Component Overrides ---

const MuiBackdrop: Components<Theme>['MuiBackdrop'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      // Accessing palette directly, not via theme.vars for standard ThemeProvider
      backgroundColor: varAlpha(
        (theme.palette.grey as GreyColorsWithChannels)['900Channel'] ||
          theme.palette.grey[900] ||
          '20, 26, 33',
        0.8
      ),
    }),
    invisible: {
      background: 'transparent',
    },
  },
};

const MuiButton: Components<Theme>['MuiButton'] = {
  defaultProps: {
    disableElevation: true,
  },
  styleOverrides: {
    containedInherit: ({ theme }) => ({
      color: theme.palette.common.white,
      backgroundColor: theme.palette.grey[800],
      '&:hover': {
        // backgroundColor: theme.palette.grey[700], // Slight change on hover
        backgroundColor: theme.palette.grey[800], // material-kit-react had same color
      },
    }),
    sizeLarge: {
      // As in material-kit-react
      minHeight: 48,
    },
  },
};

const MuiCard: Components<Theme>['MuiCard'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      zIndex: 0, // material-kit-react
      position: 'relative', // material-kit-react
      // theme.customShadows should be available if types are augmented correctly
      boxShadow: theme.customShadows?.card || 'none', // Fallback for customShadows
      borderRadius: theme.shape.borderRadius, // Reduced from * 2
    }),
  },
};

const MuiCardHeader: Components<Theme>['MuiCardHeader'] = {
  defaultProps: {
    // As in material-kit-react
    titleTypographyProps: { variant: 'h6' },
    subheaderTypographyProps: { variant: 'body2' },
  },
  styleOverrides: {
    root: ({ theme }) => ({
      // As in material-kit-react
      padding: theme.spacing(3, 3, 0),
    }),
  },
};

const MuiOutlinedInput: Components<Theme>['MuiOutlinedInput'] = {
  styleOverrides: {
    notchedOutline: ({ theme }) => ({
      // As in material-kit-react
      borderColor: varAlpha(
        (theme.palette.grey as GreyColorsWithChannels)['500Channel'] ||
          '145, 158, 171',
        0.2
      ),
    }),
  },
};

const MuiPaper: Components<Theme>['MuiPaper'] = {
  defaultProps: {
    // As in material-kit-react
    elevation: 0,
  },
  styleOverrides: {
    root: {
      // As in material-kit-react
      backgroundImage: 'none',
    },
    outlined: ({ theme }) => ({
      // As in material-kit-react
      borderColor: varAlpha(
        (theme.palette.grey as GreyColorsWithChannels)['500Channel'] ||
          '145, 158, 171',
        0.16
      ),
    }),
  },
};

const MuiTableCell: Components<Theme>['MuiTableCell'] = {
  styleOverrides: {
    head: ({ theme }) => {
      const typography = theme.typography as typeof theme.typography &
        import('../types').TypographyCustom; // Explicit cast
      return {
        fontSize: typography.pxToRem?.(14) || '0.875rem',
        color: theme.palette.text.secondary,
        fontWeight: typography.fontWeightSemiBold, // Custom addition
        // Using a color that adapts better to dark mode for table headers
        backgroundColor:
          theme.palette.mode === 'dark'
            ? theme.palette.grey[700]
            : theme.palette.grey[100], // Or theme.palette.action.hover
        // borderBottom will now come from MuiTableRow
      };
    },
    body: ({ theme }) => ({
      // New override for body cells
      borderBottom: `1px solid ${theme.palette.divider}`, // Remove bottom border for body cells
    }),
  },
};

const MuiTable: Components<Theme>['MuiTable'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      borderCollapse: 'separate', // Important for border-radius to work with borders
      overflow: 'hidden', // Ensures content respects the border radius
    }),
  },
};

const MuiTableRow: Components<Theme>['MuiTableRow'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderBottom: `1px solid ${theme.palette.divider}`,
      // To prevent double borders if the last row is also the last element in a bordered MuiTable
      '&:last-child': {
        // This might be too aggressive if MuiTable itself doesn't have a border.
        // Consider if MuiTable's border is the primary one.
        // If MuiTable has a border, this helps avoid a double line at the bottom.
        // borderBottom: 'none', // Potentially remove if MuiTable has its own border
      },
    }),
  },
};

const MuiMenuItem: Components<Theme>['MuiMenuItem'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      // As in material-kit-react
      ...theme.typography.body2,
    }),
  },
};

const MuiLink: Components<Theme>['MuiLink'] = {
  defaultProps: {
    // As in material-kit-react
    underline: 'hover',
  },
};

const MuiFormControlLabel: Components<Theme>['MuiFormControlLabel'] = {
  styleOverrides: {
    label: ({ theme }) => ({
      // As in material-kit-react
      ...theme.typography.body2,
    }),
  },
};

// Custom Checkbox and Radio icons from material-kit-react
const MuiCheckbox: Components<Theme>['MuiCheckbox'] = {
  defaultProps: {
    size: 'small',
    icon: (
      <SvgIcon fontSize='inherit'>
        {' '}
        {/* Use fontSize="inherit" for better scaling */}
        <path d='M17.9 2.318A5 5 0 0 1 22.895 7.1l.005.217v10a5 5 0 0 1-4.783 4.995l-.217.005h-10a5 5 0 0 1-4.995-4.783l-.005-.217v-10a5 5 0 0 1 4.783-4.996l.217-.004h10Zm-.5 1.5h-9a4 4 0 0 0-4 4v9a4 4 0 0 0 4 4h9a4 4 0 0 0 4-4v-9a4 4 0 0 0-4-4Z' />
      </SvgIcon>
    ),
    checkedIcon: (
      <SvgIcon fontSize='inherit'>
        <path d='M17 2a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm-1.625 7.255-4.13 4.13-1.75-1.75a.881.881 0 0 0-1.24 0c-.34.34-.34.89 0 1.24l2.38 2.37c.17.17.39.25.61.25.23 0 .45-.08.62-.25l4.75-4.75c.34-.34.34-.89 0-1.24a.881.881 0 0 0-1.24 0Z' />
      </SvgIcon>
    ),
    indeterminateIcon: (
      <SvgIcon fontSize='inherit'>
        <path d='M17,2 C19.7614,2 22,4.23858 22,7 L22,7 L22,17 C22,19.7614 19.7614,22 17,22 L17,22 L7,22 C4.23858,22 2,19.7614 2,17 L2,17 L2,7 C2,4.23858 4.23858,2 7,2 L7,2 Z M15,11 L9,11 C8.44772,11 8,11.4477 8,12 C8,12.5523 8.44772,13 9,13 L15,13 C15.5523,13 16,12.5523 16,12 C16,11.4477 15.5523,11 15,11 Z' />
      </SvgIcon>
    ),
  },
};

const MuiRadio: Components<Theme>['MuiRadio'] = {
  defaultProps: {
    size: 'small',
    icon: (
      <SvgIcon fontSize='inherit'>
        <path
          d='M12 2C13.9778 2 15.9112 2.58649 17.5557 3.6853C19.2002 4.78412 20.4819 6.3459 21.2388 8.17317C21.9957 10.0004 22.1937 12.0111 21.8079 13.9509C21.422 15.8907 20.4696 17.6725 19.0711 19.0711C17.6725 20.4696 15.8907 21.422 13.9509 21.8079C12.0111 22.1937 10.0004 21.9957 8.17317 21.2388C6.3459 20.4819 4.78412 19.2002 3.6853 17.5557C2.58649 15.9112 2 13.9778 2 12C2 6.477 6.477 2 12 2ZM12 3.5C9.74566 3.5 7.58365 4.39553 5.98959 5.98959C4.39553 7.58365 3.5 9.74566 3.5 12C3.5 14.2543 4.39553 16.4163 5.98959 18.0104C7.58365 19.6045 9.74566 20.5 12 20.5C14.2543 20.5 16.4163 19.6045 18.0104 18.0104C19.6045 16.4163 20.5 14.2543 20.5 12C20.5 9.74566 19.6045 7.58365 18.0104 5.98959C16.4163 4.39553 14.2543 3.5 12 3.5Z'
          fill='currentColor'
        />
      </SvgIcon>
    ),
    checkedIcon: (
      <SvgIcon fontSize='inherit'>
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 8C10.9391 8 9.92172 8.42143 9.17157 9.17157C8.42143 9.92172 8 10.9391 8 12C8 13.0609 8.42143 14.0783 9.17157 14.8284C9.92172 15.5786 10.9391 16 12 16C13.0609 16 14.0783 15.5786 14.8284 14.8284C15.5786 14.0783 16 13.0609 16 12C16 10.9391 15.5786 9.92172 14.8284 9.17157C14.0783 8.42143 13.0609 8 12 8Z'
          fill='currentColor'
        />
      </SvgIcon>
    ),
  },
};

// --- Export All Component Overrides ---
export const components: Components<Theme> = {
  MuiBackdrop,
  MuiButton,
  MuiCard,
  MuiCardHeader,
  MuiOutlinedInput,
  MuiPaper,
  MuiTableCell,
  MuiTable,
  MuiTableRow,
  MuiMenuItem,
  MuiLink,
  MuiFormControlLabel,
  MuiCheckbox,
  MuiRadio,
  // Add other components as needed
};
