import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'], // Output ESModule
  dts: true, // Generate .d.ts files
  splitting: true,
  sourcemap: true,
  clean: true, // Clean output directory before build
  target: 'esnext', // Target modern JS
  tsconfig: './tsconfig.json', // Specify tsconfig file
});
