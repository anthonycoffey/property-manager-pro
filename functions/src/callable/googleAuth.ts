import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions'; // For onRequest v1
import 'dotenv/config'; // Load environment variables from .env files
import { google } from 'googleapis';
import { db } from '../firebaseAdmin.js';

console.log(
  process.env.GOOGLE_AUTH_CLIENT_ID,
  process.env.GOOGLE_AUTH_CLIENT_SECRET
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_AUTH_CLIENT_ID,
  process.env.GOOGLE_AUTH_CLIENT_SECRET,
  // This will be the URL of our HTTP function that handles the callback
  `https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/handleGoogleOAuthCallback`
);

export const initiateGoogleOAuth = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { organizationId } = request.data as { organizationId: string };
  if (!organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'The function must be called with an "organizationId".'
    );
  }

  const scopes = ['https://www.googleapis.com/auth/business.manage'];

  const state = `${request.auth.uid}|${organizationId}`;

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: state,
  });

  return { authorizationUrl: url };
});

export const handleGoogleOAuthCallback = functions.https.onRequest(
  async (req, res) => {
    const { code, state } = req.query;

    const frontendUrl =
      process.env.FUNCTIONS_EMULATOR === 'true'
        ? 'http://localhost:5173'
        : 'https://amenities.24hrcarunlocking.com';

    const redirectPath = '/dashboard/property-manager/organization-settings';

    if (!code) {
      res.status(400).send('Missing authorization code.');
      return;
    }
    if (!state || typeof state !== 'string') {
      res.status(400).send('Missing or invalid state parameter.');
      return;
    }

    const [uid, organizationId] = (state as string).split('|');
    if (!uid || !organizationId) {
      res.status(400).send('Invalid state parameter format.');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      const { access_token, refresh_token } = tokens;

      if (!refresh_token) {
        console.warn(
          `No refresh token received for user ${uid}. This may be because they have previously authorized the app.`
        );
      }

      const tokenData = {
        accessToken: access_token,
        refreshToken: refresh_token,
        createdAt: new Date(),
      };

      await db
        .collection('organizations')
        .doc(organizationId)
        .collection('googleAuth')
        .doc(uid)
        .set(tokenData, { merge: true });

      res.redirect(`${frontendUrl}${redirectPath}?status=success`);
    } catch (error) {
      console.error('Error handling Google OAuth callback:', error);
      res.redirect(`${frontendUrl}${redirectPath}?status=error`);
    }
  }
);

export const disconnectGoogleAccount = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { organizationId } = request.data as { organizationId: string };
  if (!organizationId) {
    throw new HttpsError(
      'invalid-argument',
      'The function must be called with an "organizationId".'
    );
  }

  const uid = request.auth.uid;
  const tokenDocRef = db
    .collection('organizations')
    .doc(organizationId)
    .collection('googleAuth')
    .doc(uid);
  const tokenDoc = await tokenDocRef.get();

  if (!tokenDoc.exists) {
    throw new HttpsError(
      'not-found',
      'No Google account connection found for this user in this organization.'
    );
  }

  const { refreshToken } = tokenDoc.data() as { refreshToken: string };

  try {
    if (refreshToken) {
      await oauth2Client.revokeToken(refreshToken);
    }
    await tokenDocRef.delete();
    return { success: true };
  } catch (error) {
    console.error('Error disconnecting Google account:', error);
    await tokenDocRef.delete();
    throw new HttpsError('internal', 'Failed to disconnect Google account.');
  }
});
