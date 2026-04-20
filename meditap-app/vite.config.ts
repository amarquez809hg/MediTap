/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    /* Match common Ionic dev URL (many bookmarks use :8100) */
    port: 8100,
    strictPort: false,
  },
  plugins: [
    react(),
    legacy()
  ],
  optimizeDeps: {
    include: ['pdfjs-dist'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
