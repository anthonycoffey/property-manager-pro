import { HttpsError } from 'firebase-functions/v2/https';

// Helper function to handle errors and throw HttpsError for v2 functions
export function handleHttpsErrorV2(error: unknown, defaultMessage: string): HttpsError {
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
    if (firebaseErrorCode.startsWith('auth/')) {
        const message = (error as { message?: string }).message || 'An authentication error occurred.';
        return new HttpsError('failed-precondition', message);
    }
  }

  const errorMessage =
    error instanceof Error ? error.message : 'An unknown error occurred.';

  return new HttpsError('internal', `${defaultMessage}: ${errorMessage}`);
}
