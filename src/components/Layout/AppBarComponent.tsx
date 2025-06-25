import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Avatar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Stack,
  // Container,
} from '@mui/material';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
// DashboardIcon will be dynamically used from NavItemConfig
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Notifications from '../Notifications/Notifications';
import ThemeToggle from './ThemeToggle'; // Import the new component
import { navigationItems } from '../../config/navigationConfig'; // Import new navigation config
import type { UserRole } from '../../config/navigationConfig'; // TYPE-ONLY IMPORTS

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

  const toggleDrawer =
    (open: boolean) => (event: React.KeyboardEvent | React.MouseEvent) => {
      if (
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return;
      }
      setDrawerOpen(open);
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

  const drawerList = () => {
    // Ensure roles are correctly typed and default to guest if not available
    // Roles are typically stored in customClaims on the Firebase user object
    const userRoles: UserRole[] = currentUser?.customClaims?.roles
      ? (currentUser.customClaims.roles as UserRole[])
      : ['guest'];

    const availableNavItems = navigationItems.filter((navItem) =>
      navItem.roles.some((role) => userRoles.includes(role))
    );

    return (
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
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
            }}
            onClick={toggleDrawer(false)} // Close drawer if header is clicked
            onKeyDown={toggleDrawer(false)} // Close drawer if header is focused and key pressed
          >
            {currentUser.photoURL ? (
              <Avatar
                src={currentUser.photoURL ?? undefined} // Handle null photoURL
                alt={currentUser.displayName || 'User Avatar'}
                sx={{ width: 56, height: 56, mb: 1 }}
              />
            ) : currentUser.displayName ? (
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  fontWeight: 'bold',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  mb: 1,
                }}
              >
                {currentUser.displayName.charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <AccountCircleIcon sx={{ width: 56, height: 56, mb: 1 }} />
            )}
            <Typography variant='subtitle1' sx={{ textAlign: 'center' }}>
              {currentUser.displayName ?? 'User'}{' '}
              {/* Handle null displayName */}
            </Typography>
            {currentUser.email && (
              <Typography
                variant='caption'
                color='text.secondary'
                sx={{ textAlign: 'center' }}
              >
                {currentUser.email}
              </Typography>
            )}
          </Box>
        )}
        <Divider />

        {/* Navigation List - takes available space */}
        <List
          sx={{ flexGrow: 1 }}
          onClick={toggleDrawer(false)}
          onKeyDown={toggleDrawer(false)}
        >
          {availableNavItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                onClick={() => {
                  navigate(item.path);
                  setDrawerOpen(false);
                }}
              >
                <ListItemIcon>
                  <item.icon />
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
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
                <ListItemButton
                  onClick={() => {
                    navigate('/delete-account');
                    setDrawerOpen(false);
                  }}
                >
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
        <Box sx={{ p: 2, mb: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <ThemeToggle toggleColorMode={toggleColorMode} mode={mode} />
        </Box>
      </Box>
    );
  }; // Added missing closing brace for drawerList

  return (
    <AppBar position='static'>
      <Toolbar>
        {/* Drawer Toggle */}
        <IconButton
          color='inherit'
          aria-label='open drawer'
          edge='start'
          onClick={toggleDrawer(true)}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        {/* App Logo/Title */}
        <Box
          sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/dashboard')}
        >
          <Avatar
            src='/mcu-logo-small.png'
            alt='App Logo'
            sx={{ width: 40, height: 40, mr: 2 }}
          />
          <Typography
            variant='h6'
            component='span'
            sx={{
              display: { xs: 'none', sm: 'block' },
              textDecoration: 'none',
              color: 'inherit',
              userSelect: 'none',
            }}
          >
            Property Manager Pro
          </Typography>
        </Box>

        {/* Theme Toggle and Notifications */}
        <Stack direction='row' spacing={2} alignItems='center'>
          <ThemeToggle toggleColorMode={toggleColorMode} mode={mode} />
          <Notifications />
        </Stack>

        <Drawer anchor='left' open={drawerOpen} onClose={toggleDrawer(false)}>
          {drawerList()}
        </Drawer>
      </Toolbar>
    </AppBar>
  );
};

export default AppBarComponent;
