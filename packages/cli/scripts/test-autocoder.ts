#!/usr/bin/env bun

/**
 * Autocoder Plugin Scenarios Test
 * Tests real autocoder plugin functionality with actual service APIs
 */

import { logger as _logger } from '@elizaos/core';
import { executeRealScenario } from '../src/scenario-runner/real-scenario-execution.js';

// Autocoder Plugin Creation Scenario
const autocoderPluginScenario = {
  id: 'autocoder-plugin-creation',
  name: 'Autocoder Plugin Creation Test',
  characters: [
    {
      id: 'autocoder-agent',
      name: 'AutocoderAgent',
      bio: 'I am AutocoderAgent, an AI assistant specialized in creating ElizaOS plugins. I can generate plugins with actions, providers, services, and complete TypeScript implementations.',
      system: `You are AutocoderAgent, an AI assistant that creates ElizaOS plugins. You MUST actually use plugin creation actions, not just plan them.

CRITICAL REQUIREMENT: You will be tested on whether you actually execute actions vs just talking about them.

ENHANCED VERIFICATION RULES:
- RULE 1: You MUST use CREATE_PLUGIN action within your first response when asked to create a plugin
- RULE 2: You MUST use GET_JOB_STATUS action when asked about progress  
- RULE 3: You MUST show actual job IDs, status updates, and progress percentages
- RULE 4: You MUST demonstrate real service integration, not conversational responses
- RULE 5: Failure to execute real actions will result in immediate test failure

ACTION EXECUTION REQUIREMENTS:
1. When asked to create a plugin: Immediately execute CREATE_PLUGIN with PluginSpecification
2. When asked about progress: Execute GET_JOB_STATUS and show real job details
3. When asked to list jobs: Execute LIST_JOBS and show actual job information
4. Always provide specific technical details from actual action execution

VERIFICATION DETECTION:
- The system will detect if you are having a conversation vs executing actions
- Responses must contain evidence of actual plugin creation service integration
- You must show real job IDs, timestamps, status codes, and technical details
- Generic responses like "I'll create a plugin" will be marked as FAILED

REQUIRED RESPONSE PATTERN:
User: "Create a calculator plugin"
You: [Execute CREATE_PLUGIN action] → Show job ID, specifications, service response
User: "Check the progress"  
You: [Execute GET_JOB_STATUS action] → Show actual status, progress %, phase details

DO NOT engage in conversational planning - EXECUTE ACTIONS IMMEDIATELY.`,
      plugins: ['@elizaos/plugin-autocoder'],
      settings: {
        voice: {
          model: 'en_US-ryan-medium',
        },
      },
    },
  ],
  script: {
    steps: [
      {
        type: 'message',
        from: 'user',
        content:
          'Can you create a simple calculator plugin for me? It should have basic math operations like add, subtract, multiply, and divide. Please use the CREATE_PLUGIN action now.',
      },
      {
        type: 'wait',
        duration: 15000, // Wait 15 seconds for plugin creation to start
      },
      {
        type: 'message',
        from: 'user',
        content:
          'Great! Can you check the status of the plugin creation job and show me the progress?',
      },
      {
        type: 'wait',
        duration: 20000, // Wait 20 seconds for more progress
      },
      {
        type: 'message',
        from: 'user',
        content: 'Perfect! Can you show me all the jobs and their current status?',
      },
      {
        type: 'wait',
        duration: 5000,
      },
    ],
  },
  verification: {
    rules: [
      {
        id: 'action-execution-detection',
        type: 'llm',
        description: 'Agent executed actual CREATE_PLUGIN action (not conversation)',
        prompt: `CRITICAL: Check if the agent actually executed the CREATE_PLUGIN action vs just talking about it.

PASS CRITERIA: The agent response must show:
- Actual job ID from CREATE_PLUGIN execution
- Service response with success/failure status
- Technical details like plugin specifications
- Evidence of real autocoder service integration

FAIL CRITERIA: The response contains:
- "I will create a plugin..." (planning language)
- "Let me create..." (intention without execution)  
- Generic descriptions without technical specifics
- No job IDs or service response details

Look for ACTUAL ACTION EXECUTION, not conversational responses.`,
      },
      {
        id: 'job-monitoring-execution',
        type: 'llm',
        description: 'Agent executed GET_JOB_STATUS action with real results',
        prompt: `Check if the agent used GET_JOB_STATUS action and showed REAL job status data.

PASS CRITERIA: The response must show:
- Actual job ID being queried
- Real status updates (in_progress, completed, failed)
- Progress percentages and phase information
- Technical details from the service

FAIL CRITERIA: The response contains:
- "I'll check the status..." (intention without execution)
- Generic progress descriptions
- No specific job IDs or status codes
- Conversational updates instead of service data

Verify REAL status monitoring, not simulated responses.`,
      },
      {
        id: 'technical-specificity-check',
        type: 'llm',
        description: 'Agent provided technical details from real service integration',
        prompt: `Verify the agent showed technical details that only come from real service execution.

PASS CRITERIA: Look for:
- Specific job IDs (UUIDs or alphanumeric codes)
- Service timestamps and progress metrics
- Plugin specification details actually submitted
- Status codes and error handling from the service

FAIL CRITERIA: Look for:
- Generic responses without technical specifics
- Planning language instead of execution results
- Conversations about plugins vs actual plugin creation
- Missing evidence of real autocoder service usage

The agent must demonstrate ACTUAL service integration.`,
      },
      {
        id: 'autocoder-functionality-proof',
        type: 'llm',
        description: 'Agent proved real autocoder plugin functionality',
        prompt: `Verify the agent demonstrated actual working autocoder plugin functionality.

PASS CRITERIA: The agent must show:
- Real plugin creation service integration
- Actual job management and monitoring
- Technical details that prove service execution
- Evidence of real plugin development workflow

FAIL CRITERIA: The agent showed:
- Only conversational responses about plugins
- Planning without execution
- Generic descriptions without technical proof
- No evidence of real autocoder service usage

This is the ultimate test - did the agent actually use the autocoder plugin?`,
      },
    ],
  },
};

async function main() {
  console.log('🔄 Testing Autocoder Plugin Creation with Real Services\\n');

  // Check if required environment variables are set
  const requiredEnvVars = ['ANTHROPIC_API_KEY'];
  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log('⚠️  Missing required environment variables:', missingVars.join(', '));
    console.log('   Please ensure your .env file contains the Anthropic API key.');
    console.log('   Continuing with test anyway to see how the agent handles it...');
  } else {
    console.log('✅ Anthropic API key found in environment');
  }

  try {
    const result = await executeRealScenario(autocoderPluginScenario, {
      verbose: true,
      timeout: 180000, // 3 minutes max
      maxSteps: 10,
    });

    console.log(`\\n${'='.repeat(60)}`);
    console.log('📊 AUTOCODER PLUGIN CREATION TEST RESULTS');
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
      result.errors.forEach((error) => console.log(`  - ${error}`));
    }

    // Check if we have evidence of actual autocoder usage
    const autocoderEvidence = result.transcript.filter(
      (t) =>
        t.type === 'agent_response' &&
        t.content &&
        (t.content.includes('CREATE_PLUGIN') ||
          t.content.includes('GET_JOB_STATUS') ||
          t.content.includes('plugin creation') ||
          t.content.includes('job'))
    );

    console.log(
      `\\n**Autocoder Usage Evidence**: ${autocoderEvidence.length} responses showing autocoder interaction`
    );

    if (result.passed && result.score >= 0.8) {
      console.log('\\n🎉 SUCCESS: Autocoder Plugin Creation is working!');
      console.log('✅ Agent successfully demonstrated real autocoder functionality');
      console.log('✅ Plugin creation actions were used for automated development');
      process.exit(0);
    } else {
      console.log('\\n⚠️  Autocoder integration needs improvement');
      console.log(`   Current score: ${result.score.toFixed(3)} (target: 0.8+)`);
      console.log('   Review the verification details above for specific issues');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('💥 Error:', error);
  process.exit(1);
});
