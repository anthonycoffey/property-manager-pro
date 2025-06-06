import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Avatar,
  IconButton,
  Switch,
  Stack,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Notifications from '../Notifications/Notifications';

interface AppBarComponentProps {
  toggleColorMode: () => void;
  mode: 'light' | 'dark';
}

const AppBarComponent: React.FC<AppBarComponentProps> = ({
  toggleColorMode,
  mode,
}) => {
  const { currentUser, signOutUser } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = (open: boolean) => (
    event: React.KeyboardEvent | React.MouseEvent,
  ) => {
    if (
      event.type === 'keydown' &&
      ((event as React.KeyboardEvent).key === 'Tab' ||
        (event as React.KeyboardEvent).key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  const handleDashboard = () => {
    navigate('/dashboard');
    setDrawerOpen(false);
  };

  const handleLogin = () => {
    navigate('/login');
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    if (signOutUser) {
      try {
        await signOutUser();
        navigate('/login');
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
    setDrawerOpen(false);
  };

  const drawerList = () => (
    <Box
      sx={{ 
        width: 250, 
        height: '100%', // Ensure Box takes full height for flexbox positioning
        display: 'flex',
        flexDirection: 'column',
      }}
      role='presentation'
    >
      {/* User Profile Section - stays at top */}
      {currentUser && (
        <Box 
          sx={{ p: 2, display: 'flex', alignItems: 'center', flexDirection: 'column' }}
          onClick={toggleDrawer(false)} // Close drawer if header is clicked
          onKeyDown={toggleDrawer(false)} // Close drawer if header is focused and key pressed
        >
          {currentUser.photoURL ? (
            <Avatar
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User Avatar'}
              sx={{ width: 56, height: 56, mb: 1 }}
            />
          ) : currentUser.displayName ? (
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'secondary.main', mb: 1 }}>
              {currentUser.displayName.charAt(0).toUpperCase()}
            </Avatar>
          ) : (
            <AccountCircleIcon sx={{ width: 56, height: 56, mb: 1 }} />
          )}
          <Typography variant="subtitle1" sx={{textAlign: 'center'}}>
            {currentUser.displayName || 'User'}
          </Typography>
          {currentUser.email && (
             <Typography variant="caption" color="text.secondary" sx={{textAlign: 'center'}}>
               {currentUser.email}
             </Typography>
          )}
        </Box>
      )}
      <Divider />

      {/* Navigation List - takes available space */}
      <List sx={{ flexGrow: 1 }} onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
        {currentUser && (
          <ListItem disablePadding>
            <ListItemButton onClick={handleDashboard}>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary='Dashboard' />
            </ListItemButton>
          </ListItem>
        )}
        {currentUser ? (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary='Logout' />
            </ListItemButton>
          </ListItem>
        ) : (
          <ListItem disablePadding>
            <ListItemButton onClick={handleLogin}>
              <ListItemIcon>
                <LoginIcon />
              </ListItemIcon>
              <ListItemText primary='Login' />
            </ListItemButton>
          </ListItem>
        )}
      </List>
      
      {/* Delete Account Link - directly above theme toggle */}
      {currentUser && ( 
        <Box> 
          <Divider /> 
          <List onClick={toggleDrawer(false)} onKeyDown={toggleDrawer(false)}>
            <ListItem disablePadding>
              <ListItemButton onClick={() => { navigate('/delete-account'); setDrawerOpen(false); }}>
                <ListItemIcon>
                  <DeleteForeverIcon sx={{ color: 'error.main' }} />
                </ListItemIcon>
                <ListItemText primary='Delete Account' />
              </ListItemButton>
            </ListItem>
          </List>
        </Box>
      )}
      
      {/* Theme Toggle - pushed to bottom */}
      <Box> {/* Wrapper for theme toggle to prevent it from being part of the List's click handler */}
        <Divider />
        <Stack
          direction='row'
          spacing={1} // Increased spacing a bit for better visual separation
          alignItems='center'
          justifyContent='center' // Center the toggle
          sx={{ p: 2, mb:4 }} // Add padding around the toggle
        >
          <LightModeIcon
            sx={{
              color: mode === 'light' ? 'primary.main' : 'action.disabled', // Use theme color
              fontSize: '1.25rem',
            }}
          />
          <Switch
            checked={mode === 'dark'}
            onChange={toggleColorMode}
            color='primary' // Use primary color for switch
            size='small'
          />
          <DarkModeIcon
            sx={{
              color: mode === 'dark' ? 'primary.main' : 'action.disabled', // Use theme color
              fontSize: '1.25rem',
            }}
          />
        </Stack>
      </Box>
    </Box>
  );

  return (
    <AppBar position='static'>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        {/* Left Side: App Logo/Title */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
           <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Property Manager Pro
          </Typography>
        </Box>

        {/* Right Side: Notifications and Menu Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Notifications />
          {/* User Avatar or Menu Icon to toggle drawer */}
          {currentUser?.photoURL ? (
            <Avatar
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User Avatar'}
              sx={{ width: 32, height: 32, ml: 1.5, cursor: 'pointer' }} // Adjusted margin
              onClick={toggleDrawer(true)}
            />
          ) : currentUser?.displayName ? (
            <Avatar 
              sx={{ width: 32, height: 32, bgcolor: 'secondary.main', ml: 1.5, cursor: 'pointer' }} // Adjusted margin
              onClick={toggleDrawer(true)}
            >
              {currentUser.displayName.charAt(0).toUpperCase()}
            </Avatar>
          ) : (
             <IconButton
              onClick={toggleDrawer(true)}
              color='inherit'
              aria-label='open drawer'
              edge='end' // Ensure it's at the very end
              sx={{ ml: 0.5 }} // Adjusted margin
            >
              <MenuIcon />
            </IconButton>
          )}
        </Box>
        
        <Drawer
          anchor='right'
          open={drawerOpen}
          onClose={toggleDrawer(false)}
        >
          {drawerList()}
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};

export default AppBarComponent;
