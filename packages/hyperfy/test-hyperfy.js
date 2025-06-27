#!/usr/bin/env node

console.log('✅ Hyperfy Package Test');
console.log('=======================');
console.log('📦 Package: @elizaos/hyperfy');
console.log('🔍 Testing basic functionality...');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test 1: Package structure
console.log('\n1. Package Structure Check:');
const packageJsonPath = path.join(__dirname, 'package.json');
const srcPath = path.join(__dirname, 'src');

if (fs.existsSync(packageJsonPath) && fs.existsSync(srcPath)) {
  console.log('   ✅ Package structure is valid');
} else {
  console.log('   ❌ Missing package.json or src directory');
  process.exit(1);
}

// Test 2: RPG Scripts
console.log('\n2. RPG Scripts Check:');
const rpgTestScript = path.join(__dirname, 'scripts', 'run-rpg-tests.mjs');
const rpgVisualScript = path.join(__dirname, 'scripts', 'rpg-visual-test.mjs');

if (fs.existsSync(rpgTestScript) && fs.existsSync(rpgVisualScript)) {
  console.log('   ✅ RPG test scripts are present');
} else {
  console.log('   ❌ Missing RPG test scripts');
  process.exit(1);
}

// Test 3: Core directories
console.log('\n3. Core Directory Structure:');
const coreDir = path.join(__dirname, 'src', 'core');
const rpgDir = path.join(__dirname, 'src', 'rpg');

if (fs.existsSync(coreDir) && fs.existsSync(rpgDir)) {
  console.log('   ✅ Core and RPG directories exist');
} else {
  console.log('   ❌ Missing core or RPG directories');
  process.exit(1);
}

console.log('\n🎉 All basic tests passed!');
console.log('📝 Note: Visual tests require full development environment setup');
console.log('💡 To run visual tests: npm run test:rpg');
console.log('');