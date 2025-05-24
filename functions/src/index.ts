import { auth } from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Initialize the Firebase Admin SDK
initializeApp();
const db = getFirestore();

// On sign up.
export const processSignUp = auth
  .user()
  .onCreate(async (user: auth.UserRecord) => { // Added back explicit type with functions.auth.UserRecord
    const { uid, email, emailVerified } = user;

    console.log(`New user signed up: ${email} (UID: ${uid})`);

    // Check if user meets role criteria.
    // For admin users (e.g., *@24hrcarunlocking.com)
    if (email && email.endsWith('@24hrcarunlocking.com') && emailVerified) {
      const customClaims = {
        roles: ['admin'],
      };

      try {
        // Set custom user claims on this newly created user.
        await getAuth().setCustomUserClaims(uid, customClaims);
        console.log(
          `Custom claims set for admin user ${uid}: ${JSON.stringify(customClaims)}`
        );

        // Create a user profile in the 'admins' collection for admin users
        await db
          .collection('admins') // Changed from 'users' to 'admins'
          .doc(uid)
          .set({
            uid: uid,
            email: email,
            displayName: user.displayName || 'Admin User',
            roles: ['admin'],
            createdAt: FieldValue.serverTimestamp(),
            status: 'active',
            // accessLevel: 9, // Removed as per systemPatterns (not explicitly listed for admins collection)
          });
        console.log(`Admin user profile created in 'admins' collection for ${uid}`);
      } catch (error) {
        console.error(
          `Error setting custom claims or creating admin profile for ${uid}:`,
          error
        );
      }
    } else {
      // For non-admin users (direct sign-ups)
      // Check if the user already has an organizationId claim (e.g., processed by signUpWithInvitation)
      if (user.customClaims?.organizationId) {
        console.log(
          `User ${uid} (${email}) already has an organizationId claim. Skipping default 'pending_association' setup in processSignUp.`
        );
        return;
      }

      try {
        const customClaims = {
          roles: ['pending_association'], // Changed from ['resident']
        };
        await getAuth().setCustomUserClaims(uid, customClaims);
        console.log(
          `Default 'pending_association' claims set for user ${uid}: ${JSON.stringify(
            customClaims
          )}`
        );

        // Create a temporary profile in the root 'users' collection
        await db
          .collection('users')
          .doc(uid)
          .set({
            uid: uid,
            email: email,
            displayName: user.displayName || 'New User',
            roles: ['pending_association'], // Mirroring the claim
            createdAt: FieldValue.serverTimestamp(),
            status: 'pending_association', // Reflecting their unassociated state
          });
        console.log(
          `Temporary user profile created in 'users' collection for ${uid} with 'pending_association' status.`
        );
      } catch (error) {
        console.error(
          `Error setting 'pending_association' claims or creating temporary user profile for ${uid}:`,
          error
        );
      }
    }
  });

import { onCall } from 'firebase-functions/v2/https'; // Import onCall for callable functions
import { HttpsError } from 'firebase-functions/v2/https'; // Import HttpsError

// Helper function to handle errors and throw HttpsError
function handleHttpsError(error: unknown, defaultMessage: string): HttpsError {
  console.error(defaultMessage, error);

  if (error instanceof HttpsError) {
    return error; // Already an HttpsError, re-throw as is
  }

  // Check for Firebase Auth errors specifically
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: string }).code === 'string'
  ) {
    const firebaseErrorCode = (error as { code: string }).code;
    if (firebaseErrorCode === 'auth/email-already-exists') {
      return new HttpsError(
        'already-exists',
        'The email address is already in use by another account.'
      );
    }
    // You can add more specific Firebase error codes here if needed
  }

  // Extract message from error if available, otherwise use default
  const errorMessage =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: string }).message === 'string'
      ? (error as { message: string }).message
      : 'An unknown error occurred.';

  return new HttpsError('internal', defaultMessage, errorMessage);
}

export const signUpWithInvitation = onCall(async (request) => {
  const { email, password, displayName, organizationId, invitationId } =
    request.data;

  // 1. Input Validation
  if (!email || !password || !displayName || !organizationId || !invitationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, password, displayName, organizationId, invitationId.'
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

    // Optional: Check if the email matches the invited email if your invitations store one
    // if (invitationData.email && invitationData.email.toLowerCase() !== email.toLowerCase()) {
    //   throw new HttpsError('permission-denied', 'Email does not match invited email.');
    // }

    // 3. Extract Invitation Details
    const rolesToAssign = invitationData.rolesToAssign as string[];
    const targetPropertyId = invitationData.targetPropertyId as string | undefined;
    const invitedBy = invitationData.createdBy as string | undefined; // Assuming 'createdBy' stores the inviter's UID

    if (!rolesToAssign || rolesToAssign.length === 0) {
      throw new HttpsError(
        'internal',
        'Invitation is missing rolesToAssign.'
      );
    }

    // 4. Create Firebase Auth User
    const userRecord = await getAuth().createUser({
      email: email,
      password: password,
      displayName: displayName,
    });
    const uid = userRecord.uid;
    console.log(`Auth user created via invitation: ${uid} for email ${email}`);

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
      // This case should ideally be prevented by how invitations are created
      console.error(
        `Resident role assigned for ${uid} but targetPropertyId is missing in invitation ${invitationId}.`
      );
      throw new HttpsError(
        'internal',
        'Resident invitation is missing targetPropertyId.'
      );
    }
    await getAuth().setCustomUserClaims(uid, claims);
    console.log(`Custom claims set for invited user ${uid}: ${JSON.stringify(claims)}`);

    // 6. Create Firestore User Profile
    let userProfilePath = '';
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

    const userProfileData: UserProfileData = {
      uid: uid,
      email: email,
      displayName: displayName,
      organizationId: organizationId,
      createdAt: FieldValue.serverTimestamp(),
      status: 'active',
      invitedBy: invitedBy || null, // Store who invited them
    };

    if (rolesToAssign.includes('resident')) {
      if (!claims.propertyId) {
        // Should have been caught earlier, but as a safeguard
        throw new HttpsError('internal', 'Cannot create resident profile without propertyId.');
      }
      userProfilePath = `organizations/${organizationId}/properties/${claims.propertyId}/residents/${uid}`;
      userProfileData.roles = ['resident']; // Explicitly set for Firestore doc
      userProfileData.propertyId = claims.propertyId;
    } else {
      // For other organization users like property_manager, property_staff
      userProfilePath = `organizations/${organizationId}/users/${uid}`;
      userProfileData.organizationRoles = rolesToAssign; // Store roles like ['property_manager']
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
    // Use the existing handleHttpsError helper
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error in signUpWithInvitation:', error);
    throw new HttpsError(
      'internal',
      'An unexpected error occurred during invitation sign-up.',
      error instanceof Error ? error.message : String(error)
    );
  }
});

export const createPropertyManager = onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  // Check if the user has the 'admin' role
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can create property managers.'
    );
  }

  const { email, displayName, organizationId, password } = request.data;

  // Basic input validation
  if (!email || !displayName || !organizationId || !password) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: email, displayName, organizationId, password.'
    );
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await getAuth().createUser({
      email: email,
      displayName: displayName,
      password: password, // Password is required for createUser
    });

    const uid = userRecord.uid;

    // 2. Set custom claims for the new user
    const customClaims = {
      roles: ['property_manager'],
      organizationId: organizationId,
    };
    await getAuth().setCustomUserClaims(uid, customClaims);
    console.log(
      `Custom claims set for new property manager ${uid}: ${JSON.stringify(
        customClaims
      )}`
    );

    // 3. Create user document in Firestore under the organization's users subcollection
    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('users')
      .doc(uid)
      .set({
        uid: uid,
        email: email,
        displayName: displayName,
        organizationRoles: ['property_manager'], // Mirroring custom claims
        organizationId: organizationId,
        createdAt: FieldValue.serverTimestamp(), // Changed to FieldValue
        status: 'active',
      });

    console.log(`Property manager profile created in Firestore for ${uid}`);

    return {
      success: true,
      message: 'Property manager created successfully',
      uid: uid,
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create property manager.');
  }
});

export const updatePropertyManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can update property managers.'
    );
  }

  const { uid, email, displayName, organizationId, roles } = request.data;

  if (!uid || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: uid, organizationId.'
    );
  }

  try {
    const updates: { email?: string; displayName?: string } = {};
    if (email) updates.email = email;
    if (displayName) updates.displayName = displayName;

    if (Object.keys(updates).length > 0) {
      await getAuth().updateUser(uid, updates);
      console.log(
        `Firebase Auth user ${uid} updated: ${JSON.stringify(updates)}`
      );
    }

    // Update custom claims if roles or organizationId are provided
    const currentCustomClaims =
      (await getAuth().getUser(uid)).customClaims || {};
    const newCustomClaims = {
      ...currentCustomClaims,
      roles: roles || currentCustomClaims.roles,
      organizationId: organizationId || currentCustomClaims.organizationId,
    };
    await getAuth().setCustomUserClaims(uid, newCustomClaims);
    console.log(
      `Custom claims updated for user ${uid}: ${JSON.stringify(
        newCustomClaims
      )}`
    );

    // Update Firestore document
    const firestoreUpdates: {
      displayName?: string;
      organizationRoles?: string[];
      organizationId?: string;
    } = {};
    if (displayName) firestoreUpdates.displayName = displayName;
    if (roles) firestoreUpdates.organizationRoles = roles;
    if (organizationId) firestoreUpdates.organizationId = organizationId;

    if (Object.keys(firestoreUpdates).length > 0) {
      await db
        .collection('organizations')
        .doc(organizationId)
        .collection('users')
        .doc(uid)
        .update(firestoreUpdates);
      console.log(
        `Firestore profile updated for ${uid}: ${JSON.stringify(
          firestoreUpdates
        )}`
      );
    }

    return { success: true, message: 'Property manager updated successfully' };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to update property manager.');
  }
});

export const deletePropertyManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const callerRoles = (request.auth.token?.roles as string[]) || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError(
      'permission-denied',
      'Only administrators can delete property managers.'
    );
  }

  const { uid, organizationId } = request.data;

  if (!uid || !organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing required fields: uid, organizationId.'
    );
  }

  try {
    // 1. Delete Firebase Auth user
    await getAuth().deleteUser(uid);
    console.log(`Firebase Auth user ${uid} deleted.`);

    // 2. Delete Firestore document
    await db
      .collection('organizations')
      .doc(organizationId)
      .collection('users')
      .doc(uid)
      .delete();
    console.log(`Firestore profile deleted for ${uid}.`);

    return { success: true, message: 'Property manager deleted successfully' };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to delete property manager.');
  }
});

// New function to create an invitation
export const createInvitation = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const {
    inviteeEmail,
    organizationId,
    rolesToAssign, // e.g., ['property_manager'] or ['resident']
    invitedByRole, // 'admin' or 'property_manager'
    targetPropertyId, // Optional, only for resident invitations
  } = request.data;

  // Validate basic inputs
  if (!inviteeEmail || !organizationId || !rolesToAssign || !Array.isArray(rolesToAssign) || rolesToAssign.length === 0 || !invitedByRole) {
    throw new HttpsError('invalid-argument', 'Missing or invalid required fields for invitation.');
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgId = request.auth.token?.organizationId as string | undefined;

  try {
    // Authorization checks
    if (invitedByRole === 'admin') {
      if (!callerRoles.includes('admin')) {
        throw new HttpsError('permission-denied', 'Only administrators can create admin-level invitations.');
      }
      // Admin can invite to any specified organizationId, so we trust the input `organizationId`
    } else if (invitedByRole === 'property_manager') {
      if (!callerRoles.includes('property_manager') || callerOrgId !== organizationId) {
        throw new HttpsError('permission-denied', 'Property managers can only invite within their own organization.');
      }
      if (rolesToAssign.includes('resident') && !targetPropertyId) {
        throw new HttpsError('invalid-argument', 'targetPropertyId is required for resident invitations.');
      }
      // Further validation: ensure PM manages targetPropertyId if provided
      if (targetPropertyId) {
        const propertyRef = db.doc(`organizations/${organizationId}/properties/${targetPropertyId}`);
        const propertyDoc = await propertyRef.get();
        if (!propertyDoc.exists) {
          throw new HttpsError('not-found', `Property ${targetPropertyId} not found in organization ${organizationId}.`);
        }
        // Optional: Check if propertyDoc.data()?.managedBy === callerUid if that level of granularity is needed
      }
    } else {
      throw new HttpsError('invalid-argument', 'Invalid invitedByRole specified.');
    }

    // Generate a unique invitation token (simple UUID for now)
    const invitationToken = crypto.randomUUID();
    const invitationPath = `organizations/${organizationId}/invitations/${invitationToken}`;

    // Define a more specific type for invitationData
    interface InvitationData {
      email: string;
      organizationId: string;
      rolesToAssign: string[];
      status: 'pending' | 'accepted' | 'expired';
      createdBy: string;
      invitedByRole: 'admin' | 'property_manager';
      createdAt: FirebaseFirestore.FieldValue;
      expiresAt: Date | FirebaseFirestore.FieldValue; // Can be Date object or serverTimestamp initially
      invitationType: 'resident' | 'property_manager' | string; // More specific types if known
      targetPropertyId?: string;
    }

    const invitationData: InvitationData = {
      email: inviteeEmail,
      organizationId: organizationId,
      rolesToAssign: rolesToAssign,
      status: 'pending',
      createdBy: callerUid,
      invitedByRole: invitedByRole,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: FieldValue.serverTimestamp(), // Placeholder, actual expiration logic below
      invitationType: rolesToAssign.includes('resident') ? 'resident' : 'property_manager', // Or more specific based on roles
    };

    if (targetPropertyId && rolesToAssign.includes('resident')) {
      invitationData.targetPropertyId = targetPropertyId;
    }

    // Set expiration (e.g., 7 days from now)
    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
    invitationData.expiresAt = new Date(Date.now() + sevenDaysInMillis);


    await db.doc(invitationPath).set(invitationData);
    console.log(`Invitation created at ${invitationPath} for ${inviteeEmail}`);

    // Trigger email using firestore-send-email extension
    // Get project ID for constructing the default app domain
    const projectId = process.env.GCLOUD_PROJECT || 'your-project-id-fallback'; // Fallback if not in Firebase env
    const appDomain = `${projectId}.firebaseapp.com`; // Or your custom domain
    const appName = "Property Manager Pro";

    let emailTemplateName = '';
     // Define a more specific type for emailData
    interface EmailTemplateData {
        inviteeName: string;
        invitationLink: string;
        appName: string;
        inviterName: string;
        organizationName?: string;
        propertyName?: string;
    }

    const emailData: EmailTemplateData = {
      inviteeName: inviteeEmail,
      invitationLink: `https://${appDomain}/accept-invitation?token=${invitationToken}&orgId=${organizationId}`,
      appName: appName, // Add appName to template data
      inviterName: 'The Team', // Default inviter name, will be updated
    };
    
    let inviterDisplayName = 'The Team'; // Default inviter name
    if (request.auth?.token.name) {
        inviterDisplayName = request.auth.token.name;
    } else {
        // Fallback to fetching inviter's profile if name not in token
        const inviterProfile = await db.doc(`users/${callerUid}`).get(); // Adjust path if admins/org users are in different collections
        if (inviterProfile.exists && inviterProfile.data()?.displayName) {
            inviterDisplayName = inviterProfile.data()?.displayName;
        }
    }
    emailData.inviterName = inviterDisplayName;


    if (rolesToAssign.includes('property_manager')) {
      emailTemplateName = 'propertyManagerInvitation';
      const orgDoc = await db.doc(`organizations/${organizationId}`).get();
      emailData.organizationName = orgDoc.exists ? orgDoc.data()?.name || organizationId : organizationId;
    } else if (rolesToAssign.includes('resident') && targetPropertyId) {
      emailTemplateName = 'residentInvitation';
      const propDoc = await db.doc(`organizations/${organizationId}/properties/${targetPropertyId}`).get();
      emailData.propertyName = propDoc.exists ? propDoc.data()?.name || targetPropertyId : targetPropertyId;
    } else {
      console.error("Could not determine email template for roles:", rolesToAssign);
      throw new HttpsError('internal', 'Could not determine email template for the invitation.');
    }

    await db.collection('mail').add({
      to: inviteeEmail,
      template: {
        name: emailTemplateName,
        data: emailData,
      },
    });
    console.log(`Email trigger created for invitation ${invitationToken} to ${inviteeEmail}`);

    return {
      success: true,
      message: 'Invitation created and email triggered successfully.',
      invitationId: invitationToken,
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create invitation.');
  }
});

// New function to create a property
export const createProperty = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerUid = request.auth.uid;
  const callerRoles = (request.auth.token?.roles as string[]) || [];
  const callerOrgId = request.auth.token?.organizationId as string | undefined;

  if (!callerRoles.includes('property_manager') || !callerOrgId) {
    throw new HttpsError('permission-denied', 'Only property managers can create properties within their organization.');
  }

  const { propertyName, address, propertyType } = request.data; // Add other fields as per your data model

  if (!propertyName || !address || !propertyType) {
    throw new HttpsError('invalid-argument', 'Missing required fields: propertyName, address, propertyType.');
  }
  // Add more specific validation for address object if needed

  try {
    const propertyCollectionRef = db.collection(`organizations/${callerOrgId}/properties`);
    const newPropertyRef = propertyCollectionRef.doc(); // Auto-generate ID

    const propertyData = {
      id: newPropertyRef.id, // Store the auto-generated ID within the document
      name: propertyName,
      address: address, // e.g., { street, city, state, zip }
      type: propertyType,
      organizationId: callerOrgId,
      managedBy: callerUid, // UID of the property manager creating it
      createdAt: FieldValue.serverTimestamp(),
      status: 'active', // Default status
      // Add any other relevant fields
    };

    await newPropertyRef.set(propertyData);
    console.log(`Property created with ID ${newPropertyRef.id} in organization ${callerOrgId}`);

    return {
      success: true,
      message: 'Property created successfully.',
      propertyId: newPropertyRef.id,
      propertyData: propertyData
    };
  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create property.');
  }
});
