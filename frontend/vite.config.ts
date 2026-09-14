import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Optional dev-only proxy: lets a second checkout run on another port without changing API CORS.
const apiProxyTarget = process.env.TERRA_API_PROXY_TARGET;

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["maplibre-gl"] },
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: apiProxyTarget ? { "/api": { target: apiProxyTarget, changeOrigin: true } } : undefined,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
  },
});
