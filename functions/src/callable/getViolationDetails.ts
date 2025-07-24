import { https, logger } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface GetViolationDetailsData {
  violationId: string;
  organizationId: string;
  propertyId: string;
}

export const getViolationDetails = https.onCall(async (data: GetViolationDetailsData, context) => {
  logger.info('getViolationDetails called', { data, auth: context.auth });

  if (!context.auth) {
    logger.error('Authentication error: Function called without authentication.');
    throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { violationId, organizationId, propertyId } = data;
  const userId = context.auth.uid;

  if (!violationId || !organizationId || !propertyId) {
    const missingParams = [];
    if (!violationId) missingParams.push('violationId');
    if (!organizationId) missingParams.push('organizationId');
    if (!propertyId) missingParams.push('propertyId');
    const errorMessage = `The function must be called with required arguments. Missing: ${missingParams.join(', ')}.`;
    logger.error(errorMessage, { data });
    throw new https.HttpsError('invalid-argument', errorMessage);
  }

  logger.info(`Fetching violation ${violationId} for user ${userId} in org ${organizationId}, property ${propertyId}`);

  try {
    const violationRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('properties')
      .doc(propertyId)
      .collection('violations')
      .doc(violationId);

    logger.info(`Executing Firestore get for path: ${violationRef.path}`);
    const violationSnap = await violationRef.get();

    if (!violationSnap.exists) {
      logger.warn(`Violation not found at path: ${violationRef.path}`);
      throw new https.HttpsError('not-found', 'Violation not found.');
    }

    const violationData = violationSnap.data();
    logger.info('Violation data retrieved successfully', { violationId, violationData });

    // Security check: Ensure the user is either the resident assigned to the violation or the person who reported it.
    if (violationData?.residentId !== userId && violationData?.reporterId !== userId) {
      logger.warn('Permission denied for user to view violation', {
        userId,
        residentId: violationData?.residentId,
        reporterId: violationData?.reporterId,
      });
      throw new https.HttpsError('permission-denied', 'You do not have permission to view this violation.');
    }

    const result = { ...violationData, id: violationSnap.id };
    logger.info('Successfully fetched and authorized violation details. Returning result.', { result });

    return result;
  } catch (error) {
    logger.error('Error in getViolationDetails', { error });
    throw handleHttpsError(error, 'Failed to get violation details.');
  }
});
