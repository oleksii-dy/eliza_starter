#!/usr/bin/env bun

import { $ } from 'bun';
import fs from 'fs-extra';
import path from 'path';

async function build() {
  console.log('🏗️  Building CLI with TypeScript compiler...');

  // Clean dist directory
  await fs.remove('dist');
  await fs.ensureDir('dist');

  // Copy templates first
  console.log('📁 Copying templates...');
  try {
    await $`bun run src/scripts/copy-templates.ts`;
  } catch (error) {
    console.warn('⚠️  Failed to copy templates:', error);
  }

  // Use TypeScript compiler to build
  console.log('🔨 Compiling TypeScript...');
  try {
    await $`npx tsc --project tsconfig.build.json`;
    console.log('✅ TypeScript compilation successful');
  } catch (error) {
    console.error('❌ TypeScript compilation failed:', error);
    process.exit(1);
  }

  // Copy package.json to dist
  await fs.copy('package.json', 'dist/package.json');
  console.log('📦 Copied package.json to dist');

  // Copy templates to dist
  if (await fs.pathExists('templates')) {
    await fs.copy('templates', 'dist/templates');
    console.log('📁 Copied templates to dist');
  }

  // Make the CLI executable
  const cliPath = path.join('dist', 'src', 'index.js');
  if (await fs.pathExists(cliPath)) {
    await fs.chmod(cliPath, 0o755);
    console.log('🔧 Made CLI executable');
  }

  console.log('✅ Build complete!');
}

build().catch(console.error); 