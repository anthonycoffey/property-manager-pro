import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from './firebaseConfig';

const VAPID_KEY = import.meta.env.VITE_VAPID_KEY;
console.log('VAPID_KEY:', VAPID_KEY);

export const initializeFCM = () => {
  return getMessaging(app);
};

export const requestNotificationPermission = async () => {
  try {
    const messaging = initializeFCM();
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (fcmToken) {
        return fcmToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    const messaging = initializeFCM();
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
