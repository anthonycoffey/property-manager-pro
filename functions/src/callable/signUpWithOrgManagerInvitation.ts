import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js';
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

export const signUpWithOrgManagerInvitation = onCall(async (request) => {
  const {
    email,
    password, // Optional for social sign-on
    displayName,
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
    // 2. Fetch and Validate Invitation - ONLY from globalInvitations for OM
    actualInvitationPath = `globalInvitations/${invitationId}`;
    invitationDoc = await db.doc(actualInvitationPath).get();
    
    if (!invitationDoc.exists) {
      throw new HttpsError('not-found', `Invitation ${invitationId} not found in globalInvitations.`);
    }
    
    invitationData = invitationDoc.data();
    if (!invitationData) {
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

    // Ensure this is an organization_manager invitation
    if (!invitationData.rolesToAssign || !invitationData.rolesToAssign.includes('organization_manager')) {
        throw new HttpsError('failed-precondition', 'This invitation is not for an Organization Manager.');
    }

    // 3. Extract Invitation Details
    const invOrganizationIds = invitationData.organizationIds as string[] | null;
    const invitedBy = invitationData.createdBy as string | undefined;

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

    // 5. Set Custom Claims - specifically for Organization Manager
    const claimsToSet: CustomClaims = {
      roles: ['organization_manager'],
      organizationIds: invOrganizationIds || [], // Use the array from invitation, or empty if null
    };

    console.log(`Attempting to set custom claims for OM user ${uid}: ${JSON.stringify(claimsToSet)}`);
    await adminAuth.setCustomUserClaims(uid, claimsToSet);
    console.log(`Custom claims successfully set for invited Organization Manager user ${uid}: ${JSON.stringify(claimsToSet)}`);

    // 6. Create Firestore User Profile(s)
    const baseProfileData = {
      uid: uid,
      email: email,
      displayName: finalDisplayName,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
      invitedBy: invitedBy || null,
    };

    // Create profile in /admins collection for ALL Organization Managers
    const adminProfileData = {
      ...baseProfileData, // Includes uid, email, displayName, createdAt, status, invitedBy
      roles: ['organization_manager'], // Explicitly set the role for the profile document
      assignedOrganizationIds: invOrganizationIds || [], // Store assigned org IDs for easier querying by admin panel
    };
    console.log(`Attempting to create/update profile in 'admins' collection for OM user ${uid} with data: ${JSON.stringify(adminProfileData)}`);
    await db.collection('admins').doc(uid).set(adminProfileData, { merge: true });
    console.log(`Organization Manager profile successfully created/updated in 'admins' collection for ${uid}`);

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

    // 8. Return Success
    return {
      success: true,
      uid: uid,
      message: 'Organization Manager created and associated via invitation successfully.',
    };
  } catch (error: unknown) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in signUpWithOrgManagerInvitation:', error);
    throw handleHttpsError(error, 'An unexpected error occurred during organization manager invitation sign-up.');
  }
});
