import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development, requests to /api are passed on to the local Spring Boot backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8080" } },
  test: { environment: "jsdom", globals: true }
});
