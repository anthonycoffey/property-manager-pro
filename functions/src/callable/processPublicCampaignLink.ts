import * as functions from 'firebase-functions';
import { https as v1Https } from 'firebase-functions/v1';
import { HttpsError, CallableContext } from 'firebase-functions/v1/https';
import { db, FieldValue } from '../firebaseAdmin.js';

interface ProcessLinkData {
  campaignId: string;
}

interface ProcessLinkResult {
  invitationId: string;
  campaignId: string;
  organizationId: string;
  targetPropertyId: string;
  rolesToAssign: string[];
  expiresAt?: number | null; // Pass expiry back to frontend if needed
}

export const processPublicCampaignLink = v1Https.onCall(
  async (data: ProcessLinkData, context: CallableContext): Promise<ProcessLinkResult> => {
    // App Check validation (optional but recommended for public callable functions)
    // if (context.app == undefined) {
    //   throw new HttpsError(
    //     'failed-precondition',
    //     'The function must be called from an App Check verified app.'
    //   );
    // }

    const { campaignId } = data;

    if (!campaignId || typeof campaignId !== 'string') {
      throw new HttpsError('invalid-argument', 'Campaign ID is required and must be a string.');
    }

    try {
      const campaignSnap = await db
        .collectionGroup('campaigns')
        .where('id', '==', campaignId) // Query on the new 'id' field
        .where('status', '==', 'active') // Ensure campaign is active
        .limit(1)
        .get();

      if (campaignSnap.empty) {
        throw new HttpsError('not-found', 'Campaign not found.');
      }

      const campaignDoc = campaignSnap.docs[0];
      const campaignData = campaignDoc.data();

      if (!campaignData) {
        // Should not happen if campaignSnap is not empty, but good practice
        throw new HttpsError('internal', 'Campaign data is missing.');
      }
      
      // Validate campaign
      if (campaignData.status !== 'active') {
        throw new HttpsError('failed-precondition', 'This campaign is not currently active.');
      }

      if (
        campaignData.expiresAt &&
        campaignData.expiresAt.toMillis() < Date.now()
      ) {
        await campaignDoc.ref.update({ status: 'expired' }).catch(err => {
            functions.logger.error(`Error updating campaign ${campaignDoc.id} to expired:`, err);
        });
        throw new HttpsError('failed-precondition', 'This campaign has expired.');
      }

      if (
        typeof campaignData.maxUses === 'number' && // Check if maxUses is a number
        typeof campaignData.totalAccepted === 'number' && // Check if totalAccepted is a number
        campaignData.totalAccepted >= campaignData.maxUses
      ) {
        if (campaignData.totalAccepted >= campaignData.maxUses) {
            await campaignDoc.ref.update({ status: 'completed' }).catch(err => {
                functions.logger.error(`Error updating campaign ${campaignDoc.id} to completed:`, err);
            });
        }
        throw new HttpsError('failed-precondition', 'This campaign has reached its maximum number of uses.');
      }

      // All checks passed, create an invitation
      const invitationRef = db
        .collection('organizations')
        .doc(campaignData.organizationId)
        .collection('invitations')
        .doc();

      const invitationData = {
        campaignId: campaignDoc.id,
        rolesToAssign: campaignData.rolesToAssign,
        targetPropertyId: campaignData.targetPropertyId,
        // organizationId: campaignData.organizationId, // Store as an array for consistency
        organizationIds: [campaignData.organizationId], // Consistent with systemPatterns.md
        status: 'pending',
        createdAt: FieldValue.serverTimestamp(),
        expiresAt: campaignData.expiresAt || null,
        // email will be captured on the JoinCampaignPage/AcceptInvitationPage
      };

      await invitationRef.set(invitationData);
      functions.logger.info(
        `Callable: Dynamically created invitation ${invitationRef.id} for campaign ${campaignDoc.id}`
      );

      return {
        invitationId: invitationRef.id,
        campaignId: campaignDoc.id,
        organizationId: campaignData.organizationId,
        targetPropertyId: campaignData.targetPropertyId,
        rolesToAssign: campaignData.rolesToAssign,
        expiresAt: campaignData.expiresAt ? campaignData.expiresAt.toMillis() : null,
      };

    } catch (error) {
      functions.logger.error(
        `Error in processPublicCampaignLink for campaignId ${campaignId}:`,
        error
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError('internal', 'An internal error occurred while processing the campaign link.');
    }
  }
);
