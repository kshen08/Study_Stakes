import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  server: {
    port: 5173,
    fs: { allow: [path.resolve('.')] },
    proxy: { '/api': 'http://127.0.0.1:5174' },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
