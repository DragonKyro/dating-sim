import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  // GitHub Pages serves the site from /dating-sim/.
  base: '/dating-sim/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Last Ferry',
        short_name: 'Last Ferry',
        description: 'A conversational dating game. Everyone on the island is deciding whether to stay or go. So are you.',
        theme_color: '#17121f',
        background_color: '#17121f',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        // Gemini and Firebase calls always go to the network.
        navigateFallbackDenylist: [/^\/__/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // The Firebase chunks load lazily, on sign-in only.
  build: { chunkSizeWarningLimit: 800 },
  test: {
    environment: 'node',
    globals: true,
  },
});
