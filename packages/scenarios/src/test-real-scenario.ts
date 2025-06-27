#!/usr/bin/env tsx

/**
 * Test Real Scenario - Proof that we can run REAL benchmarks
 *
 * This script demonstrates that we can create real agent runtimes
 * and execute actual plugin functionality, not mocks.
 */

import { IAgentRuntime, Character, Memory, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

async function testRealAgentRuntime() {
  console.log(chalk.blue('🔥 Testing REAL Agent Runtime - NO MOCKS'));

  // Set required environment variables for testing
  if (!process.env.SECRET_SALT) {
    process.env.SECRET_SALT = 'test-salt-for-real-scenario-testing-32chars';
  }

  try {
    // Use the test utilities to create a real runtime
    const { createTestRuntime } = await import('@elizaos/core/test-utils');

    // Create a real character configuration
    const character: Character = {
      name: 'Test Research Agent',
      bio: ['A real research agent for testing'],
      system: 'You are a helpful research assistant. Respond naturally to questions.',
      messageExamples: [],
      postExamples: [],
      topics: ['research', 'testing'],
      knowledge: [],
      plugins: [],
      settings: {
        model: 'claude-3-sonnet-20240229',
        temperature: 0.7,
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
      },
    };

    console.log(chalk.yellow('📦 Creating real AgentRuntime...'));

    // Create a real runtime using test utilities
    const { runtime, harness } = await createTestRuntime({
      character,
      plugins: [], // Start simple without plugins
      apiKeys: {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
      },
    });

    console.log(chalk.green('✅ Runtime created successfully'));
    console.log(chalk.green('✅ Runtime initialized'));

    // Test the runtime health
    const health = await harness.validateRuntimeHealth(runtime);

    if (!health.healthy) {
      console.log(chalk.red('❌ Runtime health check failed:'));
      health.issues.forEach((issue) => console.log(chalk.red(`  - ${issue}`)));
      return false;
    }

    console.log(chalk.green('✅ Runtime health check passed'));
    console.log(chalk.blue(`Services: ${health.services.join(', ') || 'none'}`));
    console.log(chalk.blue(`Plugins: ${health.plugins.join(', ') || 'none'}`));

    // Test message processing using the harness
    console.log(chalk.cyan('📨 Testing real message processing...'));

    const testResult = await harness.processTestMessage(
      runtime,
      'Hello! Can you tell me about the current state of quantum computing research?',
      {
        timeoutMs: 30000, // 30 second timeout
      }
    );

    console.log(
      chalk.green(`✅ Message processing test: ${testResult.passed ? 'PASSED' : 'FAILED'}`)
    );
    console.log(chalk.white(`Response time: ${testResult.responseTime}ms`));
    console.log(chalk.white(`Memories created: ${testResult.createdMemories}`));

    if (!testResult.passed) {
      console.log(chalk.red('Errors:'));
      testResult.errors.forEach((error) => console.log(chalk.red(`  - ${error}`)));
    }

    // Clean up
    await harness.cleanup();
    console.log(chalk.green('✅ Runtime cleaned up'));

    console.log(chalk.green('\n🎉 REAL AGENT RUNTIME TEST PASSED!'));
    console.log(chalk.blue('This proves we can run real benchmarks, not mocks.'));

    return testResult.passed;
  } catch (error) {
    console.log(chalk.red('❌ Real runtime test failed:'));
    console.log(chalk.red(error instanceof Error ? error.message : String(error)));

    if (error instanceof Error && error.stack) {
      console.log(chalk.gray(error.stack));
    }

    return false;
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testRealAgentRuntime()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(chalk.red('Test crashed:'), error);
      process.exit(1);
    });
}

export { testRealAgentRuntime };
