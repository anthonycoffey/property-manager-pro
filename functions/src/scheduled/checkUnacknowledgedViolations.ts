import { pubsub } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import * as admin from 'firebase-admin';

export const checkUnacknowledgedViolations = pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    console.log('Checking for unacknowledged violations...');

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    try {
      const orgsSnapshot = await db.collection('organizations').get();

      for (const orgDoc of orgsSnapshot.docs) {
        const organizationId = orgDoc.id;
        const violationsRef = orgDoc.ref.collection('violations');

        const querySnapshot = await violationsRef
          .where('status', '==', 'pending_acknowledgement')
          .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(fiveMinutesAgo))
          .get();

        if (querySnapshot.empty) {
          continue;
        }

        const batch = db.batch();

        querySnapshot.forEach((doc) => {
          console.log(`Escalating violation ${doc.id} in organization ${organizationId}`);
          const violationRef = doc.ref;
          batch.update(violationRef, { status: 'escalated_to_manager' });

          // Create a notification for the property manager who reported it
          const violationData = doc.data();
          if (violationData.reporterId) {
            const notification = {
              title: 'Violation Escalated',
              body: `A parking violation for license plate ${violationData.licensePlate} has not been acknowledged and requires your attention.`,
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
      console.error('Error checking for unacknowledged violations:', error);
    }
  });
