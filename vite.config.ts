import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",

  plugins: [react()],

  server: {
    host: "127.0.0.1",
    port: 3000,
    strictPort: true,

    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});