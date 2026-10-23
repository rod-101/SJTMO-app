import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // New versions install in the background and activate on the next load.
      registerType: "autoUpdate",

      // Static assets live in frontend/static/ (see publicDir below).
      includeAssets: ["icons/apple-touch-icon.png"],

      manifest: {
        name: "San Jose Traffic Management Office",
        short_name: "SJTMO",
        description: "San Jose Traffic Management Office System",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#140c7e",
        background_color: "#ffffff",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-512-maskable.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        // Precache the app shell so it loads offline.
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
        navigateFallback: "/index.html",

        // Only cache what is safe to serve stale. Backend API calls are not
        // matched here, so they always go to the network and are never cached.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "osm-tiles",
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/unpkg\.com\/leaflet@.*/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "leaflet-assets",
              expiration: { maxEntries: 20 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Service worker stays off in `vite dev` to avoid stale-cache confusion.
      devOptions: { enabled: false },
    }),
  ],

  // Use 'static' as the public dir so the old CRA public/index.html
  // does NOT conflict with the Vite root index.html at build time.
  // Static assets (_redirects, manifest.json) go in frontend/static/
  publicDir: "static",

  build: {
    outDir: "dist",
    sourcemap: false, // inline source maps use eval(); disable in production
    target: "es2015", // esbuild targets native ES modules — no eval polyfills
    minify: "esbuild", // esbuild minifier never emits eval
  },

  server: {
    port: 3000,
    proxy: {
      "/tickets": "http://localhost:5000",
      "/users": "http://localhost:5000",
      "/ordinances": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
    },
  },
});
