#!/usr/bin/env bun

/**
 * GitHub Todo Workflow Test Script
 * Tests the complete GitHub Todo integration workflow
 */

import { logger as _logger } from '@elizaos/core';
import { executeRealScenario } from '../src/scenario-runner/real-scenario-execution.js';

const githubTodoScenario = {
  id: 'github-todo-workflow',
  name: 'GitHub Todo Workflow Integration Test',
  characters: [
    {
      id: 'github-agent',
      name: 'GitHubAgent',
      bio: 'I am GitHubAgent, an AI assistant specialized in GitHub operations. I can create repositories, manage issues, and handle todo workflows with actual GitHub API integration.',
      system: `You are GitHubAgent, an AI assistant that manages GitHub repositories and todo workflows. You MUST actually use GitHub actions, not just plan them.

CRITICAL REQUIREMENT: You will be tested on whether you actually execute actions vs just talking about them.

ENHANCED VERIFICATION RULES:
- RULE 1: You MUST use CREATE_TODO action when asked to create todos
- RULE 2: You MUST use SEARCH_TODOS action when asked to find todos  
- RULE 3: You MUST use UPDATE_TODO action when asked to update todos
- RULE 4: You MUST show actual todo IDs, timestamps, and GitHub integration details
- RULE 5: Failure to execute real actions will result in immediate test failure

ACTION EXECUTION REQUIREMENTS:
1. When asked to create a todo: Immediately execute CREATE_TODO with proper details
2. When asked to search todos: Execute SEARCH_TODOS and show real results
3. When asked to update todos: Execute UPDATE_TODO with actual todo IDs
4. Always provide specific technical details from actual action execution

DO NOT engage in conversational planning - EXECUTE ACTIONS IMMEDIATELY.`,
      plugins: ['@elizaos/plugin-github', '@elizaos/plugin-todo'],
      settings: {
        github: {
          owner: 'test-user',
          repo: 'test-repo'
        }
      }
    }
  ],
  script: {
    steps: [
      {
        type: 'message',
        from: 'user',
        content: 'Create a todo: "Setup GitHub Actions workflow for automated testing". Please use the CREATE_TODO action now.'
      },
      {
        type: 'wait',
        duration: 10000
      },
      {
        type: 'message',
        from: 'user',
        content: 'Search for all todos containing "GitHub". Please use the SEARCH_TODOS action.'
      },
      {
        type: 'wait',
        duration: 10000
      },
      {
        type: 'message',
        from: 'user',
        content: 'Update the GitHub Actions todo status to "in progress". Please use the UPDATE_TODO action.'
      },
      {
        type: 'wait',
        duration: 5000
      }
    ]
  },
  verification: {
    rules: [
      {
        id: 'todo-creation-execution',
        type: 'llm',
        description: 'Agent executed actual CREATE_TODO action',
        prompt: `Check if the agent actually executed CREATE_TODO action vs just talking about it.

PASS CRITERIA: The agent response must show:
- Actual todo ID from CREATE_TODO execution
- Service response with success/failure status
- Technical details like todo content and metadata
- Evidence of real todo service integration

FAIL CRITERIA: The response contains:
- "I will create a todo..." (planning language)
- "Let me create..." (intention without execution)
- Generic descriptions without technical specifics
- No todo IDs or service response details

Look for ACTUAL ACTION EXECUTION, not conversational responses.`
      },
      {
        id: 'todo-search-execution',
        type: 'llm',
        description: 'Agent executed SEARCH_TODOS action with real results',
        prompt: `Check if the agent used SEARCH_TODOS action and showed REAL search results.

PASS CRITERIA: The response must show:
- Actual search query execution
- Real todo results with IDs and content
- Search result count and details
- Technical details from the service

FAIL CRITERIA: The response contains:
- "I'll search for todos..." (intention without execution)
- Generic search descriptions
- No specific todo IDs or search results
- Conversational responses instead of service data

Verify REAL search execution, not simulated responses.`
      }
    ]
  }
};

async function main() {
  console.log('🔄 Testing GitHub Todo Workflow Integration\\n');

  try {
    const result = await executeRealScenario(githubTodoScenario, {
      verbose: true,
      timeout: 120000,
      maxSteps: 8
    });

    console.log(`\\n${'='.repeat(60)}`);
    console.log('📊 GITHUB TODO WORKFLOW TEST RESULTS');
    console.log('='.repeat(60));

    console.log(`\\n**Scenario**: ${result.name}`);
    console.log(`**Status**: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`**Score**: ${result.score.toFixed(3)}`);
    console.log(`**Duration**: ${result.duration}ms`);

    if (result.verificationResults.length > 0) {
      console.log('\\n**Verification Results**:');
      for (const verification of result.verificationResults) {
        const status = verification.passed ? '✅' : '❌';
        console.log(`  ${status} **${verification.ruleName}** (${verification.score.toFixed(3)})`);
        if (verification.reason) {
          console.log(`     ${verification.reason}`);
        }
      }
    }

    if (result.errors.length > 0) {
      console.log('\\n**Errors**:');
      result.errors.forEach(error => console.log(`  - ${error}`));
    }

    if (result.passed && result.score >= 0.8) {
      console.log('\\n🎉 SUCCESS: GitHub Todo Workflow is working!');
      process.exit(0);
    } else {
      console.log('\\n⚠️  GitHub Todo integration needs improvement');
      console.log(`   Current score: ${result.score.toFixed(3)} (target: 0.8+)`);
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Error:', error);
  process.exit(1);
});