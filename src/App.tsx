import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
} from '@mui/material'; // Added Avatar
import LightModeIcon from '@mui/icons-material/LightMode'; // New Icon for light mode
import DarkModeIcon from '@mui/icons-material/DarkMode';   // New Icon for dark mode
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
          <IconButton sx={{ ml: 1 }} onClick={toggleColorMode} color='inherit'>
            {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
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
