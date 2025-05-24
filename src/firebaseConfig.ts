import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage"; // Import getStorage

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('Firebase config:', firebaseConfig);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);
const storage = getStorage(app); // Initialize Firebase Storage

// Connect to emulators if in development mode (Vite specific)
if (import.meta.env.DEV) {
  console.log("Connecting to Firebase Emulators");
  try {
    const { connectAuthEmulator } = await import("firebase/auth");
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("Auth emulator connected");

    const { connectFirestoreEmulator } = await import("firebase/firestore");
    connectFirestoreEmulator(db, "localhost", 8080);
    console.log("Firestore emulator connected");

    const { connectFunctionsEmulator } = await import("firebase/functions");
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("Functions emulator connected");
    
    const { connectStorageEmulator } = await import("firebase/storage");
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("Storage emulator connected");

  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
}

export { app, auth, db, functions, storage }; // Export storage
