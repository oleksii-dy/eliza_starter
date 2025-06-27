#!/usr/bin/env bun

/**
 * Build script for @elizaos/plugin-bridge using bun build
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
  sourcemap: 'none', // Disable sourcemap to reduce memory usage
  external: [
    '@elizaos/core',
    '@lifi/sdk',
    'ethers',
    'viem',
    'zod',
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
  console.log('🏗️  Building @elizaos/plugin-bridge...');

  // Clean dist directory
  await $`rm -rf dist`;

  // Ensure dist directory exists
  await fs.mkdir('./dist', { recursive: true });

  // Build with bun
  console.log('📦 Starting Bun build with config:', JSON.stringify(buildConfig, null, 2));
  const result = await Bun.build(buildConfig);

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log(`✅ Built ${result.outputs.length} files`);
  
  // Debug: Print information about outputs
  for (let i = 0; i < result.outputs.length; i++) {
    const output = result.outputs[i];
    console.log(`📄 Output ${i + 1}:`);
    console.log(`   Path: ${output.path}`);
    console.log(`   Kind: ${output.kind}`);
    console.log(`   Size: ${output.size} bytes`);
    
    // If output has a path, ensure it's written to disk
    if (output.path) {
      try {
        const outputPath = join('./dist', output.path.split('/').pop() || 'index.js');
        console.log(`📝 Writing output to: ${outputPath}`);
        
        // Get the actual content from the output
        const content = await output.text();
        await Bun.write(outputPath, content);
        
        // Verify the file was written
        const stats = await fs.stat(outputPath);
        console.log(`✅ Successfully wrote ${outputPath} (${stats.size} bytes)`);
      } catch (error) {
        console.error(`❌ Failed to write output: ${error}`);
      }
    }
  }

  // List dist directory contents
  console.log('📁 Dist directory contents:');
  const distContents = await fs.readdir('./dist');
  for (const file of distContents) {
    const stats = await fs.stat(join('./dist', file));
    console.log(`   ${file} (${stats.size} bytes)`);
  }

  console.log('✅ Build complete!');
}

build().catch(console.error);