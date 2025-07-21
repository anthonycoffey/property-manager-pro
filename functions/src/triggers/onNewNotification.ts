import { firestore, EventContext } from 'firebase-functions/v1';
import { db, messaging } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';
import { MessagingDeviceResult } from 'firebase-admin/messaging';

interface Notification {
  title: string;
  body: string;
  link?: string;
  mobileLink?: string;
}

// Generic function to send a notification based on a direct user profile path
const sendNotificationToUser = async (snapshot: QueryDocumentSnapshot, userProfilePath: string) => {
  const notificationData = snapshot.data() as Notification;
  const { title, body, link, mobileLink } = notificationData;

  const userProfileRef = db.doc(userProfilePath);
  const userProfileSnap = await userProfileRef.get();

  if (!userProfileSnap.exists) {
    console.error(`User profile not found at path: ${userProfilePath}`);
    return;
  }

  const userProfile = userProfileSnap.data();
  const tokens = userProfile?.fcmTokens;

  if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
    console.log(`No FCM tokens found for user at path: ${userProfilePath}`);
    return;
  }

  const payload = {
    notification: { title, body },
    data: {
      link: link,
      mobileLink: mobileLink,
    },
  };

  const response = await messaging.send(tokens, payload);
  const tokensToRemove: string[] = [];

  response.results.forEach((result: MessagingDeviceResult, index: number) => {
    const error = result.error;
    if (error) {
      console.error('Failure sending notification to', tokens[index], error);
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        tokensToRemove.push(tokens[index]);
      }
    }
  });

  if (tokensToRemove.length > 0) {
    await userProfileRef.update({
      fcmTokens: FieldValue.arrayRemove(...tokensToRemove),
    });
  }

  await snapshot.ref.update({
    status: 'sent',
    sentAt: FieldValue.serverTimestamp(),
  });
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
