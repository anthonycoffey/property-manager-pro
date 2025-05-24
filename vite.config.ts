import { defineConfig, loadEnv } from 'vite'; // Make sure loadEnv is imported
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables from process.cwd() (current working directory)
  // for the given 'mode' (e.g., 'production') and prefixed with 'VITE_'.
  // This will pick up the environment variables set in your GitHub Action.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react()],
    define: {
      // Define these variables so Vite replaces them statically in the bundle.
      // JSON.stringify() is crucial because the values need to be injected as string literals.
      'import.meta.env.VITE_FIREBASE_API_KEY': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      'import.meta.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      'import.meta.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      'import.meta.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      'import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      'import.meta.env.VITE_FIREBASE_APP_ID': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    },
  };
});