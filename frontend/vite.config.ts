import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        headers: {
          'x-api-key': process.env.SYNCRO_SCALE_API_KEY || '',
        },
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            if (process.env.SYNCRO_SCALE_API_KEY) {
              proxyReq.setHeader('x-api-key', process.env.SYNCRO_SCALE_API_KEY);
            }
          });
        },
      },
    },
  },
  build: {
    outDir: '../public',
    emptyOutDir: false,
  },
});
