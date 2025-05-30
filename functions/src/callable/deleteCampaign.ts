import * as functions from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v1/https';
import { db } from '../firebaseAdmin.js';
import { DeleteCampaignData, CampaignActionResult, Campaign, InvitationStatus } from '../types.js';
import { isUserRole, isResourceCreator } from '../helpers/authHelpers.js';

/**
 * Deletes an inactive campaign and its pending/cancelled invitations.
 * Permissions:
 * - Creator of the campaign (if inactive).
 * - Organization Manager for the campaign's organization (if inactive).
 * - Admin (if inactive).
 */
export const deleteCampaign = functions.https.onCall(
  async (request): Promise<CampaignActionResult> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated and have a UID.');
    }

    const typedData = request.data as DeleteCampaignData;
    const { campaignId, organizationId, propertyId } = typedData;

    if (!campaignId || !organizationId || !propertyId) {
      throw new HttpsError(
        'invalid-argument',
        'Campaign ID, Organization ID, and Property ID must be provided.'
      );
    }

    const campaignRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('properties')
      .doc(propertyId)
      .collection('campaigns')
      .doc(campaignId);

    try {
      const campaignDoc = await campaignRef.get();
      if (!campaignDoc.exists) {
        throw new HttpsError('not-found', 'Campaign not found.');
      }
      const campaignData = campaignDoc.data() as Campaign;

      // Permission Check
      let hasPermission = false;
      if (isUserRole(request, 'admin')) {
        hasPermission = true;
      } else if (isUserRole(request, 'organization_manager')) {
        const tokenOrgIds = request.auth.token.organizationIds as string[] | undefined;
        if (tokenOrgIds?.includes(organizationId)) {
          hasPermission = true;
        }
      } else if (isResourceCreator(request, campaignData.createdBy)) {
        hasPermission = true;
      }

      if (!hasPermission) {
        throw new HttpsError(
          'permission-denied',
          'User does not have permission to delete this campaign.'
        );
      }

      // CRITICAL: Campaign must be inactive to be deleted
      if (campaignData.status !== 'inactive') {
        throw new HttpsError(
          'failed-precondition',
          `Campaign must be inactive to be deleted. Current status: '${campaignData.status}'.`
        );
      }

      // Batch write for deleting campaign and its non-terminal invitations
      const batch = db.batch();

      // 1. Delete the campaign document
      batch.delete(campaignRef);

      // 2. Find and delete pending or cancelled invitations associated with this campaign
      // Accepted and expired invitations are kept for historical record.
      const invitationsQuery = db
        .collection('organizations')
        .doc(organizationId)
        .collection('invitations')
        .where('campaignId', '==', campaignId)
        .where('status', 'in', ['pending', 'cancelled'] as InvitationStatus[]);

      const invitationsSnapshot = await invitationsQuery.get();
      invitationsSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      return { success: true, message: 'Campaign and associated pending/cancelled invitations deleted.' };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error deleting campaign:', error);
      throw new HttpsError('internal', 'An internal error occurred while deleting the campaign.');
    }
  }
);
