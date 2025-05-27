import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const deletePropertyManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can delete property managers.'
    );
  }

  const { uid, organizationId } = request.data;

  if (!uid || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: uid, organizationId.'
    );
  }

  try {
    // 1. Delete Firebase Auth user
    await adminAuth.deleteUser(uid);
    console.log(`Firebase Auth user ${uid} deleted.`);

    // 2. Delete Firestore document
    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('users')
      .doc(uid)
      .delete();
    console.log(`Firestore profile deleted for ${uid}.`);

    return { success: true, message: 'Property manager deleted successfully' };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to delete property manager.');
  }
});
