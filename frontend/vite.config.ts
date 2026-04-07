import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        id: '/',
        name: 'ImmoPilot — Gestion immobilière',
        short_name: 'ImmoPilot',
        description: 'Biens, locataires, baux, loyers, charges et tableau de bord.',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'fr',
        dir: 'ltr',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        /** Précache uniquement les assets du build ; les appels `fetch` vers l’API ne sont pas mis en cache par défaut. */
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: {
        /** Service worker en dev (meilleure détection « Installer l’app » sur Edge / Chrome). */
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    /** Ouvre l’app sur le LAN (téléphone sur le même Wi‑Fi) : http://IP_DU_PC:5173 */
    host: true,
    proxy: {
      '/auth': { target: 'http://localhost:4000', changeOrigin: true },
      '/buildings': { target: 'http://localhost:4000', changeOrigin: true },
      '/units': { target: 'http://localhost:4000', changeOrigin: true },
      '/tenants': { target: 'http://localhost:4000', changeOrigin: true },
      '/leases': { target: 'http://localhost:4000', changeOrigin: true },
      '/payments': { target: 'http://localhost:4000', changeOrigin: true },
      '/charges': { target: 'http://localhost:4000', changeOrigin: true },
      '/dashboard': { target: 'http://localhost:4000', changeOrigin: true },
      '/reports': { target: 'http://localhost:4000', changeOrigin: true },
      '/search': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
