import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 3002,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:3003", changeOrigin: false },
    },
  },
  preview: { host: "127.0.0.1", port: 3002, strictPort: true },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
