import { firestore } from 'firebase-functions/v1';
import { db, messaging } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { QueryDocumentSnapshot } from 'firebase-functions/v1/firestore';
import { MessagingDeviceResult } from 'firebase-admin/messaging';

interface Notification {
  userId: string;
  title: string;
  body: string;
  link?: string;
}

export const onNewNotification = firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snapshot: QueryDocumentSnapshot) => {
    const notificationData = snapshot.data() as Notification;
    const { userId, title, body, link } = notificationData;

    if (!userId) {
      console.error('Notification is missing userId.');
      return;
    }

    const userProfileRef = db.collection('userProfiles').doc(userId);
    const userProfileSnap = await userProfileRef.get();

    if (!userProfileSnap.exists) {
      console.error(`UserProfile not found for userId: ${userId}`);
      return;
    }

    const userProfile = userProfileSnap.data();
    const tokens = userProfile?.fcmTokens;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      console.log(`No FCM tokens found for user: ${userId}`);
      return;
    }

    const payload = {
      notification: {
        title,
        body,
      },
      data: {
        link: link || '',
      },
    };

    const response = await messaging.sendToDevice(tokens, payload);
    const tokensToRemove: string[] = [];

    response.results.forEach((result: MessagingDeviceResult, index: number) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        // Cleanup stale tokens
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
  });
