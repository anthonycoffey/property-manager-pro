import React from 'react';
import { Switch, Stack } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';

interface ThemeToggleProps {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ toggleColorMode, mode }) => {
  return (
    <Stack
      direction='row'
      spacing={1}
      alignItems='center'
      justifyContent='center'
    >
      <LightModeIcon
      />
      <Switch
        checked={mode === 'dark'}
        onChange={toggleColorMode}
        color='default'
        size='small'
      />
      <DarkModeIcon
      />
    </Stack>
  );
};

export default ThemeToggle;
