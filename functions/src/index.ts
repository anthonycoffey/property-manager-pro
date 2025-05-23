import * as logger from 'firebase-functions/logger';
import * as functions from 'firebase-functions'; // Import the main functions module
import admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

// On sign up.
export const processSignUp = functions.auth.user().onCreate(async (user) => {
  const { uid, email, emailVerified } = user;

  logger.info(`New user signed up: ${email} (UID: ${uid})`);

  // Check if user meets role criteria.
  if (
    email &&
    email.endsWith('@admin.example.com') &&
    emailVerified
  ) {
    const customClaims = {
      admin: true,
      accessLevel: 9
    };

    try {
      // Set custom user claims on this newly created user.
      await admin.auth().setCustomUserClaims(uid, customClaims);
      logger.info(
        `Custom claims set for user ${uid}: ${JSON.stringify(customClaims)}`
      );

      // Update real-time database to notify client to force refresh.
      const metadataRef = admin.database().ref('metadata/' + uid);

      // Set the refresh time to the current UTC timestamp.
      // This will be captured on the client to force a token refresh.
      await metadataRef.set({ refreshTime: new Date().getTime() });
      logger.info(`Metadata updated for user ${uid} to force token refresh.`);

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
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'active',
        });
      logger.info(`Admin user profile created in Firestore for ${uid}`);

    } catch (error) {
      logger.error(
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
      await admin.auth().setCustomUserClaims(uid, customClaims);
      logger.info(
        `Default custom claims set for user ${uid}: ${JSON.stringify(customClaims)}`
      );

      await db
        .collection('users')
        .doc(uid)
        .set({
          uid: uid,
          email: email,
          displayName: user.displayName || 'New User',
          roles: ['resident'],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          status: 'pending_assignment',
        });
      logger.info(`User profile created in Firestore for ${uid}`);

    } catch (error) {
      logger.error(
        `Error setting default custom claims or creating user profile for ${uid}:`,
        error
      );
    }
  }
});

import { onCall } from "firebase-functions/v2/https"; // Import onCall for callable functions
import { HttpsError } from "firebase-functions/v2/https"; // Import HttpsError

// Helper function to handle errors and throw HttpsError
function handleHttpsError(error: unknown, defaultMessage: string): HttpsError {
  logger.error(defaultMessage, error);

  if (error instanceof HttpsError) {
    return error; // Already an HttpsError, re-throw as is
  }

  // Check for Firebase Auth errors specifically
  if (typeof error === 'object' && error !== null && 'code' in error && typeof (error as { code: string }).code === 'string') {
    const firebaseErrorCode = (error as { code: string }).code;
    if (firebaseErrorCode === 'auth/email-already-exists') {
      return new HttpsError('already-exists', 'The email address is already in use by another account.');
    }
    // You can add more specific Firebase error codes here if needed
  }

  // Extract message from error if available, otherwise use default
  const errorMessage = (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: string }).message === 'string')
    ? (error as { message: string }).message
    : 'An unknown error occurred.';

  return new HttpsError('internal', defaultMessage, errorMessage);
}

export const createPropertyManager = onCall(async (request) => {
  // Check if the user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  // Check if the user has the 'admin' role
  const callerRoles = request.auth.token?.roles as string[] || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can create property managers.');
  }

  const { email, displayName, organizationId, password } = request.data;

  // Basic input validation
  if (!email || !displayName || !organizationId || !password) {
    throw new HttpsError('invalid-argument', 'Missing required fields: email, displayName, organizationId, password.');
  }

  try {
    // 1. Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
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
    await admin.auth().setCustomUserClaims(uid, customClaims);
    logger.info(`Custom claims set for new property manager ${uid}: ${JSON.stringify(customClaims)}`);

    // 3. Create user document in Firestore under the organization's users subcollection
    await db.collection('organizations').doc(organizationId).collection('users').doc(uid).set({
      uid: uid,
      email: email,
      displayName: displayName,
      organizationRoles: ['property_manager'], // Mirroring custom claims
      organizationId: organizationId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active',
    });

    logger.info(`Property manager profile created in Firestore for ${uid}`);

    return { success: true, message: 'Property manager created successfully', uid: uid };

  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to create property manager.');
  }
});

export const updatePropertyManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerRoles = request.auth.token?.roles as string[] || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can update property managers.');
  }

  const { uid, email, displayName, organizationId, roles } = request.data;

  if (!uid || !organizationId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: uid, organizationId.');
  }

  try {
    const updates: { email?: string; displayName?: string } = {};
    if (email) updates.email = email;
    if (displayName) updates.displayName = displayName;

    if (Object.keys(updates).length > 0) {
      await admin.auth().updateUser(uid, updates);
      logger.info(`Firebase Auth user ${uid} updated: ${JSON.stringify(updates)}`);
    }

    // Update custom claims if roles or organizationId are provided
    const currentCustomClaims = (await admin.auth().getUser(uid)).customClaims || {};
    const newCustomClaims = {
      ...currentCustomClaims,
      roles: roles || currentCustomClaims.roles,
      organizationId: organizationId || currentCustomClaims.organizationId,
    };
    await admin.auth().setCustomUserClaims(uid, newCustomClaims);
    logger.info(`Custom claims updated for user ${uid}: ${JSON.stringify(newCustomClaims)}`);

    // Update Firestore document
    const firestoreUpdates: { displayName?: string; organizationRoles?: string[]; organizationId?: string } = {};
    if (displayName) firestoreUpdates.displayName = displayName;
    if (roles) firestoreUpdates.organizationRoles = roles;
    if (organizationId) firestoreUpdates.organizationId = organizationId;

    if (Object.keys(firestoreUpdates).length > 0) {
      await db.collection('organizations').doc(organizationId).collection('users').doc(uid).update(firestoreUpdates);
      logger.info(`Firestore profile updated for ${uid}: ${JSON.stringify(firestoreUpdates)}`);
    }

    return { success: true, message: 'Property manager updated successfully' };

  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to update property manager.');
  }
});

export const deletePropertyManager = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const callerRoles = request.auth.token?.roles as string[] || [];
  if (!callerRoles.includes('admin')) {
    throw new HttpsError('permission-denied', 'Only administrators can delete property managers.');
  }

  const { uid, organizationId } = request.data;

  if (!uid || !organizationId) {
    throw new HttpsError('invalid-argument', 'Missing required fields: uid, organizationId.');
  }

  try {
    // 1. Delete Firebase Auth user
    await admin.auth().deleteUser(uid);
    logger.info(`Firebase Auth user ${uid} deleted.`);

    // 2. Delete Firestore document
    await db.collection('organizations').doc(organizationId).collection('users').doc(uid).delete();
    logger.info(`Firestore profile deleted for ${uid}.`);

    return { success: true, message: 'Property manager deleted successfully' };

  } catch (error: unknown) {
    throw handleHttpsError(error, 'Failed to delete property manager.');
  }
});
