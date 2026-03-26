import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    allowedHosts: ['erp.snuol.com.vn', 'localhost'],
    hmr: {
      host: 'erp.snuol.com.vn',
      port: 443,
      protocol: 'wss',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      '/private': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false,
      },
      '/socket.io': {
        target: 'http://localhost:8082',
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
