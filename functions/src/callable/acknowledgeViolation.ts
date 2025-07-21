import { https } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import { FieldValue } from 'firebase-admin/firestore';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface AcknowledgeViolationData {
  violationId: string;
  organizationId: string;
}

export const acknowledgeViolation = https.onCall(async (data: AcknowledgeViolationData, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { violationId, organizationId } = data;
  const userId = context.auth.uid;

  if (!violationId || !organizationId) {
    throw new https.HttpsError('invalid-argument', 'The function must be called with "violationId" and "organizationId" arguments.');
  }

  try {
    const violationRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('violations')
      .doc(violationId);

    const violationSnap = await violationRef.get();

    if (!violationSnap.exists) {
      throw new https.HttpsError('not-found', 'Violation not found.');
    }

    const violationData = violationSnap.data();

    if (violationData?.residentId !== userId) {
      throw new https.HttpsError('permission-denied', 'You do not have permission to acknowledge this violation.');
    }

    await violationRef.update({
      status: 'acknowledged',
      acknowledgedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Violation acknowledged successfully.' };
  } catch (error) {
    throw handleHttpsError(error, 'Failed to acknowledge violation.');
  }
});
