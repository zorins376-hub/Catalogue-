import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev server proxies /api and /img to the local Worker (wrangler dev :8787).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8787',
      '/img': 'http://localhost:8787',
      '/print': 'http://localhost:8787',
    },
  },
});
