import { https } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface GetViolationDetailsData {
  violationId: string;
  organizationId: string;
  propertyId: string;
}

export const getViolationDetails = https.onCall(async (data: GetViolationDetailsData, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { violationId, organizationId, propertyId } = data;
  const userId = context.auth.uid;

  if (!violationId || !organizationId || !propertyId) {
    throw new https.HttpsError(
      'invalid-argument',
      'The function must be called with "violationId", "organizationId", and "propertyId" arguments.'
    );
  }

  try {
    const violationRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('properties')
      .doc(propertyId)
      .collection('violations')
      .doc(violationId);

    const violationSnap = await violationRef.get();

    if (!violationSnap.exists) {
      throw new https.HttpsError('not-found', 'Violation not found.');
    }

    const violationData = violationSnap.data();

    // Security check: Ensure the user is either the resident assigned to the violation or the person who reported it.
    if (violationData?.residentId !== userId && violationData?.reporterId !== userId) {
      throw new https.HttpsError('permission-denied', 'You do not have permission to view this violation.');
    }

    return { ...violationData, id: violationSnap.id };
  } catch (error) {
    throw handleHttpsError(error, 'Failed to get violation details.');
  }
});
