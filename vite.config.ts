/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  // Build-time prerender (src/entry-server.tsx): react-helmet-async ships as
  // CommonJS, which Node can't import by name, so it is bundled into the SSR build.
  ssr: {
    noExternal: ["react-helmet-async"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Run under Kenyan time so timezone regressions in month/date keys fail
    // the suite instead of shipping. See src/lib/month.ts.
    environment: "node",
    env: { TZ: "Africa/Nairobi" },
    include: ["src/**/*.test.ts"],
  },
}));
