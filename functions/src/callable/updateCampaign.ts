import * as functions from 'firebase-functions';
import { HttpsError } from 'firebase-functions/v1/https';
import { db, Timestamp } from '../firebaseAdmin.js';
import { UpdateCampaignData, CampaignActionResult, Campaign } from '../types.js';
import { isUserRole, isResourceCreator } from '../helpers/authHelpers.js';

/**
 * Updates mutable fields of a campaign.
 * Permissions:
 * - Creator of the campaign.
 * - Organization Manager for the campaign's organization.
 * - Admin.
 */
export const updateCampaign = functions.https.onCall(
  async (request: functions.https.CallableRequest<UpdateCampaignData>): Promise<CampaignActionResult> => {
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError('unauthenticated', 'User must be authenticated and have a UID.');
    }

    const typedData = request.data as UpdateCampaignData;
    const { campaignId, organizationId, propertyId, campaignName, maxUses, expiresAt } = typedData;

    if (!campaignId || !organizationId || !propertyId) {
      throw new HttpsError(
        'invalid-argument',
        'Campaign ID, Organization ID, and Property ID must be provided.'
      );
    }

    if (campaignName === undefined && maxUses === undefined && expiresAt === undefined) {
      throw new HttpsError(
        'invalid-argument',
        'At least one field (campaignName, maxUses, expiresAt) must be provided for update.'
      );
    }
    
    // Validate campaignName length if provided
    if (campaignName !== undefined && (campaignName.length < 3 || campaignName.length > 100)) {
      throw new HttpsError('invalid-argument', 'Campaign name must be between 3 and 100 characters.');
    }

    // Validate maxUses if provided
    if (maxUses !== undefined && maxUses !== null && (maxUses < 1 || maxUses > 10000)) {
        throw new HttpsError('invalid-argument', 'Max uses must be between 1 and 10,000, or null.');
    }

    // Validate expiresAt if provided (ensure it's a future date or null)
    if (expiresAt !== undefined && expiresAt !== null && expiresAt.toMillis() < Date.now()) {
        throw new HttpsError('invalid-argument', 'Expiration date must be in the future or null.');
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
        // Assuming OM's organizationIds are in claims or fetched by a helper
        // For simplicity, if role is OM and orgId matches, grant. Refine with actual org check.
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
          'User does not have permission to update this campaign.'
        );
      }

      // Prevent editing if campaign is not in an editable state (e.g., 'active' or 'inactive')
      // For now, allowing edits on 'active' or 'inactive'. 'completed', 'expired', 'error' might be non-editable.
      if (['completed', 'expired', 'error', 'processing'].includes(campaignData.status)) {
        throw new HttpsError('failed-precondition', `Campaign in status '${campaignData.status}' cannot be edited.`);
      }

      const updatePayload: Partial<Campaign> = {};
      if (campaignName !== undefined) {
        updatePayload.campaignName = campaignName;
      }
      if (maxUses !== undefined) { // Allows setting to null
        updatePayload.maxUses = maxUses;
      }
      if (expiresAt !== undefined) { // Allows setting to null
        // Ensure expiresAt is a Firestore Timestamp if not null
        updatePayload.expiresAt = expiresAt ? Timestamp.fromDate(new Date(expiresAt.toDate())) : null;
      }
      
      // Check if totalAccepted exceeds new maxUses
      if (updatePayload.maxUses !== undefined && updatePayload.maxUses !== null && campaignData.totalAccepted > updatePayload.maxUses) {
        throw new HttpsError('failed-precondition', `New max uses (${updatePayload.maxUses}) cannot be less than current accepted count (${campaignData.totalAccepted}).`);
      }


      await campaignRef.update(updatePayload);

      return { success: true, message: 'Campaign updated successfully.' };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      console.error('Error updating campaign:', error);
      throw new HttpsError('internal', 'An internal error occurred while updating the campaign.');
    }
  }
);
