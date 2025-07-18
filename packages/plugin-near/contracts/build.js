#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Building NEAR JavaScript Smart Contracts...\n');

// Build escrow contract
console.log('Building escrow contract...');
try {
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'escrow-js'),
    stdio: 'inherit'
  });
  console.log('✅ Escrow contract built successfully\n');
} catch (error) {
  console.error('❌ Failed to build escrow contract:', error.message);
  process.exit(1);
}

// Build messaging contract
console.log('Building messaging contract...');
try {
  execSync('npm run build', { 
    cwd: path.join(__dirname, 'messaging-js'),
    stdio: 'inherit'
  });
  console.log('✅ Messaging contract built successfully\n');
} catch (error) {
  console.error('❌ Failed to build messaging contract:', error.message);
  process.exit(1);
}

// Create wasm directory in parent
const wasmDir = path.join(__dirname, '..', 'wasm');
if (!fs.existsSync(wasmDir)) {
  fs.mkdirSync(wasmDir, { recursive: true });
}

// Copy built contracts to wasm directory
console.log('Copying contracts to wasm directory...');
try {
  // Copy escrow contract
  const escrowSource = path.join(__dirname, 'escrow-js', 'build', 'escrow.wasm');
  const escrowDest = path.join(wasmDir, 'escrow.wasm');
  
  if (fs.existsSync(escrowSource)) {
    fs.copyFileSync(escrowSource, escrowDest);
    console.log(`✅ Copied escrow.wasm to ${escrowDest}`);
  } else {
    console.warn('⚠️  Escrow contract not found at:', escrowSource);
  }

  // Copy messaging contract
  const messagingSource = path.join(__dirname, 'messaging-js', 'build', 'messaging.wasm');
  const messagingDest = path.join(wasmDir, 'messaging.wasm');
  
  if (fs.existsSync(messagingSource)) {
    fs.copyFileSync(messagingSource, messagingDest);
    console.log(`✅ Copied messaging.wasm to ${messagingDest}`);
  } else {
    console.warn('⚠️  Messaging contract not found at:', messagingSource);
  }
} catch (error) {
  console.error('❌ Failed to copy contracts:', error.message);
  process.exit(1);
}

console.log('\n✅ All contracts built successfully!'); 