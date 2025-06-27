#!/usr/bin/env bun

/**
 * Standard plugin build script for ElizaOS
 * Provides consistent build behavior across all plugins
 */

import { $ } from 'bun';
import { createPluginConfig } from '@elizaos/core';

async function build() {
  console.log('🏗️  Building plugin...');

  // Clean dist directory
  await $`rm -rf dist`;

  // Use default plugin config or load from build.config.ts if it exists
  let buildConfig;
  try {
    const configModule = await import('./build.config');
    buildConfig = configModule.buildConfig;
  } catch {
    // Fallback to default config
    buildConfig = createPluginConfig(['./src/index.ts']);
  }

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

  // Generate TypeScript declarations
  console.log('📝 Generating TypeScript declarations...');
  try {
    await $`tsc --project tsconfig.json`;
    console.log('✅ TypeScript declarations generated');
  } catch (_error) {
    console.warn('⚠️ TypeScript declaration generation had issues, but continuing...');
  }

  console.log('✅ Plugin build complete!');
}

build().catch(console.error);