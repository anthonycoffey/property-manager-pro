import { onCall, HttpsError } from "firebase-functions/v2/https";
import { adminAuth } from "../firebaseAdmin.js";
import { UserRecord } from "firebase-admin/auth";

interface UserProfile {
  displayName: string;
  photoURL: string | null;
}

export const getUserProfiles = onCall(async (request) => {
  // Ensure the user is authenticated
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const uids = request.data.uids as string[];

  if (!Array.isArray(uids) || uids.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "The function must be called with a non-empty array of uids."
    );
  }

  const profilesMap: { [uid: string]: UserProfile } = {};

  try {
    // Use adminAuth to fetch user records in a single batch operation.
    // This is the most efficient way to look up users by UID.
    const userRecords = await adminAuth.getUsers(uids.map((uid) => ({ uid })));

    userRecords.users.forEach((userRecord: UserRecord) => {
      // We only care about users that exist and have a display name.
      if (userRecord && userRecord.displayName) {
        profilesMap[userRecord.uid] = {
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL || null,
        };
      }
    });

    return profilesMap;
  } catch (error) {
    console.error("Error getting user profiles:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "An unexpected error occurred while fetching user profiles.");
  }
});
