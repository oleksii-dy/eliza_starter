#!/usr/bin/env bun

/**
 * Build script for @elizaos/plugin-lending using bun build
 */

import { $ } from 'bun';
import { promises as fs } from 'fs';
import { join } from 'path';

const buildConfig = {
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  target: 'node',
  format: 'esm',
  splitting: false,
  sourcemap: 'none',
  external: [
    '@elizaos/core',
    '@aave/core-v3',
    '@aave/math-utils', 
    '@aave/contract-helpers',
    'ethers',
    'viem',
    'zod',
    'bignumber.js',
    'fs',
    'path',
    'os',
    'net',
    'process',
    'buffer',
  ],
  naming: '[dir]/[name].[ext]',
};

async function build() {
  console.log('🏗️  Building @elizaos/plugin-lending...');

  // Clean dist directory
  await $`rm -rf dist`;

  // Ensure dist directory exists
  await fs.mkdir('./dist', { recursive: true });

  // Build with bun
  console.log('📦 Starting Bun build...');
  const result = await Bun.build(buildConfig);

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log(`✅ Built ${result.outputs.length} files`);
  
  // Write outputs to disk
  for (let i = 0; i < result.outputs.length; i++) {
    const output = result.outputs[i];
    
    if (output.path) {
      try {
        const outputPath = join('./dist', output.path.split('/').pop() || 'index.js');
        const content = await output.text();
        await Bun.write(outputPath, content);
        
        const stats = await fs.stat(outputPath);
        console.log(`✅ Successfully wrote ${outputPath} (${stats.size} bytes)`);
      } catch (error) {
        console.error(`❌ Failed to write output: ${error}`);
      }
    }
  }

  console.log('✅ Build complete!');
}

build().catch(console.error);