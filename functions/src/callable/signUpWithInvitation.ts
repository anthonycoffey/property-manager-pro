import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string;
  createdAt: FirebaseFirestore.FieldValue;
  status: string;
  invitedBy: string | null;
  roles?: string[];
  organizationRoles?: string[];
  propertyId?: string;
}

interface CustomClaims {
  roles: string[];
  organizationId?: string;
  organizationIds?: string[];
  propertyId?: string;
}

export const signUpWithInvitation = onCall(async (request) => {
  logger.info('[signUpWithInvitation] Function called. Request object:', request);
  logger.info('[signUpWithInvitation] Request data:', request.data);

  try {
    const {
      email,
      password,
      displayName,
      organizationId: orgIdFromRequest,
      invitationId,
      uid: preAuthUid,
    } = request.data;

    logger.info('[signUpWithInvitation] Received data:', request.data);

    if (!email || !displayName || !invitationId) {
      console.log('Missing required fields:', { email, displayName, invitationId });
      throw new HttpsError('invalid-argument', 'Missing required fields: email, displayName, invitationId.');
    }
    if (!preAuthUid && !password) {
      console.log('Password is required for email/password sign-up.');
      throw new HttpsError('invalid-argument', 'Password is required for email/password sign-up.');
    }

    let invitationDoc;
    let invitationData: FirebaseFirestore.DocumentData | undefined;
    let actualInvitationPath: string | undefined;

    try {
      if (orgIdFromRequest) {
        actualInvitationPath = `organizations/${orgIdFromRequest}/invitations/${invitationId}`;
        invitationDoc = await db.doc(actualInvitationPath).get();
        if (invitationDoc.exists) {
          invitationData = invitationDoc.data();
        }
      }

      if (!invitationData) {
        const globalInvitationPath = `globalInvitations/${invitationId}`;
        const globalInvitationDoc = await db.doc(globalInvitationPath).get();
        if (globalInvitationDoc.exists) {
          invitationDoc = globalInvitationDoc;
          invitationData = globalInvitationDoc.data();
          actualInvitationPath = globalInvitationPath;
        } else {
          console.log(`Invitation ${invitationId} not found.`);
          throw new HttpsError('not-found', `Invitation ${invitationId} not found.`);
        }
      }

      if (!invitationDoc || !invitationData) {
        console.log('Failed to load invitation data.');
        throw new HttpsError('internal', 'Failed to load invitation data.');
      }

      if (invitationData.status !== 'pending') {
        console.log('Invitation is not pending or has already been used.');
        throw new HttpsError('failed-precondition', 'Invitation is not pending or has already been used.');
      }

      if (invitationData.email) {
        if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
          logger.error(`Email mismatch: Invitation email (${invitationData.email}) vs provided email (${email}) for invitation ${invitationId}.`);
          throw new HttpsError('failed-precondition', 'The provided email does not match the invited email address.');
        }
      }

      const invOrganizationIds = invitationData.organizationIds as string[] | null;
      const invOrganizationId = invitationData.organizationId as string;
      const rolesToAssign = invitationData.rolesToAssign as string[];
      const targetPropertyId = invitationData.targetPropertyId as string | undefined;
      const invitedBy = invitationData.createdBy as string | undefined;

      if (!rolesToAssign || rolesToAssign.length === 0) {
        console.log('Invitation is missing rolesToAssign.');
        throw new HttpsError('internal', 'Invitation is missing rolesToAssign.');
      }

      let uid: string;
      let finalDisplayName = displayName;

      if (preAuthUid) {
        uid = preAuthUid;
        try {
          const existingUser = await adminAuth.getUser(uid);
          if (existingUser.email?.toLowerCase() !== email.toLowerCase()) {
            console.log('Social account email does not match the invitation email.');
            throw new HttpsError('failed-precondition', 'Social account email does not match the invitation email.');
          }
          finalDisplayName = existingUser.displayName || displayName;
          console.log(`Using pre-authenticated user ${uid} for email ${email} from social sign-on.`);
        } catch (authError) {
          console.error(`Error fetching pre-authenticated user ${uid}:`, authError);
          throw new HttpsError('internal', 'Failed to verify pre-authenticated user.');
        }
      } else {
        const userRecord = await adminAuth.createUser({
          email: email,
          password: password,
          displayName: displayName,
        });
        uid = userRecord.uid;
        console.log(`Auth user created via invitation: ${uid} for email ${email}`);
      }

      let claimsToSet: CustomClaims;

      if (rolesToAssign.includes('organization_manager')) {
        claimsToSet = {
          roles: ['organization_manager'],
          organizationIds: invOrganizationIds || [],
        };
      } else if (rolesToAssign.includes('resident') && targetPropertyId) {
        const singleOrgId =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : invOrganizationId;
        console.log({ singleOrgId });

        if (!singleOrgId) {
          console.log('Invitation data is missing a single organizationId for resident role.');
          throw new HttpsError('internal', 'Invitation data is missing a single organizationId for resident role.');
        }
        claimsToSet = {
          roles: rolesToAssign,
          organizationId: singleOrgId,
          propertyId: targetPropertyId,
        };
      } else if (rolesToAssign.includes('resident') && !targetPropertyId) {
        console.error(`Resident role assigned for ${uid} but targetPropertyId is missing in invitation ${invitationId}.`);
        throw new HttpsError('internal', 'Resident invitation is missing targetPropertyId.');
      } else {
        const singleOrgId =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null;
        if (!singleOrgId) {
          console.log('Invitation data is missing a single organizationId for this role type.');
          throw new HttpsError('internal', 'Invitation data is missing a single organizationId for this role type.');
        }
        claimsToSet = {
          roles: rolesToAssign,
          organizationId: singleOrgId,
        };
      }

      await adminAuth.setCustomUserClaims(uid, claimsToSet);
      console.log(`Custom claims set for invited user ${uid}: ${JSON.stringify(claimsToSet)}`);

      const baseProfileData = {
        uid: uid,
        email: email,
        displayName: finalDisplayName,
        createdAt: FieldValue.serverTimestamp(),
        status: 'active',
        invitedBy: invitedBy || null,
      };

      if (rolesToAssign.includes('organization_manager')) {
        if (invOrganizationIds && invOrganizationIds.length > 0) {
          for (const orgId of invOrganizationIds) {
            const userProfilePath = `organizations/${orgId}/users/${uid}`;
            const profileDataForOrgManager: UserProfileData = {
              ...baseProfileData,
              organizationId: orgId,
              organizationRoles: ['organization_manager'],
            };
            await db.doc(userProfilePath).set(profileDataForOrgManager);
            console.log(`User profile created for Organization Manager ${uid} in organization ${orgId} at ${userProfilePath}`);
          }
        } else {
          console.log(`Organization Manager ${uid} signed up without initial organization assignment. No org-specific profiles created at this time.`);
        }
      } else if (rolesToAssign.includes('resident')) {
        const singleOrgId =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : invOrganizationId;
        if (!singleOrgId || !targetPropertyId) {
          console.log('Cannot create resident profile without organizationId or propertyId from invitation.');
          throw new HttpsError('internal', 'Cannot create resident profile without organizationId or propertyId from invitation.');
        }
        const userProfilePath = `organizations/${singleOrgId}/properties/${targetPropertyId}/residents/${uid}`;
        const profileDataForResident: UserProfileData = {
          ...baseProfileData,
          organizationId: singleOrgId,
          roles: ['resident'],
          propertyId: targetPropertyId,
        };
        await db.doc(userProfilePath).set(profileDataForResident);
        console.log(`User profile created for Resident ${uid} at ${userProfilePath}`);
      } else {
        const singleOrgId =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null;
        if (!singleOrgId) {
          console.log('Cannot create profile for this role without organizationId from invitation.');
          throw new HttpsError('internal', 'Cannot create profile for this role without organizationId from invitation.');
        }
        const userProfilePath = `organizations/${singleOrgId}/users/${uid}`;
        const profileDataForOther: UserProfileData = {
          ...baseProfileData,
          organizationId: singleOrgId,
          organizationRoles: rolesToAssign,
        };
        await db.doc(userProfilePath).set(profileDataForOther);
        console.log(`User profile created for ${rolesToAssign.join(', ')} ${uid} at ${userProfilePath}`);
      }

      if (!actualInvitationPath) {
        console.log('Could not determine original invitation path to update status.');
        throw new HttpsError('internal', 'Could not determine original invitation path to update status.');
      }
      await db.doc(actualInvitationPath).update({
        status: 'accepted',
        acceptedByUid: uid,
        acceptedAt: FieldValue.serverTimestamp(),
      });
      console.log(`Invitation ${invitationId} at ${actualInvitationPath} status updated to 'accepted' by ${uid}.`);

      if (invitationData.campaignId && rolesToAssign.includes('resident')) {
        const campaignId = invitationData.campaignId as string;
        const campaignOrgId =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null;
        const campaignPropertyId = targetPropertyId;

        if (campaignOrgId && campaignPropertyId) {
          const campaignRef = db.doc(
            `organizations/${campaignOrgId}/properties/${campaignPropertyId}/campaigns/${campaignId}`
          );
          try {
            await db.runTransaction(async (transaction) => {
              const campaignDocSnap = await transaction.get(campaignRef);
              if (!campaignDocSnap.exists) {
                console.error(`Campaign ${campaignId} not found for update.`);
                return;
              }
              const campaign = campaignDocSnap.data();
              if (!campaign) {
                console.error(`Campaign data missing for ${campaignId}.`);
                return;
              }

              const newTotalAccepted = (campaign.totalAccepted || 0) + 1;
              const updates: { totalAccepted: number; status?: string } = {
                totalAccepted: newTotalAccepted,
              };

              if (
                campaign.expiresAt &&
                campaign.expiresAt.toMillis() < Date.now()
              ) {
                updates.status = 'expired';
              } else if (
                campaign.maxUses &&
                newTotalAccepted >= campaign.maxUses
              ) {
                updates.status = 'completed';
              }
              if (
                campaign.status !== 'expired' &&
                updates.status &&
                campaign.status !== updates.status
              ) {
                transaction.update(campaignRef, updates);
              } else {
                transaction.update(campaignRef, {
                  totalAccepted: newTotalAccepted,
                });
              }
              console.log(
                `Campaign ${campaignId} updated. New totalAccepted: ${newTotalAccepted}, Status: ${
                  updates.status || campaign.status
                }`
              );
            });
          } catch (campaignError) {
            console.error(`Error updating campaign ${campaignId}:`, campaignError);
          }
        } else {
          console.warn(
            `Could not determine campaign path for campaignId ${campaignId} due to missing org/property from invitation.`
          );
        }
      }

      return {
        success: true,
        uid: uid,
        message: 'User created and associated via invitation successfully.',
      };
    } catch (error: unknown) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error('Error in signUpWithInvitation:', error);
      throw handleHttpsError(
        error,
        'An unexpected error occurred during invitation sign-up.'
      );
    }
  } catch (e) {
    logger.error('[signUpWithInvitation] TOP LEVEL CRITICAL ERROR:', e);
    if (e instanceof HttpsError) {
      throw e;
    }
    throw new HttpsError(
      'internal',
      'A critical internal error occurred in signUpWithInvitation.'
    );
  }
});
