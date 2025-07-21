import React, { useState, useEffect } from 'react';
import { IconButton, Badge, Menu, MenuItem, Typography, CircularProgress } from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useAuth } from '../../hooks/useAuth';
import { db as firestore } from '../../firebaseConfig';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import type { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';

const Notifications: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    let path = '';
    const roles = currentUser.customClaims?.roles || [];

    if (roles.includes('admin')) {
      path = `admins/${currentUser.uid}/notifications`;
    } else if (roles.includes('property_manager')) {
      const { organizationId } = currentUser.customClaims || {};
      if (organizationId) {
        path = `organizations/${organizationId}/users/${currentUser.uid}/notifications`;
      }
    } else if (roles.includes('resident')) {
      const { organizationId, propertyId } = currentUser.customClaims || {};
      if (organizationId && propertyId) {
        path = `organizations/${organizationId}/properties/${propertyId}/residents/${currentUser.uid}/notifications`;
      }
    }
    // Add paths for other roles as needed

    if (!path) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(firestore, path);
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Notification));
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    markNotificationsAsRead();
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.link) {
      navigate(notification.link);
    }
    handleMenuClose();
  };

  const markNotificationsAsRead = async () => {
    if (!currentUser) return;

    let path = '';
    const roles = currentUser.customClaims?.roles || [];

    if (roles.includes('admin')) {
      path = `admins/${currentUser.uid}/notifications`;
    } else if (roles.includes('property_manager')) {
      const { organizationId } = currentUser.customClaims || {};
      if (organizationId) {
        path = `organizations/${organizationId}/users/${currentUser.uid}/notifications`;
      }
    } else if (roles.includes('resident')) {
      const { organizationId, propertyId } = currentUser.customClaims || {};
      if (organizationId && propertyId) {
        path = `organizations/${organizationId}/properties/${propertyId}/residents/${currentUser.uid}/notifications`;
      }
    }

    if (!path) return;

    const unreadNotifications = notifications.filter(n => !n.read);
    for (const notification of unreadNotifications) {
      const notificationRef = doc(firestore, path, notification.id);
      await updateDoc(notificationRef, { read: true });
    }
  };

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
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {loading ? (
          <MenuItem>
            <CircularProgress size={20} />
          </MenuItem>
        ) : notifications.length > 0 ? (
          notifications.map(notification => (
            <MenuItem key={notification.id} onClick={() => handleNotificationClick(notification)}>
              <Typography variant="body2" fontWeight={notification.read ? 'normal' : 'bold'}>
                {notification.title}
              </Typography>
            </MenuItem>
          ))
        ) : (
          <MenuItem onClick={handleMenuClose}>
            <Typography variant="body2">No new notifications</Typography>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default Notifications;
