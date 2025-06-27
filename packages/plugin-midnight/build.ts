#!/usr/bin/env bun

/**
 * Build script using bun build
 * Replaces tsup with native bun build functionality
 */

import { $ } from 'bun';
import { buildConfig } from './build.config';
import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

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

  // Copy WASM files from Midnight Network packages
  console.log('📦 Copying WASM files...');
  await copyWasmFiles();

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

async function copyWasmFiles() {
  const wasmFiles = [
    {
      src: '../../node_modules/@midnight-ntwrk/ledger/midnight_ledger_wasm_bg.wasm',
      dest: 'dist/midnight_ledger_wasm_bg.wasm'
    }
  ];

  // Ensure dist directory exists
  if (!existsSync('dist')) {
    await mkdir('dist', { recursive: true });
  }

  for (const { src, dest } of wasmFiles) {
    try {
      if (existsSync(src)) {
        await copyFile(src, dest);
        console.log(`✅ Copied ${src} to ${dest}`);
      } else {
        console.warn(`⚠️ WASM file not found: ${src}`);
      }
    } catch (error) {
      console.error(`❌ Failed to copy ${src}:`, error);
    }
  }
}

build().catch(console.error);
