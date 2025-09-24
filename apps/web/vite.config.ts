import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
    preserveSymlinks: false,
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: process.env.NODE_ENV === 'development' && process.env.DOCKER ? 'http://api:3000' : 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom'],
    exclude: []
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        // Use content hash for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        // Split chunks for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['lucide-react', 'sonner'],
          query: ['@tanstack/react-query'],
        }
      }
    },
    // Ensure deterministic module IDs for better caching
    modulePreload: {
      polyfill: false
    },
    // Add cache busting to HTML
    assetsInlineLimit: 0,
    // Force new build every time
    emptyOutDir: true
  }
})
