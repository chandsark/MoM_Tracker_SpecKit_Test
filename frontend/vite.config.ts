import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // API_URL lets end-to-end tests point the dev server at their own API instance.
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
});
