import { auth as functionsAuth } from 'firebase-functions/v1'; // Aliased to avoid conflict if 'auth' is used for adminAuth
import { adminAuth, db, FieldValue } from '../firebaseAdmin.js'; // Added .js extension

// On sign up.
export const processSignUp = functionsAuth
  .user()
  .onCreate(async (user: functionsAuth.UserRecord) => {
    const { uid, email, displayName } = user; // Added displayName

    console.log(`New user signed up: ${email} (UID: ${uid})`);

    // List of specific admin emails (add as needed)
    const admin_emails = [
      'coffey.j.anthony@gmail.com',
      // Add more admin emails here
    ];

    // Check if user meets role criteria.
    // For admin users (e.g., *@24hrcarunlocking.com or in admin_emails)
    if (
      email &&
      (email.endsWith('@24hrcarunlocking.com') || admin_emails.includes(email))
    ) {
      const customClaims = {
        roles: ['admin'],
      };

      try {
        // Set custom user claims on this newly created user.
        await adminAuth.setCustomUserClaims(uid, customClaims);
        console.log(
          `Custom claims set for admin user ${uid}: ${JSON.stringify(
            customClaims
          )}`
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
        console.log(
          `Admin user profile created in 'admins' collection for ${uid}`
        );
      } catch (error) {
        console.error(
          `Error setting custom claims or creating admin profile for ${uid}:`,
          error
        );
      }
    } else {
      // For non-Super-Admin users.
      // The specific invitation-handling callable functions (e.g., signUpWithOrgManagerInvitation, signUpWithInvitation)
      // are responsible for setting their custom claims and creating appropriate Firestore profiles.
      // processSignUp will not set any default claims for these users to avoid potential race conditions
      // where it might overwrite claims set by the more specific invitation flows.
      console.log(
        `User ${uid} (${email}) is not a Super Admin. Claims and profile will be handled by the relevant invitation processing function if applicable.`
      );
      // No default claims are set here for non-Super-Admins.
    }
  });
