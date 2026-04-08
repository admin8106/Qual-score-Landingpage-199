import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/// <reference types="vitest" />

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },

  optimizeDeps: {
    exclude: ['lucide-react'],
  },

  build: {
    // Source maps: enabled in staging for easier debugging, disabled in production
    sourcemap: mode === 'staging',

    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // Split vendor chunks for better browser cache hit rates across deploys
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui':       ['lucide-react'],
        },
      },
    },

    chunkSizeWarningLimit: 600,
  },

  server: {
    // In dev, proxy /api calls to the Spring Boot backend — avoids local CORS config
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
