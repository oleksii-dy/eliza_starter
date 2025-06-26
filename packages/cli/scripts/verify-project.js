#!/usr/bin/env node

/**
 * Project verification script
 * Ensures the CLI package is clean and well-organized
 */

import { existsSync, statSync } from 'fs';
import { readdir } from 'fs/promises';
import { join } from 'path';

const projectRoot = process.cwd();

const requiredFiles = [
  'package.json',
  'README.md',
  'tsconfig.json',
  'src/index.ts',
  'scripts/test-autocoder.ts',
  'scripts/test-github-todo.ts'
];

const disallowedFiles = [
  'scenario_output.log',
  'LOGS.md',
  'comprehensive-scenario-results.md',
  'test-production-scenario.cjs',
  'test-autocoder-scenarios.ts',
  'test-scenario.js',
  'SCENARIO_VALIDATION_REPORT.md',
  'test-todo-simple.ts',
  'ENHANCED_SCENARIOS_SUMMARY.md',
  'test-cli-integration.cjs',
  'GITHUB_TODO_WORKFLOW_RESULTS.md',
  'test-github-todo-workflow.ts',
  'test-enhanced-scenarios.cjs',
  'test-github-simple.ts',
  'test-github-workflow.cjs'
];

const disallowedDirectories = [
  ':memory:',
  'test-data',
  'existing-app',
  'my-test-app',
  'plugin-my-create'
];

async function verifyProject() {
  console.log('🔍 Verifying ElizaOS CLI project structure...\n');

  let allPassed = true;

  // Check required files exist
  console.log('📁 Checking required files:');
  for (const file of requiredFiles) {
    const exists = existsSync(join(projectRoot, file));
    const status = exists ? '✅' : '❌';
    console.log(`  ${status} ${file}`);
    if (!exists) allPassed = false;
  }

  // Check disallowed files don't exist
  console.log('\n🧹 Checking cleanup (disallowed files):');
  for (const file of disallowedFiles) {
    const exists = existsSync(join(projectRoot, file));
    const status = exists ? '❌' : '✅';
    console.log(`  ${status} ${file} ${exists ? '(should be removed)' : ''}`);
    if (exists) allPassed = false;
  }

  // Check disallowed directories don't exist
  console.log('\n📂 Checking cleanup (disallowed directories):');
  for (const dir of disallowedDirectories) {
    const exists = existsSync(join(projectRoot, dir));
    const status = exists ? '❌' : '✅';
    console.log(`  ${status} ${dir}/ ${exists ? '(should be removed)' : ''}`);
    if (exists) allPassed = false;
  }

  // Check scripts directory structure
  console.log('\n🛠️  Checking scripts organization:');
  const scriptsDir = join(projectRoot, 'scripts');
  if (existsSync(scriptsDir)) {
    const entries = await readdir(scriptsDir, { withFileTypes: true });
    
    const hasTestScripts = entries.some(e => e.name === 'test-autocoder.ts' || e.name === 'test-github-todo.ts');
    const hasTestsSubdir = entries.some(e => e.isDirectory() && e.name === 'tests');
    
    console.log(`  ${hasTestScripts ? '✅' : '❌'} Test scripts present`);
    console.log(`  ${hasTestsSubdir ? '✅' : '❌'} Tests subdirectory organized`);
    
    if (!hasTestScripts || !hasTestsSubdir) allPassed = false;
  } else {
    console.log('  ❌ Scripts directory missing');
    allPassed = false;
  }

  // Check package.json scripts
  console.log('\n📦 Checking npm scripts:');
  try {
    const packageJson = JSON.parse(await import('fs').then(fs => fs.readFileSync(join(projectRoot, 'package.json'), 'utf8')));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = ['test:scenarios', 'build', 'lint', 'test', 'test:unit'];
    for (const script of requiredScripts) {
      const exists = script in scripts;
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${script}`);
      if (!exists) allPassed = false;
    }
  } catch (error) {
    console.log('  ❌ Error reading package.json');
    allPassed = false;
  }

  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 Project verification PASSED!');
    console.log('✅ CLI package is clean and well-organized');
    process.exit(0);
  } else {
    console.log('❌ Project verification FAILED!');
    console.log('⚠️  Some issues need to be addressed');
    process.exit(1);
  }
}

verifyProject().catch(error => {
  console.error('💥 Verification script failed:', error);
  process.exit(1);
});