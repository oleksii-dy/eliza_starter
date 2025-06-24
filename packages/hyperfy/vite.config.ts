import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Custom plugin to inject process polyfill
const processPolyfillPlugin = () => ({
  name: 'process-polyfill',
  transform(code: string, id: string) {
    if (id.includes('node_modules') || !id.includes('/src/')) {
      return null;
    }
    // Inject process polyfill at the top of each module
    return {
      code: `
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: { NODE_ENV: 'development' },
    platform: '',
    versions: {},
    version: ''
  };
}
${code}`,
      map: null
    };
  }
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), processPolyfillPlugin()],

  // Define which env variables are exposed to client
  envPrefix: 'PUBLIC_', // Only expose env vars starting with PUBLIC_

  root: path.resolve(__dirname, 'src/client'),
  publicDir: 'public',

  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    target: 'esnext', // Support top-level await
    assetsDir: 'client-assets', // Use a different directory to avoid conflicts with world assets
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/client/index.html')
      }
    }
  },

  esbuild: {
    target: 'esnext' // Support top-level await
  },

  define: {
    // Provide global process object for libraries that check for it
    'global.process': JSON.stringify({
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development'
      },
      platform: '',
      versions: {},
      version: ''
    }),
    // Also define individual properties for direct access
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },

  server: {
    port: Number(process.env.VITE_PORT) || 3001,
    open: false,
    host: true,
    // These will be configured in the dev script
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@client': path.resolve('./src/client'),
      '@core': path.resolve('./src/core'),
      '@types': path.resolve('./src/types'),
    },
  },

  optimizeDeps: {
    include: ['three', 'react', 'react-dom'],
    esbuildOptions: {
      target: 'esnext' // Support top-level await
    }
  },
});
