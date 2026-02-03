import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/fuentmondo-manager/',
  plugins: [react()],
  server: {
    host: true, // Expose to network
    proxy: {
      '/api': {
        target: 'https://api.futmondo.com/external/kong',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/internal-api': {
        target: 'https://api.futmondo.com',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/internal-api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://app.futmondo.com');
            proxyReq.setHeader('Referer', 'https://app.futmondo.com/');
          });
        }
      }
    }
  }
})
