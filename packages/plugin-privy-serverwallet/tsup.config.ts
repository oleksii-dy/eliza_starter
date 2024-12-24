import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  clean: true,
  target: 'esnext',
  format: ['esm'],
  dts: true,
});
