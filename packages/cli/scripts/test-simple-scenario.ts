#!/usr/bin/env bun

/**
 * Simple Scenario Test to Validate the Testing Framework
 */

import { executeRealScenario } from '../src/scenario-runner/real-scenario-execution.js';
import { asUUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Simple test scenario
const simpleTestScenario = {
  id: 'simple-test',
  name: 'Simple Test Scenario',
  characters: [
    {
      id: asUUID(uuidv4()),
      name: 'TestAgent',
      bio: 'I am a test agent for scenario validation.',
      system: 'You are a helpful test agent. Respond clearly and concisely to user messages.',
      plugins: [], // No plugins for simplicity
      settings: {},
    },
  ],
  script: {
    steps: [
      {
        type: 'message',
        from: 'user',
        content: 'Hello, can you help me test the scenario system?',
      },
      {
        type: 'wait',
        duration: 2000,
      },
      {
        type: 'message',
        from: 'user',
        content: 'Great! The test is working.',
      },
    ],
  },
  verification: {
    rules: [
      {
        id: 'response-check',
        type: 'llm',
        description: 'Agent responded to user messages',
        prompt: 'Did the agent respond helpfully to the user messages?',
      },
    ],
  },
};

async function testSimpleScenario() {
  console.log('🔄 Testing Simple Scenario...');

  try {
    const result = await executeRealScenario(simpleTestScenario, {
      verbose: true,
      timeout: 60000,
      maxSteps: 10,
    });

    console.log(`📊 Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📈 Score: ${result.score.toFixed(3)}`);
    console.log(`📝 Transcript entries: ${result.transcript.length}`);
    console.log(`🔍 Verification results: ${result.verificationResults.length}`);

    if (result.passed) {
      console.log('✅ Simple scenario test passed');
      process.exit(0);
    } else {
      console.log('❌ Simple scenario test failed');
      console.log('Errors:', result.errors);

      // Log verification details
      result.verificationResults.forEach((v) => {
        console.log(`   Rule ${v.ruleId}: ${v.passed ? 'PASSED' : 'FAILED'} - ${v.reason}`);
      });

      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Simple scenario test error:', error);
    process.exit(1);
  }
}

testSimpleScenario();
