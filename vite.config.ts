import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    preset: process.env.VERCEL ? "vercel" : process.env.NITRO_PRESET || undefined,
  },
  vite: {
    build: {
      chunkSizeWarningLimit: 4000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules/jspdf") || id.includes("node_modules/html2canvas") || id.includes("node_modules/canvg")) {
              return "vendor-pdf";
            }
            if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
              return "vendor-firebase";
            }
          },
        },
      },
    },
  },
});
