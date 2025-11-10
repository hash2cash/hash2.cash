import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Vite configuration supporting multi-page builds for legal/contact routes.
export default defineConfig({
  plugins: [svelte()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        terms: resolve(__dirname, 'terms/index.html'),
        privacy: resolve(__dirname, 'privacy/index.html'),
        contact: resolve(__dirname, 'contact/index.html'),
        mergeMining: resolve(__dirname, 'merge-mining/index.html'),
      }
    }
  },
  server: {
    allowedHosts: ['lab.in.ionance.com'],
    host: '0.0.0.0',
  }
});
