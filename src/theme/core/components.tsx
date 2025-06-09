import type { Theme, Components } from '@mui/material/styles';
import type { ContainerProps } from '@mui/material/Container';
import type { DialogProps } from '@mui/material/Dialog';
import type { DialogContentProps } from '@mui/material/DialogContent';
import type { GreyColorsWithChannels } from '../types';

import { varAlpha } from '../utils';

// --- Component Overrides ---

const MuiContainer: Components<Theme>['MuiContainer'] = {
  styleOverrides: {
    root: ({ theme, ownerState }: { theme: Theme; ownerState: ContainerProps }) => ({
      ...(!ownerState?.disableGutters && {
        [theme.breakpoints.only('xs')]: {
          paddingLeft: theme.spacing(1),
          paddingRight: theme.spacing(1),
        },
        [theme.breakpoints.only('sm')]: {
          paddingLeft: theme.spacing(2),
          paddingRight: theme.spacing(2),
        },
        [theme.breakpoints.up('md')]: {
          paddingLeft: theme.spacing(3),
          paddingRight: theme.spacing(3),
        },
      }),
    }),
  },
};

const MuiBackdrop: Components<Theme>['MuiBackdrop'] = {
  styleOverrides: {
    root: ({ theme }) => ({
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
        backgroundColor: theme.palette.grey[800],
      },
    }),
    sizeLarge: ({ theme }) => ({
      minHeight: 48,
      [theme.breakpoints.only('xs')]: {
        paddingTop: theme.spacing(0.75),
        paddingBottom: theme.spacing(0.75),
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
      },
    }),
  },
};

const MuiCard: Components<Theme>['MuiCard'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      zIndex: 0,
      position: 'relative',
      boxShadow: theme.customShadows?.card || 'none',
      borderRadius: theme.shape.borderRadius, // Default for md+
      [theme.breakpoints.down('sm')]: {
        borderRadius: theme.spacing(1), // 8px for xs, sm
      },
    }),
  },
};

const MuiCardHeader: Components<Theme>['MuiCardHeader'] = {
  defaultProps: {
    titleTypographyProps: { variant: 'h6' },
    subheaderTypographyProps: { variant: 'body2' },
  },
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(3, 3, 0), // Default for md+
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(2, 2, 0), // 16px for xs, sm
      },
    }),
  },
};

const MuiOutlinedInput: Components<Theme>['MuiOutlinedInput'] = {
  styleOverrides: {
    notchedOutline: ({ theme }) => ({
      borderColor: varAlpha(
        (theme.palette.grey as GreyColorsWithChannels)['500Channel'] ||
          '145, 158, 171',
        0.2
      ),
    }),
    input: ({ theme }) => ({
      padding: theme.spacing(2.0625, 1.75), // Approx 16.5px 14px (MUI default)
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.25, 1.5), // 10px V, 12px H for xs, sm
      },
    }),
  },
};

const MuiTableCell: Components<Theme>['MuiTableCell'] = {
  styleOverrides: {
    head: ({ theme }) => {
      const typography = theme.typography as typeof theme.typography &
        import('../types').TypographyCustom;
      return {
        fontSize: typography.pxToRem?.(14) || '0.875rem',
        color: theme.palette.text.secondary,
        fontWeight: typography.fontWeightSemiBold,
        backgroundColor:
          theme.palette.mode === 'dark'
            ? theme.palette.grey[700]
            : theme.palette.grey[100],
        padding: theme.spacing(2), // Default for md+
        [theme.breakpoints.down('sm')]: {
          padding: theme.spacing(1), // 8px for xs, sm
        },
      };
    },
    body: ({ theme }) => ({
      borderBottom: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(2), // Default for md+
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1), // 8px for xs, sm
      },
    }),
  },
};

const MuiTable: Components<Theme>['MuiTable'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius, // Default for md+
      borderCollapse: 'separate',
      overflow: 'hidden',
      [theme.breakpoints.down('sm')]: {
        borderRadius: theme.spacing(1), // 8px for xs, sm
      },
    }),
  },
};

const MuiTableRow: Components<Theme>['MuiTableRow'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      borderBottom: `1px solid ${theme.palette.divider}`,
      '&:last-child': {
        // borderBottom: 'none', // Consider if MuiTable has its own border
      },
    }),
  },
};

const MuiMenuItem: Components<Theme>['MuiMenuItem'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      ...theme.typography.body2,
      paddingTop: theme.spacing(1),    // 8px
      paddingBottom: theme.spacing(1), // 8px
      paddingLeft: theme.spacing(2),   // 16px
      paddingRight: theme.spacing(2),  // 16px
      [theme.breakpoints.down('sm')]: {
        paddingTop: theme.spacing(0.75),    // 6px
        paddingBottom: theme.spacing(0.75), // 6px
        paddingLeft: theme.spacing(1.5),   // 12px
        paddingRight: theme.spacing(1.5),  // 12px
      },
    }),
  },
};

const MuiLink: Components<Theme>['MuiLink'] = {
  defaultProps: {
    underline: 'hover',
  },
};

const MuiFormControlLabel: Components<Theme>['MuiFormControlLabel'] = {
  styleOverrides: {
    label: ({ theme }) => ({
      ...theme.typography.body2,
    }),
  },
};

const MuiCheckbox: Components<Theme>['MuiCheckbox'] = {
  defaultProps: { /* ... existing ... */ },
};

const MuiRadio: Components<Theme>['MuiRadio'] = {
  defaultProps: { /* ... existing ... */ },
};

// --- Dialog Component Overrides ---
const MuiDialog: Components<Theme>['MuiDialog'] = {
  styleOverrides: {
    paper: ({ theme }: { theme: Theme; ownerState: DialogProps }) => ({
      [theme.breakpoints.down('sm')]: {
        margin: theme.spacing(2),
        width: `calc(100% - ${theme.spacing(4)})`, // Account for new margins
        maxWidth: `calc(100% - ${theme.spacing(4)})`, // Ensure it doesn't exceed this
      },
    }),
  },
};

const MuiDialogTitle: Components<Theme>['MuiDialogTitle'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(2, 3), // Default
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(2, 2), // Reduced padding
      },
    }),
  },
};

const MuiDialogContent: Components<Theme>['MuiDialogContent'] = {
  styleOverrides: {
    root: ({ theme, ownerState }: { theme: Theme; ownerState: DialogContentProps }) => ({
      padding: ownerState?.dividers ? theme.spacing(1, 3) : theme.spacing(2, 3), // Default based on dividers
      [theme.breakpoints.down('sm')]: {
        paddingLeft: theme.spacing(2),
        paddingRight: theme.spacing(2),
        // Vertical padding might also need adjustment based on dividers
        paddingTop: ownerState?.dividers ? theme.spacing(1) : theme.spacing(2),
        paddingBottom: ownerState?.dividers ? theme.spacing(1) : theme.spacing(2),
      },
    }),
  },
};

const MuiDialogActions: Components<Theme>['MuiDialogActions'] = {
  styleOverrides: {
    root: ({ theme }) => ({
      padding: theme.spacing(1, 3), // Default
      [theme.breakpoints.down('sm')]: {
        padding: theme.spacing(1.5, 2), // 12px V, 16px H
      },
    }),
  },
};


// --- Export All Component Overrides ---
export const components: Components<Theme> = {
  MuiContainer, // Added
  MuiBackdrop,
  MuiButton,
  MuiCard,
  MuiCardHeader,
  MuiOutlinedInput,
  MuiTableCell,
  MuiTable,
  MuiTableRow,
  MuiMenuItem,
  MuiLink,
  MuiFormControlLabel,
  MuiCheckbox,
  MuiRadio,
  MuiDialog,          // Added
  MuiDialogTitle,     // Added
  MuiDialogContent,   // Added
  MuiDialogActions,   // Added
};
