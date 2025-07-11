import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator, type Functions } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

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
const storage = getStorage(app);
// We will get the functions instance later, after connecting to the emulator

let functions: Functions;

// Connect to emulators if in development mode (Vite specific)
if (import.meta.env.DEV) {
  console.log("Connecting to Firebase Emulators");
  try {
    connectAuthEmulator(auth, "http://localhost:9099");
    console.log("Auth emulator connected");

    connectFirestoreEmulator(db, "localhost", 8080);
    console.log("Firestore emulator connected");
    
    connectStorageEmulator(storage, "localhost", 9199);
    console.log("Storage emulator connected");

    // Now that the auth emulator is connected, we can get the functions instance
    functions = getFunctions(app);
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log("Functions emulator connected");

  } catch (error) {
    console.error("Error connecting to Firebase emulators:", error);
  }
} else {
  functions = getFunctions(app);
}

export { app, auth, db, functions, storage };
