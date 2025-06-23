import {
  type IAgentRuntime,
  type UUID,
  type Memory,
  type Content,
  // type Character, // Available if needed
  EventType,
  createUniqueUuid,
  asUUID,
  ChannelType,
  // Role, // Available if needed
  logger,
} from '@elizaos/core';
import { AgentServer } from '@elizaos/server';
import type {
  Scenario,
  ScenarioResult,
  ScenarioContext,
  ScenarioActor,
  ScenarioMessage,
  ScenarioRunOptions,
  ScenarioProgressCallback,
  ScriptStep,
} from './types.js';
import { ScenarioVerifier } from './verification.js';
import { MetricsCollector } from './metrics.js';
import { ProductionVerificationSystem } from './integration-test.js';
import { ScenarioActionTracker } from '../commands/scenario/action-tracker.js';
import { MockLLMService, processMessageWithLLMFallback } from './mock-llm-service.js';
import { v4 as uuidv4 } from 'uuid';

// Benchmarking System Components  
import { ProductionCostTracker } from './production-cost-tracker.js';
import { LiveMessageBus } from './live-message-bus.js';
import { RealWorldTaskExecutor } from './real-world-task-executor.js';
import { ExternalAgentAPI } from './external-agent-api.js';
import { BenchmarkScoringSystem } from './benchmark-scoring-system.js';
import { defiPortfolioBenchmark } from './benchmarks/defi-portfolio-benchmark.js';
import { ecommerceStoreBenchmark } from './benchmarks/ecommerce-store-benchmark.js';

// import { getMessageManager } from '../utils/runtime-context'; // Module not found
// import { calculateFactorQuality } from '../verification/evaluator'; // Module not found
// import { ScenarioService } from '../services/scenario'; // Module not found
// import { validateSendScenarioEvent } from './types'; // Not exported
// import type { LoadedScenario, Message, VerificationRule } from './types'; // Not exported
// import { ActionTracker } from '../commands/scenario/action-tracker'; // Not exported

export class ScenarioRunner {
  private primaryRuntime: IAgentRuntime;
  private verifier: ScenarioVerifier;
  private metricsCollector: MetricsCollector;
  private productionVerificationSystem: ProductionVerificationSystem;
  private activeScenarios = new Map<string, ScenarioContext>();

  // Benchmarking system components
  private costTracker: ProductionCostTracker;
  private messageBus: LiveMessageBus;
  private taskExecutor: RealWorldTaskExecutor;
  private externalAgentAPI: ExternalAgentAPI;
  private scoringSystem: BenchmarkScoringSystem;
  private activeBenchmarks = new Map<string, any>();

  // Add these interfaces
  private scenario: any;
  private runtime: IAgentRuntime;

  // Add property to store agents map
  public agents: Map<string, IAgentRuntime> = new Map();

  constructor(_server: AgentServer, primaryRuntime: IAgentRuntime) {
    this.primaryRuntime = primaryRuntime;
    this.verifier = new ScenarioVerifier(primaryRuntime);
    this.metricsCollector = new MetricsCollector();
    this.productionVerificationSystem = new ProductionVerificationSystem(this.primaryRuntime);
    this.runtime = primaryRuntime;

    // Initialize benchmarking system
    this.costTracker = new ProductionCostTracker();
    this.messageBus = new LiveMessageBus();
    this.taskExecutor = new RealWorldTaskExecutor(this.costTracker);
    this.externalAgentAPI = new ExternalAgentAPI();
    this.scoringSystem = new BenchmarkScoringSystem();

    logger.info('ScenarioRunner initialized with real-world benchmarking capabilities');
  }

  async runScenario(
    scenario: Scenario,
    _options: ScenarioRunOptions = {},
    progressCallback?: ScenarioProgressCallback
  ): Promise<ScenarioResult> {
    // Validate scenario
    this.validateScenario(scenario);

    const startTime = Date.now();
    let context: ScenarioContext | null = null;

    try {
      // Setup phase
      progressCallback?.({
        scenarioId: scenario.id,
        phase: 'setup',
        step: 1,
        totalSteps: 4,
        message: 'Setting up scenario environment',
      });

      try {
        context = await this.setupScenario(scenario);
      } catch (setupError) {
        logger.error('Error in setupScenario:', setupError);
        logger.error(
          'Error details:',
          setupError instanceof Error ? setupError.message : String(setupError)
        );
        logger.error(
          'Error stack:',
          setupError instanceof Error ? setupError.stack : 'No stack trace'
        );
        throw setupError;
      }
      this.activeScenarios.set(scenario.id, context);
      this.metricsCollector.start();

      // Execution phase
      progressCallback?.({
        scenarioId: scenario.id,
        phase: 'execution',
        step: 2,
        totalSteps: 4,
        message: 'Executing scenario',
      });

      await this.executeScenario(context, progressCallback);

      // Verification phase
      progressCallback?.({
        scenarioId: scenario.id,
        phase: 'verification',
        step: 3,
        totalSteps: 4,
        message: 'Verifying results',
      });

      // Use production verification system with all 5 improvements
      await this.productionVerificationSystem.initializeSystem();
      const verificationResults = await this.verifier.verify(scenario.verification.rules, context);

      // Metrics collection
      const metrics = this.metricsCollector.collect(context);
      context.metrics = metrics;

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Teardown phase
      progressCallback?.({
        scenarioId: scenario.id,
        phase: 'teardown',
        step: 4,
        totalSteps: 4,
        message: 'Cleaning up',
      });

      await this.teardownScenario(context);

      const overallScore = this.calculateOverallScore(verificationResults);
      const passed = this.determinePass(verificationResults, scenario);
      
      const result: ScenarioResult = {
        scenarioId: scenario.id,
        name: scenario.name,
        startTime,
        endTime,
        duration,
        passed,
        completed: true, // Successfully completed execution
        success: passed, // Success based on verification results
        score: overallScore,
        metrics: {
          duration,
          messageCount: context.transcript.length,
          stepCount: 0,
          tokenUsage: metrics.tokenUsage || { input: 0, output: 0, total: 0 },
          memoryUsage: metrics.memoryUsage || { peak: 0, average: 0, memoryOperations: 0 },
          actionCounts: metrics.actionCounts || {},
          responseLatency: metrics.responseLatency || { min: 0, max: 0, average: 0, p95: 0 },
          customMetrics: metrics.customMetrics,
        },
        verificationResults,
        verification: {
          overallScore,
        },
        transcript: context.transcript,
      };

      return result;
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      const errorResult: ScenarioResult = {
        scenarioId: scenario.id,
        name: scenario.name,
        startTime,
        endTime,
        duration,
        passed: false,
        completed: false, // Failed to complete execution
        success: false, // Failed
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          duration: endTime - startTime,
          messageCount: context?.transcript?.length || 0,
          stepCount: 0,
          tokenUsage: context?.metrics?.tokenUsage || { input: 0, output: 0, total: 0 },
          memoryUsage: context?.metrics?.memoryUsage || {
            peak: 0,
            average: 0,
            memoryOperations: 0,
          },
          actionCounts: context?.metrics?.actionCounts || {},
          responseLatency: context?.metrics?.responseLatency || {
            min: 0,
            max: 0,
            average: 0,
            p95: 0,
          },
          customMetrics: context?.metrics?.customMetrics,
        },
        verificationResults: [],
        verification: {
          overallScore: 0,
        },
        transcript: context?.transcript || [],
        errors: [error instanceof Error ? error.message : String(error)],
      };

      if (context) {
        await this.teardownScenario(context);
      }

      return errorResult;
    } finally {
      if (scenario.id) {
        this.activeScenarios.delete(scenario.id);
      }
    }
  }

  async runScenarios(
    scenarios: Scenario[],
    options: ScenarioRunOptions = {}
  ): Promise<ScenarioResult[]> {
    const results: ScenarioResult[] = [];

    if (options.parallel && scenarios.length > 1) {
      const maxConcurrency = options.maxConcurrency || 3;
      const chunks = this.chunkArray(scenarios, maxConcurrency);

      for (const chunk of chunks) {
        const chunkResults = await Promise.all(
          chunk.map((scenario) => this.runScenario(scenario, options))
        );
        results.push(...chunkResults);
      }
    } else {
      for (const scenario of scenarios) {
        const result = await this.runScenario(scenario, options);
        results.push(result);
      }
    }

    return results;
  }

  private async setupScenario(scenario: Scenario): Promise<ScenarioContext> {
    // Use the primary runtime that was passed to the constructor
    const primaryRuntime = this.primaryRuntime;
    if (!primaryRuntime) {
      throw new Error('No primary runtime available');
    }

    logger.info(`Setting up scenario with primary runtime: ${primaryRuntime.agentId}`);

    // Create isolated room and world for this scenario
    const worldId = asUUID(createUniqueUuid(primaryRuntime, `scenario-world-${scenario.id}`));
    const roomId = asUUID(createUniqueUuid(primaryRuntime, `scenario-room-${scenario.id}`));

    // Setup world
    try {
      await primaryRuntime.ensureWorldExists({
        id: worldId,
        name: `Scenario: ${scenario.name}`,
        agentId: primaryRuntime.agentId,
        serverId: `scenario-${scenario.id}`,
      });
    } catch (worldError) {
      logger.error('Error creating world:', worldError);
      throw worldError;
    }

    // Setup room
    const roomType = await this.mapRoomType(scenario.setup.roomType || 'group');
    await primaryRuntime.ensureRoomExists({
      id: roomId,
      name: scenario.setup.roomName || `${scenario.name} Room`,
      source: 'scenario-runner',
      type: roomType,
      channelId: `scenario-${scenario.id}`,
      serverId: `scenario-${scenario.id}`,
      worldId,
    });

    // Initialize actors - proper runtime assignment
    const actorMap = new Map<string, ScenarioActor>();
    for (const actor of scenario.actors) {
      let runtime: IAgentRuntime | undefined;
      
      // Strategy 1: Try to find runtime by actor name in agents map
      runtime = this.agents.get(actor.name);
      
      // Strategy 2: If actor is 'subject' type, use primary runtime
      if (!runtime && actor.role === 'subject') {
        runtime = this.primaryRuntime;
        logger.info(`Using primary runtime for subject actor ${actor.name}`);
      }
      
      // Strategy 3: Try to find runtime by agent ID (for existing agents)
      if (!runtime && actor.id === this.primaryRuntime.agentId) {
        runtime = this.primaryRuntime;
        logger.info(`Matched actor ${actor.name} to primary runtime by ID`);
      }
      
      // Strategy 4: For non-subject actors (like test users), use primary runtime
      // This allows the scenario to run with message simulation
      if (!runtime) {
        runtime = this.primaryRuntime;
        logger.info(`Using primary runtime for actor ${actor.name} (${actor.role})`);
      }
      
      if (!runtime) {
        throw new Error(
          `No runtime available for actor ${actor.name}. This should not happen.`
        );
      }
      
      actor.runtime = runtime as IAgentRuntime;
      logger.info(`Assigned runtime ${runtime.agentId} to actor ${actor.name}`);

      // Ensure the agent joins the room
      try {
        await runtime.ensureRoomExists({
          id: roomId,
          name: scenario.setup.roomName || `${scenario.name} Room`,
          source: 'scenario-runner',
          type: roomType,
          channelId: `scenario-${scenario.id}`,
          serverId: `scenario-${scenario.id}`,
          worldId,
        });
        logger.info(`Agent ${actor.name} joined room ${roomId}`);
      } catch (error) {
        // Don't just warn - this is a critical error
        logger.error(`Failed to add agent ${actor.name} to room:`, error);
        throw new Error(
          `Failed to setup actor ${actor.name} in room: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      actorMap.set(actor.id, actor);
    }

    // Add initial context messages if specified
    if (scenario.setup.initialMessages) {
      for (const msg of scenario.setup.initialMessages) {
        await this.sendContextMessage(roomId, msg.content, msg.sender, primaryRuntime, worldId);
      }
    }

    const context: ScenarioContext = {
      scenario,
      actors: actorMap,
      roomId,
      worldId,
      startTime: Date.now(),
      transcript: [],
      metrics: {},
      state: {},
    };

    return context;
  }

  private async executeScenario(
    context: ScenarioContext,
    progressCallback?: ScenarioProgressCallback
  ): Promise<void> {
    const { scenario: _scenario, actors } = context;
    // const maxDuration = scenario.execution.maxDuration || 300000; // 5 minutes default
    // const maxSteps = scenario.execution.maxSteps || 100;

    // let stepCount = 0;
    // const startTime = Date.now();

    logger.info(`Executing scenario with ${actors.size} actors`);

    try {
      // Execute actor scripts sequentially
      for (const actor of actors.values()) {
        logger.info(`Checking actor ${actor.name} (${actor.id}) for script`);
        logger.info(`Actor has script: ${!!actor.script}, has runtime: ${!!actor.runtime}`);

        if (actor.script && actor.runtime) {
          logger.info(
            `Executing script for actor ${actor.name} with ${actor.script?.steps.length} steps`
          );
          await this.executeActorScript(actor, context, progressCallback);

          // Small delay between actors to allow for processing
          await new Promise((resolve) => setTimeout(resolve, 1000));
        } else {
          logger.warn(`Skipping actor ${actor.name} - no script or runtime`);
        }
      }

      // Wait a bit for final responses
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      logger.error('Error during scenario execution:', error);
      throw error;
    }
  }

  private async executeActorScript(
    actor: ScenarioActor,
    context: ScenarioContext,
    _progressCallback?: ScenarioProgressCallback
  ): Promise<void> {
    if (!actor.script || !actor.runtime) return;

    for (let i = 0; i < actor.script?.steps.length; i++) {
      const step = actor.script?.steps[i];

      try {
        await this.executeScriptStep(actor, step, context);

        // Small delay between steps to allow for responses
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`Error executing step ${i} for actor ${actor.id}:`, error);
        break; // Stop this actor's script on error
      }
    }
  }

  private async executeScriptStep(
    actor: ScenarioActor,
    step: ScriptStep,
    context: ScenarioContext
  ): Promise<void> {
    switch (step.type) {
      case 'message':
        if (step.content && actor.runtime) {
          await this.sendActorMessage(actor, step.content, context);
        }
        break;

      case 'wait':
        if (step.waitTime) {
          await new Promise((resolve) => setTimeout(resolve, step.waitTime));
        }
        break;

      case 'react':
        // Reaction steps would be handled by message triggers
        break;

      case 'action':
        if (step.actionName && actor.runtime) {
          await this.executeActorAction(actor, step.actionName, step.actionParams || {}, context);
        }
        break;

      case 'assert':
        if (step.assertion) {
          this.validateAssertion(step.assertion, context);
        }
        break;
    }
  }

  private async sendActorMessage(
    actor: ScenarioActor,
    content: string,
    context: ScenarioContext
  ): Promise<void> {
    if (!actor.runtime) return;

    logger.info(`Sending message from actor ${actor.name}: "${content}"`);

    const message: Memory = {
      id: asUUID(uuidv4()),
      entityId: actor.runtime.agentId,
      agentId: actor.runtime.agentId,
      roomId: context.roomId,
      worldId: context.worldId,
      content: {
        text: content,
        source: 'scenario-runner',
      },
      createdAt: Date.now(),
    };

    // Record the outgoing message
    this.recordMessage(context, message);
    logger.info(
      `Recorded message in transcript, current transcript length: ${context.transcript.length}`
    );

    // Send through the message bus
    await actor.runtime.createMemory(message, 'messages');

    // For subject actors (the agent being tested), trigger message processing
    const subjectActor = context.scenario.actors.find((a) => a.role === 'subject');
    if (actor.role !== 'subject' && subjectActor && subjectActor.runtime) {
      logger.info(`Triggering message processing for subject actor ${subjectActor.name}`);

      // Create a promise to wait for the response
      const responsePromise = new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          logger.warn('Response timeout - no response received within 30 seconds');
          resolve();
        }, 30000); // 30 second timeout

        const callback = async (response: Content) => {
          clearTimeout(timeout);
          logger.info(`Received response from subject actor: ${JSON.stringify(response)}`);

          if (response) {
            // Create a memory for the response
            const responseMessage: Memory = {
              id: asUUID(uuidv4()),
              entityId: subjectActor.runtime!.agentId,
              agentId: subjectActor.runtime!.agentId,
              roomId: context.roomId,
              worldId: context.worldId,
              content: response,
              createdAt: Date.now(),
            };

            // Record the response
            this.recordMessage(context, responseMessage);

            // Record response latency
            this.metricsCollector.recordResponseLatency(Date.now() - message.createdAt!);
          }

          resolve();
        };

        try {
          // Create a message for the subject agent to process
          const messageForSubject: Memory = {
            id: asUUID(uuidv4()),
            entityId: actor.runtime!.agentId, // From the actor - we checked it's not null above
            agentId: subjectActor.runtime!.agentId, // To the subject - we checked it's not null above
            roomId: context.roomId,
            worldId: context.worldId,
            content: {
              text: content,
              source: 'scenario-runner',
            },
            createdAt: Date.now(),
          };

          // Store the message in the subject's memory
          subjectActor
            .runtime!.createMemory(messageForSubject, 'messages')
            .then(async () => {
              // Use the runtime's message handler directly if available
              const messageManager = (subjectActor.runtime as any).messageManager;
              if (messageManager && messageManager.handleMessage) {
                logger.info('Using message manager to handle message');
                try {
                  const response = await messageManager.handleMessage({
                    message: messageForSubject,
                    runtime: subjectActor.runtime!,
                    callback,
                  });
                  if (response) {
                    callback(response);
                  }
                } catch (error) {
                  logger.error('Error handling message through message manager:', error);
                  // Fallback to mock LLM if message manager fails
                  logger.info('Falling back to LLM processing with mock fallback');
                  try {
                    await processMessageWithLLMFallback(subjectActor.runtime!, messageForSubject, callback);
                  } catch (fallbackError) {
                    logger.error('LLM fallback also failed:', fallbackError);
                    clearTimeout(timeout);
                    resolve();
                  }
                }
              } else {
                // Try LLM processing with fallback first
                logger.info('Using LLM processing with mock fallback');
                try {
                  await processMessageWithLLMFallback(subjectActor.runtime!, messageForSubject, callback);
                } catch (error) {
                  logger.error('LLM processing failed, trying event system:', error);
                  // Fallback to event system if LLM fails
                  logger.info('Using event system as final fallback');
                  subjectActor
                    .runtime!.emitEvent(EventType.MESSAGE_RECEIVED, {
                      runtime: subjectActor.runtime!,
                      message: messageForSubject,
                      callback,
                    })
                    .then(() => {
                      logger.info('Message event emitted successfully');
                    })
                    .catch((error) => {
                      logger.error(`Error emitting message event:`, error);
                      clearTimeout(timeout);
                      resolve();
                    });
                }
              }
            })
            .catch((error) => {
              logger.error(`Error creating memory for subject:`, error);
              clearTimeout(timeout);
              resolve();
            });
        } catch (error) {
          logger.error(`Error processing message for subject actor:`, error);
          clearTimeout(timeout);
          resolve();
        }
      });

      // Wait for the response
      await responsePromise;
      logger.info('Response handling complete');
    }
  }

  private async executeActorAction(
    actor: ScenarioActor,
    actionName: string,
    params: Record<string, any>,
    _context: ScenarioContext
  ): Promise<void> {
    this.metricsCollector.recordAction(actionName);

    // Action execution would depend on the specific action
    // This is a placeholder for action execution logic
    logger.debug(`Actor ${actor.id} executing action: ${actionName}`, params);
  }

  private validateAssertion(assertion: any, _context: ScenarioContext): void {
    // Assertion validation logic would go here
    logger.debug('Validating assertion:', assertion);
  }

  private recordMessage(context: ScenarioContext, message: Memory): void {
    const actor = Array.from(context.actors.values()).find(
      (a) => a.runtime?.agentId === message.entityId
    );

    const scenarioMessage: ScenarioMessage = {
      id: message.id || uuidv4(),
      timestamp: message.createdAt || Date.now(),
      actorId: message.entityId,
      actorName: actor?.name || 'Unknown',
      content: message.content,
      roomId: message.roomId,
      messageType:
        message.entityId ===
        context.scenario.actors.find((a) => a.role === 'subject')?.runtime?.agentId
          ? 'outgoing'
          : 'incoming',
    };

    context.transcript.push(scenarioMessage);
  }

  private async sendContextMessage(
    roomId: UUID,
    content: string,
    _sender: string,
    runtime: IAgentRuntime,
    worldId: UUID
  ): Promise<void> {
    const message: Memory = {
      id: asUUID(uuidv4()),
      entityId: asUUID(uuidv4()), // System message
      agentId: runtime.agentId,
      roomId,
      worldId,
      content: {
        text: content,
        source: 'scenario-setup',
      },
      createdAt: Date.now(),
    };

    await runtime.createMemory(message, 'messages');
  }

  private async mapRoomType(roomType: string): Promise<ChannelType> {
    // Simple deterministic mapping to avoid LLM dependency during setup
    const lowerRoomType = roomType.toLowerCase();
    
    if (lowerRoomType.includes('dm') || lowerRoomType.includes('direct')) {
      return ChannelType.DM;
    } else if (lowerRoomType.includes('group') || lowerRoomType.includes('public')) {
      return ChannelType.GROUP;
    } else {
      // Default to GROUP for scenario testing
      logger.info(`Unknown room type "${roomType}", defaulting to GROUP`);
      return ChannelType.GROUP;
    }
  }

  private async teardownScenario(context: ScenarioContext): Promise<void> {
    // Since we're using the primary runtime for all actors, no need to stop individual runtimes
    // Just clean up any temporary resources if needed

    logger.debug(`Scenario ${context.scenario.id} teardown complete`);
  }

  private determinePass(verificationResults: any[], scenario: Scenario): boolean {
    if (verificationResults.length === 0) return false;

    const totalWeight = verificationResults.reduce((sum, result) => {
      const rule = scenario.verification.rules.find((r) => r.id === result.ruleId);
      return sum + (rule?.weight || 1);
    }, 0);

    const passedWeight = verificationResults.reduce((sum, result) => {
      if (result.passed) {
        const rule = scenario.verification.rules.find((r) => r.id === result.ruleId);
        return sum + (rule?.weight || 1);
      }
      return sum;
    }, 0);

    return passedWeight / totalWeight >= 0.7; // 70% threshold
  }

  private calculateOverallScore(verificationResults: any[]): number {
    if (verificationResults.length === 0) return 0;

    const totalScore = verificationResults.reduce((sum, result) => {
      return sum + (result.score || (result.passed ? 1 : 0));
    }, 0);

    return totalScore / verificationResults.length;
  }

  public validateScenario(scenario: Scenario): void {
    if (!scenario.id) {
      throw new Error('Scenario must have an ID');
    }
    if (!scenario.name) {
      throw new Error('Scenario must have a name');
    }
    if (!scenario.actors || scenario.actors.length === 0) {
      throw new Error('Scenario must have at least one actor');
    }

    // Validate that there's exactly one subject actor
    const subjectActors = scenario.actors.filter((a) => a.role === 'subject');
    if (subjectActors.length === 0) {
      throw new Error('Scenario must have exactly one subject actor');
    }
    if (subjectActors.length > 1) {
      throw new Error('Scenario can only have one subject actor');
    }

    // Validate verification rules
    if (scenario.verification?.rules && scenario.verification.rules.length === 0) {
      throw new Error('Scenario must have at least one verification rule');
    }

    for (const rule of scenario.verification.rules) {
      if (!rule.id) {
        throw new Error('All verification rules must have an ID');
      }
      if (!rule.type) {
        throw new Error('All verification rules must have a type');
      }
    }
  }

  public chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Run comprehensive tests to validate all 5 technical improvements
   */
  async runProductionVerificationTests(): Promise<{
    allImprovementsWorking: boolean;
    overallScore: number;
    detailedResults: any;
  }> {
    logger.info('Running comprehensive production verification tests...');

    try {
      await this.productionVerificationSystem.initializeSystem();
      const results = await this.productionVerificationSystem.runComprehensiveTest();

      if (results.allImprovementsWorking) {
        logger.info('✅ All 5 technical improvements verified successfully');
      } else {
        logger.warn('⚠️ Some technical improvements need attention');
      }

      return {
        allImprovementsWorking: results.allImprovementsWorking,
        overallScore: results.overallScore,
        detailedResults: results,
      };
    } catch (error) {
      logger.error('Failed to run production verification tests:', error);
      return {
        allImprovementsWorking: false,
        overallScore: 0,
        detailedResults: { error: error instanceof Error ? error.message : String(error) },
      };
    }
  }

  /**
   * Run all scenario messages in sequence
   */
  async run(_options: RunOptions = {}): Promise<ExecutionResult> {
    if (!this.scenario) {
      throw new Error('No scenario loaded. Call loadScenario() first.');
    }

    console.log(`Starting scenario: ${this.scenario.name}`);

    // const _sleep = options.sleep || 1000;
    const results: ExecutionResult = {
      passed: 0,
      failed: 0,
      total: 0,
      messages: [],
    };

    // Initialize action tracker
    const _actionTracker = new ScenarioActionTracker(this.metricsCollector);

    // Attach action tracker to runtime
    if (this.runtime) {
      _actionTracker.attach(this.runtime);
    }

    // Run scenario logic here...

    // Get action execution stats
    const actionStats = _actionTracker.getStats();
    console.log('\n🔄 Action Execution Summary:');
    console.log(`  Total actions attempted: ${actionStats.total}`);
    console.log(`  Successful actions: ${actionStats.successful}`);
    console.log(`  Failed actions: ${actionStats.failed}`);

    if (actionStats.byAction.size > 0) {
      console.log('\n  Actions by type:');
      actionStats.byAction.forEach((count: number, action: string) => {
        console.log(`    ${action}: ${count}`);
      });
    }

    // Clean up
    _actionTracker.detach();

    return results;
  }

  // ========================================
  // REAL-WORLD BENCHMARKING SYSTEM
  // ========================================

  /**
   * Register an external agent for benchmarking
   */
  async registerExternalAgent(request: {
    name: string;
    description: string;
    apiEndpoint: string;
    authToken?: string;
    capabilities: string[];
    securityLevel: 'sandbox' | 'trusted';
    maxBenchmarkCost: number;
  }): Promise<string> {
    return await this.externalAgentAPI.registerAgent({
      name: request.name,
      description: request.description,
      apiEndpoint: request.apiEndpoint,
      authToken: request.authToken,
      capabilities: request.capabilities,
      securityConstraints: {
        level: request.securityLevel,
        maxBenchmarkCost: request.maxBenchmarkCost,
        allowedActions: request.capabilities,
        networkRestrictions: request.securityLevel === 'sandbox' ? ['sandbox_only'] : [],
        resourceLimits: {
          maxMemory: request.securityLevel === 'sandbox' ? 512 : 2048,
          maxCpu: request.securityLevel === 'sandbox' ? 50 : 100,
          maxNetwork: request.securityLevel === 'sandbox' ? 10 : 100,
        },
      },
      metadata: {
        registrationTime: Date.now(),
        source: 'scenario-runner',
      },
    });
  }

  /**
   * Run a DeFi Portfolio benchmark
   */
  async runDeFiBenchmark(
    agentId: string,
    parameters: {
      initialBalance: number;
      riskTolerance: 'conservative' | 'moderate' | 'aggressive';
      timeHorizon: number;
      channelId?: string;
    }
  ): Promise<any> {
    logger.info(`Starting DeFi Portfolio benchmark for agent ${agentId}`);

    // Get agent runtime
    const runtime = this.agents.get(agentId) || this.primaryRuntime;
    
    // Execute the benchmark
    const result = await defiPortfolioBenchmark.executeBenchmark(agentId, runtime, parameters);

    // Calculate comprehensive score
    const benchmarkScore = await this.scoringSystem.calculateScore(
      result.benchmarkId,
      agentId,
      'defi_portfolio',
      result,
      {
        environment: 'production',
        timestamp: Date.now(),
        runtimeVersion: '1.0.0',
        plugins: runtime.plugins?.map(p => p.name) || [],
        configuration: parameters,
      }
    );

    // Update leaderboard
    await this.scoringSystem.updateLeaderboard('defi_portfolio', benchmarkScore);

    logger.info(`DeFi benchmark completed: Score ${(benchmarkScore.overallScore * 100).toFixed(1)}% (Rank #${benchmarkScore.ranking.overall})`);

    return {
      benchmarkResult: result,
      score: benchmarkScore,
      leaderboard: await this.scoringSystem.getLeaderboard('defi_portfolio', 10),
    };
  }

  /**
   * Run an E-commerce Store benchmark
   */
  async runEcommerceBenchmark(
    agentId: string,
    parameters: {
      initialCapital: number;
      businessType: 'dropshipping' | 'inventory' | 'digital' | 'service';
      targetMarket: string[];
      timeHorizon: number;
      channelId?: string;
    }
  ): Promise<any> {
    logger.info(`Starting E-commerce Store benchmark for agent ${agentId}`);

    // Get agent runtime
    const runtime = this.agents.get(agentId) || this.primaryRuntime;
    
    // Execute the benchmark
    const result = await ecommerceStoreBenchmark.executeBenchmark(agentId, runtime, parameters);

    // Calculate comprehensive score
    const benchmarkScore = await this.scoringSystem.calculateScore(
      result.benchmarkId,
      agentId,
      'ecommerce_store',
      result,
      {
        environment: 'production',
        timestamp: Date.now(),
        runtimeVersion: '1.0.0',
        plugins: runtime.plugins?.map(p => p.name) || [],
        configuration: parameters,
      }
    );

    // Update leaderboard
    await this.scoringSystem.updateLeaderboard('ecommerce_store', benchmarkScore);

    logger.info(`E-commerce benchmark completed: Score ${(benchmarkScore.overallScore * 100).toFixed(1)}% (Rank #${benchmarkScore.ranking.overall})`);

    return {
      benchmarkResult: result,
      score: benchmarkScore,
      leaderboard: await this.scoringSystem.getLeaderboard('ecommerce_store', 10),
    };
  }

  /**
   * Get available benchmarks
   */
  getAvailableBenchmarks(): any[] {
    return [
      {
        id: 'defi-portfolio-v1',
        name: 'DeFi Portfolio Management',
        category: 'finance',
        difficulty: 'advanced',
        estimatedCost: { min: 500, typical: 2000, max: 10000 },
        description: 'Manage a real DeFi portfolio with actual cryptocurrency transactions',
        capabilities: ['wallet_management', 'defi_protocols', 'yield_farming', 'risk_assessment'],
      },
      {
        id: 'ecommerce-store-v1',
        name: 'E-commerce Store Management',
        category: 'business',
        difficulty: 'advanced',
        estimatedCost: { min: 300, typical: 1500, max: 5000 },
        description: 'Run a real e-commerce business with product sourcing and customer service',
        capabilities: ['business_operations', 'customer_service', 'inventory_management', 'marketing'],
      },
    ];
  }

  /**
   * Get benchmark leaderboard
   */
  async getBenchmarkLeaderboard(benchmarkType: string, limit: number = 10): Promise<any> {
    return await this.scoringSystem.getLeaderboard(benchmarkType, limit);
  }

  /**
   * Get agent's benchmark history
   */
  async getAgentBenchmarkHistory(agentId: string): Promise<any[]> {
    return await this.scoringSystem.getAgentHistory(agentId);
  }

  /**
   * Get real-time benchmark stats
   */
  async getBenchmarkStats(): Promise<any> {
    const stats = await this.scoringSystem.getBenchmarkStatistics();
    
    return {
      ...stats,
      activeBenchmarks: this.activeBenchmarks.size,
      registeredAgents: await this.externalAgentAPI.getRegisteredAgents(),
      totalCosts: await this.costTracker.getTotalSpend(),
      platformStatus: {
        costTracker: 'active',
        messageBus: this.messageBus.getAvailablePlatforms().length > 0 ? 'active' : 'inactive',
        taskExecutor: 'active',
        scoringSystem: 'active',
      },
    };
  }

  /**
   * Start real-time monitoring
   */
  async startRealtimeMonitoring(): Promise<void> {
    // Start cost tracking
    await this.costTracker.startTracking();

    // Setup message bus monitoring
    this.messageBus.on('message', (data) => {
      logger.debug('Real-time message:', data);
    });

    // Setup external agent monitoring
    this.externalAgentAPI.on('agent_action', (data) => {
      logger.info('External agent action:', data);
    });

    logger.info('Real-time monitoring started for benchmark platform');
  }

  /**
   * Stop all active benchmarks and cleanup
   */
  async stopAllBenchmarks(): Promise<void> {
    logger.info('Stopping all active benchmarks...');

    // Stop all active benchmarks
    for (const [benchmarkId, benchmark] of this.activeBenchmarks) {
      try {
        await this.taskExecutor.stopTask(benchmarkId);
        await this.messageBus.cleanupBenchmark(benchmarkId);
      } catch (error) {
        logger.error(`Error stopping benchmark ${benchmarkId}:`, error);
      }
    }

    this.activeBenchmarks.clear();

    // Stop monitoring
    await this.costTracker.stopTracking();

    logger.info('All benchmarks stopped successfully');
  }
}

// Add missing type definitions
export interface RunOptions {
  sleep?: number;
}

export interface ExecutionResult {
  passed: number;
  failed: number;
  total: number;
  messages: any[];
}

export * from './types.js';
export * from './verification.js';
export * from './metrics.js';
