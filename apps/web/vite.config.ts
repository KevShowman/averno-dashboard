import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
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
      external: []
    }
  }
})
