import { firestore } from 'firebase-functions/v1';
import { db, messaging } from '../firebaseAdmin.js';
import { logger } from 'firebase-functions';

export const sendPropertyNotification = firestore
  .document('organizations/{organizationId}/properties/{propertyId}/notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const { organizationId, propertyId } = context.params;
    const notificationData = snap.data();

    if (!notificationData) {
      logger.error('No data associated with the event');
      return;
    }

    const { title, message } = notificationData;

    try {
      const residentsSnapshot = await db
        .collection(`organizations/${organizationId}/properties/${propertyId}/residents`)
        .get();

      if (residentsSnapshot.empty) {
        logger.log(`No residents found for property ${propertyId}.`);
        return;
      }

      const tokens = residentsSnapshot.docs.flatMap(
        (doc) => doc.data().fcmTokens || []
      );

      if (tokens.length === 0) {
        logger.log('No FCM tokens found for any resident.');
        return;
      }
      
      const payload = {
        notification: {
          title: title,
          body: message,
        },
      };

      // Chunk tokens into arrays of 500
      const tokenChunks = [];
      for (let i = 0; i < tokens.length; i += 500) {
        tokenChunks.push(tokens.slice(i, i + 500));
      }

      for (const chunk of tokenChunks) {
        const multicastMessage = {
          tokens: chunk,
          notification: payload.notification,
        };

        const result = await messaging.sendEachForMulticast(multicastMessage);
        logger.log(
          `Sent notification to a chunk of ${chunk.length} tokens. ` +
          `Success count: ${result.successCount}, Failure count: ${result.failureCount}`
        );

        if (result.failureCount > 0) {
          result.responses.forEach((response, idx) => {
            if (!response.success) {
              logger.error(
                `Failed to send notification to token: ${chunk[idx]}`,
                response.error
              );
            }
          });
        }
      }
    } catch (error) {
      logger.error('Error sending property notification:', error);
    }
  });
