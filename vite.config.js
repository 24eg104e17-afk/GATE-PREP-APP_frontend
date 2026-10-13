import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// In development the browser talks to this server only. Requests to /api are passed on to the Spring Boot backend.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { "/api": "http://localhost:8080" } },
  test: { environment: "jsdom", globals: true }
});
