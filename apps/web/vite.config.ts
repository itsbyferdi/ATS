import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API is optional. When it is running, the second PDF engine becomes available.
    proxy: { '/api': { target: process.env.API_URL ?? 'http://localhost:8787', changeOrigin: true } },
  },
  build: { outDir: 'dist', sourcemap: true },
});
