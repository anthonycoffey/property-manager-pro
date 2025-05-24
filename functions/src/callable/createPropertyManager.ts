import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createPropertyManager = onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check if the user has the 'admin' role
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can create property managers.'
    );
  }

  const { email, displayName, organizationId, password } = request.data;

  // Basic input validation
  if (!email || !displayName || !organizationId || !password) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, displayName, organizationId, password.'
    );
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await adminAuth.createUser({
      email: email,
      displayName: displayName,
      password: password,
    });

    const uid = userRecord.uid;

    // 2. Set custom claims for the new user
    const customClaims = {
      roles: ['property_manager'],
      organizationId: organizationId,
    };
    await adminAuth.setCustomUserClaims(uid, customClaims);
    console.log(
      `Custom claims set for new property manager ${uid}: ${JSON.stringify(
        customClaims
      )}`
    );

    // 3. Create user document in Firestore under the organization's users subcollection
    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('users')
      .doc(uid)
      .set({
        uid: uid,
        email: email,
        displayName: displayName,
        organizationRoles: ['property_manager'],
        organizationId: organizationId,
        createdAt: FieldValue.serverTimestamp(),
        status: 'active',
      });

    console.log(`Property manager profile created in Firestore for ${uid}`);

    return {
      success: true,
      message: 'Property manager created successfully',
      uid: uid,
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create property manager.');
  }
});
