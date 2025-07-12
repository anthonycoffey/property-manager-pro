import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin SDK only if it hasn't been initialized already
if (getApps().length === 0) {
  initializeApp();
}

export const adminAuth = getAuth();
export const db = getFirestore();
export const storage = getStorage();
export const messaging = getMessaging();
export { FieldValue, FieldPath, Timestamp } from 'firebase-admin/firestore'; // Re-export FieldValue, FieldPath, and Timestamp
