import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const addOrganizationToManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];

  // 1. Verify Caller is Admin
  if (!callerRoles.includes('admin')) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can perform this action.'
    );
  }

  const { userId, newOrganizationId } = request.data;

  // 2. Input Validation
  if (!userId || !newOrganizationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: userId and newOrganizationId.'
    );
  }

  try {
    // 3. Fetch Target User and their Current Claims
    const userRecord = await adminAuth.getUser(userId);
    if (!userRecord) {
      throw new HttpsError('not-found', `User with ID ${userId} not found.`);
    }

    const currentClaims = userRecord.customClaims || {};
    const userRoles = (currentClaims.roles as string[]) || [];

    if (!userRoles.includes('organization_manager')) {
      throw new HttpsError(
        'failed-precondition',
        `User ${userId} is not an organization_manager.`
      );
    }

    // 4. Verify newOrganizationId exists (optional but good practice)
    const orgDoc = await db.doc(`organizations/${newOrganizationId}`).get();
    if (!orgDoc.exists) {
        throw new HttpsError('not-found', `Organization ${newOrganizationId} not found.`);
    }


    // 5. Update Claims
    const organizationIds = (currentClaims.organizationIds as string[]) || [];
    if (!organizationIds.includes(newOrganizationId)) {
      const updatedOrganizationIds = [...organizationIds, newOrganizationId];
      const newClaims = {
        ...currentClaims,
        organizationIds: updatedOrganizationIds,
      };
      await adminAuth.setCustomUserClaims(userId, newClaims);
      console.log(
        `User ${userId} (${userRecord.email}) assigned to new organization ${newOrganizationId}. New claims: ${JSON.stringify(newClaims)}`
      );

      // Optionally, create a reference in the new organization's user list if desired,
      // but the claim is the source of truth for access.
      // For now, we rely on the claim.

      return {
        success: true,
        message: `User ${userId} successfully assigned to organization ${newOrganizationId}.`,
        updatedClaims: newClaims,
      };
    }
    // If the user is already assigned, this code will now execute directly
    console.log(
      `User ${userId} is already assigned to organization ${newOrganizationId}. No changes made.`
    );
    return {
      success: true,
      message: `User ${userId} is already assigned to organization ${newOrganizationId}.`,
      updatedClaims: currentClaims, // Return current claims as no update occurred
    };
  } catch (error: unknown) {
    throw handleHttpsError(
      error,
      'Failed to assign organization to manager.'
    );
  }
});
