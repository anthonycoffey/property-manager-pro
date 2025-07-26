import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { google } from 'googleapis';
import { db } from '../firebaseAdmin.js';

const getOauth2Client = async (uid: string, organizationId: string) => {
  const tokenDocRef = db
    .collection('organizations')
    .doc(organizationId)
    .collection('googleAuth')
    .doc(uid);
  const tokenDoc = await tokenDocRef.get();

  if (!tokenDoc.exists) {
    throw new HttpsError('not-found', 'Google account connection not found.');
  }

  const tokens = tokenDoc.data();
  if (!tokens || !tokens.refreshToken) {
    throw new HttpsError(
      'failed-precondition',
      'Refresh token not found for the user.'
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_AUTH_CLIENT_ID,
    process.env.GOOGLE_AUTH_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: tokens.refreshToken,
  });

  // Test the token by getting a new access token
  try {
    const { token } = await oauth2Client.getAccessToken();
    if (token) {
      oauth2Client.setCredentials({
        access_token: token,
        refresh_token: tokens.refreshToken,
      });
    } else {
        throw new Error("Failed to refresh access token")
    }
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw new HttpsError(
      'permission-denied',
      'Failed to refresh access token. Please reconnect your Google account.'
    );
  }

  return oauth2Client;
};

export const getGmbLocations = onCall(async (request) => {
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

  const oauth2Client = await getOauth2Client(request.auth.uid, organizationId);

  const accountManagement = google.mybusinessaccountmanagement({
    version: 'v1',
    auth: oauth2Client,
  });

  const businessInformation = google.mybusinessbusinessinformation({
    version: 'v1',
    auth: oauth2Client,
  });

  try {
    const {
      data: { accounts },
    } = await accountManagement.accounts.list();
    if (!accounts || accounts.length === 0) {
      return { locations: [] };
    }

    const allLocations = [];
    for (const account of accounts) {
      const {
        data: { locations },
      } = await businessInformation.accounts.locations.list({
        parent: account.name || '',
        readMask: 'name,title,storefrontAddress,metadata',
      });
      if (locations) {
        allLocations.push(...locations);
      }
    }

    return { locations: allLocations };
  } catch (error) {
    console.error('Error fetching GMB locations:', error);
    throw new HttpsError('internal', 'Failed to fetch GMB locations.');
  }
});

export const linkGmbToProperty = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  const { organizationId, propertyId, placeId, locationName } = request.data as {
    organizationId: string;
    propertyId: string;
    placeId: string;
    locationName: string;
  };

  if (!organizationId || !propertyId) {
    throw new HttpsError(
      'invalid-argument',
      'Missing organizationId or propertyId.'
    );
  }

  const propertyDocRef = db
    .collection('organizations')
    .doc(organizationId)
    .collection('properties')
    .doc(propertyId);

  try {
    await propertyDocRef.update({
      'gmb.placeId': placeId,
      'gmb.locationName': locationName,
    });
    return { success: true };
  } catch (error) {
    console.error('Error linking GMB to property:', error);
    throw new HttpsError('internal', 'Failed to link GMB location.');
  }
});
