import * as functions from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v1/https';
import { db } from '../firebaseAdmin.js';
import { ActivateCampaignData, CampaignActionResult, Campaign, CampaignStatus } from '../types.js';
import { isUserRole } from '../helpers/authHelpers.js';

/**
 * Activates an inactive campaign.
 * Permissions:
 * - Property Manager: Can activate any campaign within their organization.
 * - Organization Manager: Can activate any campaign within organizations they manage.
 * - Admin: Can activate any campaign.
 */
export const activateCampaign = functions.https.onCall(
  async (request: functions.https.CallableRequest<ActivateCampaignData>): Promise<CampaignActionResult> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated and have a UID.');
    }

    const typedData = request.data as ActivateCampaignData;
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
        if (request.auth.token.organizationId === organizationId) {
            hasPermission = true;
        }
      }

      if (!hasPermission) {
        throw new HttpsError(
          'permission-denied',
          'User does not have permission to activate this campaign.'
        );
      }

      if (campaignData.status === 'active') {
        return { success: true, message: 'Campaign is already active.' };
      }
      
      if (campaignData.status !== 'inactive') {
        throw new HttpsError('failed-precondition', `Campaign must be inactive to be reactivated. Current status: ${campaignData.status}.`);
      }

      // Update campaign status to 'active'
      await campaignRef.update({ status: 'active' as CampaignStatus });

      return { success: true, message: 'Campaign reactivated successfully.' };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error activating campaign:', error);
      throw new HttpsError('internal', 'An internal error occurred while activating the campaign.');
    }
  }
);
