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
