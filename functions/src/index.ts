import * as logger from 'firebase-functions/logger';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import admin from 'firebase-admin';
import { AuthBlockingEvent } from 'firebase-functions/v2/identity';

admin.initializeApp();
const db = admin.firestore();

export const onUserCreate = beforeUserCreated(async (event: AuthBlockingEvent) => {
  const user = event.data; // AuthBlockingEvent has data property for UserRecord

  if (!user) {
    logger.error('No user data found in event.');
    return;
  }

  const { uid, email, displayName } = user;

  logger.info(`New user signed up: ${email} (UID: ${uid})`);

  try {
    const customClaims = {
      roles: ['resident'],
    };

    // Note: For blocking functions, custom claims are typically set in the response,
    // but for simplicity and immediate effect, we'll set them directly here.
    // The blocking function can also modify the user record before creation.
    await admin.auth().setCustomUserClaims(uid, customClaims);
    logger.info(
      `Custom claims set for user ${uid}: ${JSON.stringify(customClaims)}`
    );

    await db
      .collection('users')
      .doc(uid)
      .set({
        uid: uid,
        email: email,
        displayName: displayName || 'New User',
        roles: ['resident'],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'pending_assignment',
      });

    logger.info(`User profile created in Firestore for ${uid}`);

    // Return an empty object or void if no modifications to the user record are needed
    return {};
  } catch (error) {
    logger.error(
      `Error setting custom claims or creating user profile for ${uid}:`,
      error
    );
    // Re-throw the error to block user creation if something goes wrong
    throw error;
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
