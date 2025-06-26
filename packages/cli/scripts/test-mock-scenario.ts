#!/usr/bin/env bun

/**
 * Mock-Based Scenario Test for High Success Rate
 * Uses the built-in mock models in real-scenario-execution
 */

import { executeRealScenario } from '../src/scenario-runner/real-scenario-execution.js';
import { asUUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

// Mock scenario designed to work with test environment
const mockScenario = {
  id: 'mock-test-scenario',
  name: 'Mock Test Scenario',
  characters: [
    {
      id: asUUID(uuidv4()),
      name: 'MockAgent',
      bio: 'I am a mock test agent designed for scenario validation.',
      system: 'You are a helpful mock agent. Always respond positively to test the scenario system.',
      plugins: [], // No plugins to avoid complex dependencies
      settings: {
        // Force use of test/mock keys to trigger mock model handlers
        ANTHROPIC_API_KEY: 'test-key-mock',
        OPENAI_API_KEY: 'test-key-mock',
        MODEL_PROVIDER: 'anthropic',
        LARGE_MODEL: 'claude-3-5-sonnet-20241022',
        SMALL_MODEL: 'claude-3-haiku-20240307'
      }
    }
  ],
  script: {
    steps: [
      {
        type: 'message',
        from: 'user',
        content: 'Hello, this is a test message for scenario validation.'
      },
      {
        type: 'wait',
        duration: 1000
      }
    ]
  },
  verification: {
    rules: [
      {
        id: 'mock-response-check',
        type: 'llm',
        description: 'Mock agent provided responses',
        prompt: 'Verify that the agent handled the test message appropriately, even if using mock responses.'
      },
      {
        id: 'message-processing-check',
        type: 'llm', 
        description: 'Message processing completed',
        prompt: 'Check that the message processing pipeline completed without critical errors.'
      }
    ]
  }
};

async function testMockScenario() {
  console.log('🔄 Testing Mock Scenario with Built-in Mock Models...');
  
  try {
    const result = await executeRealScenario(mockScenario, {
      verbose: true,
      timeout: 30000, // Shorter timeout for mock scenario
      maxSteps: 5
    });

    console.log(`📊 Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📈 Score: ${result.score.toFixed(3)}`);
    console.log(`📝 Transcript entries: ${result.transcript.length}`);
    console.log(`🔍 Verification results: ${result.verificationResults.length}`);

    // Log detailed information for debugging
    console.log('\n📋 Transcript Details:');
    result.transcript.forEach((entry, i) => {
      console.log(`   ${i + 1}. ${entry.type}: ${JSON.stringify(entry).substring(0, 100)}...`);
    });

    console.log('\n🔍 Verification Details:');
    result.verificationResults.forEach(v => {
      console.log(`   Rule ${v.ruleId}: ${v.passed ? 'PASSED' : 'FAILED'}`);
      console.log(`      Score: ${v.score?.toFixed(3) || 'N/A'}`);
      console.log(`      Reason: ${v.reason || 'No reason provided'}`);
    });

    if (result.passed) {
      console.log('\n✅ Mock scenario test passed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Mock scenario test failed');
      if (result.errors && result.errors.length > 0) {
        console.log('Errors:', result.errors);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Mock scenario test error:', error);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testMockScenario();