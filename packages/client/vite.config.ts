import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      tsDecorators: false,
    }),
    nodePolyfills({
      include: ['crypto', 'stream', 'buffer', 'util', 'events', 'path', 'fs', 'module'],
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
      crypto: 'crypto-browserify',
    },
  },
  define: {
    global: 'globalThis',
  },
  // Use new Vite 5.1+ syntax for disabling optimizeDeps
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'buffer',
      'events',
      'crypto-browserify',
      'stream-browserify',
      'util',
      '@elizaos/core',
    ],
  },
  build: {
    target: 'es2020',
    minify: false, // Keep minification disabled to avoid esbuild
    rollupOptions: {
      // Removed manual chunks that were causing import issues
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
});
