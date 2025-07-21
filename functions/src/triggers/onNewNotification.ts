import { firestore, EventContext } from 'firebase-functions/v1';
import { db, messaging } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';
import { MulticastMessage } from 'firebase-admin/messaging';

interface Notification {
  title: string;
  body: string;
  link?: string;
  mobileLink?: string;
}

// Generic function to send a notification based on a direct user profile path
const sendNotificationToUser = async (snapshot: QueryDocumentSnapshot, userProfilePath: string) => {
  console.log(`[sendNotificationToUser] Triggered for notification ID: ${snapshot.id}`);
  console.log(`[sendNotificationToUser] Target user profile path: ${userProfilePath}`);

  const notificationData = snapshot.data() as Notification;
  const { title, body, link, mobileLink } = notificationData;
  console.log('[sendNotificationToUser] Notification Data:', JSON.stringify(notificationData, null, 2));

  const userProfileRef = db.doc(userProfilePath);
  const userProfileSnap = await userProfileRef.get();

  if (!userProfileSnap.exists) {
    console.error(`[sendNotificationToUser] User profile not found at path: ${userProfilePath}`);
    return;
  }
  console.log(`[sendNotificationToUser] Successfully fetched user profile for path: ${userProfilePath}`);

  const userProfile = userProfileSnap.data();
  const fcmTokens = userProfile?.fcmTokens;

  if (!fcmTokens || !Array.isArray(fcmTokens) || fcmTokens.length === 0) {
    console.log(`[sendNotificationToUser] No FCM tokens found for user at path: ${userProfilePath}`);
    return;
  }
  console.log(`[sendNotificationToUser] Found ${fcmTokens.length} FCM token(s):`, fcmTokens);

  const dataPayload: { [key: string]: string } = {};
  if (link) dataPayload.link = link;
  if (mobileLink) dataPayload.mobileLink = mobileLink;

  const message: MulticastMessage = {
    notification: { title, body },
    data: dataPayload,
    tokens: fcmTokens,
  };
  console.log('[sendNotificationToUser] Sending multicast message payload:', JSON.stringify(message, null, 2));

  const response = await messaging.sendEachForMulticast(message);
  console.log(
    `[sendNotificationToUser] FCM response: ${response.successCount} success, ${response.failureCount} failure.`
  );
  const tokensToRemove: string[] = [];

  response.responses.forEach((result, index) => {
    if (!result.success) {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', fcmTokens[index], error);
        if (
          error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered'
        ) {
          tokensToRemove.push(fcmTokens[index]);
        }
      }
    }
  });

  if (tokensToRemove.length > 0) {
    console.log(`[sendNotificationToUser] Removing ${tokensToRemove.length} invalid tokens:`, tokensToRemove);
    await userProfileRef.update({
      fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
    });
    console.log('[sendNotificationToUser] Successfully removed invalid tokens.');
  }

  await snapshot.ref.update({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
  });
  console.log(`[sendNotificationToUser] Successfully marked notification ${snapshot.id} as sent.`);
};

// Higher-order function to create a notification handler.
// It takes a function that constructs the user profile path from context parameters.
const createNotificationHandler = (pathBuilder: (params: EventContext['params']) => string) => {
  return async (snapshot: QueryDocumentSnapshot, context: EventContext) => {
    const userProfilePath = pathBuilder(context.params);
    await sendNotificationToUser(snapshot, userProfilePath);
  };
};

// Trigger for Admin notifications
export const onNewAdminNotification = firestore
  .document('admins/{adminId}/notifications/{notificationId}')
  .onCreate(createNotificationHandler((params) => `admins/${params.adminId}`));

// Trigger for general User notifications within an Organization (e.g., Property Managers)
export const onNewUserNotification = firestore
  .document('organizations/{organizationId}/users/{userId}/notifications/{notificationId}')
  .onCreate(createNotificationHandler((params) => `organizations/${params.organizationId}/users/${params.userId}`));

// Trigger for Resident notifications
export const onNewResidentNotification = firestore
  .document('organizations/{organizationId}/properties/{propertyId}/residents/{residentId}/notifications/{notificationId}')
  .onCreate(
    createNotificationHandler(
      (params) => `organizations/${params.organizationId}/properties/${params.propertyId}/residents/${params.residentId}`
    )
  );
