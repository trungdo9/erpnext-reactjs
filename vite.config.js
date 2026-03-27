import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: ['192.168.180.68', 'localhost'],
    hmr: {
      host: '192.168.180.68',
      port: 5174,
      protocol: 'ws',
    },
    proxy: {
      '/api': {
        target: 'http://192.168.180.68:8080',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://192.168.180.68:8080',
        changeOrigin: true,
        secure: false,
      },
      '/private': {
        target: 'http://192.168.180.68:8080',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://192.168.180.68:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    assetsDir: 'static',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react-dom/') || id.includes('/react/')) return 'vendor-react';
            if (id.includes('/react-router-dom/') || id.includes('/react-router/')) return 'vendor-router';
            if (id.includes('/lucide-react/')) return 'vendor-icons';
            if (id.includes('/frappe-js-sdk/')) return 'vendor-frappe';
            if (id.includes('/recharts/') || id.includes('/d3-')) return 'vendor-charts';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
    sourcemap: mode === 'analyze',
  }
}))
