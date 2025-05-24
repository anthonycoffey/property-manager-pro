import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

// Define a more specific type for userProfileData
interface UserProfileData {
  uid: string;
  email: string;
  displayName: string;
  organizationId: string;
  createdAt: FirebaseFirestore.FieldValue;
  status: string;
  invitedBy: string | null;
  roles?: string[]; // For residents
  organizationRoles?: string[]; // For org users like PMs
  propertyId?: string; // For residents
}

export const signUpWithInvitation = onCall(async (request) => {
  const {
    email,
    password, // Optional for social sign-on
    displayName,
    organizationId,
    invitationId,
    uid: preAuthUid, // UID from social sign-on if user is already authenticated
  } = request.data;

  // 1. Input Validation
  if (!email || !displayName || !organizationId || !invitationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, displayName, organizationId, invitationId.'
    );
  }
  // Password is required only if preAuthUid is not provided
  if (!preAuthUid && !password) {
    throw new HttpsError(
      'invalid-argument',
      'Password is required for email/password sign-up.'
    );
  }

  const invitationPath = `organizations/${organizationId}/invitations/${invitationId}`;

  try {
    // 2. Fetch and Validate Invitation
    const invitationDoc = await db.doc(invitationPath).get();

    if (!invitationDoc.exists) {
      throw new HttpsError(
        'not-found',
        `Invitation not found at ${invitationPath}.`
      );
    }

    const invitationData = invitationDoc.data();
    if (!invitationData) {
      throw new HttpsError('internal', 'Invitation data is missing.');
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
      // User is already authenticated via social sign-on
      uid = preAuthUid;
      // Optionally, fetch the user to confirm existence and get their auth display name if preferred
      try {
        const existingUser = await adminAuth.getUser(uid);
        if (existingUser.email?.toLowerCase() !== email.toLowerCase()) {
            // This is an important server-side check
            throw new HttpsError('failed-precondition', 'Social account email does not match the invitation email.');
        }
        finalDisplayName = existingUser.displayName || displayName; // Prefer auth display name
        console.log(`Using pre-authenticated user ${uid} for email ${email} from social sign-on.`);
      } catch (authError) {
        console.error(`Error fetching pre-authenticated user ${uid}:`, authError);
        throw new HttpsError('internal', 'Failed to verify pre-authenticated user.');
      }
    } else {
      // Create a new Firebase Auth user (email/password flow)
      const userRecord = await adminAuth.createUser({
        email: email,
        password: password, // Password is guaranteed to be present here by prior validation
        displayName: displayName,
      });
      uid = userRecord.uid;
      console.log(`Auth user created via invitation: ${uid} for email ${email}`);
    }


    // 5. Set Custom Claims
    const claims: {
      roles: string[];
      organizationId: string;
      propertyId?: string;
    } = {
      roles: rolesToAssign,
      organizationId: organizationId,
    };

    if (rolesToAssign.includes('resident') && targetPropertyId) {
      claims.propertyId = targetPropertyId;
    } else if (rolesToAssign.includes('resident') && !targetPropertyId) {
      console.error(
        `Resident role assigned for ${uid} but targetPropertyId is missing in invitation ${invitationId}.`
      );
      throw new HttpsError(
        'internal',
        'Resident invitation is missing targetPropertyId.'
      );
    }
    await adminAuth.setCustomUserClaims(uid, claims);
    console.log(`Custom claims set for invited user ${uid}: ${JSON.stringify(claims)}`);

    // 6. Create Firestore User Profile
    let userProfilePath = '';
    const userProfileData: UserProfileData = {
      uid: uid,
      email: email, // Use the validated email from invitation/input
      displayName: finalDisplayName, // Use potentially updated display name
      organizationId: organizationId,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
      invitedBy: invitedBy || null,
    };

    if (rolesToAssign.includes('resident')) {
      if (!claims.propertyId) {
        throw new HttpsError('internal', 'Cannot create resident profile without propertyId.');
      }
      userProfilePath = `organizations/${organizationId}/properties/${claims.propertyId}/residents/${uid}`;
      userProfileData.roles = ['resident'];
      userProfileData.propertyId = claims.propertyId;
    } else {
      userProfilePath = `organizations/${organizationId}/users/${uid}`;
      userProfileData.organizationRoles = rolesToAssign;
    }

    await db.doc(userProfilePath).set(userProfileData);
    console.log(`User profile created for invited user ${uid} at ${userProfilePath}`);

    // 7. Update Invitation Status
    await db.doc(invitationPath).update({
      status: 'accepted',
      acceptedByUid: uid,
      acceptedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Invitation ${invitationId} status updated to 'accepted' by ${uid}.`);

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
