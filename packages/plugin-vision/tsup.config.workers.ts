import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/workers/screen-capture-worker.ts',
    'src/workers/florence2-worker.ts',
    'src/workers/ocr-worker.ts',
  ],
  format: ['cjs'], // Workers need CommonJS format
  dts: false, // No type definitions needed for workers
  splitting: false,
  sourcemap: true,
  clean: true,
  outDir: 'dist/workers',
  target: 'node18',
  external: [
    'sharp',
    '@tensorflow/tfjs-node',
    '@tensorflow-models/mobilenet',
    '@mapbox/node-pre-gyp',
    'mock-aws-s3',
    'aws-sdk',
    'nock',
    'canvas',
    'face-api.js',
  ], // Keep native modules and problematic dependencies external
  noExternal: [] // Don't force bundling of everything
}); 