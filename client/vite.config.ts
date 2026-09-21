import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';
import { securityHeaders } from './security-headers';

// Where the API runs during development (override with API_URL=... if it is not on :4000).
const apiTarget = process.env.API_URL ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  // `npm run preview` serves the production build with the same headers a real host should send.
  preview: {
    headers: securityHeaders,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
      '/robots.txt': apiTarget,
      '/sitemap.xml': apiTarget,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': apiTarget,
      '/uploads': apiTarget,
      '/robots.txt': apiTarget,
      '/sitemap.xml': apiTarget,
    },
  },
});
