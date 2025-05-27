import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const updatePropertyManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgIds = (request.auth.token?.organizationIds as string[]) || []; // For organization_manager
  const { uid, email, displayName, organizationId, roles } = request.data;

  // Permission check: Allow admin OR organization_manager for their assigned orgs
  if (callerRoles.includes('admin')) {
    // Admin has global access
  } else if (callerRoles.includes('organization_manager')) {
    if (!callerOrgIds.includes(organizationId)) {
      throw new HttpsError(
        'permission-denied',
        'Organization managers can only update property managers within their assigned organizations.'
      );
    }
  } else {
    throw new HttpsError(
      'permission-denied',
      'Caller does not have permission to update property managers.'
    );
  }

  if (!uid || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: uid, organizationId.'
    );
  }

  try {
    const updates: { email?: string; displayName?: string } = {};
    if (email) updates.email = email;
    if (displayName) updates.displayName = displayName;

    if (Object.keys(updates).length > 0) {
      await adminAuth.updateUser(uid, updates);
      console.log(
        `Firebase Auth user ${uid} updated: ${JSON.stringify(updates)}`
      );
    }

    const user = await adminAuth.getUser(uid);
    const currentCustomClaims = user.customClaims || {};
    
    const newCustomClaims: Record<string, string | string[] | boolean | number | undefined> = { ...currentCustomClaims };
    if (roles) newCustomClaims.roles = roles;
    // Ensure organizationId is always present in claims for a property manager
    newCustomClaims.organizationId = organizationId; 


    await adminAuth.setCustomUserClaims(uid, newCustomClaims);
    console.log(
      `Custom claims updated for user ${uid}: ${JSON.stringify(
        newCustomClaims
      )}`
    );

    const firestoreUpdates: {
      displayName?: string;
      organizationRoles?: string[];
      // email is not typically updated in Firestore profile directly if auth is source of truth
    } = {};
    if (displayName) firestoreUpdates.displayName = displayName;
    if (roles) firestoreUpdates.organizationRoles = roles;
    // organizationId in Firestore doc usually doesn't change for a user within an org

    if (Object.keys(firestoreUpdates).length > 0) {
      await db
        .collection('organizations')
        .doc(organizationId)
        .collection('users')
        .doc(uid)
        .update(firestoreUpdates);
      console.log(
        `Firestore profile updated for ${uid}: ${JSON.stringify(
          firestoreUpdates
        )}`
      );
    }

    return { success: true, message: 'Property manager updated successfully' };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to update property manager.');
  }
});
