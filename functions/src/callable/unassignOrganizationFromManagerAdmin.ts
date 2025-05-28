import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const unassignOrganizationFromManagerAdmin = onCall(async (request) => {
  // 1. Authentication Check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // 2. Authorization Check
  const callerRoles = request.auth.token.roles as string[] | undefined;
  if (!callerRoles || !callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Caller does not have admin privileges.');
  }

  const { userId, organizationId } = request.data;

  // 3. Input Validation
  if (!userId || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: userId and organizationId.'
    );
  }

  try {
    // 4. Fetch Target User and their Current Claims
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

    // 5. Update Claims and Firestore
    const currentAssignedOrgIds = (currentClaims.organizationIds as string[]) || [];
    let newClaims = currentClaims;

    if (currentAssignedOrgIds.includes(organizationId)) {
      const updatedOrganizationIds = currentAssignedOrgIds.filter(id => id !== organizationId);
      newClaims = {
        ...currentClaims,
        organizationIds: updatedOrganizationIds,
      };
      await adminAuth.setCustomUserClaims(userId, newClaims);
      console.log(
        `User ${userId} (${userRecord.email}) custom claims updated to remove organization ${organizationId}. New claims: ${JSON.stringify(newClaims)}`
      );

      // Update the admins collection for denormalization
      const adminProfileRef = db.collection('admins').doc(userId);
      await adminProfileRef.update({
        assignedOrganizationIds: updatedOrganizationIds,
      });
      console.log(
        `Admin profile for user ${userId} updated in Firestore to remove organization ${organizationId}.`
      );

      // Delete the user's profile from the specific organization's users subcollection
      const orgUserProfileRef = db.doc(`organizations/${organizationId}/users/${userId}`);
      await orgUserProfileRef.delete();
      console.log(`User profile for ${userId} deleted from organizations/${organizationId}/users.`);

      return {
        success: true,
        message: `User ${userRecord.email} successfully unassigned from organization ${organizationId}.`,
        updatedClaims: newClaims,
      };
    }
    // If not assigned, the code below will execute as the 'if' block was not entered.
    console.log(
      `User ${userId} is not currently assigned to organization ${organizationId}. No changes made.`
    );
    return {
      success: true,
      message: `User ${userRecord.email} is not currently assigned to organization ${organizationId}.`,
      updatedClaims: currentClaims, // Return current claims as no update occurred
    };
  } catch (error: unknown) {
    throw handleHttpsError(
      error,
      'Failed to unassign organization from manager via admin function.'
    );
  }
});
