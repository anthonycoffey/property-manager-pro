import React, { useState } from 'react';
import { IconButton, Badge, Menu, MenuItem, Typography } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';

const Notifications: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationCount] = useState(0); // Placeholder for actual notification count

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton color="inherit" onClick={handleMenuOpen} aria-label="show new notifications">
        <Badge badgeContent={notificationCount} color="error">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {notificationCount > 0 ? (
          <MenuItem onClick={handleMenuClose}>
            <Typography variant="body2">You have {notificationCount} new notifications.</Typography>
          </MenuItem>
        ) : (
          <MenuItem onClick={handleMenuClose}>
            <Typography variant="body2">No new notifications</Typography>
          </MenuItem>
        )}
        {/* Future: Map through actual notifications here */}
      </Menu>
    </>
  );
};

export default Notifications;
