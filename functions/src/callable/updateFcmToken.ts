import { https } from 'firebase-functions/v1';
import { CallableContext } from 'firebase-functions/v1/https';
import { db } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface UpdateFcmTokenData {
  fcmToken: string;
}

export async function _updateFcmTokenLogic(data: UpdateFcmTokenData, context: CallableContext) {
  if (!context.auth) {
    throw handleHttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { uid } = context.auth;
  const { fcmToken } = data;

  if (!fcmToken) {
    throw handleHttpsError('invalid-argument', 'FCM token is required.');
  }

  const userProfileRef = db.collection('userProfiles').doc(uid);

  try {
    await userProfileRef.update({
      fcmTokens: FieldValue.arrayUnion(fcmToken),
    });
    return { success: true, message: 'FCM token updated successfully.' };
  } catch (error) {
    console.error(`Error updating FCM token for user ${uid}:`, error);
    throw handleHttpsError('internal', 'Failed to update FCM token.');
  }
}

export const updateFcmToken = https.onCall(
  async (data: UpdateFcmTokenData, context: CallableContext) => {
    return await _updateFcmTokenLogic(data, context);
  }
);
