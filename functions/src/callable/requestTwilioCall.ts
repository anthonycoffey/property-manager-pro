import * as functions from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import { handleHttpsError } from '../helpers/handleHttpsError.js';

interface RequestTwilioCallData {
  phoneNumber: string;
}

interface TwilioCallResponse {
  sid?: string;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow other properties from Twilio
}

export const requestTwilioCall = functions.onCall(
  async (request: functions.CallableRequest<RequestTwilioCallData>) => {
    // Check authentication
    if (!request.auth) {
      throw new functions.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.'
      );
    }

    const { phoneNumber } = request.data;

    // Validate phone number (basic E.164 check)
    if (!phoneNumber || !/^\+[1-9]\d{1,14}$/.test(phoneNumber)) {
      throw new functions.HttpsError(
        'invalid-argument',
        'Invalid phone number format. Must be in E.164 format (e.g., +15551234567).'
      );
    }

    // Get Twilio secrets from environment variables
    // These should be set via .env file for local emulation (loaded by dotenv in index.ts or similar)
    // or as environment variables for deployed functions.
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
    const TWILIO_WEBHOOK_URL = process.env.TWILIO_WEBHOOK_URL;

    if (
      !TWILIO_ACCOUNT_SID ||
      !TWILIO_AUTH_TOKEN ||
      !TWILIO_PHONE_NUMBER ||
      !TWILIO_WEBHOOK_URL
    ) {
      console.error(
        'Missing Twilio environment variables. Ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER, and TWILIO_WEBHOOK_URL are set in the environment.'
      );
      throw new functions.HttpsError(
        'internal',
        'Server configuration error: Missing Twilio credentials.'
      );
    }

    console.log(
      `Requesting Twilio call to: ${phoneNumber} from ${TWILIO_PHONE_NUMBER} with webhook ${TWILIO_WEBHOOK_URL}`
    );

    const twilioApiUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`;
    const authHeader =
      'Basic ' +
      Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString(
        'base64'
      );

    const params = new URLSearchParams();
    params.append('To', phoneNumber);
    params.append('From', TWILIO_PHONE_NUMBER);
    params.append('Url', TWILIO_WEBHOOK_URL);

    try {
      const twilioResponse = await fetch(twilioApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader,
        },
        body: params,
      });

      const twilioData = (await twilioResponse.json()) as TwilioCallResponse;

      if (twilioResponse.ok) {
        console.log('Twilio call successfully initiated:', twilioData);
        return {
          success: true,
          message: 'Call request successful.',
          callSid: twilioData.sid,
        };
      }
      console.error('Twilio API error:', twilioData);
      throw new functions.HttpsError(
        'internal',
        `Failed to initiate call. Twilio error: ${
          twilioData.message || twilioResponse.statusText
        }`,
        twilioData
      );
    } catch (error) {
      return handleHttpsError(
        error,
        'An unexpected error occurred while requesting a Twilio call.'
      );
    }
  }
);
