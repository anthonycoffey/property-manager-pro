import { pubsub } from 'firebase-functions/v1';
import { db, Timestamp } from '../firebaseAdmin.js';

export const processUnassignedViolations = pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    console.log('Checking for unassigned violations...');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      const orgsSnapshot = await db.collection('organizations').get();

      for (const orgDoc of orgsSnapshot.docs) {
        const organizationId = orgDoc.id;
        const violationsRef = orgDoc.ref.collection('violations');

        const querySnapshot = await violationsRef
          .where('status', '==', 'reported')
          .where('violationType', 'in', [
            'unauthorized_parking',
            'fire_lane',
            'double_parked',
          ])
          .where('createdAt', '<=', Timestamp.fromDate(fiveMinutesAgo))
          .get();

        if (querySnapshot.empty) {
          continue;
        }

        const batch = db.batch();

        querySnapshot.forEach((doc) => {
          console.log(
            `Moving violation ${doc.id} to pending_tow in organization ${organizationId}`
          );
          const violationRef = doc.ref;
          batch.update(violationRef, { status: 'pending_tow' });

          // Create a notification for the property manager who reported it
          const violationData = doc.data();
          if (violationData.reporterId) {
            const notification = {
              title: 'Violation Pending Tow',
              body: `A parking violation for license plate ${violationData.licensePlate} has not been assigned and is now pending tow.`,
              link: `/violations/${doc.id}`, // Link to the specific violation
              createdAt: new Date(),
              read: false,
            };
            const notificationPath = `organizations/${organizationId}/users/${violationData.reporterId}/notifications`;
            const notificationRef = db.collection(notificationPath).doc();
            batch.set(notificationRef, notification);
          }
        });

        await batch.commit();
      }
    } catch (error) {
      console.error('Error checking for unassigned violations:', error);
    }
  });
