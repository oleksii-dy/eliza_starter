import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: '/client-static/',
  plugins: [
    react(),
    nodePolyfills({
      // Include specific polyfills
      include: [
        'crypto',
        'stream', 
        'buffer',
        'util',
        'events',
        'path',
        'fs',
        'module'
      ],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Additional aliases if needed
      crypto: 'crypto-browserify',
    },
  },
  define: {
    // Define global for browser compatibility
    global: 'globalThis',
  },
  optimizeDeps: {
    include: [
      'buffer',
      'events', 
      'crypto-browserify',
      'stream-browserify',
      'util',
      '@elizaos/core'
    ],
    // Disable esbuild for dependency optimization
    disabled: false,
    force: true,
  },
  build: {
    // Increase memory limit and reduce parallelism to avoid EPIPE errors
    rollupOptions: {
      output: {
        chunkSizeWarningLimit: 1600,
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['@radix-ui/react-alert-dialog', '@radix-ui/react-avatar', '@radix-ui/react-checkbox'],
          'chart-vendor': ['react-force-graph', 'react-force-graph-2d'],
        },
      },
      maxParallelFileOps: 2,
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Reduce memory pressure and avoid esbuild EPIPE issues
    target: 'esnext',
    minify: 'terser',
    // Use terser instead of esbuild for minification to avoid EPIPE
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    },
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});