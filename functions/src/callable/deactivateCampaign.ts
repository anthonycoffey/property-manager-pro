import * as functions from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v1/https';
import { db } from '../firebaseAdmin.js';
import { DeactivateCampaignData, CampaignActionResult, Campaign, InvitationStatus, CampaignStatus } from '../types.js'; // Added CampaignStatus
import { isUserRole } from '../helpers/authHelpers.js'; // Assuming getPropertyManagerOrganizations is not needed here directly for permission, but for role check

/**
 * Deactivates a campaign and cancels its pending invitations.
 * Permissions:
 * - Property Manager: Can deactivate any campaign within their organization.
 * - Organization Manager: Can deactivate any campaign within organizations they manage.
 * - Admin: Can deactivate any campaign.
 */
export const deactivateCampaign = functions.https.onCall(
  async (request: functions.https.CallableRequest<DeactivateCampaignData>): Promise<CampaignActionResult> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated and have a UID.');
    }

    const typedData = request.data as DeactivateCampaignData;
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
      } else if (isUserRole(request, 'property_manager')) {
        // PMs can deactivate any campaign in their org.
        // Need to verify this user (PM) actually belongs to 'organizationId'
        // This might involve a helper like `isPropertyManagerForOrg(userId, organizationId)`
        // For now, relying on the claim `request.auth.token.organizationId` if it's singular for PMs
        if (request.auth.token.organizationId === organizationId) {
            hasPermission = true;
        }
      }


      if (!hasPermission) {
        throw new HttpsError(
          'permission-denied',
          'User does not have permission to deactivate this campaign.'
        );
      }

      if (campaignData.status === 'inactive') {
        return { success: true, message: 'Campaign is already inactive.' };
      }
      
      if (['completed', 'expired', 'error'].includes(campaignData.status)) {
        throw new HttpsError('failed-precondition', `Campaign in status '${campaignData.status}' cannot be deactivated directly. It's already in a terminal state.`);
      }


      // Batch write for updating campaign and its invitations
      const batch = db.batch();

      // 1. Update campaign status to 'inactive'
      batch.update(campaignRef, { status: 'inactive' as CampaignStatus });

      // 2. Find and cancel pending invitations associated with this campaign
      const invitationsQuery = db
        .collection('organizations')
        .doc(organizationId)
        .collection('invitations')
        .where('campaignId', '==', campaignId)
        .where('status', '==', 'pending' as InvitationStatus);

      const invitationsSnapshot = await invitationsQuery.get();
      invitationsSnapshot.forEach(doc => {
        batch.update(doc.ref, { status: 'cancelled' as InvitationStatus });
      });

      await batch.commit();

      return { success: true, message: 'Campaign deactivated and pending invitations cancelled.' };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error deactivating campaign:', error);
      throw new HttpsError('internal', 'An internal error occurred while deactivating the campaign.');
    }
  }
);
