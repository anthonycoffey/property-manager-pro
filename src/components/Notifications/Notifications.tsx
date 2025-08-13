import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  MenuItem,
  Typography,
  CircularProgress,
  Box,
  Divider,
  Button,
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationsContext';
import type { Notification } from '../../types';
import { formatRelativeTime } from '../../utils/dates';

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markOneAsRead,
    markAllAsRead,
  } = useNotifications();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markOneAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
    handleMenuClose();
  };

  const handleViewAll = () => {
    navigate('/dashboard/notifications');
    handleMenuClose();
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    // Optimistically close the menu, or you could wait for the promise to resolve
    handleMenuClose();
  }

  return (
    <>
      <IconButton color="inherit" onClick={handleMenuOpen} aria-label="show new notifications">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>
      <Menu
        id="notifications-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          style: {
            maxHeight: 400,
            width: '350px',
          },
        }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
            <Typography variant="h6" sx={{ pl: 1}}>Notifications</Typography>
            <Button size="small" onClick={handleMarkAllRead} disabled={unreadCount === 0}>Mark all as read</Button>
        </Box>
        <Divider />
        {loading ? (
          <MenuItem>
            <CircularProgress size={20} />
          </MenuItem>
        ) : notifications.length > 0 ? (
          notifications.map((notification) => (
            <MenuItem
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              sx={{ whiteSpace: 'normal', my: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                {!notification.read && (
                  <Box
                    component="span"
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      mr: 1.5,
                      mt: '6px',
                      flexShrink: 0,
                    }}
                  />
                )}
                <Box sx={{ flexGrow: 1, ml: notification.read ? '20px' : '0' }}>
                  <Typography variant="body1" fontWeight="bold">
                    {notification.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {notification.body}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(notification.createdAt)}
                  </Typography>
                </Box>
              </Box>
            </MenuItem>
          ))
        ) : (
          <MenuItem onClick={handleMenuClose}>
            <Typography variant="body2">No new notifications</Typography>
          </MenuItem>
        )}
        <Divider />
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
            <Button fullWidth onClick={handleViewAll}>View all notifications</Button>
        </Box>
      </Menu>
    </>
  );
};

export default Notifications;
