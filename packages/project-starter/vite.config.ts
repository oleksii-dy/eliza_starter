import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, copyFileSync, existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function copyAvatarPlugin() {
  return {
    name: "copy-eliza-avatar",
    apply: "build" as const,
    closeBundle() {
      const src = path.resolve(
        __dirname,
        "src/frontend/avatars/elizaos-avatar.png"
      );
      const destDir = path.resolve(__dirname, "dist/frontend/assets/avatars");
      const dest = path.resolve(destDir, "elizaos-avatar.png");

      if (!existsSync(src)) {
        console.warn(
          `elizaos-avatar.png not found at ${src}, skipping copy.`
        );
        return;
      }

      if (!existsSync(destDir)) {
        mkdirSync(destDir, { recursive: true });
      }

      copyFileSync(src, dest);
      console.info(`Copied elizaos-avatar.png to ${dest} during build.`);
    },
  };
}


// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyAvatarPlugin()],
  root: 'src/frontend',
  build: {
    outDir: '../../dist/frontend',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/frontend/index.html'),
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@tanstack/react-query'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@elizaos/core': path.resolve(__dirname, '../../core/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
