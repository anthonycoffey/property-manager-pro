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
  const callerOrgIds = (request.auth.token?.organizationIds as string[]) || []; // For organization_manager
  const { uid, organizationId } = request.data;

  // Permission check: Allow admin OR organization_manager for their assigned orgs
  if (callerRoles.includes('admin')) {
    // Admin has global access, no further org check needed for this operation
  } else if (callerRoles.includes('organization_manager')) {
    if (!callerOrgIds.includes(organizationId)) {
      throw new HttpsError(
        'permission-denied',
        'Organization managers can only delete property managers within their assigned organizations.'
      );
    }
  } else {
    throw new HttpsError(
      'permission-denied',
      'Caller does not have permission to delete property managers.'
    );
  }

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
