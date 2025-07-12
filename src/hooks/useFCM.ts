import { useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { requestNotificationPermission } from '../firebaseMessaging';
import { useAuth } from './useAuth';

const functions = getFunctions();
const updateFcmToken = httpsCallable(functions, 'updateFcmToken');

export const useFCM = () => {
  const { currentUser } = useAuth();

  useEffect(() => {
    const handlePermission = async () => {
      if (currentUser) {
        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          try {
            await updateFcmToken({ fcmToken });
          } catch (error) {
            console.error('Failed to update FCM token:', error);
          }
        }
      }
    };

    handlePermission();
  }, [currentUser]);
};
