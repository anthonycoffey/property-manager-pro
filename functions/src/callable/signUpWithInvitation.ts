import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js'; // Already using firebaseAdmin exports
import { handleHttpsError } from '../helpers/handleHttpsError.js';

// Define a more specific type for userProfileData
interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string; // Still relevant for single-org context like PM or Resident profile
  createdAt: FirebaseFirestore.FieldValue;
  status: string;
  invitedBy: string | null;
  roles?: string[]; // For residents
  organizationRoles?: string[]; // For org users like PMs
  propertyId?: string; // For residents
}

// Define a specific type for custom claims
interface CustomClaims {
  roles: string[];
  organizationId?: string;
  organizationIds?: string[];
  propertyId?: string;
}

export const signUpWithInvitation = onCall(async (request) => {
  const {
    email,
    password, // Optional for social sign-on
    displayName,
    organizationId: orgIdFromRequest, // This can be undefined if not in the accept link (e.g. global OM invite)
    invitationId,
    uid: preAuthUid, // UID from social sign-on if user is already authenticated
  } = request.data;

  // 1. Input Validation
  if (!email || !displayName || !invitationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, displayName, invitationId.'
    );
  }
  // Password is required only if preAuthUid is not provided
  if (!preAuthUid && !password) {
    throw new HttpsError(
      'invalid-argument',
      'Password is required for email/password sign-up.'
    );
  }

  let invitationDoc;
  let invitationData: FirebaseFirestore.DocumentData | undefined;
  let actualInvitationPath: string | undefined;

  try {
    // 2. Fetch and Validate Invitation
    // Try fetching from organization-specific path if orgIdFromRequest is provided
    if (orgIdFromRequest) {
      actualInvitationPath = `organizations/${orgIdFromRequest}/invitations/${invitationId}`;
      invitationDoc = await db.doc(actualInvitationPath).get();
      if (invitationDoc.exists) {
        invitationData = invitationDoc.data();
      }
    }

    // If not found in org-specific path (or if orgIdFromRequest was not provided),
    // try fetching from globalInvitations path.
    if (!invitationData) {
      const globalInvitationPath = `globalInvitations/${invitationId}`;
      const globalInvitationDoc = await db.doc(globalInvitationPath).get();
      if (globalInvitationDoc.exists) {
        invitationDoc = globalInvitationDoc; // Use this one
        invitationData = globalInvitationDoc.data();
        actualInvitationPath = globalInvitationPath; // Update the path
      } else {
        // If not found in either path
        throw new HttpsError('not-found', `Invitation ${invitationId} not found.`);
      }
    }
    
    if (!invitationDoc || !invitationData) { // Should be redundant due to checks above, but for safety
        throw new HttpsError('internal', 'Failed to load invitation data.');
    }

    if (invitationData.status !== 'pending') {
      throw new HttpsError(
        'failed-precondition',
        'Invitation is not pending or has already been used.'
      );
    }
    
    // Server-side email validation against invitation
    if (invitationData.email.toLowerCase() !== email.toLowerCase()) {
        console.error(
            `Email mismatch: Invitation email (${invitationData.email}) vs provided email (${email}) for invitation ${invitationId}.`
        );
        throw new HttpsError(
            'failed-precondition',
            'The provided email does not match the invited email address.'
        );
    }


    // 3. Extract Invitation Details
    // invitationData.organizationIds will be an array for OM, or array with single element for PM/Resident, or null
    const invOrganizationIds = invitationData.organizationIds as string[] | null;
    const rolesToAssign = invitationData.rolesToAssign as string[];
    const targetPropertyId = invitationData.targetPropertyId as string | undefined;
    const invitedBy = invitationData.createdBy as string | undefined;

    if (!rolesToAssign || rolesToAssign.length === 0) {
      throw new HttpsError(
        'internal',
        'Invitation is missing rolesToAssign.'
      );
    }

    let uid: string;
    let finalDisplayName = displayName;

    // 4. Handle Auth User: Create or Use Existing (for social sign-on)
    if (preAuthUid) {
      uid = preAuthUid;
      try {
        const existingUser = await adminAuth.getUser(uid);
        if (existingUser.email?.toLowerCase() !== email.toLowerCase()) {
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

    // 5. Set Custom Claims
    let claimsToSet: CustomClaims; 

    if (rolesToAssign.includes('organization_manager')) {
      claimsToSet = {
        roles: ['organization_manager'],
        organizationIds: invOrganizationIds || [], // Use the array from invitation, or empty if null
      };
    } else if (rolesToAssign.includes('resident') && targetPropertyId) {
      // For residents, invOrganizationIds should be an array with one ID.
      const singleOrgId = (invOrganizationIds && invOrganizationIds.length === 1) ? invOrganizationIds[0] : null;
      if (!singleOrgId) {
        throw new HttpsError('internal', 'Invitation data is missing a single organizationId for resident role.');
      }
      claimsToSet = {
        roles: rolesToAssign,
        organizationId: singleOrgId, // Claim for single org context
        propertyId: targetPropertyId,
      };
    } else if (rolesToAssign.includes('resident') && !targetPropertyId) {
      console.error(`Resident role assigned for ${uid} but targetPropertyId is missing in invitation ${invitationId}.`);
      throw new HttpsError('internal', 'Resident invitation is missing targetPropertyId.');
    } else { // For property_manager and other non-OM, non-resident roles
      const singleOrgId = (invOrganizationIds && invOrganizationIds.length === 1) ? invOrganizationIds[0] : null;
      if (!singleOrgId) {
        throw new HttpsError('internal', 'Invitation data is missing a single organizationId for this role type.');
      }
      claimsToSet = {
        roles: rolesToAssign,
        organizationId: singleOrgId, // Claim for single org context
      };
    }

    await adminAuth.setCustomUserClaims(uid, claimsToSet);
    console.log(`Custom claims set for invited user ${uid}: ${JSON.stringify(claimsToSet)}`);

    // 6. Create Firestore User Profile(s)
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
        // Create a profile in each assigned organization
        for (const orgId of invOrganizationIds) {
          const userProfilePath = `organizations/${orgId}/users/${uid}`;
          const profileDataForOrgManager: UserProfileData = {
            ...baseProfileData,
            organizationId: orgId, // Context of this specific profile
            organizationRoles: ['organization_manager'],
          };
          await db.doc(userProfilePath).set(profileDataForOrgManager);
          console.log(`User profile created for Organization Manager ${uid} in organization ${orgId} at ${userProfilePath}`);
        }
      } else {
        console.log(`Organization Manager ${uid} signed up without initial organization assignment. No org-specific profiles created at this time.`);
      }
    } else if (rolesToAssign.includes('resident')) {
      const singleOrgId = (invOrganizationIds && invOrganizationIds.length === 1) ? invOrganizationIds[0] : null;
      if (!singleOrgId || !targetPropertyId) {
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
    } else { // For property_manager and other roles
      const singleOrgId = (invOrganizationIds && invOrganizationIds.length === 1) ? invOrganizationIds[0] : null;
      if (!singleOrgId) {
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

    // 7. Update Invitation Status
    if (!actualInvitationPath) { // Should always be set if invitation was found
        throw new HttpsError('internal', 'Could not determine original invitation path to update status.');
    }
    await db.doc(actualInvitationPath).update({
      status: 'accepted',
      acceptedByUid: uid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Invitation ${invitationId} at ${actualInvitationPath} status updated to 'accepted' by ${uid}.`);

    // 7.5 Update Campaign Counters if applicable
    if (invitationData.campaignId && rolesToAssign.includes('resident')) {
      const campaignId = invitationData.campaignId as string;
      // For residents, invOrganizationIds should be an array with one ID.
      const campaignOrgId = (invOrganizationIds && invOrganizationIds.length === 1) ? invOrganizationIds[0] : null;
      const campaignPropertyId = targetPropertyId;

      if (campaignOrgId && campaignPropertyId) {
        const campaignRef = db.doc(`organizations/${campaignOrgId}/properties/${campaignPropertyId}/campaigns/${campaignId}`);
        try {
          await db.runTransaction(async (transaction) => {
            const campaignDocSnap = await transaction.get(campaignRef);
            if (!campaignDocSnap.exists) {
              console.error(`Campaign ${campaignId} not found for update.`);
              return; // Don't fail the whole signup, just log error
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

            if (campaign.expiresAt && campaign.expiresAt.toMillis() < Date.now()) {
              updates.status = 'expired';
            } else if (campaign.maxUses && newTotalAccepted >= campaign.maxUses) {
              updates.status = 'completed';
            }
            // Only update status if it's not already expired and a new status is determined
            if (campaign.status !== 'expired' && updates.status && campaign.status !== updates.status) {
                 transaction.update(campaignRef, updates);
            } else { // just update totalAccepted if status isn't changing or already expired
                 transaction.update(campaignRef, { totalAccepted: newTotalAccepted });
            }
            console.log(`Campaign ${campaignId} updated. New totalAccepted: ${newTotalAccepted}, Status: ${updates.status || campaign.status}`);
          });
        } catch (campaignError) {
          console.error(`Error updating campaign ${campaignId}:`, campaignError);
          // Log error but do not fail the main sign-up process
        }
      } else {
        console.warn(`Could not determine campaign path for campaignId ${campaignId} due to missing org/property from invitation.`);
      }
    }

    // 8. Return Success
    return {
      success: true,
      uid: uid,
      message: 'User created and associated via invitation successfully.',
    };
  } catch (error: unknown) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in signUpWithInvitation:', error);
    throw handleHttpsError(error, 'An unexpected error occurred during invitation sign-up.');
  }
});
