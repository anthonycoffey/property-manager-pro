import * as functions from 'firebase-functions'; // Standard import
import { HttpsError } from 'firebase-functions/v1/https'; // Correct v1 types
import { db } from '../firebaseAdmin.js';
import {
  GetCampaignDetailsData,
  GetCampaignDetailsResult,
  Campaign,
  Invitation,
} from '../types.js';
import {
  getRoleFromContext,
  getUserOrganizations,
} from '../helpers/authHelpers.js';

/**
 * Gets the details for a specific campaign, including its associated invitations.
 * Permissions:
 * - Property Manager: Can fetch for campaigns belonging to properties in their organization.
 * - Organization Manager: Can fetch for campaigns within organizations they manage.
 * - Admin: Can fetch any campaign.
 */
export const getCampaignDetails = functions.https.onCall(
  async (
    request: functions.https.CallableRequest<GetCampaignDetailsData>
  ): Promise<GetCampaignDetailsResult> => {
    console.log('getCampaignDetails called with request:', JSON.stringify(request.data));

    // Ensure request.auth is checked correctly for v1 CallableRequest
    if (!request.auth || !request.auth.uid) {
      console.warn('Unauthenticated request:', request.auth);
      throw new HttpsError(
        'unauthenticated',
        'User must be authenticated and have a UID.'
      );
    }

    const typedData = request.data as GetCampaignDetailsData;
    const { campaignId, organizationId, propertyId } = typedData;

    console.log('Parsed data:', { campaignId, organizationId, propertyId });

    if (!campaignId || !organizationId || !propertyId) {
      console.warn('Missing required arguments:', { campaignId, organizationId, propertyId });
      throw new HttpsError(
        'invalid-argument',
        'Campaign ID, Organization ID, and Property ID must be provided.'
      );
    }

    const userRole = getRoleFromContext(request);
    const userId = request.auth.uid;

    console.log('User info:', { userId, userRole });

    let hasPermission = false;

    try {
      if (userRole === 'admin') {
        hasPermission = true;
        console.log('User is admin, permission granted.');
      } else if (userRole === 'organization_manager') {
        const managedOrgs = await getUserOrganizations(userId);
        console.log('Organization manager, managedOrgs:', managedOrgs);
        if (managedOrgs.includes(organizationId)) {
          hasPermission = true;
          console.log('Organization manager has access to this organization.');
        }
      } else if (userRole === 'property_manager') {
        const pmClaimOrgId = request.auth?.token?.organizationId;
        console.log('Property manager, pmClaimOrgId from token:', pmClaimOrgId);
        if (pmClaimOrgId && pmClaimOrgId === organizationId) {
          hasPermission = true;
          console.log('Property manager has access to this organization via custom claim.');
        }
      }

      if (!hasPermission) {
        console.warn('Permission denied for user:', userId);
        throw new HttpsError(
          'permission-denied',
          'User does not have permission to view this campaign.'
        );
      }

      const campaignRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('properties')
        .doc(propertyId)
        .collection('campaigns')
        .doc(campaignId);

      console.log('Fetching campaign from Firestore:', campaignRef.path);

      const campaignDoc = await campaignRef.get();

      if (!campaignDoc.exists) {
        console.warn('Campaign not found:', campaignRef.path);
        throw new HttpsError('not-found', 'Campaign not found.');
      }

      const campaignData = campaignDoc.data() as Campaign;
      campaignData.id = campaignDoc.id; // Ensure ID is part of the returned object

      console.log('Fetched campaign data:', campaignData);

      // Fetch associated invitations
      // Invitations are stored in organizations/{organizationId}/invitations
      // and linked by campaignId
      const invitationsSnapshot = await db
        .collection('organizations')
        .doc(organizationId)
        .collection('invitations')
        .where('campaignId', '==', campaignId)
        .get();

      console.log('Fetched invitations count:', invitationsSnapshot.size);

      const invitations: Invitation[] = [];
      invitationsSnapshot.forEach(
        (doc: FirebaseFirestore.QueryDocumentSnapshot) => {
          const invitation = doc.data() as Invitation;
          invitation.id = doc.id;
          invitations.push(invitation);
        }
      );

      console.log('Returning campaign details and invitations.');

      return { campaign: campaignData, invitations };
    } catch (error) {
      if (error instanceof HttpsError) {
        console.error('HttpsError thrown:', error);
        throw error;
      }
      console.error('Error fetching campaign details:', error);
      throw new HttpsError(
        'internal',
        'An internal error occurred while fetching campaign details.'
      );
    }
  }
);
