import { auth } from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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
    if (email && email.endsWith('@24hrcarunlocking.com') && emailVerified) {
      const customClaims = {
        admin: true,
      };

      try {
        // Set custom user claims on this newly created user.
        await getAuth().setCustomUserClaims(uid, customClaims);
        console.log(
          `Custom claims set for user ${uid}: ${JSON.stringify(customClaims)}`
        );

        // Also create a user profile in Firestore for admin users
        await db
          .collection('users')
          .doc(uid)
          .set({
            uid: uid,
            email: email,
            displayName: user.displayName || 'Admin User',
            roles: ['admin'], // Assign 'admin' role in Firestore
            accessLevel: 9,
            createdAt: FieldValue.serverTimestamp(), // Changed to FieldValue
            status: 'active',
          });
        console.log(`Admin user profile created in Firestore for ${uid}`);
      } catch (error) {
        console.error(
          `Error setting custom claims or updating metadata for ${uid}:`,
          error
        );
      }
    } else {
      // For non-admin users, set default claims and create Firestore profile
      try {
        const customClaims = {
          roles: ['resident'],
        };
        await getAuth().setCustomUserClaims(uid, customClaims);
        console.log(
          `Default custom claims set for user ${uid}: ${JSON.stringify(
            customClaims
          )}`
        );

        await db
          .collection('users')
          .doc(uid)
          .set({
            uid: uid,
            email: email,
            displayName: user.displayName || 'New User',
            roles: ['resident'],
            createdAt: FieldValue.serverTimestamp(), // Changed to FieldValue
            status: 'pending_assignment',
          });
        console.log(`User profile created in Firestore for ${uid}`);
      } catch (error) {
        console.error(
          `Error setting default custom claims or creating user profile for ${uid}:`,
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
