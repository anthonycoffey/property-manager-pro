import * as functions from 'firebase-functions'; // Use general import

// Helper function to handle errors and throw HttpsError (v1 compatible)
export function handleHttpsError(error: unknown, defaultMessage: string): functions.https.HttpsError {
  console.error(defaultMessage, error);

  if (error instanceof functions.https.HttpsError) { // Check against v1 HttpsError
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
      return new functions.https.HttpsError( // Use v1 HttpsError
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

  // Constructing a v1 HttpsError. Note: v1 HttpsError constructor is (code, message, details?)
  // The 'details' (third param) is optional and can be any JSON-serializable object.
  // Here, errorMessage (extracted message) can be part of the main message or put in details.
  // For simplicity, appending to defaultMessage if different.
  const finalMessage = defaultMessage === errorMessage ? defaultMessage : `${defaultMessage} Details: ${errorMessage}`;
  return new functions.https.HttpsError('internal', finalMessage); 
}
