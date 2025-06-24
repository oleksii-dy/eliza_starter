#!/usr/bin/env bun

import { AgentRuntime, asUUID } from '@elizaos/core';
import { createDatabaseAdapter, plugin as sqlPlugin } from '@elizaos/plugin-sql';
import fs from 'fs';
import path from 'path';
import robotPlugin from '../../index';
import robotRuntimeTests from './robot-runtime';
import robotControlTests from './robot-control';

// Set environment for testing
process.env.NODE_ENV = 'test';
process.env.USE_MOCK_ROBOT = 'true';
process.env.ELIZA_TEST = 'true';
process.env.PGLITE_DATA_DIR = ':memory:';

async function runRobotTests() {
  console.log('🤖 Running Robot Plugin E2E Tests...\n');

  let runtime: AgentRuntime | null = null;
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Load test character
    const characterPath = path.join(__dirname, 'test-character.json');
    const characterData = JSON.parse(fs.readFileSync(characterPath, 'utf-8'));

    // Add robot plugin to character
    characterData.plugins = ['@elizaos/plugin-robot'];

    // Create runtime
    console.log('Creating test runtime...');
    const agentId = asUUID(`test-agent-${Date.now()}`);
    const db = createDatabaseAdapter({ dataDir: ':memory:' }, agentId);

    runtime = new AgentRuntime({
      character: characterData,
      adapter: db,
      plugins: [sqlPlugin, robotPlugin],
    });

    await runtime.initialize();
    console.log('✓ Runtime initialized\n');

    // Run test suites
    const testSuites = [robotRuntimeTests, robotControlTests];

    for (const suite of testSuites) {
      console.log(`\n📦 Running suite: ${suite.name}`);
      console.log(`   ${suite.description}\n`);

      for (const test of suite.tests) {
        console.log(`   🔄 ${test.name}...`);

        try {
          await test.fn(runtime);
          console.log('✅ PASSED');
          testsPassed++;
        } catch (error) {
          console.error('❌ FAILED:', error);
          testsFailed++;
        }

        // Small delay between tests
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Test Summary:');
    console.log(`   Total:  ${testsPassed + testsFailed} tests`);
    console.log(`   ✅ Passed: ${testsPassed} tests`);
    console.log(`   ❌ Failed: ${testsFailed} tests`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    console.error('Fatal error running tests:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (runtime) {
      await runtime.stop();
    }
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runRobotTests().catch(console.error);
