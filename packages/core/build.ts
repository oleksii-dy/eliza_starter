#!/usr/bin/env bun

/**
 * Build script for @elizaos/core using bun build
 */

import { $ } from 'bun';
import { buildConfig } from './build.config';
import { promises as fs } from 'fs';
import { join } from 'path';

async function build() {
  console.log('🏗️  Building @elizaos/core...');

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

  // Post-process the index.js to remove createRequire import and handlebars extensions
  console.log('🔧 Post-processing for browser compatibility...');
  const indexPath = join(import.meta.dir, 'dist/index.js');
  let content = await fs.readFile(indexPath, 'utf-8');

  // Remove createRequire import
  content = content.replace(
    /import\s*{\s*createRequire\s*}\s*from\s*["']node:module["'];?\s*\n?/g,
    ''
  );

  // Also remove any usage of createRequire if present
  content = content.replace(/const\s+require\s*=\s*createRequire\([^)]*\);?\s*\n?/g, '');
  
  // Remove direct createRequire usage (the problematic line)
  content = content.replace(/var __require = \/\* @__PURE__ \*\/ createRequire\(import\.meta\.url\);?\s*\n?/g, '');
  content = content.replace(/createRequire\(import\.meta\.url\)/g, '(() => { throw new Error("createRequire not available in browser"); })');
  
  // Replace any remaining createRequire references with a browser-safe version
  content = content.replace(/createRequire/g, '(() => { throw new Error("createRequire not available in browser"); })');

  // Remove handlebars require.extensions code
  content = content.replace(
    /if\s*\(\s*__require\.extensions\s*\)\s*{[^}]*__require\.extensions\[["']\.handlebars["']\][^}]*}/g,
    ''
  );

  await fs.writeFile(indexPath, content);
  console.log('✅ Removed Node.js specific imports and handlebars extensions');

  // Generate TypeScript declarations
  console.log('📝 Generating TypeScript declarations...');
  try {
    await $`tsc --project tsconfig.build.json`;
    console.log('✅ TypeScript declarations generated');
  } catch (error) {
    console.warn('⚠️ TypeScript declaration generation had issues, but continuing...');
  }

  console.log('✅ Build complete!');
}

build().catch(console.error);
