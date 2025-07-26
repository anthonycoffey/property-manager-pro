import { https } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

export const createViolationReport = https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { organizationId, propertyId, licensePlate, violationType, photoUrl } =
    data;
  const reporterId = context.auth.uid;

  if (
    !organizationId ||
    !propertyId ||
    !licensePlate ||
    !violationType ||
    !photoUrl
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      'The function must be called with organizationId, propertyId, licensePlate, violationType, and photoUrl.'
    );
  }

  try {
    const residentsRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('properties')
      .doc(propertyId)
      .collection('residents');

    const querySnapshot = await residentsRef
      .where('vehicleLicensePlates', 'array-contains', licensePlate)
      .limit(1)
      .get();

    let residentId = null;
    if (!querySnapshot.empty) {
      residentId = querySnapshot.docs[0].id;
    }

    const violationData = {
      organizationId,
      propertyId,
      licensePlate,
      violationType,
      photoUrl,
      reporterId,
      residentId, // Can be null if no match is found
      status: residentId ? 'pending' : 'reported',
      createdAt: new Date(),
    };

    const violationsRef = db
      .collection('organizations')
      .doc(organizationId)
      .collection('properties')
      .doc(propertyId)
      .collection('violations');

    const batch = db.batch();
    const violationRef = violationsRef.doc();
    batch.set(violationRef, violationData);

    if (residentId) {
      // If resident is known, create a direct notification for them
      const notificationRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('properties')
        .doc(propertyId)
        .collection('residents')
        .doc(residentId)
        .collection('notifications')
        .doc();

      const notificationData = {
        title: 'Parking Violation Warning',
        body: `A parking violation has been reported for a vehicle with license plate ${licensePlate}. Please check the details.`,
        link: `/dashboard/resident/violations/${violationRef.id}`,
        mobileLink: `amenilink-resident://(resident)/my-violations/${violationRef.id}`,
        createdAt: new Date(),
        read: false,
      };
      batch.set(notificationRef, notificationData);
    } else {
      // If resident is unknown, create a property-wide notification for managers
      const propertyNotificationRef = db
        .collection('organizations')
        .doc(organizationId)
        .collection('properties')
        .doc(propertyId)
        .collection('notifications')
        .doc();

      const propertyNotificationData = {
        title: 'Unidentified Vehicle Violation',
        message: `A violation has been reported for an unidentified vehicle with license plate: ${licensePlate}.`,
        violationId: violationRef.id,
        vehicle: { licensePlate },
        link: `/dashboard/resident/violations/${violationRef.id}`,
        mobileLink: `amenilink-resident://(resident)/my-violations/${violationRef.id}`,
        createdAt: new Date(),
        createdBy: reporterId,
      };
      batch.set(propertyNotificationRef, propertyNotificationData);
    }

    await batch.commit();

    return { success: true, violationId: violationRef.id };
  } catch (error) {
    throw handleHttpsError(error, 'Error creating violation report.');
  }
});
