import { firestore } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';

export const onViolationUpdate = firestore
  .document('organizations/{organizationId}/violations/{violationId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();

    // Check if residentId was added in this update
    if (!beforeData.residentId && afterData.residentId) {
      const { organizationId, violationId } = context.params;
      const { residentId, propertyId } = afterData;

      if (!propertyId) {
        console.error(`Violation ${violationId} is missing propertyId.`);
        return;
      }

      const notification = {
        title: 'Parking Violation Warning',
        body: 'Your vehicle is in a restricted area. Please move it within 5 minutes to avoid a formal citation.',
        link: `/violations/${violationId}`, // Deep link to the specific violation
        createdAt: new Date(),
        read: false,
      };

      const notificationPath = `organizations/${organizationId}/properties/${propertyId}/residents/${residentId}/notifications`;

      try {
        await db.collection(notificationPath).add(notification);
        console.log(`Notification created for resident ${residentId} at ${notificationPath}`);
      } catch (error) {
        console.error('Error creating notification:', error);
      }
    }
  });
