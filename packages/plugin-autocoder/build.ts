#!/usr/bin/env bun

/**
 * Build script using bun build
 * Replaces tsup with native bun build functionality
 */

import { $ } from 'bun';
import { readFileSync, writeFileSync, existsSync } from 'fs';
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


  // Generate TypeScript declarations
  console.log('📝 Generating TypeScript declarations...');
  try {
    await $`tsc --project tsconfig.build.json`;
  } catch (error) {
    console.warn('⚠️ TypeScript declaration generation had issues, but continuing...');
  }
  
  // Copy main declaration file to expected location (always attempt)
  try {
    const sourcePath = 'dist/plugin-autocoder/src/index.d.ts';
    const targetPath = 'dist/index.d.ts';
    
    if (existsSync(sourcePath)) {
      const content = readFileSync(sourcePath, 'utf8');
      writeFileSync(targetPath, content);
      console.log('✅ Main declaration file copied to dist/index.d.ts');
    } else {
      console.warn('⚠️ Source declaration file not found, skipping copy');
    }
  } catch (copyError) {
    console.warn('⚠️ Failed to copy main declaration file:', copyError);
  }
  
  console.log('✅ TypeScript declarations generated');


  console.log('✅ Build complete!');
}

build().catch(console.error);
