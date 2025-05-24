import { HttpsError } from 'firebase-functions/v2/https';

// Helper function to handle errors and throw HttpsError
export function handleHttpsError(error: unknown, defaultMessage: string): HttpsError {
  console.error(defaultMessage, error);

  if (error instanceof HttpsError) {
    return error; // Already an HttpsError, re-throw as is
  }

  // Check for Firebase Auth errors specifically
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: string }).code === 'string'
  ) {
    const firebaseErrorCode = (error as { code: string }).code;
    if (firebaseErrorCode === 'auth/email-already-exists') {
      return new HttpsError(
        'already-exists',
        'The email address is already in use by another account.'
      );
    }
    // You can add more specific Firebase error codes here if needed
  }

  // Extract message from error if available, otherwise use default
  const errorMessage =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: string }).message === 'string'
      ? (error as { message: string }).message
      : 'An unknown error occurred.';

  return new HttpsError('internal', defaultMessage, errorMessage);
}
