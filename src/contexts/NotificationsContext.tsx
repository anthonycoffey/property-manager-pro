import { createContext, useContext } from 'react';
import type { Notification } from '../types';

export interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markOneAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => void;
}

export const NotificationsContext = createContext<NotificationsContextType | undefined>(
  undefined
);

export const useNotifications = (): NotificationsContextType => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationsProvider'
    );
  }
  return context;
};
