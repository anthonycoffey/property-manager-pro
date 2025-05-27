import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  // IconButton, // Removed unused import
  Avatar,
  Switch, // Added Switch
  Stack, // Added Stack for layout
} from '@mui/material'; // Added Avatar
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PMPLogoLight from '/property-manager-pro-light.svg'; // Import the light logo
import AppRoutes from './routes';
import { useThemeMode } from './hooks/useThemeMode';
import { useAuth } from './hooks/useAuth';
import LogoutButton from './components/LogoutButton';
import { Link } from 'react-router-dom';

function App() {
  const { toggleColorMode, mode } = useThemeMode();
  const { currentUser } = useAuth();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position='static'>
        <Toolbar>
          <Avatar
            src={PMPLogoLight}
            alt='Property Manager Pro Logo'
            sx={{ width: 36, height: 36, mr: 1 }} // Adjusted size for AppBar
          />
          <Typography variant='h6' component='div' sx={{ flexGrow: 1 }}>
            Property Manager Pro
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mx: 2 }}>
            <LightModeIcon sx={{ color: mode === 'light' ? 'inherit' : 'action.disabled' }} />
            <Switch
              checked={mode === 'dark'}
              onChange={toggleColorMode}
              color="default"
            />
            <DarkModeIcon sx={{ color: mode === 'dark' ? 'inherit' : 'action.disabled' }} />
          </Stack>
          {currentUser ? (
            <LogoutButton />
          ) : (
            <Box>
              <Button color='inherit' component={Link} to='/login'>
                Login
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 3 }}>
        <AppRoutes />
      </Box>
    </Box>
  );
}

export default App;
