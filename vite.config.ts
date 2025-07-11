import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  console.log(`Current mode: ${mode}`);
  return {
    plugins: [react()],
    server: {
      allowedHosts: ['62ab454d0155.ngrok-free.app'],
    },
  };
});