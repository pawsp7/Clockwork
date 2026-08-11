import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API_TARGET = process.env.CLOCKWORK_API_URL ?? "http://localhost:4000";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
