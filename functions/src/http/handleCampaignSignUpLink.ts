import * as functions from 'firebase-functions'; // Keep for functions.config() and functions.logger
import {
  https as v1Https,
  Response as V1Response,
} from 'firebase-functions/v1';
// import * as admin from 'firebase-admin'; // No longer needed
import { HttpsError } from 'firebase-functions/v1/https';
import { db, FieldValue, FieldPath } from '../firebaseAdmin.js'; // Import db, FieldValue, and FieldPath
// admin.initializeApp() is handled in firebaseAdmin.ts
// const db = admin.firestore(); is replaced by imported db

// Helper function to send a response (simplified)
const sendResponse = (
  res: V1Response, // Use V1Response
  statusCode: number,
  body: string
) => {
  res.status(statusCode).send(body);
};

export const handleCampaignSignUpLink = v1Https.onRequest(
  // Use v1Https
  async (req: v1Https.Request, res: V1Response) => {
    // Use v1Https.Request and V1Response
    if (req.method !== 'GET') {
      sendResponse(res, 405, 'Method Not Allowed');
      return;
    }

    const campaignId = req.query.campaign as string;

    if (!campaignId) {
      sendResponse(res, 400, 'Campaign ID is required.');
      return;
    }

    try {
      const campaignSnap = await db
        .collectionGroup('campaigns') // Query across all properties
        .where('status', '==', 'active') // Must be active
        .where(FieldPath.documentId(), '==', campaignId) // Use imported FieldPath
        .limit(1)
        .get();

      if (campaignSnap.empty) {
        sendResponse(res, 404, 'Campaign not found or not active.');
        return;
      }

      const campaignDoc = campaignSnap.docs[0];
      const campaignData = campaignDoc.data();

      // Validate campaign
      if (campaignData.status !== 'active') {
        sendResponse(res, 403, 'This campaign is not currently active.');
        return;
      }

      if (
        campaignData.expiresAt &&
        campaignData.expiresAt.toMillis() < Date.now()
      ) {
        // Optionally update status to "expired"
        await campaignDoc.ref.update({ status: 'expired' });
        sendResponse(res, 403, 'This campaign has expired.');
        return;
      }

      if (
        campaignData.maxUses &&
        campaignData.totalAccepted >= campaignData.maxUses
      ) {
        // Optionally update status to "completed"
        if (campaignData.totalAccepted >= campaignData.maxUses) {
          await campaignDoc.ref.update({ status: 'completed' });
        }
        sendResponse(
          res,
          403,
          'This campaign has reached its maximum number of uses.'
        );
        return;
      }

      // All checks passed, create an invitation
      const invitationRef = db
        .collection('organizations')
        .doc(campaignData.organizationId)
        .collection('invitations')
        .doc(); // Auto-generate ID

      const invitationData = {
        campaignId: campaignDoc.id,
        rolesToAssign: campaignData.rolesToAssign,
        targetPropertyId: campaignData.targetPropertyId,
        organizationId: campaignData.organizationId,
        status: 'pending', // This invite is now pending user action
        createdAt: FieldValue.serverTimestamp(), // Use imported FieldValue
        expiresAt: campaignData.expiresAt || null, // Inherit from campaign
        // email will be captured on the AcceptInvitationPage
      };

      await invitationRef.set(invitationData);
      functions.logger.info(
        `Dynamically created invitation ${invitationRef.id} for campaign ${campaignDoc.id}`
      );

      // Redirect to AcceptInvitationPage
      let baseUrl: string;
      if (process.env.FUNCTIONS_EMULATOR === 'true') {
        const configuredDomain = functions.config().app?.domain;
        if (configuredDomain) {
          if (configuredDomain.toLowerCase() === "localhost") {
            baseUrl = 'http://localhost:5173';
          } else {
            baseUrl = configuredDomain.startsWith('http') ? configuredDomain : `https://${configuredDomain}`;
          }
        } else {
          baseUrl = 'http://localhost:5173';
        }
      } else {
        const prodDomain = functions.config().app?.domain;
        if (!prodDomain) {
          functions.logger.error(
            "CRITICAL: functions.config().app.domain is not set for production environment! Public campaign links will use hardcoded fallback. This MUST be configured."
          );
          baseUrl = 'https://phoenix-property-manager-pro.web.app';
        } else {
          baseUrl = `https://${prodDomain}`;
        }
      }
      
      // Pass invitationId, campaignId, and organizationId to the frontend page
      const joinUrl = `${baseUrl}/join-campaign?invitationId=${invitationRef.id}&campaignId=${campaignDoc.id}&organizationId=${campaignData.organizationId}`;

      res.redirect(302, joinUrl);
    } catch (error) {
      functions.logger.error(
        `Error in handleCampaignSignUpLink for campaignId ${campaignId}:`,
        error
      );
      if (error instanceof HttpsError) {
        // Should not happen here as we are not throwing HttpsError to client
        sendResponse(res, error.httpErrorCode.status, error.message);
      } else {
        sendResponse(res, 500, 'An internal error occurred.');
      }
    }
  }
);
