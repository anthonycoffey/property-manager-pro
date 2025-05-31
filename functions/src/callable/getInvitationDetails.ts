import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger'; // Import logger
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface GetInvitationDetailsData {
  organizationId: string;
  invitationId: string;
}

// Modified interface
interface InvitationDetails {
  email?: string; // Make email optional
  displayName?: string;
}

export const getInvitationDetails = onCall(async (request) => {
  const { organizationId, invitationId } = request.data as GetInvitationDetailsData;

  // Log 1: Inputs
  logger.info('[getInvitationDetails] Called with:', { organizationId, invitationId });

  if (!organizationId || !invitationId) {
    logger.warn('[getInvitationDetails] Missing required fields:', { organizationId, invitationId });
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: organizationId, invitationId.'
    );
  }

  const invitationPath = `organizations/${organizationId}/invitations/${invitationId}`;
  logger.info(`[getInvitationDetails] Attempting to fetch invitation from path: ${invitationPath}`);

  try {
    const invitationDoc = await db.doc(invitationPath).get();

    if (!invitationDoc.exists) {
      logger.warn('[getInvitationDetails] Invitation not found at path:', { path: invitationPath });
      throw new HttpsError('not-found', 'Invitation not found.');
    }

    const invitationData = invitationDoc.data();
    // Log 2: Fetched Invitation Data
    logger.info('[getInvitationDetails] Fetched invitation data:', { invitationId, data: invitationData });

    if (!invitationData) {
      logger.error('[getInvitationDetails] Invitation data is corrupt or missing for doc:', { invitationId });
      throw new HttpsError('internal', 'Invitation data is corrupt or missing.');
    }

    if (invitationData.status !== 'pending') {
      logger.info(`[getInvitationDetails] Invitation ${invitationId} status is not pending: ${invitationData.status}`);
      throw new HttpsError(
        'failed-precondition',
        'Invitation is not pending (it may have been accepted, revoked, or expired).'
      );
    }
    
    // Check for expiration if `expiresAt` field exists
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
        logger.info(`[getInvitationDetails] Invitation ${invitationId} has expired.`);
        // Optionally update status to 'expired' here if not done by a scheduled job
        // await db.doc(invitationPath).update({ status: 'expired' });
        throw new HttpsError(
            'failed-precondition',
            'This invitation has expired.'
        );
    }

    const response: InvitationDetails = {
      // Ensure email is explicitly undefined if not present
      email: invitationData.email || undefined, 
    };
    
    // If you store a suggested display name with the invitation, you can return it too.
    // if (invitationData.suggestedDisplayName) {
    //   response.displayName = invitationData.suggestedDisplayName;
    // }

    // Log 3: Response being sent
    logger.info('[getInvitationDetails] Sending response:', { invitationId, response });

    return response;

  } catch (error: unknown) {
    // Log 4: Error caught
    logger.error('[getInvitationDetails] Error caught:', { invitationId, errorDetails: String(error) }); // Stringify error for better logging
    if (error instanceof HttpsError) {
      throw error;
    }
    throw handleHttpsError(error, 'An unexpected error occurred while fetching invitation details.');
  }
});
