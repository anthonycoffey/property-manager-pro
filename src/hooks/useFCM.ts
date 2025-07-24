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
      if (currentUser && currentUser.customClaims) {
        const { roles, organizationId, propertyId } = currentUser.customClaims;

        if (!roles || roles.length === 0 || !organizationId) {
          // Not enough info to update token
          return;
        }

        const fcmToken = await requestNotificationPermission();
        if (fcmToken) {
          try {
            // Assuming the first role is the primary one for this context
            const role = roles[0];
            const payload: {
              fcmToken: string;
              organizationId: string;
              role: string;
              propertyId?: string;
            } = {
              fcmToken,
              organizationId,
              role,
            };

            if (role === 'resident' && propertyId) {
              payload.propertyId = propertyId;
            } else if (role === 'resident' && !propertyId) {
              console.error('Resident role requires a propertyId to update FCM token.');
              return;
            }

            await updateFcmToken(payload);
          } catch (error) {
            console.error('Failed to update FCM token:', error);
          }
        }
      }
    };

    handlePermission();
  }, [currentUser]);
};
