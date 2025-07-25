import { https } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createPropertyNotification = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { organizationId, propertyId, notification } = data;
  const { title, message, violationId, vehicle } = notification || {};
  const createdBy = context.auth.uid;

  const roles = context.auth.token.roles || [];
  const hasPermission =
    roles.includes('admin') ||
    roles.includes('organization_manager') ||
    roles.includes('property_manager');

  if (!hasPermission) {
    throw new https.HttpsError(
      'permission-denied',
      'You do not have permission to perform this action.'
    );
  }

  if (!organizationId || !propertyId || !title || !message) {
    throw new https.HttpsError(
      'invalid-argument',
      'The function must be called with organizationId, propertyId, and a notification object with title and message.'
    );
  }

  try {
    const vehicleData = vehicle?.licensePlate ? { licensePlate: vehicle.licensePlate } : null;

    const notificationData = {
      title,
      message,
      createdBy,
      createdAt: new Date(),
      ...(violationId && { violationId }),
      ...(vehicleData && { vehicle: vehicleData }),
    };

    const notificationRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('properties')
      .doc(propertyId)
      .collection('notifications')
      .doc();

    await notificationRef.set(notificationData);

    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    throw handleHttpsError(error, 'Error creating property notification.');
  }
});
