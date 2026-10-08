import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

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
      '/auth-service': {
        target: 'http://localhost:10009',
        changeOrigin: true,
        secure: false,
        // Forward cookies for __Host-refresh
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Preserve original host for cookie security
            proxyReq.setHeader('X-Forwarded-Host', req.headers.host || 'localhost:5173');
          });
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost/',
      },
    },
    setupFiles: './src/test/setup.js',
    css: true,
    // Exclude Playwright specs — they use a different test runner
    exclude: ['**/node_modules/**', 'tests/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['src/test/**', '**/*.test.{js,jsx}', 'tests/**'],
    },
  },
});
