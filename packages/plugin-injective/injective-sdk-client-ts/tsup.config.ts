
import { defineConfig } from 'tsup';
import { builtinModules } from 'module';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'], // Adjust if your entry point is different
  format: ['esm'], // ESM output
  dts: true, // Generate TypeScript declaration files
  sourcemap: true, // Optional: Generate source maps
  clean: true, // Clean output directory before build
  splitting: false, // Disable code splitting unless needed
  minify: false, // Disable minification for easier debugging
  platform: 'node', // Target Node.js
  target: 'node23', // Specify Node.js version without minor/patch

  // Externalize Node.js built-in modules and dependencies
  external: [
    // Node.js built-in modules
    ...builtinModules,

    // Externalize all dependencies
    ...Object.keys(pkg.dependencies || {}),
  ],

  esbuildOptions: (esbuild) => {
    // Optional: Define global constants or polyfills if needed
    // esbuild.define = { 'process.env.NODE_ENV': '"production"' };
  },
});
