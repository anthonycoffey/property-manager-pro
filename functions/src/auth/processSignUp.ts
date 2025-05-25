import { auth as functionsAuth } from 'firebase-functions/v1'; // Aliased to avoid conflict if 'auth' is used for adminAuth
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js'; // Added .js extension

// On sign up.
export const processSignUp = functionsAuth
  .user()
  .onCreate(async (user: functionsAuth.UserRecord) => {
    const { uid, email, emailVerified, displayName } = user; // Added displayName

    console.log(`New user signed up: ${email} (UID: ${uid})`);

    // Check if user meets role criteria.
    // For admin users (e.g., *@24hrcarunlocking.com)
    if (email && email.endsWith('@24hrcarunlocking.com') && emailVerified) {
      const customClaims = {
        roles: ['admin'],
      };

      try {
        // Set custom user claims on this newly created user.
        await adminAuth.setCustomUserClaims(uid, customClaims);
        console.log(
          `Custom claims set for admin user ${uid}: ${JSON.stringify(customClaims)}`
        );

        // Create a user profile in the 'admins' collection for admin users
        await db
          .collection('admins')
          .doc(uid)
          .set({
            uid: uid,
            email: email,
            displayName: displayName || 'Admin User',
            roles: ['admin'],
            createdAt: FieldValue.serverTimestamp(),
            status: 'active',
          });
        console.log(`Admin user profile created in 'admins' collection for ${uid}`);
      } catch (error) {
        console.error(
          `Error setting custom claims or creating admin profile for ${uid}:`,
          error
        );
      }
    } else {
    // For non-admin users (direct sign-ups)
    // Set 'pending_association' claim. No Firestore document is created here for these users.
    try {
      const customClaims = {
        roles: ['pending_association'],
      };
      await adminAuth.setCustomUserClaims(uid, customClaims);
      console.log(
        `Default 'pending_association' claims set for user ${uid}: ${JSON.stringify(
          customClaims
        )}`
      );
    } catch (error) {
      console.error(
        `Error setting 'pending_association' claims for ${uid}:`,
        error
      );
    }
    }
  });
