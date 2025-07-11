import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db } from '../firebaseAdmin.js';

export const createViolationReport = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { organizationId, propertyId, licensePlate, violationType, photoUrl } = request.data;
  const reporterId = request.auth.uid;

  if (!organizationId || !propertyId || !licensePlate || !violationType || !photoUrl) {
    throw new HttpsError('invalid-argument', 'The function must be called with organizationId, propertyId, licensePlate, violationType, and photoUrl.');
  }

  try {
    console.log(`Creating violation for property: ${propertyId} in organization: ${organizationId}`);
    const propertyDoc = await db.collection('organizations').doc(organizationId).collection('properties').doc(propertyId).get();
    if (!propertyDoc.exists) {
      console.error(`Property with ID ${propertyId} not found in organization ${organizationId}.`);
      throw new HttpsError('not-found', 'Property not found.');
    }

    const violation = {
      organizationId,
      propertyId,
      licensePlate,
      violationType,
      photoUrl,
      reporterId,
      status: 'reported',
      createdAt: new Date(),
    };

    console.log('Violation data to be saved:', violation);
    const violationRef = await db.collection('violations').add(violation);
    console.log(`Violation created with ID: ${violationRef.id}`);

    return { success: true, violationId: violationRef.id };
  } catch (error) {
    console.error('Error creating violation report:', error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError('internal', 'An unexpected error occurred.');
  }
});
