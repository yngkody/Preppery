

// https://vitejs.dev/config/
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/",                 // important for Vercel
  build: {
    outDir: "dist",          // Vercel will serve this
    sourcemap: true
  }
});

