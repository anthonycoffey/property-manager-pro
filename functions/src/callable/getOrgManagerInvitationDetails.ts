import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface GetOrgManagerInvitationDetailsData {
  invitationId: string;
}

interface OrgManagerInvitationDetails {
  email: string;
  displayName?: string;
  rolesToAssign: string[];
  organizationIds: string[] | null;
}

export const getOrgManagerInvitationDetails = onCall(async (request) => {
  const { invitationId } = request.data as GetOrgManagerInvitationDetailsData;

  if (!invitationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required field: invitationId.'
    );
  }

  const invitationPath = `globalInvitations/${invitationId}`;

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
      throw new HttpsError(
        'failed-precondition',
        'Invitation is not pending (it may have been accepted, revoked, or expired).'
      );
    }
    
    if (invitationData.expiresAt && invitationData.expiresAt.toDate() < new Date()) {
        throw new HttpsError(
            'failed-precondition',
            'This invitation has expired.'
        );
    }

    const response: OrgManagerInvitationDetails = {
      email: invitationData.email,
      rolesToAssign: invitationData.rolesToAssign || [],
      organizationIds: invitationData.organizationIds || null,
    };
    
    return response;

  } catch (error: unknown) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in getOrgManagerInvitationDetails:', error);
    throw handleHttpsError(error, 'An unexpected error occurred while fetching organization manager invitation details.');
  }
});
