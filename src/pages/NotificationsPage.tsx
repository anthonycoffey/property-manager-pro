import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
  Stack,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import DashboardPageWrapper from '../components/Layout/DashboardPageWrapper';
import { useNotifications } from '../contexts/NotificationsContext';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime } from '../utils/dates';
import type { Notification } from '../types';

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    loading,
    markAllAsRead,
    markOneAsRead,
    clearAll,
  } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markOneAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <DashboardPageWrapper title="Notifications" icon={NotificationsIcon}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={markAllAsRead}
            disabled={notifications.every((n) => n.read)}
          >
            Mark All as Read
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={clearAll}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </Stack>
      </Box>
      <Divider />
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : notifications.length > 0 ? (
        <List>
          {notifications.map((notification, index) => (
            <React.Fragment key={notification.id}>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNotificationClick(notification)}
                  alignItems="flex-start"
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                    {!notification.read && (
                      <Box
                        component="span"
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          backgroundColor: 'primary.main',
                          mr: 2,
                          mt: '12px',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="bold">
                          {notification.title}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography
                            component="span"
                            variant="body2"
                            color="text.primary"
                          >
                            {notification.body}
                          </Typography>
                          <Typography
                            component="span"
                            variant="caption"
                            sx={{ display: 'block', mt: 0.5 }}
                          >
                            {formatRelativeTime(notification.createdAt)}
                          </Typography>
                        </>
                      }
                      sx={{ ml: notification.read ? '26px' : '0' }}
                    />
                  </Box>
                </ListItemButton>
              </ListItem>
              {index < notifications.length - 1 && <Divider component="li" />}
            </React.Fragment>
          ))}
        </List>
      ) : (
        <Typography sx={{ textAlign: 'center', my: 4 }}>
          You have no notifications.
        </Typography>
      )}
    </DashboardPageWrapper>
  );
};

export default NotificationsPage;
