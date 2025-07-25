import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js';
import { handleHttpsErrorV2 } from '../helpers/handleHttpsErrorV2.js';

export const anonymizeAndDeleteUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const uid = request.auth.uid;

  try {
    const userRecord = await adminAuth.getUser(uid);
    const roles = userRecord.customClaims?.roles || [];

    // Anonymize user data in Firestore
    if (roles.includes('admin') || roles.includes('organization_manager')) {
      const adminRef = db.collection('admins').doc(uid);
      await adminRef.update({
        displayName: 'Deleted Admin',
        email: `deleted+${uid}@example.com`,
      });
    } else if (roles.includes('property_manager')) {
      const userDocs = await db.collectionGroup('users').where('uid', '==', uid).get();
      for (const doc of userDocs.docs) {
        await doc.ref.update({
          displayName: 'Deleted Property Manager',
          email: `deleted+${uid}@example.com`,
          phone: '000-000-0000',
        });
      }
    } else if (roles.includes('resident')) {
      const residentDocs = await db
        .collectionGroup('residents')
        .where('uid', '==', uid)
        .get();
      for (const doc of residentDocs.docs) {
        await doc.ref.update({
          displayName: 'Deleted Resident',
          email: `deleted+${uid}@example.com`,
          phone: '000-000-0000',
          vehicles: [],
          vehicleLicensePlates: FieldValue.delete(),
        });
      }
    }

    // Delete user from Firebase Authentication
    await adminAuth.deleteUser(uid);

    return { success: true, message: 'Account successfully deleted.' };
  } catch (error) {
    throw handleHttpsErrorV2(error, 'Failed to delete user.');
  }
});
