import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { ReactNode } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { db } from '../firebaseConfig';
import type { UserNotification, PropertyNotification, Notification } from '../types';
import { NotificationsContext } from '../contexts/NotificationsContext';

export const NotificationsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { currentUser } = useAuth();
  const [userNotifications, setUserNotifications] = useState<UserNotification[]>([]);
  const [propertyNotifications, setPropertyNotifications] = useState<PropertyNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const getUserNotificationPath = useCallback(() => {
    if (!currentUser) return null;
    const roles = currentUser.customClaims?.roles || [];
    if (roles.includes('admin')) {
      return `admins/${currentUser.uid}/notifications`;
    }
    if (roles.includes('organization_manager')) {
       return `users/${currentUser.uid}/notifications`;
    }
    if (roles.includes('property_manager')) {
      const { organizationId } = currentUser.customClaims || {};
      if (organizationId) {
        return `organizations/${organizationId}/users/${currentUser.uid}/notifications`;
      }
    }
    if (roles.includes('resident')) {
      const { organizationId, propertyId } = currentUser.customClaims || {};
      if (organizationId && propertyId) {
        return `organizations/${organizationId}/properties/${propertyId}/residents/${currentUser.uid}/notifications`;
      }
    }
    return null;
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // --- Listener for User-Specific Notifications ---
    const userPath = getUserNotificationPath();
    let unsubscribeUser: () => void = () => {};
    if (userPath) {
      const userNotificationsRef = collection(db, userPath);
      const qUser = query(userNotificationsRef, orderBy('createdAt', 'desc'));
      unsubscribeUser = onSnapshot(qUser, (snapshot) => {
        const fetched = snapshot.docs.map(
          (d) => ({ ...d.data(), id: d.id } as UserNotification)
        );
        setUserNotifications(fetched);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user notifications:", error);
        setLoading(false);
      });
    } else {
      setUserNotifications([]);
      setLoading(false);
    }

    // --- Listener for Property-Wide Notifications ---
    const { propertyId, organizationId } = currentUser.customClaims || {};
    let unsubscribeProperty: () => void = () => {};
    if (propertyId && organizationId) {
      const propertyPath = `organizations/${organizationId}/properties/${propertyId}/notifications`;
      const propertyNotificationsRef = collection(db, propertyPath);
      const qProperty = query(propertyNotificationsRef, orderBy('createdAt', 'desc'));
      unsubscribeProperty = onSnapshot(qProperty, (snapshot) => {
        const fetched = snapshot.docs.map(
          (d) => ({ ...d.data(), id: d.id } as PropertyNotification)
        );
        setPropertyNotifications(fetched);
      }, (error) => {
        console.error("Error fetching property notifications:", error);
      });
    } else {
        setPropertyNotifications([]);
    }


    return () => {
      unsubscribeUser();
      unsubscribeProperty();
    };
  }, [currentUser, getUserNotificationPath]);

  const markOneAsRead = async (id: string) => {
    const userPath = getUserNotificationPath();
    if (!userPath) return;
    const notificationRef = doc(db, userPath, id);
    try {
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    const userPath = getUserNotificationPath();
    if (!userPath) return;
    const unread = userNotifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    const batch = writeBatch(db);
    unread.forEach((notification) => {
      const notificationRef = doc(db, userPath, notification.id);
      batch.update(notificationRef, { read: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const clearAll = async () => {
    const userPath = getUserNotificationPath();
    if (!userPath) return;

    const batch = writeBatch(db);
    userNotifications.forEach((notification) => {
        const notificationRef = doc(db, userPath, notification.id);
        batch.delete(notificationRef);
    });
    
    try {
        await batch.commit();
    } catch (error) {
        console.error("Error clearing all notifications:", error);
    }
  };

  const refreshNotifications = () => {
    // This can be expanded later if manual refresh is needed.
    // For now, onSnapshot handles real-time updates.
    console.log("Refreshing notifications...");
  };

  // --- Merge and Sort Notifications ---
  const mergedNotifications: Notification[] = [
    ...userNotifications.map(n => ({...n})),
    ...propertyNotifications.map(p => ({
        id: p.id,
        title: p.title,
        body: p.message,
        createdAt: p.createdAt,
        read: userNotifications.some(un => un.id === p.id && un.read), // Simplistic read status check
        link: p.link,
        mobileLink: p.mobileLink,
    }))
  ].sort((a, b) => (b.createdAt as Timestamp).toMillis() - (a.createdAt as Timestamp).toMillis());

  const unreadCount = mergedNotifications.filter(n => !n.read).length;

  const value = {
    notifications: mergedNotifications,
    unreadCount,
    loading,
    markOneAsRead,
    markAllAsRead,
    clearAll,
    refreshNotifications,
  };

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};
