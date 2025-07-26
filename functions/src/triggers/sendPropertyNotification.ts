import { firestore } from 'firebase-functions/v1';
import { db, messaging } from '../firebaseAdmin.js';
import { logger } from 'firebase-functions';
import { FieldValue } from 'firebase-admin/firestore';

interface Resident {
  fcmTokens?: string[];
  // Add other resident properties if needed for typing
}

export const sendPropertyNotification = firestore
  .document(
    'organizations/{organizationId}/properties/{propertyId}/notifications/{notificationId}'
  )
  .onCreate(async (snap, context) => {
    const { organizationId, propertyId } = context.params;
    const notificationData = snap.data();

    if (!notificationData) {
      logger.error('No data associated with the event');
      return;
    }

    const { title, message, link, mobileLink } = notificationData;

    try {
      const residentsSnapshot = await db
        .collection(
          `organizations/${organizationId}/properties/${propertyId}/residents`
        )
        .get();

      if (residentsSnapshot.empty) {
        logger.log(`No residents found for property ${propertyId}.`);
        return;
      }

      const residentsWithTokens = residentsSnapshot.docs
        .map((doc) => {
          const data = doc.data() as Resident;
          return {
            id: doc.id,
            ...data,
          };
        })
        .filter(
          (resident) => resident.fcmTokens && resident.fcmTokens.length > 0
        );

      if (residentsWithTokens.length === 0) {
        logger.log('No residents with FCM tokens found.');
        return;
      }

      const allTokens = residentsWithTokens.flatMap(
        (resident) => resident.fcmTokens || []
      );

      if (allTokens.length === 0) {
        logger.log('No FCM tokens found for any resident.');
        return;
      }

      // Prepare platform-specific data payloads
      const webData: { [key: string]: string } = {};
      if (link) webData.link = link;

      const mobileData: { [key: string]: string } = {};
      const mobileDeepLink = mobileLink || link; // Fallback to web link
      if (mobileDeepLink) mobileData.link = mobileDeepLink;

      const payload = {
        notification: {
          title: title,
          body: message,
        },
        data: webData,
        android: { data: mobileData },
        apns: {
          payload: {
            aps: { sound: 'default' },
            ...mobileData,
          },
        },
      };

      // Chunk tokens into arrays of 500
      const tokenChunks = [];
      for (let i = 0; i < allTokens.length; i += 500) {
        tokenChunks.push(allTokens.slice(i, i + 500));
      }

      for (const chunk of tokenChunks) {
        const multicastMessage = {
          tokens: chunk,
          ...payload,
        };

        const result = await messaging.sendEachForMulticast(multicastMessage);
        logger.log(
          `Sent notification to a chunk of ${chunk.length} tokens. ` +
            `Success count: ${result.successCount}, Failure count: ${result.failureCount}`
        );

        if (result.failureCount > 0) {
          const tokensToRemove: { [userId: string]: string[] } = {};

          result.responses.forEach((response, idx) => {
            if (!response.success) {
              const token = chunk[idx];
              logger.error(
                `Failed to send notification to token: ${token}`,
                response.error
              );

              const errorCode = response.error?.code;
              if (
                errorCode === 'messaging/invalid-registration-token' ||
                errorCode === 'messaging/registration-token-not-registered'
              ) {
                // Find which resident this token belongs to
                const resident = residentsWithTokens.find(
                  (r) => r.fcmTokens && r.fcmTokens.includes(token)
                );
                if (resident) {
                  if (!tokensToRemove[resident.id]) {
                    tokensToRemove[resident.id] = [];
                  }
                  tokensToRemove[resident.id].push(token);
                }
              }
            }
          });

          // Batch remove invalid tokens
          for (const residentId in tokensToRemove) {
            const userRef = db.doc(
              `organizations/${organizationId}/properties/${propertyId}/residents/${residentId}`
            );
            await userRef.update({
              fcmTokens: FieldValue.arrayRemove(...tokensToRemove[residentId]),
            });
            logger.log(
              `Removed ${tokensToRemove[residentId].length} invalid tokens for resident ${residentId}.`
            );
          }
        }
      }
    } catch (error) {
      logger.error('Error sending property notification:', error);
    }
  });
