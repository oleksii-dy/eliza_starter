#!/usr/bin/env tsx

import { AgentServer } from '@elizaos/server';
import {
  AgentRuntime,
  Character,
  stringToUuid,
  type IAgentRuntime,
  type UUID,
  type Memory,
  type Plugin,
  EventType,
  ChannelType,
  type MessagePayload,
  type Room,
  type Entity,
  type World,
} from '@elizaos/core';
// Use workspace packages directly for development
import { createDatabaseAdapter } from '../../plugin-sql/src/index.js';
import sqlPlugin from '../../plugin-sql/src/index.js';
import { schemaRegistry } from '../../plugin-sql/src/schema-registry.js';
import { coreSchema } from '../../plugin-sql/src/schema/core.js';
// Import scenarios loader to avoid circular dependencies
import { loadAllScenarios, loadScenariosByCategory } from './scenarios-loader.js';
import type {
  Scenario,
  ScenarioContext,
  ScenarioMessage,
  ScriptStep,
  VerificationResult,
  ScenarioExecutionResult,
  ScenarioValidationResult,
  BenchmarkResult,
} from './types.js';
import type { TestRunnerOptions, TestRunnerResult } from './test-runner.js';
import { ScenarioManifestValidator } from './test-runner.js';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

// Helper function to ensure core tables exist using proper schema registry
async function ensureCoreTablesExist(database: any): Promise<void> {
  console.log('🔧 Ensuring core ElizaOS tables exist using schema registry...');

  try {
    // Register core SQL plugin schema first
    console.log('   Registering core schema tables...');
    
    // Register core tables from the SQL plugin
    const coreTableSchemas = [
      {
        name: 'agents',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS agents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          email TEXT,
          avatar TEXT,
          metadata JSONB DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT,
          avatar TEXT,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      },
      {
        name: 'entities',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS entities (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "agentId" UUID NOT NULL,
          names JSONB NOT NULL,
          metadata JSONB DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS entities (
          id TEXT PRIMARY KEY,
          "agentId" TEXT NOT NULL,
          names TEXT NOT NULL,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      },
      {
        name: 'memories',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS memories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "entityId" UUID NOT NULL,
          "agentId" UUID NOT NULL,
          "roomId" UUID NOT NULL,
          "worldId" UUID,
          content JSONB NOT NULL,
          embedding VECTOR(1536),
          metadata JSONB DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          "entityId" TEXT NOT NULL,
          "agentId" TEXT NOT NULL,
          "roomId" TEXT NOT NULL,
          "worldId" TEXT,
          content TEXT NOT NULL,
          embedding TEXT,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      },
      {
        name: 'rooms',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS rooms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          "channelId" TEXT,
          "agentId" UUID,
          "serverId" TEXT,
          "worldId" UUID,
          type TEXT,
          source TEXT,
          metadata JSONB DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS rooms (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "channelId" TEXT,
          "agentId" TEXT,
          "serverId" TEXT,
          "worldId" TEXT,
          type TEXT,
          source TEXT,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      },
      {
        name: 'participants',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS participants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "entityId" UUID NOT NULL,
          "roomId" UUID NOT NULL,
          "userState" TEXT,
          metadata JSONB DEFAULT '{}' NOT NULL,
          "lastActiveAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS participants (
          id TEXT PRIMARY KEY,
          "entityId" TEXT NOT NULL,
          "roomId" TEXT NOT NULL,
          "userState" TEXT,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "lastActiveAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      },
      {
        name: 'worlds',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS worlds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          "serverId" TEXT,
          metadata JSONB DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS worlds (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "serverId" TEXT,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      },
      {
        name: 'cache',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS cache (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key TEXT NOT NULL UNIQUE,
          "entityId" UUID,
          value TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "expiresAt" TIMESTAMP
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS cache (
          id TEXT PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          "entityId" TEXT,
          value TEXT NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "expiresAt" TIMESTAMP
        )`
      },
      {
        name: 'relationships',
        pluginName: '@elizaos/plugin-sql',
        sql: `CREATE TABLE IF NOT EXISTS relationships (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "sourceEntityId" UUID NOT NULL,
          "targetEntityId" UUID NOT NULL,
          tags JSONB DEFAULT '[]' NOT NULL,
          metadata JSONB DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`,
        fallbackSql: `CREATE TABLE IF NOT EXISTS relationships (
          id TEXT PRIMARY KEY,
          "sourceEntityId" TEXT NOT NULL,
          "targetEntityId" TEXT NOT NULL,
          tags TEXT DEFAULT '[]' NOT NULL,
          metadata TEXT DEFAULT '{}' NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
        )`
      }
    ];

    // Register all core tables with the schema registry
    schemaRegistry.registerTables(coreTableSchemas);
    console.log(`   Registered ${coreTableSchemas.length} core tables with schema registry`);

    // Get the database type for proper table creation
    const dbType = database.constructor.name === 'PgliteDatabaseAdapter' ? 'pglite' : 'postgres';
    console.log(`   Detected database type: ${dbType}`);

    // Use schema registry to create tables in proper dependency order
    if (
      database.constructor.name === 'PgliteDatabaseAdapter' &&
      typeof database.getDatabase === 'function'
    ) {
      console.log('   Using PGLite adapter, getting drizzle db...');
      const drizzleDb = await database.getDatabase();
      
      // Use schema registry to create all tables
      await schemaRegistry.createTables(drizzleDb, dbType);
      
      console.log('   ✅ Core tables created successfully using schema registry');
    } else if (database.db) {
      console.log('   Using PostgreSQL adapter...');
      
      // Use schema registry to create all tables
      await schemaRegistry.createTables(database.db, dbType);
      
      console.log('   ✅ Core tables created successfully using schema registry');
    } else {
      console.warn('   ⚠️  Unable to determine database type or access connection');
      throw new Error('Cannot access database connection for table creation');
    }

  } catch (error) {
    console.error('   ❌ Failed to ensure core tables exist:', error);
    throw error;
  }
}

// Real context that tracks actual runtime state
interface RealScenarioContext extends ScenarioContext {
  server: AgentServer | null;
  database: any;
  agentRuntimes: Map<UUID, IAgentRuntime>;
  dbPath: string;
  testWorldId: UUID;
  testRoomId: UUID;
  realMessages: Memory[];
  messagePromises: Map<string, Promise<void>>;
}

export class RealScenarioTestRunner {
  private validator = new ScenarioManifestValidator();
  private server: AgentServer | null = null;
  private testDir: string;

  constructor(testDir?: string) {
    this.testDir = testDir || path.join(process.cwd(), '.test-scenarios');
  }

  async runAllScenarios(
    options: TestRunnerOptions = {},
    providedScenarios?: Scenario[]
  ): Promise<TestRunnerResult> {
    const startTime = Date.now();

    // Use provided scenarios or load them dynamically to avoid circular dependencies
    let allScenarios: Scenario[] = [];
    if (providedScenarios) {
      allScenarios = providedScenarios;
    } else {
      try {
        // Use scenarios loader to avoid circular dependency
        if (options.category) {
          allScenarios = await loadScenariosByCategory(options.category);
        } else {
          allScenarios = await loadAllScenarios();
        }
      } catch (error) {
        console.warn('Could not load scenarios using scenarios loader, using empty array');
        allScenarios = [];
      }
    }

    const scenarios = this.filterScenarios(allScenarios, options);

    console.log(`🚀 Starting REAL scenario test run with ${scenarios.length} scenarios`);
    console.log(`📁 Test directory: ${this.testDir}`);

    const results: ScenarioExecutionResult[] = [];
    const validationResults: ScenarioValidationResult[] = [];

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let validationErrors = 0;

    // Ensure test directory exists
    await fs.mkdir(this.testDir, { recursive: true });

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

        // Execute scenario with real infrastructure
        console.log(`🏃 Executing REAL scenario: ${scenario.name}`);
        const result = await this.executeRealScenario(scenario, options);
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

  private async executeRealScenario(
    scenario: Scenario,
    options: TestRunnerOptions
  ): Promise<ScenarioExecutionResult> {
    const startTime = Date.now();

    // Create unique test database for this scenario
    const scenarioId = scenario.id.replace(/[^a-zA-Z0-9]/g, '_');
    const dbPath = path.join(this.testDir, `scenario_${scenarioId}_${Date.now()}.db`);

    const context: RealScenarioContext = {
      scenario,
      actors: new Map(),
      roomId: stringToUuid(`test-room-${scenario.id}`),
      worldId: stringToUuid(`test-world-${scenario.id}`),
      testWorldId: stringToUuid(`test-world-${scenario.id}`),
      testRoomId: stringToUuid(`test-room-${scenario.id}`),
      startTime,
      transcript: [],
      metrics: {
        messageCount: 0,
        stepCount: 0,
        actionCounts: {},
      },
      state: {},
      server: null!,
      agentRuntimes: new Map(),
      dbPath,
      realMessages: [],
      messagePromises: new Map(),
      database: null!,
    };

    try {
      // 1. Start real server with database
      console.log(`   📦 Starting real server and database...`);
      await this.startRealInfrastructure(context);

      // 2. Create real agent runtimes with plugins
      console.log(`   🤖 Creating real agent runtimes with plugins...`);
      await this.createRealAgentRuntimes(context);

      // 3. Execute the scenario steps for real
      console.log(`   ▶️  Executing scenario steps with real agents...`);
      await this.executeRealScenarioSteps(context, options);

      // 4. Verify actual results
      console.log(`   🔍 Verifying real execution results...`);
      const verificationResults = await this.verifyRealResults(context);

      // 5. Calculate final results
      const duration = Date.now() - startTime;
      const passed = verificationResults.every((v) => v.passed);

      const result: ScenarioExecutionResult = {
        scenario: scenario.id,
        status: passed ? 'passed' : 'failed',
        duration,
        transcript: context.transcript.map((msg) => ({
          id: stringToUuid(msg.id),
          timestamp: msg.timestamp,
          actorId: stringToUuid(msg.actorId),
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

      return result;
    } finally {
      // 6. Clean up resources
      await this.cleanupRealInfrastructure(context);
    }
  }

  private async startRealInfrastructure(context: RealScenarioContext): Promise<void> {
    try {
      // Create database adapter directly
      console.log(`   📦 Creating database adapter...`);
      const database = await createDatabaseAdapter(
        {
          dataDir: context.dbPath,
        },
        stringToUuid('test-scenario-agent')
      );

      console.log(`   📦 Database adapter created, type: ${database?.constructor?.name}`);
      console.log(`   📦 Database adapter methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(database || {})));

      // Initialize the database adapter
      console.log(`   📦 Initializing database adapter...`);
      await database.init();

      // Ensure core tables exist
      console.log(`   🔄 Creating core database tables...`);
      await ensureCoreTablesExist(database);

      // Wait for tables to be created and verify agents table
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify agents table exists
      try {
        if (
          database.constructor.name === 'PgliteDatabaseAdapter' &&
          typeof database.getConnection === 'function'
        ) {
          const rawPglite = await database.getConnection();
          const result = await rawPglite.query('SELECT COUNT(*) FROM agents;');
          console.log(`   ✅ Agents table verified - contains ${result.rows[0].count} records`);
        } else {
          console.log(`   ⏭️  Skipping agents table verification for non-PGLite adapter`);
        }
      } catch (error) {
        console.log(`   ❌ Agents table verification failed:`, error);
        throw new Error('Agents table not properly created');
      }

      console.log(`   ✅ Database initialized at ${context.dbPath}`);

      // Store database reference last to avoid circular reference
      context.database = database;

      // Skip test agent creation - not needed for basic testing
      console.log(`   ⏭️  Skipping test agent creation`);

      // Skip world and room creation for now
      console.log(`   ⏭️  Skipping world and room creation for now`);
    } catch (error) {
      console.error('Failed to start real infrastructure:', error);
      throw error;
    }
  }

  private async createRealAgentRuntimes(context: RealScenarioContext): Promise<void> {
    const loadedPlugins = new Map<string, Plugin>();

    // First, load all required plugins
    const requiredPlugins = new Set<string>();
    context.scenario.actors.forEach((actor) => {
      actor.plugins?.forEach((pluginName) => requiredPlugins.add(pluginName));
    });

    // Load all required plugins
    console.log(`   📦 Loading ${requiredPlugins.size} plugins...`);
    for (const pluginName of requiredPlugins) {
      try {
        console.log(`   📦 Loading plugin: ${pluginName}`);

        let plugin;
        // Handle workspace packages for development
        if (pluginName === '@elizaos/plugin-autocoder') {
          plugin = await import('../../plugin-autocoder/src/index.js');
        } else if (pluginName === '@elizaos/plugin-sql') {
          plugin = await import('../../plugin-sql/src/index.js');
        } else if (pluginName === '@elizaos/plugin-trust') {
          plugin = await import('../../plugin-trust/src/index.js');
        } else {
          // Try regular import for other plugins
          plugin = await import(pluginName);
        }

        loadedPlugins.set(pluginName, plugin.default || plugin);
        console.log(`   ✅ Successfully loaded plugin: ${pluginName}`);
      } catch (error) {
        console.warn(
          `   ⚠️  Failed to load plugin ${pluginName}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }

    // Create real runtime for each actor
    for (const actor of context.scenario.actors) {
      const character: Character = {
        id: actor.id,
        name: actor.name,
        bio: [actor.bio || `Test actor for ${context.scenario.name}`],
        system: actor.system || 'You are a helpful test agent.',
        messageExamples: [],
        postExamples: [],
        topics: [],
        knowledge: [],
        plugins: actor.plugins || [],
        settings: actor.settings || {},
        secrets: {},
      };

      // Get plugins for this actor
      const actorPlugins: Plugin[] = [];
      actor.plugins?.forEach((pluginName) => {
        const plugin = loadedPlugins.get(pluginName);
        if (plugin) {
          actorPlugins.push(plugin);
        }
      });

      console.log(`   🔄 Creating runtime for ${actor.name}...`);

      try {
        // Create runtime with plugins
        const runtime = new AgentRuntime({
          character,
          plugins: actorPlugins,
          adapter: context.database,
          conversationLength: 32,
          agentId: actor.id,
        });

        // Initialize runtime with plugins but skip agent creation
        console.log(
          `   🔄 Initializing runtime with ${actorPlugins.length} plugins (skipping agent creation)...`
        );

        try {
          // Initialize plugins without creating agent entities
          for (const plugin of actorPlugins) {
            if (plugin.init) {
              await plugin.init(plugin.config || {}, runtime);
            }

            // Register plugin components manually
            if (plugin.actions) {
              for (const action of plugin.actions) {
                runtime.actions.push(action);
              }
            }
            if (plugin.providers) {
              for (const provider of plugin.providers) {
                runtime.providers.push(provider);
              }
            }
            if (plugin.evaluators) {
              for (const evaluator of plugin.evaluators) {
                runtime.evaluators.push(evaluator);
              }
            }
          }

          console.log(
            `   ✅ Initialized runtime manually with ${runtime.actions.length} actions, ${runtime.providers.length} providers`
          );
        } catch (initError) {
          console.warn(`   ⚠️  Manual plugin initialization had issues:`, initError);
          // Fall back to full initialization
          await runtime.initialize();
        }

        // Store initialized runtime
        context.agentRuntimes.set(actor.id, runtime);
        context.actors.set(actor.id, { ...actor, runtime });

        console.log(
          `   ✅ Created and initialized real runtime for ${actor.name} with ${actorPlugins.length} plugins`
        );
      } catch (error) {
        console.log(
          `   ❌ Failed to create runtime for ${actor.name}: ${error instanceof Error ? error.message : String(error)}`
        );
        console.log(`   Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      }
    }
  }

  private async executeRealScenarioSteps(
    context: RealScenarioContext,
    options: TestRunnerOptions
  ): Promise<void> {
    // Set up message handling to capture real responses
    for (const [agentId, runtime] of context.agentRuntimes) {
      // Use event handler registration
      runtime.registerEvent(EventType.MESSAGE_SENT, async (data: any) => {
        const message: ScenarioMessage = {
          id: data.messageId || stringToUuid(`msg-${Date.now()}`),
          timestamp: Date.now(),
          actorId: agentId,
          actorName: runtime.character.name,
          content: { text: data.content?.text || '' },
          roomId: context.testRoomId,
          messageType: 'outgoing',
        };

        context.transcript.push(message);
        context.metrics.messageCount = (context.metrics.messageCount || 0) + 1;

        console.log(`   💬 ${runtime.character.name}: ${data.content?.text || ''}`);
      });
    }

    // Collect all script steps from all actors
    const allSteps: Array<{ step: ScriptStep; actorId: UUID; actorName: string }> = [];

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
      console.log('   ⚠️  No script steps defined for scenario');
      return;
    }

    // Execute all steps in order
    for (const { step, actorId, actorName } of allSteps) {
      context.metrics.stepCount = (context.metrics.stepCount || 0) + 1;
      const stepStartTime = Date.now();

      switch (step.type) {
        case 'message':
          await this.executeRealMessageStep(context, step, actorId, actorName);
          break;
        case 'wait':
          await this.executeWaitStep(step);
          break;
        case 'action':
          await this.executeRealActionStep(context, step, actorId, actorName);
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

  private async executeRealMessageStep(
    context: RealScenarioContext,
    step: ScriptStep,
    actorId: UUID,
    actorName: string
  ): Promise<void> {
    if (!step.content) return;

    const runtime = context.agentRuntimes.get(actorId);
    if (!runtime) {
      console.log(`   ⚠️  No runtime found for actor ${actorName}`);
      return;
    }

    // Create real message
    const message: Memory = {
      id: stringToUuid(`msg-${Date.now()}-${actorId}`),
      createdAt: Date.now(),
      entityId: actorId,
      agentId: runtime.agentId,
      roomId: context.testRoomId,
      content: { text: step.content },
    };

    // Store in transcript
    const scenarioMessage: ScenarioMessage = {
      id: message.id || stringToUuid(`msg-${Date.now()}`),
      timestamp: message.createdAt || Date.now(),
      actorId: actorId,
      actorName: actorName,
      content: message.content,
      roomId: context.testRoomId,
      messageType: 'outgoing',
    };

    context.transcript.push(scenarioMessage);
    context.metrics.messageCount = (context.metrics.messageCount || 0) + 1;
    context.realMessages.push(message);

    console.log(`   💬 ${actorName}: ${step.content}`);

    // Process message through all agents in room
    for (const [agentId, agentRuntime] of context.agentRuntimes) {
      if (agentId !== actorId) {
        // Process message in the receiving agent
        const state = await agentRuntime.composeState(message);
        await agentRuntime.processActions(message, [], state);
      }
    }

    // Wait for responses to be processed
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async executeWaitStep(step: ScriptStep): Promise<void> {
    const waitTime = step.waitTime || 1000;
    await new Promise((resolve) => setTimeout(resolve, waitTime));
  }

  private async executeRealActionStep(
    context: RealScenarioContext,
    step: ScriptStep,
    actorId: UUID,
    actorName: string
  ): Promise<void> {
    const actionName = step.actionName || step.action || 'unknown';
    const runtime = context.agentRuntimes.get(actorId);

    if (!runtime) {
      console.log(`   ⚠️  No runtime found for actor ${actorName}`);
      return;
    }

    // Track action execution
    context.metrics.actionCounts = context.metrics.actionCounts || {};
    context.metrics.actionCounts[actionName] = (context.metrics.actionCounts[actionName] || 0) + 1;

    console.log(`   🎯 ${actorName} executing real action: ${actionName}`);

    // Execute the action through runtime
    const action = runtime.actions.find((a) => a.name === actionName);
    if (action) {
      try {
        const state = await runtime.composeState({
          id: stringToUuid(`action-${Date.now()}`),
          entityId: actorId,
          agentId: runtime.agentId,
          roomId: context.testRoomId,
          content: { text: `Execute action: ${actionName}` },
        });

        await action.handler(
          runtime,
          {
            id: stringToUuid(`action-msg-${Date.now()}`),
            entityId: actorId,
            agentId: runtime.agentId,
            roomId: context.testRoomId,
            content: { text: step.actionParams?.text || '' },
          },
          state,
          step.actionParams
        );
      } catch (error) {
        console.log(
          `   ❌ Action execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } else {
      console.log(`   ⚠️  Action ${actionName} not found in runtime`);
    }
  }

  private async verifyRealResults(context: RealScenarioContext): Promise<VerificationResult[]> {
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
      const result = await this.verifyRealRule(context, rule);
      results.push(result);
    }

    return results;
  }

  private async verifyRealRule(
    context: RealScenarioContext,
    rule: any
  ): Promise<VerificationResult> {
    // Get real data from the database and runtime
    const messages = context.realMessages;
    const transcript = context.transcript;

    // Check actual database state
    let dbVerification = true;
    let dbReason = '';

    // Verify messages were actually stored
    if (rule.config.verifyDatabase) {
      for (const runtime of context.agentRuntimes.values()) {
        const storedMessages = await runtime.getMemories({
          roomId: context.testRoomId,
          tableName: 'messages',
          count: 100,
        });

        if (storedMessages.length === 0) {
          dbVerification = false;
          dbReason = 'No messages found in database';
        }
      }
    }

    // Check for actual action execution
    let actionVerification = true;
    if (rule.config.verifyActions) {
      const expectedActions = rule.config.expectedActions || [];
      for (const expectedAction of expectedActions) {
        const executed = context.metrics.actionCounts?.[expectedAction] || 0;
        if (executed === 0) {
          actionVerification = false;
          dbReason += ` Action ${expectedAction} was not executed.`;
        }
      }
    }

    // Basic checks from transcript
    const minMessages = rule.config.minMessages || 1;
    const hasEnoughMessages = transcript.length >= minMessages;

    const requiredKeywords = rule.config.requiredKeywords || [];
    const transcriptText = transcript
      .map((m) => m.content.text || '')
      .join(' ')
      .toLowerCase();
    const hasRequiredKeywords =
      requiredKeywords.length === 0 ||
      requiredKeywords.every((keyword: string) => transcriptText.includes(keyword.toLowerCase()));

    const passed = hasEnoughMessages && hasRequiredKeywords && dbVerification && actionVerification;

    return {
      ruleId: rule.id,
      ruleName: rule.description,
      passed,
      score: passed ? 1.0 : 0.0,
      confidence: 0.9,
      reason: passed
        ? 'All real verification criteria met'
        : `Failed: messages=${transcript.length}/${minMessages}, keywords=${hasRequiredKeywords}, db=${dbVerification}${dbReason}`,
      executionTime: Date.now() - context.startTime,
    };
  }

  private async cleanupRealInfrastructure(context: RealScenarioContext): Promise<void> {
    try {
      console.log(`   🧹 Cleaning up real infrastructure...`);

      // Stop all agents
      for (const runtime of context.agentRuntimes.values()) {
        await runtime.stop();
      }

      // Stop database
      if (context.database) {
        await context.database.close();
      }

      // Stop server if it exists
      if (context.server) {
        await context.server.stop();
      }

      // Clean up test database file
      try {
        await fs.unlink(context.dbPath);
        await fs.unlink(`${context.dbPath}-wal`);
        await fs.unlink(`${context.dbPath}-shm`);
      } catch (error) {
        // Ignore errors if files don't exist
      }

      console.log(`   ✅ Cleanup complete`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
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

  private calculateAverageResponseTime(transcript: ScenarioMessage[]): number {
    if (transcript.length < 2) return 0;

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

  private calculateBenchmarks(context: RealScenarioContext, scenario: Scenario): BenchmarkResult[] {
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

    // Database operations benchmark
    const dbOperations = context.realMessages.length;
    benchmarks.push({
      metric: 'db_operations',
      value: dbOperations,
      threshold: 100,
      passed: dbOperations > 0,
    });

    return benchmarks;
  }

  private async outputResults(
    results: TestRunnerResult,
    options: TestRunnerOptions
  ): Promise<void> {
    // Console output
    console.log('\n' + '='.repeat(80));
    console.log('🏁 REAL SCENARIO TEST RESULTS');
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

    console.log('\n' + '='.repeat(80));
  }
}

// CLI interface
export async function runRealScenarioTests(): Promise<void> {
  const args = process.argv.slice(2);
  console.log('🔧 Raw arguments:', args);

  const options: TestRunnerOptions = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    continueOnError: args.includes('--continue-on-error'),
    validateOnly: args.includes('--validate-only'),
    parallel: false, // Always sequential for real tests
    outputFormat: 'console',
  };

  // Parse additional options
  const filterIndex = args.indexOf('--filter');
  if (filterIndex !== -1 && args[filterIndex + 1]) {
    options.filter = args[filterIndex + 1];
    console.log('🔧 Filter set to:', options.filter);
  } else {
    const filterArg = args.find((arg) => arg.startsWith('--filter='));
    if (filterArg) {
      options.filter = filterArg.split('=')[1];
      console.log('🔧 Filter set to (from =format):', options.filter);
    }
  }

  const categoryIndex = args.indexOf('--category');
  if (categoryIndex !== -1 && args[categoryIndex + 1]) {
    options.category = args[categoryIndex + 1];
  } else {
    const categoryArg = args.find((arg) => arg.startsWith('--category='));
    if (categoryArg) {
      options.category = categoryArg.split('=')[1];
    }
  }

  const runner = new RealScenarioTestRunner();

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

// Run if called directly
if (
  process.argv[1].endsWith('real-test-runner.js') ||
  process.argv[1].endsWith('real-test-runner.ts')
) {
  runRealScenarioTests();
}
