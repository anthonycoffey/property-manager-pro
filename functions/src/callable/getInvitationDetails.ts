import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface GetInvitationDetailsData {
  organizationId: string;
  invitationId: string;
}

interface InvitationDetails {
  email: string;
  displayName?: string; // If you decide to store/return display name from invitation
}

export const getInvitationDetails = onCall(async (request) => {
  const { organizationId, invitationId } = request.data as GetInvitationDetailsData;

  if (!organizationId || !invitationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: organizationId, invitationId.'
    );
  }

  const invitationPath = `organizations/${organizationId}/invitations/${invitationId}`;

  try {
    const invitationDoc = await db.doc(invitationPath).get();

    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', 'Invitation not found.');
    }

    const invitationData = invitationDoc.data();
    if (!invitationData) {
      throw new HttpsError('internal', 'Invitation data is corrupt or missing.');
    }

    if (invitationData.status !== 'pending') {
      // Consider if 'expired' should also be handled here or if client handles expiry based on expiresAt
      throw new HttpsError(
        'failed-precondition',
        'Invitation is not pending (it may have been accepted, revoked, or expired).'
      );
    }
    
    // Check for expiration if `expiresAt` field exists
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
        // Optionally update status to 'expired' here if not done by a scheduled job
        // await db.doc(invitationPath).update({ status: 'expired' });
        throw new HttpsError(
            'failed-precondition',
            'This invitation has expired.'
        );
    }

    const response: InvitationDetails = {
      email: invitationData.email,
    };
    
    // If you store a suggested display name with the invitation, you can return it too.
    // if (invitationData.suggestedDisplayName) {
    //   response.displayName = invitationData.suggestedDisplayName;
    // }

    return response;

  } catch (error: unknown) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in getInvitationDetails:', error);
    throw handleHttpsError(error, 'An unexpected error occurred while fetching invitation details.');
  }
});
