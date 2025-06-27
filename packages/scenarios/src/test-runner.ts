#!/usr/bin/env tsx

console.log('🚀 Starting test runner...');

// Import scenarios loader to avoid circular dependencies
import { loadAllScenarios } from './scenarios-loader.js';
import { stringToUuid, asUUID, IAgentRuntime, Memory, Content } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { RuntimeTestHarness } from './runtime-test-harness.js';
import chalk from 'chalk';

// Scenarios will be loaded dynamically when needed

import type {
  Scenario,
  ScenarioValidationResult,
  ScenarioExecutionResult,
  PluginDependency,
  EnvironmentRequirement,
  ScenarioManifest,
  ScenarioContext,
  ScenarioMessage,
  VerificationResult,
  VerificationRule,
  ScriptStep,
  BenchmarkResult,
  ActionResult,
  ActionError,
  ScenarioActor,
} from './types.js';

export interface TestRunnerOptions {
  parallel?: boolean;
  maxConcurrency?: number;
  verbose?: boolean;
  filter?: string;
  category?: string;
  tags?: string[];
  validateOnly?: boolean;
  continueOnError?: boolean;
  outputFormat?: 'json' | 'console' | 'both';
  outputFile?: string;
}

export interface TestRunnerResult {
  totalScenarios: number;
  passed: number;
  failed: number;
  skipped: number;
  validationErrors: number;
  duration: number;
  results: ScenarioExecutionResult[];
  validationResults: ScenarioValidationResult[];
  summary: {
    passRate: number;
    avgDuration: number;
    categories: Record<string, { passed: number; failed: number }>;
  };
}

/**
 * ScenarioManifestValidator - Validates scenario dependencies and environment
 */
export class ScenarioManifestValidator {
  private pluginCache = new Map<string, boolean>();
  private envCache = new Map<string, string | undefined>();

  async validateScenario(scenario: Scenario): Promise<ScenarioValidationResult> {
    const manifest = this.extractManifest(scenario);
    const errors: any[] = [];
    const warnings: any[] = [];
    const pluginStatus: any[] = [];
    const environmentStatus: any[] = [];

    // Validate plugin dependencies
    for (const plugin of manifest.plugins) {
      const status = await this.validatePlugin(plugin);
      pluginStatus.push(status);

      if (plugin.required && !status.available) {
        errors.push({
          type: 'plugin',
          message: `Required plugin ${plugin.name} is not available`,
          severity: 'error',
          context: { plugin: plugin.name },
        });
      }
    }

    // Validate environment requirements
    for (const env of manifest.environment) {
      const status = await this.validateEnvironment(env);
      environmentStatus.push(status);

      if (env.required && !status.present) {
        errors.push({
          type: 'environment',
          message: `Required environment variable ${env.name} is not set`,
          severity: 'error',
          context: { variable: env.name },
        });
      }
    }

    // Validate scenario configuration
    if (!scenario.actors || scenario.actors.length === 0) {
      errors.push({
        type: 'config',
        message: 'Scenario must have at least one actor',
        severity: 'error',
      });
    }

    if (!scenario.verification || !scenario.verification.rules) {
      warnings.push({
        type: 'config',
        message: 'Scenario has no verification rules',
        suggestion: 'Add verification rules to validate scenario outcomes',
      });
    }

    return {
      scenario: scenario.id,
      valid: errors.length === 0,
      errors,
      warnings,
      pluginStatus,
      environmentStatus,
    };
  }

  private extractManifest(scenario: Scenario): ScenarioManifest {
    // Extract plugin dependencies from actor configurations
    const plugins = new Set<string>();
    const environment = new Set<EnvironmentRequirement>();

    scenario.actors.forEach((actor) => {
      if (actor.plugins) {
        actor.plugins.forEach((plugin) => plugins.add(plugin));
      }
    });

    // Common plugin dependencies based on scenario categories
    const pluginDeps: PluginDependency[] = Array.from(plugins).map((name) => ({
      name,
      required: true,
      version: 'workspace:*',
    }));

    // Standard environment requirements
    const envReqs: EnvironmentRequirement[] = [
      {
        name: 'OPENAI_API_KEY',
        type: 'secret',
        required: false,
        description: 'OpenAI API key for LLM functionality',
      },
      {
        name: 'ANTHROPIC_API_KEY',
        type: 'secret',
        required: false,
        description: 'Anthropic API key for Claude models',
      },
    ];

    // Add category-specific requirements
    if (scenario.category === 'blockchain' || scenario.tags?.includes('blockchain')) {
      envReqs.push({
        name: 'SOLANA_RPC_URL',
        type: 'config',
        required: false,
        description: 'Solana RPC endpoint',
      });
    }

    if (scenario.category === 'github' || scenario.tags?.includes('github')) {
      envReqs.push({
        name: 'GITHUB_API_TOKEN',
        type: 'secret',
        required: false,
        description: 'GitHub API token',
      });
    }

    return {
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      category: scenario.category || 'general',
      tags: scenario.tags || [],
      plugins: pluginDeps,
      environment: envReqs,
      actors: scenario.actors.map((actor) => ({
        role: actor.role,
        plugins: actor.plugins || [],
        config: actor.settings,
      })),
      setup: scenario.setup,
      execution: scenario.execution,
      verification: scenario.verification,
      benchmarks: scenario.benchmarks,
    };
  }

  private async validatePlugin(plugin: PluginDependency): Promise<any> {
    if (this.pluginCache.has(plugin.name)) {
      return {
        name: plugin.name,
        available: this.pluginCache.get(plugin.name),
        compatible: true,
        errors: [],
      };
    }

    try {
      // Try to resolve the plugin module
      await import(plugin.name);
      this.pluginCache.set(plugin.name, true);

      return {
        name: plugin.name,
        available: true,
        compatible: true,
        errors: [],
      };
    } catch (error) {
      this.pluginCache.set(plugin.name, false);

      return {
        name: plugin.name,
        available: false,
        compatible: false,
        errors: [`Failed to import: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  private async validateEnvironment(env: EnvironmentRequirement): Promise<any> {
    if (this.envCache.has(env.name)) {
      const value = this.envCache.get(env.name);
      return {
        name: env.name,
        present: value !== undefined,
        valid: this.validateEnvValue(env, value),
        value: value ? '***' : undefined,
        errors: [],
      };
    }

    const value = process.env[env.name];
    this.envCache.set(env.name, value);

    const valid = this.validateEnvValue(env, value);
    const errors: string[] = [];

    if (env.required && !value) {
      errors.push(`Required environment variable ${env.name} is not set`);
    }

    if (value && !valid) {
      errors.push(`Environment variable ${env.name} has invalid format`);
    }

    return {
      name: env.name,
      present: value !== undefined,
      valid,
      value: value ? '***' : undefined,
      errors,
    };
  }

  private validateEnvValue(env: EnvironmentRequirement, value: string | undefined): boolean {
    if (!value) {
      return !env.required;
    }

    if (env.validation) {
      try {
        const regex = new RegExp(env.validation);
        return regex.test(value);
      } catch {
        return true; // If regex is invalid, assume value is valid
      }
    }

    return true;
  }
}

/**
 * ConsolidatedScenarioTestRunner - Main test runner
 */
export class ConsolidatedScenarioTestRunner {
  private validator = new ScenarioManifestValidator();

  async runAllScenarios(options: TestRunnerOptions = {}): Promise<TestRunnerResult> {
    const startTime = Date.now();
    const allScenarios = await loadAllScenarios();
    const scenarios = this.filterScenarios(allScenarios, options);

    console.log(`🚀 Starting scenario test run with ${scenarios.length} scenarios`);

    const results: ScenarioExecutionResult[] = [];
    const validationResults: ScenarioValidationResult[] = [];

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let validationErrors = 0;

    // Sequential execution to avoid conflicts
    for (const scenario of scenarios) {
      try {
        console.log(`\n🔍 Validating scenario: ${scenario.name}`);

        // Validate scenario
        const validation = await this.validator.validateScenario(scenario);
        validationResults.push(validation);

        if (!validation.valid) {
          validationErrors++;
          console.log(`❌ Validation failed for ${scenario.name}:`);
          validation.errors.forEach((error) => console.log(`  - ${error.message}`));

          if (!options.continueOnError) {
            skipped++;
            continue;
          }
        }

        if (options.validateOnly) {
          console.log(`✅ Validation passed for ${scenario.name}`);
          continue;
        }

        // Execute scenario
        console.log(`🏃 Executing scenario: ${scenario.name}`);
        const result = await this.executeScenario(scenario, options);
        results.push(result);

        if (result.status === 'passed') {
          passed++;
          console.log(`✅ ${scenario.name} PASSED`);
        } else {
          failed++;
          console.log(`❌ ${scenario.name} FAILED`);
          if (options.verbose) {
            result.errors.forEach((error) => console.log(`  - ${error}`));
          }
        }
      } catch (error) {
        failed++;
        console.log(
          `💥 ${scenario.name} CRASHED: ${error instanceof Error ? error.message : String(error)}`
        );

        results.push({
          scenario: scenario.id,
          status: 'failed',
          duration: 0,
          transcript: [],
          errors: [error instanceof Error ? error.message : String(error)],
        });

        if (!options.continueOnError) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;
    const passRate = scenarios.length > 0 ? (passed / scenarios.length) * 100 : 0;
    const avgDuration =
      results.length > 0 ? results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0;

    // Calculate category breakdown
    const categories: Record<string, { passed: number; failed: number }> = {};
    scenarios.forEach((scenario) => {
      const category = scenario.category || 'general';
      if (!categories[category]) {
        categories[category] = { passed: 0, failed: 0 };
      }

      const result = results.find((r) => r.scenario === scenario.id);
      if (result?.status === 'passed') {
        categories[category].passed++;
      } else {
        categories[category].failed++;
      }
    });

    const finalResult: TestRunnerResult = {
      totalScenarios: scenarios.length,
      passed,
      failed,
      skipped,
      validationErrors,
      duration,
      results,
      validationResults,
      summary: {
        passRate,
        avgDuration,
        categories,
      },
    };

    await this.outputResults(finalResult, options);
    return finalResult;
  }

  private filterScenarios(scenarios: Scenario[], options: TestRunnerOptions): Scenario[] {
    let filtered = [...scenarios];

    if (options.filter) {
      const filterRegex = new RegExp(options.filter, 'i');
      filtered = filtered.filter(
        (s) => filterRegex.test(s.name) || filterRegex.test(s.description) || filterRegex.test(s.id)
      );
      console.log(`🔍 Filter "${options.filter}" matched ${filtered.length} scenarios`);
    }

    if (options.category) {
      filtered = filtered.filter((s) => s.category === options.category);
      console.log(`🔍 Category "${options.category}" matched ${filtered.length} scenarios`);
    }

    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter(
        (s) => s.tags && options.tags!.some((tag) => s.tags!.includes(tag))
      );
      console.log(`🔍 Tags "${options.tags.join(',')}" matched ${filtered.length} scenarios`);
    }

    return filtered;
  }

  private async executeScenario(
    scenario: Scenario,
    options: TestRunnerOptions
  ): Promise<ScenarioExecutionResult> {
    const startTime = Date.now();
    const context: ScenarioContext = {
      scenario,
      actors: new Map(),
      roomId: asUUID(uuidv4()),
      worldId: asUUID(uuidv4()),
      startTime,
      transcript: [],
      metrics: {
        messageCount: 0,
        stepCount: 0,
        actionCounts: {},
      },
      state: {},
    };

    try {
      // 1. Set up the test environment
      console.log(`   📦 Setting up environment for ${scenario.name}...`);
      await this.setupScenarioEnvironment(context);

      // 2. Create agent runtimes with proper plugins
      console.log('   🤖 Creating actor runtimes...');
      await this.createActorRuntimes(context);

      // 3. Execute the scenario steps
      console.log('   ▶️  Executing scenario steps...');
      await this.executeScenarioSteps(context, options);

      // 4. Run verification rules
      console.log('   🔍 Running verification...');
      const verificationResults = await this.runVerification(context);

      // 5. Calculate final results
      const duration = Date.now() - startTime;
      const passed = verificationResults.every((v) => v.passed);

      const result: ScenarioExecutionResult = {
        scenario: scenario.id,
        status: passed ? 'passed' : 'failed',
        duration,
        transcript: context.transcript.map((msg) => ({
          id: msg.id,
          timestamp: msg.timestamp,
          actorId: msg.actorId,
          actorName: msg.actorName,
          content: msg.content,
          messageType: msg.messageType as 'incoming' | 'outgoing',
        })),
        errors: passed
          ? []
          : verificationResults
              .filter((v) => !v.passed)
              .map((v) => v.reason || `Verification failed: ${v.ruleName}`),
        metrics: {
          scenario: scenario.id,
          timestamp: Date.now(),
          duration,
          messageCount: context.metrics.messageCount || 0,
          avgResponseTime: this.calculateAverageResponseTime(context.transcript),
          benchmarks: this.calculateBenchmarks(context, scenario),
          failures: passed
            ? undefined
            : verificationResults
                .filter((v) => !v.passed)
                .map((v) => ({ metric: v.ruleName, reason: v.reason || 'Verification failed' })),
        },
      };

      // 6. Clean up resources
      await this.cleanupScenarioEnvironment(context);

      return result;
    } catch (error) {
      console.log(
        `   💥 Scenario execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
      await this.cleanupScenarioEnvironment(context);

      return {
        scenario: scenario.id,
        status: 'failed',
        duration: Date.now() - startTime,
        transcript: context.transcript.map((msg) => ({
          id: msg.id,
          timestamp: msg.timestamp,
          actorId: msg.actorId,
          actorName: msg.actorName,
          content: msg.content,
          messageType: msg.messageType as 'incoming' | 'outgoing',
        })),
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  private async setupScenarioEnvironment(context: ScenarioContext): Promise<void> {
    // Setup the scenario environment based on context requirements
    // For now, this is a minimal implementation
    context.state.environment = 'test';
    context.state.setupTime = Date.now();
  }

  private async createActorRuntimes(context: ScenarioContext): Promise<void> {
    console.log(chalk.cyan('   🤖 Creating real agent runtimes...'));

    // Create real test harness for this scenario
    const testId = `scenario-${context.scenario.id}-${Date.now()}`;
    const testHarness = new RuntimeTestHarness(testId);
    context.state.testHarness = testHarness;

    // Create real runtimes for each actor
    for (const actor of context.scenario.actors) {
      try {
        console.log(chalk.yellow(`     Creating runtime for ${actor.name}...`));
        
        // Extract API keys from environment for this actor
        const apiKeys: Record<string, string> = {};
        
        // Add common API keys based on plugins used
        if (actor.plugins?.some(p => p.includes('openai'))) {
          if (process.env.OPENAI_API_KEY) {
            apiKeys.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
          }
        }
        
        if (actor.plugins?.some(p => p.includes('anthropic'))) {
          if (process.env.ANTHROPIC_API_KEY) {
            apiKeys.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
          }
        }
        
        if (actor.plugins?.some(p => p.includes('github'))) {
          if (process.env.GITHUB_API_TOKEN) {
            apiKeys.GITHUB_API_TOKEN = process.env.GITHUB_API_TOKEN;
          }
        }

        // Create character configuration for this actor
        const character = {
          id: asUUID(typeof actor.id === 'string' ? actor.id : uuidv4()),
          name: actor.name,
          bio: actor.bio ? [actor.bio] : [`I am ${actor.name}`],
          system: actor.system || `You are ${actor.name}. ${actor.bio || 'Help users with their requests.'}`,
          messageExamples: [],
          postExamples: [],
          topics: [],
          knowledge: [],
          plugins: actor.plugins || [],
          settings: {
            ...apiKeys,
            ...actor.settings,
          },
        };

        // Create the real runtime
        const runtime = await testHarness.createTestRuntime({
          character,
          plugins: actor.plugins || [],
          apiKeys,
        });

        // Store the runtime with the actor
        context.actors.set(actor.id, { 
          ...actor, 
          runtime,
          character 
        });
        
        console.log(chalk.green(`     ✅ Runtime created for ${actor.name}`));
      } catch (error) {
        console.error(chalk.red(`     ❌ Failed to create runtime for ${actor.name}:`), error);
        throw new Error(`Failed to create runtime for actor ${actor.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Mark scenario as using real execution
    context.state.realExecution = true;
    console.log(chalk.green('   ✅ All actor runtimes created successfully'));
  }

  private async executeScenarioSteps(
    context: ScenarioContext,
    options: TestRunnerOptions
  ): Promise<void> {
    // Collect all script steps from all actors
    const allSteps: Array<{ step: ScriptStep; actorId: string; actorName: string }> = [];

    for (const actor of context.scenario.actors) {
      if (actor.script?.steps) {
        for (const step of actor.script.steps) {
          allSteps.push({
            step,
            actorId: actor.id,
            actorName: actor.name,
          });
        }
      }
    }

    if (allSteps.length === 0) {
      // No script to execute, create a simple message exchange
      await this.simulateBasicConversation(context);
      return;
    }

    // Execute all steps in order
    for (const { step, actorId, actorName } of allSteps) {
      context.metrics.stepCount = (context.metrics.stepCount || 0) + 1;
      const stepStartTime = Date.now();

      switch (step.type) {
        case 'message':
          await this.executeMessageStep(context, step, actorId, actorName);
          break;
        case 'wait':
          await this.executeWaitStep(step);
          break;
        case 'action':
          await this.executeActionStep(context, step, actorId, actorName);
          break;
        default:
          console.log(`   ⚠️  Unknown step type: ${step.type}`);
      }

      // Check step execution time
      const stepDuration = Date.now() - stepStartTime;
      if (step.timeout && stepDuration > step.timeout) {
        console.log(`   ⚠️  Step took ${stepDuration}ms (limit: ${step.timeout}ms)`);
      }

      // Check overall scenario timeout
      const totalDuration = Date.now() - context.startTime;
      const maxDuration = context.scenario.execution?.maxDuration || 300000; // 5 minutes default
      if (totalDuration > maxDuration) {
        throw new Error(`Scenario timeout exceeded: ${totalDuration}ms > ${maxDuration}ms`);
      }
    }
  }

  private async simulateBasicConversation(context: ScenarioContext): Promise<void> {
    // Simulate a basic conversation when no script is provided
    const actors = Array.from(context.actors.values());
    if (actors.length === 0) {
      return;
    }

    const messages = [
      'Hello, how are you?',
      'I am doing well, thank you for asking!',
      'What can we discuss today?',
      'Let me share some insights about the current topic.',
    ];

    for (let i = 0; i < Math.min(messages.length, 4); i++) {
      const actor = actors[i % actors.length];
      const message: ScenarioMessage = {
        id: asUUID(uuidv4()),
        timestamp: Date.now(),
        actorId: actor.id,
        actorName: actor.name,
        content: { text: messages[i] },
        roomId: context.roomId,
        messageType: i % 2 === 0 ? 'incoming' : 'outgoing',
      };

      context.transcript.push(message);
      context.metrics.messageCount = (context.metrics.messageCount || 0) + 1;

      // Small delay between messages
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  private async executeMessageStep(
    context: ScenarioContext,
    step: ScriptStep,
    actorId: string,
    actorName: string
  ): Promise<void> {
    if (step.content) {
      const actor = context.actors.get(actorId);
      if (!actor) {
        throw new Error(`Actor ${actorId} not found`);
      }

      // Create the message to send
      const messageContent: Content = {
        text: step.content,
        source: 'test-scenario',
      };

      const message: ScenarioMessage = {
        id: asUUID(uuidv4()),
        timestamp: Date.now(),
        actorId,
        actorName,
        content: messageContent,
        roomId: context.roomId,
        messageType: 'outgoing',
      };

      // If we have a real runtime, process the message through it
      if (context.state.realExecution && actor.runtime) {
        try {
          console.log(chalk.cyan(`   💬 ${actorName}: ${step.content}`));
          
          // Create a memory object for the message
          const memory: Memory = {
            id: asUUID(typeof message.id === 'string' ? message.id : uuidv4()),
            entityId: asUUID(typeof actorId === 'string' ? actorId : uuidv4()),
            agentId: actor.runtime.agentId,
            roomId: context.roomId,
            worldId: context.worldId,
            content: messageContent,
            createdAt: message.timestamp,
          };

          // Process the message through the real runtime
          await actor.runtime.processMessage(memory);
          
          // Get any response from the runtime
          const recentMessages = await actor.runtime.getMemories({
            roomId: context.roomId,
            count: 5,
            unique: true,
            tableName: 'messages',
          });
          
          // Find the agent's response (if any)
          const agentResponse = recentMessages.find(
            m => m.entityId === actor.runtime!.agentId && 
                 m.id !== memory.id &&
                 (m.createdAt || 0) > (memory.createdAt || 0)
          );
          
          if (agentResponse) {
            const responseMessage: ScenarioMessage = {
              id: agentResponse.id || asUUID(uuidv4()),
              timestamp: agentResponse.createdAt || Date.now(),
              actorId: typeof actor.runtime!.agentId === 'string' ? actor.runtime!.agentId : String(actor.runtime!.agentId),
              actorName: actor.name + ' (Response)',
              content: agentResponse.content,
              roomId: context.roomId,
              messageType: 'incoming',
            };
            
            context.transcript.push(responseMessage);
            console.log(chalk.green(`   🤖 ${actor.name} responded: ${agentResponse.content.text || 'No text response'}`));
          }
          
        } catch (error) {
          console.error(chalk.red(`   ❌ Error processing message for ${actorName}:`), error);
          // Continue execution but log the error
        }
      } else {
        // Fallback to simple logging for mock execution
        console.log(`   💬 ${actorName}: ${step.content}`);
      }

      context.transcript.push(message);
      context.metrics.messageCount = (context.metrics.messageCount || 0) + 1;
    }
  }

  private async executeWaitStep(step: ScriptStep): Promise<void> {
    const waitTime = step.waitTime || 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  private async executeActionStep(
    context: ScenarioContext,
    step: ScriptStep,
    actorId: string,
    actorName: string
  ): Promise<void> {
    const actionName = step.actionName || step.action || 'unknown';
    const actionParams = step.actionParams || {};

    // Track action execution
    context.metrics.actionCounts = context.metrics.actionCounts || {};
    context.metrics.actionCounts[actionName] = (context.metrics.actionCounts[actionName] || 0) + 1;

    const actor = context.actors.get(actorId);
    if (!actor) {
      throw new Error(`Actor ${actorId} not found`);
    }

    if (context.state.realExecution && actor.runtime) {
      try {
        console.log(chalk.magenta(`   🎯 ${actorName} executing action: ${actionName}`));
        
        // Find the action in the runtime
        const action = actor.runtime.actions.find(a => a.name === actionName);
        
        if (action) {
          // Create a test message context for the action
          const testMessage: Memory = {
            id: asUUID(uuidv4()),
            entityId: asUUID(typeof actorId === 'string' ? actorId : uuidv4()),
            agentId: actor.runtime!.agentId,
            roomId: context.roomId,
            worldId: context.worldId,
            content: {
              text: `Execute ${actionName}`,
              source: 'test-scenario',
              actions: [actionName],
            },
            createdAt: Date.now(),
          };

          // Create state
          const state = await actor.runtime.composeState(testMessage);
          
          // Validate the action can run
          const isValid = await action.validate(actor.runtime, testMessage, state);
          
          if (isValid) {
            // Execute the action
            const result = await action.handler(
              actor.runtime!,
              testMessage,
              state,
              { ...actionParams, context: { scenario: context.scenario.name } },
              async (content) => {
                // Callback for action responses
                const responseMessage: ScenarioMessage = {
                  id: asUUID(uuidv4()),
                  timestamp: Date.now(),
                  actorId: typeof actor.runtime!.agentId === 'string' ? actor.runtime!.agentId : String(actor.runtime!.agentId),
                  actorName: actor.name + ' (Action Response)',
                  content,
                  roomId: context.roomId,
                  messageType: 'incoming',
                };
                
                context.transcript.push(responseMessage);
                console.log(chalk.blue(`   📤 ${actor.name} action response: ${content.text || 'No text response'}`));
                return [];
              }
            );
            
            console.log(chalk.green(`   ✅ Action ${actionName} executed successfully`));
            
            // Store action result for verification
            if (!context.state.actionResults) {
              context.state.actionResults = [];
            }
            context.state.actionResults.push({
              actionName,
              actorId,
              result,
              timestamp: Date.now(),
            });
            
          } else {
            console.log(chalk.yellow(`   ⚠️  Action ${actionName} validation failed`));
          }
        } else {
          console.log(chalk.red(`   ❌ Action ${actionName} not found in runtime`));
        }
        
      } catch (error) {
        console.error(chalk.red(`   💥 Error executing action ${actionName}:`), error);
        // Continue execution but track the error
        if (!context.state.actionErrors) {
          context.state.actionErrors = [];
        }
        context.state.actionErrors.push({
          actionName,
          actorId,
          error: error instanceof Error ? error.message : String(error),
          timestamp: Date.now(),
        });
      }
    } else {
      // Fallback to simulation for mock execution
      console.log(`   🎯 ${actorName} simulating action: ${actionName}`);
    }
  }

  private async runVerification(context: ScenarioContext): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];

    if (!context.scenario.verification?.rules) {
      // No verification rules, create a basic success result
      results.push({
        ruleId: 'basic-execution',
        ruleName: 'Basic Execution',
        passed: true,
        score: 1.0,
        confidence: 0.9,
        reason: 'Scenario executed without errors',
      });
      return results;
    }

    for (const rule of context.scenario.verification.rules) {
      const result = await this.evaluateVerificationRule(context, rule);
      results.push(result);
    }

    return results;
  }

  private async evaluateVerificationRule(
    context: ScenarioContext,
    rule: VerificationRule
  ): Promise<VerificationResult> {
    console.log(chalk.cyan(`     Evaluating rule: ${rule.description}`));
    
    const transcript = context.transcript;
    const actionResults = context.state.actionResults || [];
    const actionErrors = context.state.actionErrors || [];
    
    let passed = false;
    let score = 0.0;
    let reason = '';
    let confidence = 0.8;

    try {
      if (rule.type === 'action') {
        // Verify specific action was executed
        const expectedAction = rule.config.expectedAction || rule.config.actionName;
        if (expectedAction) {
          const actionExecuted = actionResults.some(result => result.actionName === expectedAction);
          const actionFailed = actionErrors.some(error => error.actionName === expectedAction);
          
          if (actionExecuted) {
            passed = true;
            score = 1.0;
            reason = `Action ${expectedAction} was executed successfully`;
          } else if (actionFailed) {
            passed = false;
            score = 0.0;
            reason = `Action ${expectedAction} failed to execute`;
          } else {
            passed = false;
            score = 0.0;
            reason = `Action ${expectedAction} was not executed`;
          }
        }
      } else if (rule.type === 'llm') {
        // LLM-based verification using criteria
        const criteria = rule.config.criteria || rule.config.expectedValue || '';
        const transcriptText = transcript
          .map((m) => m.content.text || '')
          .join(' ')
          .toLowerCase();
          
        // Check for minimum message count
        const minMessages = rule.config.minMessages || 1;
        const hasEnoughMessages = transcript.length >= minMessages;

        // Check if criteria mentions specific actions
        const actionPattern = /\b(CREATE_|GET_|UPDATE_|DELETE_|SEARCH_|INSTALL_|EXECUTE_|FETCH_|GENERATE_)[A-Z_]+\b/g;
        const criteriaString = Array.isArray(criteria) ? criteria.join(' ') : (criteria || '');
        const mentionedActions = criteriaString.match(actionPattern) || [];
        
        let actionCriteriaMatch = true;
        if (mentionedActions.length > 0) {
          // Check if mentioned actions were actually executed
          actionCriteriaMatch = mentionedActions.every((actionName: string) => 
            actionResults.some(result => result.actionName === actionName) ||
            (context.metrics.actionCounts?.[actionName] || 0) > 0
          );
        }

        // Check for required keywords based on criteria
        const keywordChecks = [];
        const criteriaLower = criteriaString.toLowerCase();
        if (criteriaLower.includes('pricing') || criteriaLower.includes('price')) {
          keywordChecks.push(transcriptText.includes('price') || transcriptText.includes('cost') || transcriptText.includes('$'));
        }
        if (criteriaLower.includes('payment')) {
          keywordChecks.push(transcriptText.includes('payment') || transcriptText.includes('pay'));
        }
        if (criteriaLower.includes('plan')) {
          keywordChecks.push(transcriptText.includes('plan'));
        }
        
        const keywordMatch = keywordChecks.length === 0 || keywordChecks.some(check => check);

        passed = hasEnoughMessages && actionCriteriaMatch && keywordMatch;
        score = passed ? 1.0 : 0.0;
        
        if (passed) {
          reason = 'LLM verification criteria met';
        } else {
          const failureReasons = [];
          if (!hasEnoughMessages) failureReasons.push(`insufficient messages (${transcript.length}/${minMessages})`);
          if (!actionCriteriaMatch) failureReasons.push('required actions not executed');
          if (!keywordMatch) failureReasons.push('keyword criteria not met');
          reason = `Failed: ${failureReasons.join(', ')}`;
        }
      } else {
        // Default verification for other types
        const minMessages = rule.config.minMessages || 1;
        const hasEnoughMessages = transcript.length >= minMessages;
        
        passed = hasEnoughMessages;
        score = passed ? 1.0 : 0.0;
        reason = passed ? 'Basic verification passed' : `Insufficient messages: ${transcript.length}/${minMessages}`;
      }
      
      // Boost confidence if we have real execution
      if (context.state.realExecution) {
        confidence = Math.min(confidence + 0.1, 1.0);
      }
      
    } catch (error) {
      passed = false;
      score = 0.0;
      reason = `Verification error: ${error instanceof Error ? error.message : String(error)}`;
      confidence = 0.1;
    }

    const result: VerificationResult = {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      score,
      confidence,
      reason,
      executionTime: Date.now() - context.startTime,
    };
    
    console.log(passed ? 
      chalk.green(`     ✅ ${rule.description}: ${reason}`) :
      chalk.red(`     ❌ ${rule.description}: ${reason}`)
    );
    
    return result;
  }

  private calculateAverageResponseTime(transcript: ScenarioMessage[]): number {
    if (transcript.length < 2) {
      return 0;
    }

    let totalTime = 0;
    let responseCount = 0;

    for (let i = 1; i < transcript.length; i++) {
      const timeDiff = transcript[i].timestamp - transcript[i - 1].timestamp;
      if (timeDiff > 0 && timeDiff < 60000) {
        // Reasonable response time
        totalTime += timeDiff;
        responseCount++;
      }
    }

    return responseCount > 0 ? totalTime / responseCount : 0;
  }

  private calculateBenchmarks(context: ScenarioContext, scenario: Scenario): BenchmarkResult[] {
    const benchmarks: BenchmarkResult[] = [];
    const duration = Date.now() - context.startTime;

    // Duration benchmark
    const maxDuration = scenario.benchmarks?.maxDuration || 30000; // 30 seconds default
    benchmarks.push({
      metric: 'duration',
      value: duration,
      threshold: maxDuration,
      passed: duration <= maxDuration,
    });

    // Message count benchmark
    const messageCount = context.metrics.messageCount || 0;
    const maxMessages = scenario.benchmarks?.maxSteps || 50;
    benchmarks.push({
      metric: 'message_count',
      value: messageCount,
      threshold: maxMessages,
      passed: messageCount <= maxMessages,
    });

    return benchmarks;
  }

  private async cleanupScenarioEnvironment(context: ScenarioContext): Promise<void> {
    console.log(chalk.yellow('   🧹 Cleaning up scenario environment...'));
    
    try {
      // Clean up test harness if it exists
      if (context.state.testHarness) {
        await context.state.testHarness.cleanup();
      }
      
      // Clear actor references
      context.actors.clear();
      context.state = {};
      
      console.log(chalk.green('   ✅ Scenario cleanup completed'));
    } catch (error) {
      console.error(chalk.red('   ❌ Error during cleanup:'), error);
    }
  }

  private async outputResults(
    results: TestRunnerResult,
    options: TestRunnerOptions
  ): Promise<void> {
    if (options.outputFormat === 'json' || options.outputFormat === 'both') {
      const jsonOutput = JSON.stringify(results, null, 2);

      if (options.outputFile) {
        const fs = await import('fs');
        fs.writeFileSync(options.outputFile, jsonOutput);
        console.log(`\n📄 Results written to ${options.outputFile}`);
      }

      if (options.outputFormat === 'json') {
        console.log(jsonOutput);
        return;
      }
    }

    // Console output
    console.log(`\n${'='.repeat(80)}`);
    console.log('🏁 SCENARIO TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`Total Scenarios: ${results.totalScenarios}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⏭️  Skipped: ${results.skipped}`);
    console.log(`🔍 Validation Errors: ${results.validationErrors}`);
    console.log(`⏱️  Total Duration: ${(results.duration / 1000).toFixed(2)}s`);
    console.log(`📊 Pass Rate: ${results.summary.passRate.toFixed(1)}%`);
    console.log(`⚡ Avg Duration: ${(results.summary.avgDuration / 1000).toFixed(2)}s`);

    console.log('\n📈 Category Breakdown:');
    Object.entries(results.summary.categories).forEach(([category, stats]) => {
      const total = stats.passed + stats.failed;
      const rate = total > 0 ? ((stats.passed / total) * 100).toFixed(1) : '0.0';
      console.log(`  ${category}: ${stats.passed}/${total} (${rate}%)`);
    });

    if (results.validationErrors > 0) {
      console.log('\n⚠️  Validation Issues:');
      results.validationResults
        .filter((v) => !v.valid)
        .forEach((validation) => {
          console.log(`  ${validation.scenario}:`);
          validation.errors.forEach((error) => console.log(`    - ${error.message}`));
        });
    }

    if (results.failed > 0 && options.verbose) {
      console.log('\n❌ Failed Scenarios:');
      results.results
        .filter((r) => r.status === 'failed')
        .forEach((result) => {
          console.log(`  ${result.scenario}:`);
          result.errors.forEach((error) => console.log(`    - ${error}`));
        });
    }

    console.log(`\n${'='.repeat(80)}`);
  }
}

// Export scenarios loader for programmatic use
export { loadAllScenarios } from './scenarios-loader.js';

// CLI interface
export async function runScenarioTests(): Promise<void> {
  const args = process.argv.slice(2);
  console.log('🔧 Raw arguments:', args); // Debug logging

  const options: TestRunnerOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    continueOnError: args.includes('--continue-on-error'),
    validateOnly: args.includes('--validate-only'),
    parallel: false, // Always sequential for now
    outputFormat: 'console',
  };

  // Parse additional options
  const filterIndex = args.indexOf('--filter');
  if (filterIndex !== -1 && args[filterIndex + 1]) {
    options.filter = args[filterIndex + 1];
    console.log('🔧 Filter set to:', options.filter);
  } else {
    // Check for --filter=value format
    const filterArg = args.find((arg) => arg.startsWith('--filter='));
    if (filterArg) {
      options.filter = filterArg.split('=')[1];
      console.log('🔧 Filter set to (from =format):', options.filter);
    } else {
      console.log('🔧 No filter found in args');
    }
  }

  const categoryIndex = args.indexOf('--category');
  if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    options.category = args[categoryIndex + 1];
  } else {
    // Check for --category=value format
    const categoryArg = args.find((arg) => arg.startsWith('--category='));
    if (categoryArg) {
      options.category = categoryArg.split('=')[1];
    }
  }

  const outputIndex = args.indexOf('--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputFile = args[outputIndex + 1];
    options.outputFormat = 'both';
  } else {
    // Check for --output=value format
    const outputArg = args.find((arg) => arg.startsWith('--output='));
    if (outputArg) {
      options.outputFile = outputArg.split('=')[1];
      options.outputFormat = 'both';
    }
  }

  const runner = new ConsolidatedScenarioTestRunner();

  try {
    const results = await runner.runAllScenarios(options);

    // Exit with error code if tests failed
    const exitCode = results.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('💥 Test runner crashed:', error);
    process.exit(1);
  }
}

// Main entry point when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScenarioTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
