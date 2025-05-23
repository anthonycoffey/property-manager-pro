// src/firebaseConfig.ts
import { initializeApp} from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAnuM1xQVfIjMitYwr4COJLHFmicNpnLew",
  authDomain: "phoenix-property-manager-pro.firebaseapp.com",
  projectId: "phoenix-property-manager-pro",
  storageBucket: "phoenix-property-manager-pro.firebasestorage.app",
  messagingSenderId: "76291599872",
  appId: "1:76291599872:web:55d24f0831f430ce67f2e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
