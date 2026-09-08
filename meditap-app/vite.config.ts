/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    /*
     * Local `npm run dev` uses 8101 so it never fights Docker on :8100.
     * Docker frontend keeps http://127.0.0.1:8100 (and Safari "localhost" IPv6).
     * Prefer http://127.0.0.1:8100 when Docker is running.
     */
    port: 8101,
    strictPort: true,
    host: '127.0.0.1',
    headers: {
      // Dev: never let the browser keep a stale Tab14 sidebar module
      'Cache-Control': 'no-store',
    },
  },
  plugins: [
    react(),
    legacy()
  ],
  optimizeDeps: {
    include: ['pdfjs-dist', 'tesseract.js'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
