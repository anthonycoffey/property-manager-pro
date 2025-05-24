import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js'; // adminAuth not directly used, request.auth is
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const revokeInvitation = onCall(async (request) => {
  // 1. Authentication & Authorization
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    // Potentially allow Property Managers to revoke invitations they created within their org
    // For now, keeping it admin-only as per original structure in index.ts
    throw new HttpsError(
      'permission-denied',
      'Only administrators can revoke invitations.' // Adjust if PMs should also be able to
    );
  }

  // 2. Input Validation
  const { organizationId, invitationId } = request.data;
  if (!organizationId || !invitationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: organizationId, invitationId.'
    );
  }

  const invitationPath = `organizations/${organizationId}/invitations/${invitationId}`;
  const invitationRef = db.doc(invitationPath);

  try {
    // 3. Fetch Invitation
    const invitationDoc = await invitationRef.get();

    // 4. Validation
    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', `Invitation ${invitationId} not found in organization ${organizationId}.`);
    }

    const invitationData = invitationDoc.data();
    if (invitationData?.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        `Invitation ${invitationId} is not in 'pending' status. Current status: ${invitationData?.status}.`
      );
    }
    
    // Optional: Add check if admin is revoking or if PM is revoking their own org's invitation
    // if (callerRoles.includes('property_manager') && request.auth.token?.organizationId !== organizationId) {
    //   throw new HttpsError('permission-denied', 'Property managers can only revoke invitations within their own organization.');
    // }


    // 5. Action: Delete the invitation document
    // Alternatively, update status to 'revoked' if you want to keep a record
    await invitationRef.delete(); 
    // Example for soft delete:
    // await invitationRef.update({ status: 'revoked', revokedAt: FieldValue.serverTimestamp(), revokedBy: request.auth.uid });


    // 6. Logging
    console.log(
      `Invitation ${invitationId} in organization ${organizationId} revoked by ${request.auth.uid}.`
    );

    // 7. Return
    return {
      success: true,
      message: `Invitation ${invitationId} successfully revoked.`,
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to revoke invitation.');
  }
});
