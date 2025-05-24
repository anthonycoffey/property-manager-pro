import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  console.log(`Current mode: ${mode}`);
  return {
    plugins: [react()],
  };
});