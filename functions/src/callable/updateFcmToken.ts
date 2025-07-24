import { https } from 'firebase-functions/v1';
import { CallableContext } from 'firebase-functions/v1/https';
import { db } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface UpdateFcmTokenData {
  fcmToken: string;
  organizationId: string;
  role: string;
  propertyId?: string;
}

export async function _updateFcmTokenLogic(data: UpdateFcmTokenData, context: CallableContext) {
  if (!context.auth) {
    throw handleHttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { uid } = context.auth;
  const { fcmToken, organizationId, role, propertyId } = data;

  if (!fcmToken || !organizationId || !role) {
    throw handleHttpsError(
      'invalid-argument',
      'FCM token, organizationId, and role are required.'
    );
  }

  let userProfileRef;

  if (role === 'resident') {
    if (!propertyId) {
      throw handleHttpsError(
        'invalid-argument',
        'PropertyId is required for resident role.'
      );
    }
    userProfileRef = db.doc(
      `organizations/${organizationId}/properties/${propertyId}/residents/${uid}`
    );
  } else {
    userProfileRef = db.doc(`organizations/${organizationId}/users/${uid}`);
  }

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
