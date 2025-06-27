#!/usr/bin/env bun

/**
 * Build script using bun build
 * Replaces tsup with native bun build functionality
 */

import { $ } from 'bun';
import { buildConfig } from './build.config';

async function build() {
  console.log('🏗️  Building package...');

  // Clean dist directory
  await $`rm -rf dist`;

  // Build with bun
  const result = await Bun.build(buildConfig);

  if (!result.success) {
    console.error('❌ Build failed:');
    for (const message of result.logs) {
      console.error(message);
    }
    process.exit(1);
  }

  console.log(`✅ Built ${result.outputs.length} files`);

  // Copy package.json to dist for proper module resolution
  await $`cp package.json dist/package.json`;
  console.log('📦 Copied package.json to dist');

  console.log('✅ Build complete!');
}

build().catch(console.error);
