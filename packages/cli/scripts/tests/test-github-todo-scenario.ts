#!/usr/bin/env bun

/**
 * Individual GitHub Todo Workflow Scenario Test
 */

import { executeRealScenario } from '../../src/scenario-runner/real-scenario-execution.js';
import { githubTodoWorkflowScenario } from '../../scenarios/plugin-tests/02-github-todo-workflow.js';

async function testGitHubTodoWorkflow() {
  console.log('🔄 Testing GitHub Todo Workflow Scenario...');
  
  try {
    const result = await executeRealScenario(githubTodoWorkflowScenario, {
      verbose: false,
      timeout: 120000,
      maxSteps: 15
    });

    console.log(`📊 Result: ${result.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`⏱️  Duration: ${result.duration}ms`);
    console.log(`📈 Score: ${result.score.toFixed(3)}`);

    if (result.passed) {
      console.log('✅ GitHub Todo Workflow test passed');
      process.exit(0);
    } else {
      console.log('❌ GitHub Todo Workflow test failed');
      console.log('Errors:', result.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 GitHub Todo Workflow test error:', error);
    process.exit(1);
  }
}

testGitHubTodoWorkflow();
