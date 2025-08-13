import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

import { Address } from '../types.js';

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
  address?: Address;
}

interface CustomClaims {
  roles: string[];
  organizationId?: string;
  organizationIds?: string[];
  propertyId?: string;
}

export const signUpWithInvitation = onCall(async (request) => {
  // Enhanced initial logging
  // The 'request' object itself can have circular structures, so we log specific parts.
  logger.info(
    '[signUpWithInvitation] Function called. Auth object (if present):',
    request.auth ? JSON.stringify(request.auth, null, 2) : 'No auth object'
  );
  logger.info('[signUpWithInvitation] Request data payload:', request.data);

  try {
    const {
      email,
      password,
      displayName,
      organizationId: orgIdFromRequest,
      invitationId,
      uid: preAuthUid,
    } = request.data;

    logger.info('[signUpWithInvitation] Parsed request data:', {
      email,
      displayName,
      orgIdFromRequest,
      invitationId,
      preAuthUid: preAuthUid || 'N/A',
    });

    if (!email || !displayName || !invitationId) {
      logger.warn(
        '[signUpWithInvitation] Missing required fields from client:',
        {
          emailExists: !!email,
          displayNameExists: !!displayName,
          invitationIdExists: !!invitationId,
        }
      );
      throw new HttpsError(
        'invalid-argument',
        'Missing required fields: email, displayName, invitationId.'
      );
    }
    if (!preAuthUid && !password) {
      logger.warn(
        '[signUpWithInvitation] Password is required for email/password sign-up (no preAuthUid).'
      );
      throw new HttpsError(
        'invalid-argument',
        'Password is required for email/password sign-up.'
      );
    }

    let invitationDoc;
    let invitationData: FirebaseFirestore.DocumentData | undefined;
    let actualInvitationPath: string | undefined;

    logger.info(
      `[signUpWithInvitation] Attempting to fetch invitation for ID: ${invitationId}, with client-provided orgIdFromRequest: ${
        orgIdFromRequest || 'N/A'
      }`
    );

    try {
      if (orgIdFromRequest) {
        actualInvitationPath = `organizations/${orgIdFromRequest}/invitations/${invitationId}`;
        logger.info(
          `[signUpWithInvitation] Checking path: ${actualInvitationPath}`
        );
        invitationDoc = await db.doc(actualInvitationPath).get();
        if (invitationDoc.exists) {
          invitationData = invitationDoc.data();
          logger.info(
            `[signUpWithInvitation] Found invitation at org-specific path: ${actualInvitationPath}`
          );
        } else {
          logger.info(
            `[signUpWithInvitation] Invitation not found at org-specific path: ${actualInvitationPath}`
          );
        }
      }

      if (!invitationData) {
        const globalInvitationPath = `globalInvitations/${invitationId}`;
        logger.info(
          `[signUpWithInvitation] Checking global path: ${globalInvitationPath}`
        );
        const globalInvitationDoc = await db.doc(globalInvitationPath).get();
        if (globalInvitationDoc.exists) {
          invitationDoc = globalInvitationDoc;
          invitationData = globalInvitationDoc.data();
          actualInvitationPath = globalInvitationPath;
          logger.info(
            `[signUpWithInvitation] Found invitation at global path: ${globalInvitationPath}`
          );
        } else {
          logger.warn(
            `[signUpWithInvitation] Invitation ${invitationId} not found at global path either.`
          );
          throw new HttpsError(
            'not-found',
            `Invitation ${invitationId} not found.`
          );
        }
      }

      if (!invitationDoc || !invitationData) {
        // This case should ideally be caught by the 'not-found' above if both paths fail.
        logger.error(
          '[signUpWithInvitation] Critical: Failed to load invitation data after checks.'
        );
        throw new HttpsError('internal', 'Failed to load invitation data.');
      }

      logger.info(
        '[signUpWithInvitation] Successfully fetched invitation document. Full invitationData:',
        JSON.stringify(invitationData, null, 2)
      );

      if (invitationData.status !== 'pending') {
        logger.warn(
          `[signUpWithInvitation] Invitation ${invitationId} status is not 'pending', it is '${invitationData.status}'.`
        );
        throw new HttpsError(
          'failed-precondition',
          'Invitation is not pending or has already been used.'
        );
      }

      // Email matching logic (if invitation has an email)
      if (invitationData.email) {
        if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
          logger.error(
            `[signUpWithInvitation] Email mismatch for invitation ${invitationId}. Invitation email: '${invitationData.email}', Provided email: '${email}'.`
          );
          throw new HttpsError(
            'failed-precondition',
            'The provided email does not match the invited email address.'
          );
        }
      } else {
        logger.info(
          `[signUpWithInvitation] Invitation ${invitationId} does not have a pre-associated email. Proceeding with user-provided email: ${email}`
        );
      }

      // Extracting data from invitation document
      const invOrganizationIds = invitationData.organizationIds as
        | string[]
        | null;
      const rolesToAssign = invitationData.rolesToAssign as string[];
      const targetPropertyId = invitationData.targetPropertyId as
        | string
        | undefined;
      const invitedBy = invitationData.createdBy as string | undefined;
      const address = invitationData.address;

      logger.info('[signUpWithInvitation] Extracted from invitationData:', {
        invOrganizationIds,
        rolesToAssign,
        targetPropertyId: targetPropertyId || 'N/A',
        invitedBy: invitedBy || 'N/A',
        campaignId: invitationData.campaignId || 'N/A',
      });

      if (!rolesToAssign || rolesToAssign.length === 0) {
        logger.error(
          `[signUpWithInvitation] Invitation ${invitationId} is missing 'rolesToAssign'.`
        );
        throw new HttpsError(
          'internal',
          'Invitation is missing rolesToAssign.'
        );
      }

      let uid: string;
      let finalDisplayName = displayName;

      if (preAuthUid) {
        uid = preAuthUid;
        logger.info(
          `[signUpWithInvitation] Using pre-authenticated UID: ${uid} for email ${email} (social sign-on).`
        );
        try {
          const existingUser = await adminAuth.getUser(uid);
          if (existingUser.email?.toLowerCase() !== email.toLowerCase()) {
            logger.error(
              `[signUpWithInvitation] Social account email (${existingUser.email}) does not match provided/invitation email (${email}) for UID ${uid}.`
            );
            throw new HttpsError(
              'failed-precondition',
              'Social account email does not match the invitation email.'
            );
          }
          finalDisplayName = existingUser.displayName || displayName;
          logger.info(
            `[signUpWithInvitation] Verified pre-authenticated user ${uid}. Final display name: ${finalDisplayName}`
          );
        } catch (authError: any) {
          logger.error(
            `[signUpWithInvitation] Error fetching pre-authenticated user ${uid}:`,
            JSON.stringify(authError, null, 2)
          );
          throw new HttpsError(
            'internal',
            `Failed to verify pre-authenticated user: ${authError.message}`
          );
        }
      } else {
        logger.info(
          `[signUpWithInvitation] Creating new Firebase Auth user for email: ${email}`
        );
        const userRecord = await adminAuth.createUser({
          email: email,
          password: password, // Password is guaranteed by earlier check if preAuthUid is null
          displayName: displayName,
        });
        uid = userRecord.uid;
        logger.info(
          `[signUpWithInvitation] Auth user created via invitation: ${uid} for email ${email}`
        );
      }

      let claimsToSet: CustomClaims;
      let derivedSingleOrgIdForClaims: string | null | undefined = null; // For logging

      if (rolesToAssign.includes('organization_manager')) {
        logger.info(
          `[signUpWithInvitation] Setting claims for 'organization_manager'. invOrganizationIds: ${JSON.stringify(
            invOrganizationIds
          )}`
        );
        claimsToSet = {
          roles: ['organization_manager'],
          organizationIds: invOrganizationIds || [], // Ensure it's an array
        };
      } else if (rolesToAssign.includes('resident') && targetPropertyId) {
        derivedSingleOrgIdForClaims =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null; // No fallback, rely on invOrganizationIds array
        logger.info(
          `[signUpWithInvitation] Setting claims for 'resident'. invOrganizationIds: ${JSON.stringify(
            invOrganizationIds
          )}, targetPropertyId: ${targetPropertyId}. Derived singleOrgIdForClaims: ${derivedSingleOrgIdForClaims}`
        );

        if (!derivedSingleOrgIdForClaims) {
          logger.error(
            `[signUpWithInvitation] Invitation ${invitationId} data is missing a single organizationId for resident role. Cannot set claims.`
          );
          throw new HttpsError(
            'internal',
            'Invitation data is missing a single organizationId for resident role.'
          );
        }
        claimsToSet = {
          roles: rolesToAssign,
          organizationId: derivedSingleOrgIdForClaims,
          propertyId: targetPropertyId,
        };
      } else if (rolesToAssign.includes('resident') && !targetPropertyId) {
        logger.error(
          `[signUpWithInvitation] Resident role assigned for UID ${uid} but targetPropertyId is missing in invitation ${invitationId}.`
        );
        throw new HttpsError(
          'internal',
          'Resident invitation is missing targetPropertyId.'
        );
      } else {
        // For other roles like property_manager, property_staff, etc. (not yet added)
        derivedSingleOrgIdForClaims =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null; // No fallback to string field for these roles
        logger.info(
          `[signUpWithInvitation] Setting claims for other role(s): ${rolesToAssign.join(
            ', '
          )}. invOrganizationIds: ${JSON.stringify(
            invOrganizationIds
          )}. Derived singleOrgIdForClaims: ${derivedSingleOrgIdForClaims}`
        );
        if (!derivedSingleOrgIdForClaims) {
          logger.error(
            `[signUpWithInvitation] Invitation ${invitationId} data is missing a single, valid organizationId in 'organizationIds' array for role(s) ${rolesToAssign.join(
              ', '
            )}. Cannot set claims.`
          );
          throw new HttpsError(
            'internal',
            'Invitation data is missing a single organizationId for this role type.'
          );
        }
        claimsToSet = {
          roles: rolesToAssign,
          organizationId: derivedSingleOrgIdForClaims,
        };
      }

      logger.info(
        `[signUpWithInvitation] Attempting to set custom claims for UID ${uid}:`,
        JSON.stringify(claimsToSet, null, 2)
      );
      await adminAuth.setCustomUserClaims(uid, claimsToSet);
      logger.info(
        `[signUpWithInvitation] Successfully set custom claims for UID ${uid}.`
      );

      const baseProfileData = {
        uid: uid,
        email: email,
        displayName: finalDisplayName,
        createdAt: FieldValue.serverTimestamp(),
        status: 'active',
        invitedBy: invitedBy || null, // Ensure null if undefined
      };
      logger.info(
        `[signUpWithInvitation] Base profile data for UID ${uid}:`,
        JSON.stringify(baseProfileData, null, 2)
      );

      let userProfilePath: string | undefined;
      let profileDataToWrite: UserProfileData | undefined;

      if (rolesToAssign.includes('organization_manager')) {
        logger.info(
          `[signUpWithInvitation] Preparing to create Organization Manager profile(s) for UID ${uid}.`
        );
        if (invOrganizationIds && invOrganizationIds.length > 0) {
          // Note: This function does NOT create the root /admins profile for OM.
          // That's handled by signUpWithOrgManagerInvitation.ts
          for (const orgId of invOrganizationIds) {
            userProfilePath = `organizations/${orgId}/users/${uid}`;
            profileDataToWrite = {
              ...baseProfileData,
              organizationId: orgId,
              organizationRoles: ['organization_manager'], // Explicitly set org-specific roles
            };
            logger.info(
              `[signUpWithInvitation] Writing OM profile to path: ${userProfilePath} with data:`,
              JSON.stringify(profileDataToWrite, null, 2)
            );
            await db.doc(userProfilePath).set(profileDataToWrite);
            logger.info(
              `[signUpWithInvitation] User profile created for Organization Manager ${uid} in organization ${orgId} at ${userProfilePath}`
            );
          }
        } else {
          logger.info(
            `[signUpWithInvitation] Organization Manager ${uid} signed up without initial organization assignment. No org-specific profiles created by this function.`
          );
        }
      } else if (rolesToAssign.includes('resident')) {
        // Use the same derivedSingleOrgId as for claims (no fallback)
        const singleOrgIdForResidentProfile =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null; // Ensure null if not a single-element array

        logger.info(
          `[signUpWithInvitation] Preparing to create Resident profile for UID ${uid}. singleOrgIdForResidentProfile: ${singleOrgIdForResidentProfile}, targetPropertyId: ${targetPropertyId}`
        );

        if (!singleOrgIdForResidentProfile || !targetPropertyId) {
          logger.error(
            `[signUpWithInvitation] Cannot create resident profile for UID ${uid} without organizationId or targetPropertyId. OrgID: ${singleOrgIdForResidentProfile}, PropID: ${targetPropertyId}`
          );
          throw new HttpsError(
            'internal',
            'Cannot create resident profile without organizationId or propertyId from invitation.'
          );
        }
        userProfilePath = `organizations/${singleOrgIdForResidentProfile}/properties/${targetPropertyId}/residents/${uid}`;
        profileDataToWrite = {
          ...baseProfileData,
          organizationId: singleOrgIdForResidentProfile,
          roles: ['resident'], // Explicitly set roles array
          propertyId: targetPropertyId,
          address: address || null,
        };
        logger.info(
          `[signUpWithInvitation] Writing Resident profile to path: ${userProfilePath} with data:`,
          JSON.stringify(profileDataToWrite, null, 2)
        );
        await db.doc(userProfilePath).set(profileDataToWrite);
        logger.info(
          `[signUpWithInvitation] User profile created for Resident ${uid} at ${userProfilePath}`
        );
      } else {
        // For other roles like property_manager
        // Use the same strictly derived singleOrgId as for claims (no fallback)
        const singleOrgIdForOtherProfile =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null;
        logger.info(
          `[signUpWithInvitation] Preparing to create profile for other role(s) ${rolesToAssign.join(
            ', '
          )} for UID ${uid}. singleOrgIdForOtherProfile: ${singleOrgIdForOtherProfile}`
        );

        if (!singleOrgIdForOtherProfile) {
          logger.error(
            `[signUpWithInvitation] Cannot create profile for role(s) ${rolesToAssign.join(
              ', '
            )} for UID ${uid} without a single organizationId from 'organizationIds' array.`
          );
          throw new HttpsError(
            'internal',
            'Cannot create profile for this role without organizationId from invitation.'
          );
        }
        userProfilePath = `organizations/${singleOrgIdForOtherProfile}/users/${uid}`;
        profileDataToWrite = {
          ...baseProfileData,
          organizationId: singleOrgIdForOtherProfile,
          organizationRoles: rolesToAssign, // Store the assigned roles
        };
        logger.info(
          `[signUpWithInvitation] Writing profile for other role(s) to path: ${userProfilePath} with data:`,
          JSON.stringify(profileDataToWrite, null, 2)
        );
        await db.doc(userProfilePath).set(profileDataToWrite);
        logger.info(
          `[signUpWithInvitation] User profile created for ${rolesToAssign.join(
            ', '
          )} ${uid} at ${userProfilePath}`
        );
      }

      if (!actualInvitationPath) {
        logger.error(
          `[signUpWithInvitation] Critical: Could not determine original invitation path to update status for invitation ID ${invitationId}.`
        );
        throw new HttpsError(
          'internal',
          'Could not determine original invitation path to update status.'
        );
      }
      logger.info(
        `[signUpWithInvitation] Updating invitation ${invitationId} at path ${actualInvitationPath} to 'accepted'.`
      );
      await db.doc(actualInvitationPath).update({
        status: 'accepted',
        acceptedByUid: uid,
        acceptedAt: FieldValue.serverTimestamp(),
      });
      logger.info(
        `[signUpWithInvitation] Invitation ${invitationId} at ${actualInvitationPath} status updated to 'accepted' by ${uid}.`
      );

      // Campaign update logic
      if (invitationData.campaignId && rolesToAssign.includes('resident')) {
        const campaignId = invitationData.campaignId as string;
        // For campaign updates, strictly rely on invOrganizationIds[0] as per recent fixes.
        const campaignOrgId =
          invOrganizationIds && invOrganizationIds.length === 1
            ? invOrganizationIds[0]
            : null;
        const campaignPropertyId = targetPropertyId;

        logger.info(
          `[signUpWithInvitation] Processing campaign update for campaignId: ${campaignId}. campaignOrgId: ${campaignOrgId}, campaignPropertyId: ${campaignPropertyId}`
        );

        if (campaignOrgId && campaignPropertyId) {
          const campaignRef = db.doc(
            `organizations/${campaignOrgId}/properties/${campaignPropertyId}/campaigns/${campaignId}`
          );
          try {
            await db.runTransaction(async (transaction) => {
              logger.info(
                `[signUpWithInvitation] Starting transaction for campaign ${campaignId}.`
              );
              const campaignDocSnap = await transaction.get(campaignRef);
              if (!campaignDocSnap.exists) {
                logger.error(
                  `[signUpWithInvitation] Campaign ${campaignId} not found for update during transaction.`
                );
                return; // Exit transaction
              }
              const campaign = campaignDocSnap.data();
              if (!campaign) {
                logger.error(
                  `[signUpWithInvitation] Campaign data missing for ${campaignId} during transaction.`
                );
                return; // Exit transaction
              }
              logger.info(
                `[signUpWithInvitation] Campaign ${campaignId} current data:`,
                JSON.stringify(campaign, null, 2)
              );

              const newTotalAccepted = (campaign.totalAccepted || 0) + 1;
              const updates: { totalAccepted: number; status?: string } = {
                totalAccepted: newTotalAccepted,
              };

              if (
                campaign.expiresAt &&
                campaign.expiresAt.toMillis() < Date.now()
              ) {
                updates.status = 'expired';
                logger.info(
                  `[signUpWithInvitation] Campaign ${campaignId} marked as 'expired'.`
                );
              } else if (
                campaign.maxUses &&
                newTotalAccepted >= campaign.maxUses
              ) {
                updates.status = 'completed';
                logger.info(
                  `[signUpWithInvitation] Campaign ${campaignId} marked as 'completed'.`
                );
              }

              // Only update status if it's changing and not already expired
              if (
                campaign.status !== 'expired' &&
                updates.status && // A new status is determined
                campaign.status !== updates.status // And it's different from current
              ) {
                logger.info(
                  `[signUpWithInvitation] Updating campaign ${campaignId} with new status: ${updates.status} and totalAccepted: ${newTotalAccepted}`
                );
                transaction.update(campaignRef, updates);
              } else {
                logger.info(
                  `[signUpWithInvitation] Updating campaign ${campaignId} with new totalAccepted: ${newTotalAccepted} (status remains ${campaign.status})`
                );
                transaction.update(campaignRef, {
                  totalAccepted: newTotalAccepted,
                });
              }
            });
            logger.info(
              `[signUpWithInvitation] Transaction for campaign ${campaignId} completed successfully.`
            );
          } catch (campaignError: any) {
            logger.error(
              `[signUpWithInvitation] Error updating campaign ${campaignId} in transaction:`,
              JSON.stringify(campaignError, null, 2)
            );
            // Do not re-throw here to allow main sign-up to succeed
          }
        } else {
          logger.warn(
            `[signUpWithInvitation] Could not determine campaign path for campaignId ${campaignId} due to missing/invalid campaignOrgId ('${campaignOrgId}') or campaignPropertyId ('${campaignPropertyId}') from invitation.`
          );
        }
      }

      logger.info(
        `[signUpWithInvitation] Successfully processed invitation for UID ${uid}, email ${email}.`
      );
      return {
        success: true,
        uid: uid,
        message: 'User created and associated via invitation successfully.',
      };
    } catch (error: unknown) {
      logger.error(
        '[signUpWithInvitation] Error during main processing block:',
        error instanceof HttpsError
          ? JSON.stringify(error, null, 2)
          : String(error)
      );
      if (error instanceof HttpsError) {
        throw error;
      }
      // Use the helper, but also log the original error structure if not HttpsError
      logger.error('[signUpWithInvitation] Non-HttpsError details:', error);
      throw handleHttpsError(
        error,
        'An unexpected error occurred during invitation sign-up.'
      );
    }
  } catch (e: unknown) {
    // Catch top-level errors, stringify for better insight if it's an object
    logger.error(
      '[signUpWithInvitation] TOP LEVEL CRITICAL ERROR:',
      e instanceof HttpsError ? JSON.stringify(e, null, 2) : String(e)
    );
    if (e instanceof HttpsError) {
      throw e;
    }
    // Log the raw error object as well if it's not an HttpsError
    logger.error('[signUpWithInvitation] Raw top-level error object:', e);
    throw new HttpsError(
      'internal',
      'A critical internal error occurred in signUpWithInvitation.'
    );
  }
});
