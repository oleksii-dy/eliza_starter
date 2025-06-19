#!/usr/bin/env node
import { AgentServer } from '@elizaos/server';
import {
  logger,
  type Character,
  type IAgentRuntime,
  type Memory,
  type Content,
  asUUID,
  stringToUuid,
  encryptedCharacter,
  AgentRuntime,
  type Plugin,
  EventType,
} from '@elizaos/core';
import githubPlugin from '@elizaos/plugin-github';
import TodoPlugin from '@elizaos/plugin-todo';
import messageHandlingPlugin from '@elizaos/plugin-message-handling';
import { plugin as sqlPlugin } from '@elizaos/plugin-sql';
import { ScenarioRunner } from './index.js';
import type { Scenario, ScenarioResult } from './types.js';
import { v4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

// Load the scenario
async function loadGitHubTodoScenario(): Promise<Scenario> {
  const scenarioPath = path.join(
    process.cwd(),
    'scenarios/plugin-tests/02-github-todo-workflow.ts'
  );

  if (!fs.existsSync(scenarioPath)) {
    throw new Error(`Scenario file not found at: ${scenarioPath}`);
  }

  // Dynamically import the scenario
  const module = await import(scenarioPath);
  return module.default || module.githubTodoWorkflowScenario;
}

// Create a test character for the agent
function createTestCharacter(): Character {
  return {
    id: stringToUuid('github-todo-test-agent'),
    name: 'GitHub Todo Test Agent',
    system: `You are a helpful project management assistant that can:
- Fetch GitHub issues and create todo tasks from them
- Update todo status based on issue progress
- Create pull requests and link them to todos
- Provide project status summaries

When asked to check GitHub issues, use the LIST_GITHUB_ISSUES action.
When asked to create todos, use the CREATE_TODO action.
When asked to update todo status, use the UPDATE_TODO action.
When asked to create a pull request, use the CREATE_GITHUB_PULL_REQUEST action.

Always be clear about what actions you're taking and provide helpful summaries.`,
    bio: ['project management assistant', 'github integration expert', 'task tracking specialist'],
    lore: [
      'manages projects efficiently',
      'keeps track of all tasks',
      'ensures nothing falls through the cracks',
    ],
    messageExamples: [],
    postExamples: [],
    topics: ['project management', 'github', 'todo tracking', 'software development'],
    style: {
      all: ['helpful', 'organized', 'clear', 'proactive'],
      chat: ['friendly', 'informative', 'action-oriented'],
      post: ['concise', 'structured', 'informative'],
    },
    adjectives: ['organized', 'efficient', 'helpful', 'proactive'],
    plugins: [],
  };
}

// Simple wrapper to track actions
class ActionTracker {
  private actions: Array<{ name: string; params: any; timestamp: number }> = [];

  recordAction(name: string, params: any) {
    this.actions.push({
      name,
      params,
      timestamp: Date.now(),
    });
  }

  getActions() {
    return this.actions;
  }
}

async function runGitHubTodoTest() {
  console.log(chalk.cyan('🚀 Starting GitHub-Todo Scenario Test\n'));

  try {
    // Validate environment
    const requiredEnvVars = ['GITHUB_TOKEN', 'OPENAI_API_KEY'];
    const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Load scenario
    console.log(chalk.blue('📄 Loading scenario...'));
    const scenario = await loadGitHubTodoScenario();
    console.log(chalk.green(`✓ Loaded scenario: ${scenario.name}\n`));

    // Initialize server
    console.log(chalk.blue('🖥️  Initializing server...'));
    const server = new AgentServer();
    const dataDir = path.join(process.cwd(), '.eliza-test-db');
    await server.initialize({ dataDir });

    // Start server on a test port
    const testPort = 3456;
    server.start(testPort);
    console.log(chalk.green(`✓ Server started on port ${testPort}\n`));

    // Create and register test agent
    console.log(chalk.blue('🤖 Creating test agent...'));
    const character = createTestCharacter();

    // Create the runtime with plugins
    const runtime = new AgentRuntime({
      character: encryptedCharacter(character),
      plugins: [sqlPlugin as unknown as Plugin, githubPlugin, TodoPlugin, messageHandlingPlugin],
      settings: {
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GITHUB_OWNER: process.env.GITHUB_OWNER || 'elizaOS',
        GITHUB_REPO: process.env.GITHUB_REPO || 'eliza',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        MODEL_PROVIDER: process.env.MODEL_PROVIDER || 'openai',
      },
    });

    // Create action tracker
    const actionTracker = new ActionTracker();

    // Hook into action processing to track what gets executed
    const originalProcessAction = runtime.processActions.bind(runtime);
    runtime.processActions = async (
      message: Memory,
      responses: Memory[],
      state?: any,
      callback?: any
    ) => {
      // Log what actions are being processed
      logger.info('Processing actions for message:', message.content.text);

      // Track action executions
      const originalActions = runtime.actions;
      runtime.actions.forEach((action) => {
        const originalHandler = action.handler;
        action.handler = async (...args) => {
          actionTracker.recordAction(action.name, args[1]?.content);
          logger.info(`Executing action: ${action.name}`);
          return originalHandler(...args);
        };
      });

      const result = await originalProcessAction(message, responses, state, callback);

      // Restore original handlers
      runtime.actions = originalActions;

      return result;
    };

    await runtime.initialize();
    await server.registerAgent(runtime);
    console.log(chalk.green(`✓ Agent registered: ${runtime.character.name}\n`));

    // Override the scenario's subject actor runtime
    const subjectActor = scenario.actors.find((a) => a.role === 'subject');
    if (subjectActor) {
      subjectActor.runtime = runtime;
    }

    // Run the scenario
    console.log(chalk.blue('🎬 Running scenario...\n'));
    const runner = new ScenarioRunner(server, runtime);

    const result = await runner.runScenario(
      scenario,
      {
        verbose: true,
      },
      (progress) => {
        console.log(chalk.gray(`  ${progress.phase}: ${progress.message}`));
      }
    );

    // Display results
    console.log(chalk.cyan('\n📊 Scenario Results:\n'));
    console.log(
      chalk.white(`  Status: ${result.passed ? chalk.green('PASSED') : chalk.red('FAILED')}`)
    );
    console.log(chalk.white(`  Duration: ${result.duration}ms`));
    console.log(chalk.white(`  Score: ${(result.score || 0).toFixed(2)}`));

    // Show verification results
    console.log(chalk.cyan('\n🔍 Verification Results:\n'));
    for (const verification of result.verificationResults) {
      const status = verification.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${status} ${verification.ruleName}: ${verification.reason}`);
      if (verification.evidence) {
        console.log(chalk.gray(`     Evidence: ${JSON.stringify(verification.evidence, null, 2)}`));
      }
    }

    // Show action history
    const actions = actionTracker.getActions();
    if (actions.length > 0) {
      console.log(chalk.cyan('\n🎯 Actions Executed:\n'));
      for (const action of actions) {
        console.log(
          `  - ${chalk.yellow(action.name)} at ${new Date(action.timestamp).toISOString()}`
        );
        if (action.params) {
          console.log(chalk.gray(`    Params: ${JSON.stringify(action.params, null, 2)}`));
        }
      }
    }

    // Show transcript
    console.log(chalk.cyan('\n💬 Conversation Transcript:\n'));
    for (const msg of result.transcript) {
      const sender = msg.messageType === 'incoming' ? chalk.blue('User') : chalk.green('Agent');
      console.log(`  ${sender}: ${msg.content.text || JSON.stringify(msg.content)}`);
    }

    // Show metrics
    if (result.metrics) {
      console.log(chalk.cyan('\n📈 Metrics:\n'));
      console.log(`  Messages: ${result.metrics.messageCount}`);
      console.log(`  Actions: ${JSON.stringify(result.metrics.actionCounts)}`);
      console.log(`  Avg Response Time: ${result.metrics.responseLatency?.average || 0}ms`);
    }

    // Cleanup
    await server.unregisterAgent(runtime.agentId);
    await server.stop();

    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(chalk.red('\n❌ Test failed with error:'));
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runGitHubTodoTest().catch(console.error);
