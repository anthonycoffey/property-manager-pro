import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  console.log(`Current mode: ${mode}`);
  return {
    plugins: [react()],
    server: {
      allowedHosts: ['62ab454d0155.ngrok-free.app'],
    },
    define: {
      '__VITE_FIREBASE_API_KEY__': JSON.stringify(env.VITE_FIREBASE_API_KEY),
      '__VITE_FIREBASE_AUTH_DOMAIN__': JSON.stringify(env.VITE_FIREBASE_AUTH_DOMAIN),
      '__VITE_FIREBASE_PROJECT_ID__': JSON.stringify(env.VITE_FIREBASE_PROJECT_ID),
      '__VITE_FIREBASE_STORAGE_BUCKET__': JSON.stringify(env.VITE_FIREBASE_STORAGE_BUCKET),
      '__VITE_FIREBASE_MESSAGING_SENDER_ID__': JSON.stringify(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
      '__VITE_FIREBASE_APP_ID__': JSON.stringify(env.VITE_FIREBASE_APP_ID),
    }
  };
});
