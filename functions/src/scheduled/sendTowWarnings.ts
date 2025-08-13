import 'dotenv/config';
import { pubsub } from 'firebase-functions/v1';
import { db } from '../firebaseAdmin.js';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendTowWarnings = pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const violationsRef = db.collectionGroup('violations');
    const snapshot = await violationsRef
      .where('status', '==', 'reported')
      .where('smsTowWarningSent', '!=', true)
      .where('createdAt', '<=', twoMinutesAgo)
      .get();

    if (snapshot.empty) {
      console.log('No violations found needing a tow warning.');
      return;
    }

    const promises = snapshot.docs.map(async (doc) => {
      const violation = doc.data();
      if (!violation.residentId) {
        return;
      }

      const residentRef = db.doc(
        `organizations/${violation.organizationId}/properties/${violation.propertyId}/residents/${violation.residentId}`
      );
      const residentDoc = await residentRef.get();
      const resident = residentDoc.data();

      if (resident && resident.phone) {
        try {
          await twilioClient.messages.create({
            body: `Urgent: Your vehicle with license plate ${violation.licensePlate} is in violation and will be towed soon. Please move it immediately.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: resident.phone,
          });
          await doc.ref.update({ smsTowWarningSent: true });
          console.log(`SMS tow warning sent for violation ${doc.id}`);
        } catch (error) {
          console.error(`Failed to send SMS for violation ${doc.id}:`, error);
        }
      }
    });

    await Promise.all(promises);
  });
