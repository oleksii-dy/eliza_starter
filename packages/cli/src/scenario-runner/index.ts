import {
  type IAgentRuntime,
  type UUID,
  type Memory,
  type Content,
  type Character,
  EventType,
  createUniqueUuid,
  asUUID,
  ChannelType,
  Role,
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
import { MetricsCollector, BenchmarkAnalyzer } from './metrics.js';
import { v4 } from 'uuid';

export class ScenarioRunner {
  private server: AgentServer;
  private verifier: ScenarioVerifier;
  private metricsCollector: MetricsCollector;
  private benchmarkAnalyzer: BenchmarkAnalyzer;
  private activeScenarios = new Map<string, ScenarioContext>();

  constructor(server: AgentServer, primaryRuntime: IAgentRuntime) {
    this.server = server;
    this.verifier = new ScenarioVerifier(primaryRuntime);
    this.metricsCollector = new MetricsCollector();
    this.benchmarkAnalyzer = new BenchmarkAnalyzer();
  }

  async runScenario(
    scenario: Scenario,
    options: ScenarioRunOptions = {},
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

      const result: ScenarioResult = {
        scenarioId: scenario.id,
        name: scenario.name,
        startTime,
        endTime,
        duration,
        passed: this.determinePass(verificationResults, scenario),
        score: this.calculateOverallScore(verificationResults),
        metrics,
        verificationResults,
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
        metrics:
          context?.metrics || this.metricsCollector.collect(context || ({} as ScenarioContext)),
        verificationResults: [],
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
    // Get the primary runtime from the server's agents
    const primaryRuntime = Array.from(this.server.agents.values())[0];
    if (!primaryRuntime) {
      logger.error(`No agents in server. Server has ${this.server.agents.size} agents`);
      throw new Error('No primary runtime available in server');
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
    await primaryRuntime.ensureRoomExists({
      id: roomId,
      name: scenario.setup.roomName || `${scenario.name} Room`,
      source: 'scenario-runner',
      type: this.mapRoomType(scenario.setup.roomType || 'group'),
      channelId: `scenario-${scenario.id}`,
      serverId: `scenario-${scenario.id}`,
      worldId,
    });

    // Initialize actors - for simplicity, all actors use the primary runtime
    // In a full implementation, you'd create separate runtimes for different actors
    const actorMap = new Map<string, ScenarioActor>();
    for (const actor of scenario.actors) {
      // For now, all actors share the same runtime
      // This is sufficient for most testing scenarios
      actor.runtime = primaryRuntime as IAgentRuntime;
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
    const { scenario, actors } = context;
    // const maxDuration = scenario.execution.maxDuration || 300000; // 5 minutes default
    // const maxSteps = scenario.execution.maxSteps || 100;

    // let stepCount = 0;
    // const startTime = Date.now();

    try {
      // Execute actor scripts sequentially
      for (const actor of actors.values()) {
        if (actor.script && actor.runtime) {
          await this.executeActorScript(actor, context, progressCallback);

          // Small delay between actors to allow for processing
          await new Promise((resolve) => setTimeout(resolve, 1000));
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

    for (let i = 0; i < actor.script.steps.length; i++) {
      const step = actor.script.steps[i];

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

    const message: Memory = {
      id: asUUID(v4()),
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

    // Send through the message bus
    await actor.runtime.createMemory(message, 'messages');

    // For subject actors (the agent being tested), trigger message processing
    const subjectActor = context.scenario.actors.find((a) => a.role === 'subject');
    if (actor.role !== 'subject' && subjectActor && subjectActor.runtime) {
      try {
        // Emit the message received event to trigger agent processing
        const responses: Content[] = [];
        await subjectActor.runtime.emitEvent(EventType.MESSAGE_RECEIVED, {
          runtime: subjectActor.runtime,
          message,
          callback: async (response: Content) => {
            responses.push(response);

            // Create a memory for the response
            const responseMessage: Memory = {
              id: asUUID(v4()),
              entityId: subjectActor.runtime!.agentId,
              agentId: subjectActor.runtime!.agentId,
              roomId: context.roomId,
              worldId: context.worldId,
              content: response,
              createdAt: Date.now(),
            };

            // Record the response
            this.recordMessage(context, responseMessage);
            this.metricsCollector.recordResponseLatency(Date.now() - message.createdAt!);
          },
        });
      } catch (error) {
        logger.error(`Error processing message for subject actor:`, error);
      }
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
      id: message.id || v4(),
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async createActorRuntime(
    _actor: ScenarioActor,
    _worldId: UUID,
    _roomId: UUID
  ): Promise<IAgentRuntime> {
    // This would create a new runtime for the actor
    // For now, we'll use a simplified approach
    // In a full implementation, you'd create separate AgentRuntime instances
    throw new Error('Actor runtime creation not yet implemented');
  }

  private async sendContextMessage(
    roomId: UUID,
    content: string,
    _sender: string,
    runtime: IAgentRuntime,
    worldId: UUID
  ): Promise<void> {
    const message: Memory = {
      id: asUUID(v4()),
      entityId: asUUID(v4()), // System message
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

  private mapRoomType(roomType: string): ChannelType {
    switch (roomType) {
      case 'dm':
        return ChannelType.DM;
      case 'public':
        return ChannelType.GROUP;
      case 'group':
      default:
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

  private validateScenario(scenario: Scenario): void {
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
    if (!scenario.verification.rules || scenario.verification.rules.length === 0) {
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

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

export * from './types.js';
export * from './verification.js';
export * from './metrics.js';
