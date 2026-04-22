import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Smaller chunks = faster load on Vercel CDN
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor libs into separate cached chunks
          "vendor-react":    ["react", "react-dom", "react-router-dom"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-charts":   ["recharts"],
          "vendor-pdf":      ["jspdf"],
          "vendor-i18n":     ["i18next", "react-i18next"],
        },
      },
    },
    // Minify for smaller bundle
    minify: "esbuild",
    sourcemap: false,
  },
  // Optimise deps pre-bundling — faster cold starts on Vercel
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@supabase/supabase-js",
      "react-i18next",
      "i18next",
      "recharts",
      "jspdf",
      "react-hot-toast",
      "date-fns",
    ],
  },
});
