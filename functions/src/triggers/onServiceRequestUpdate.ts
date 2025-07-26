import { firestore } from 'firebase-functions/v1';
import { Change } from 'firebase-functions';
import { DocumentSnapshot } from 'firebase-admin/firestore';
import { db, messaging } from '../firebaseAdmin.js';
import { logger } from 'firebase-functions';
import { SendResponse } from 'firebase-admin/messaging';

// Notification messages mapped to service request statuses
const notificationMessages: { [key: string]: { title: string; message: string } } = {
  'en-route': {
    title: 'Technician En Route',
    message: 'Your technician is on their way.',
  },
  complete: {
    title: 'Service Complete',
    message: 'Your service request has been marked as complete.',
  },
  cancelled: {
    title: 'Service Canceled',
    message: 'Your service request has been canceled.',
  },
  // Add other status types and their messages as needed
};

export const onServiceRequestUpdate = firestore
  .document('organizations/{organizationId}/services/{serviceId}')
  .onUpdate(async (change: Change<DocumentSnapshot>) => {
    const serviceRequest = change.after.data();
    if (!serviceRequest) {
      logger.error('No data associated with the after event');
      return;
    }
    const previousServiceRequest = change.before.data();
    if (!previousServiceRequest) {
      logger.error('No data associated with the before event');
      return;
    }

    // Ensure the status has actually changed
    if (serviceRequest.status === previousServiceRequest.status) {
      logger.log(
        `Status for service ${change.after.id} has not changed. Exiting function.`
      );
      return;
    }

    const { organizationId, propertyId, residentId, status } = serviceRequest;

    // Validate required fields
    if (!organizationId || !propertyId || !residentId || !status) {
      logger.error('Missing required fields in service request document.', {
        serviceId: change.after.id,
      });
      return;
    }

    try {
      // Fetch organization to get custom notification settings
      const orgDocRef = db.doc(`organizations/${organizationId}`);
      const orgDoc = await orgDocRef.get();
      const orgData = orgDoc.data();

      const customNotifications = orgData?.notificationSettings;
      const notificationContent = (customNotifications && customNotifications[status])
        ? customNotifications[status]
        : notificationMessages[status];

      if (!notificationContent || !notificationContent.title || !notificationContent.message) {
        logger.log(
          `No notification configured for status: "${status}" in organization ${organizationId}. Exiting function.`
        );
        return;
      }

      // Fetch the resident's document to get their FCM tokens
      const residentDocRef = db.doc(
        `organizations/${organizationId}/properties/${propertyId}/residents/${residentId}`
      );
      const residentDoc = await residentDocRef.get();

      if (!residentDoc.exists) {
        logger.error(`Resident document not found: ${residentId}`);
        return;
      }

      const residentData = residentDoc.data();
      const tokens = residentData?.fcmTokens || [];

      if (tokens.length === 0) {
        logger.log(`No FCM tokens found for resident: ${residentId}.`);
        return;
      }

      const payload = {
        notification: {
          title: notificationContent.title,
          body: notificationContent.message,
        },
      };

      // Send notifications using sendEachForMulticast
      const multicastMessage = {
        tokens: tokens,
        notification: payload.notification,
      };

      const result = await messaging.sendEachForMulticast(multicastMessage);
      logger.log(
        `Sent notification to ${tokens.length} tokens for resident ${residentId}. ` +
        `Success count: ${result.successCount}, Failure count: ${result.failureCount}`
      );

      // Log any failures
      if (result.failureCount > 0) {
        result.responses.forEach((response: SendResponse, idx: number) => {
          if (!response.success) {
            logger.error(
              `Failed to send notification to token: ${tokens[idx]}`,
              response.error
            );
          }
        });
      }

      // If the service request is complete, send a review request notification
      if (status === 'complete') {
        const propertyDocRef = db.doc(
          `organizations/${organizationId}/properties/${propertyId}`
        );
        const propertyDoc = await propertyDocRef.get();
        const propertyData = propertyDoc.data();

        if (propertyData?.gmb?.placeId) {
          const reviewNotificationContent =
            customNotifications?.review;

          if (
            reviewNotificationContent?.title &&
            reviewNotificationContent?.message
          ) {
            const reviewLink = `https://search.google.com/local/writereview?placeid=${propertyData.gmb.placeId}`;
            const messageBody = reviewNotificationContent.message.replace(
              '{{reviewLink}}',
              reviewLink
            );

            const reviewPayload = {
              notification: {
                title: reviewNotificationContent.title,
                body: messageBody,
              },
            };

            const reviewMulticastMessage = {
              tokens: tokens,
              notification: reviewPayload.notification,
            };

            const reviewResult = await messaging.sendEachForMulticast(
              reviewMulticastMessage
            );
            logger.log(
              `Sent review request to ${tokens.length} tokens for resident ${residentId}. ` +
              `Success count: ${reviewResult.successCount}, Failure count: ${reviewResult.failureCount}`
            );
          }
        }
      }
    } catch (error) {
      logger.error(
        `Error processing service request update for ${change.after.id}:`,
        error
      );
    }
  });
