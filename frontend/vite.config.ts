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
      includeAssets: ['favicon.svg', 'sync-kiz.png'],
      /**
       * Manifeste servi depuis `public/manifest.webmanifest` (dev + build) pour éviter une réponse HTML
       * (fallback SPA / SW) que le navigateur interprète comme JSON invalide.
       */
      manifest: false,
      workbox: {
        /** Précache uniquement les assets du build ; les appels `fetch` vers l’API ne sont pas mis en cache par défaut. */
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
        navigateFallback: '/index.html',
        /** Ne pas substituer index.html pour le manifeste (sinon erreur « Syntax error » ligne 1). */
        navigateFallbackDenylist: [/^\/manifest\.webmanifest$/, /\.webmanifest$/],
      },
      devOptions: {
        /**
         * Désactivé : Workbox en dev intercepte `/`, le fallback SPA et casse le chargement des modules Vite
         * (`client`, `main.tsx`, @react-refresh → ERR_CONNECTION_REFUSED ou pages blanches).
         * Tester la PWA avec `npm run build` puis `npm run preview -- --host`.
         */
        enabled: false,
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
