import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Use 'static' as the public dir so the old CRA public/index.html
  // does NOT conflict with the Vite root index.html at build time.
  // Static assets (_redirects, manifest.json) go in frontend/static/
  publicDir: 'static',

  build: {
    outDir: 'dist',
  },

  server: {
    port: 3000,
    proxy: {
      '/login': 'http://localhost:5000',
      '/violations': 'http://localhost:5000',
      '/users': 'http://localhost:5000',
      '/ordinances': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
