import { Service, type IAgentRuntime, type Memory, UUID, asUUID } from '@elizaos/core';

export class AutonomousLoopService extends Service {
  static serviceType = 'autonomous-loop';
  static serviceName = 'autonomous-loop';

  runtime: IAgentRuntime;
  private isRunning = false;
  private loopInterval?: NodeJS.Timeout;
  private intervalMs: number;
  private roomId?: UUID;

  constructor(runtime: IAgentRuntime) {
    super();
    this.runtime = runtime;
    this.intervalMs = parseInt(process.env.AUTONOMOUS_LOOP_INTERVAL || '30000', 10); // 30 seconds default
  }

  static async start(runtime: IAgentRuntime): Promise<AutonomousLoopService> {
    const service = new AutonomousLoopService(runtime);
    await service.initialize();
    return service;
  }

  async initialize(): Promise<void> {
    // Use the agent ID as the room ID for autonomous operations
    // This ensures we have a valid UUID and keeps autonomous messages separate
    this.roomId = this.runtime.agentId;

    // Check if loop should auto-start
    const autoStart = this.runtime.getSetting('AUTONOMOUS_AUTO_START');
    if (autoStart === true || autoStart === 'true') {
      await this.startLoop();
    }
  }

  async startLoop(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log(`[AutonomousLoop] Starting autonomous loop for agent ${this.runtime.agentId}`);

    // Start the loop immediately, then set interval
    await this.executeLoop();

    this.loopInterval = setInterval(async () => {
      if (this.isRunning) {
        await this.executeLoop();
      }
    }, this.intervalMs);
  }

  async stopLoop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = undefined;
    }

    console.log(`[AutonomousLoop] Stopped autonomous loop for agent ${this.runtime.agentId}`);
  }

  async executeLoop(): Promise<void> {
    try {
      if (!this.roomId) {
        console.error('[AutonomousLoop] No room ID available for autonomous operation');
        return;
      }

      // Create a self-message to trigger the agent's autonomous thinking
      const autonomousMessage: Memory = {
        id: asUUID(`loop-${Date.now()}-${Math.random()}`),
        entityId: this.runtime.agentId,
        roomId: this.roomId,
        content: {
          text: 'What should I do next? Think about your goals and take appropriate actions.',
          thought: 'Autonomous loop iteration - time to think and act',
        },
      };

      // Process the message through the normal runtime flow
      // This will trigger providers, actions, and evaluators naturally
      await this.runtime.processMessage(autonomousMessage);

    } catch (error) {
      console.error('[AutonomousLoop] Error in loop execution:', error);
      // Don't stop the loop on individual errors, just log and continue
    }
  }

  isLoopRunning(): boolean {
    return this.isRunning;
  }

  getLoopInterval(): number {
    return this.intervalMs;
  }

  setLoopInterval(ms: number): void {
    this.intervalMs = ms;

    // Restart the loop with new interval if it's currently running
    if (this.isRunning) {
      this.stopLoop();
      this.startLoop();
    }
  }

  async stop(): Promise<void> {
    await this.stopLoop();
  }

  get capabilityDescription(): string {
    return 'Provides autonomous loop functionality that continuously triggers agent thinking and actions';
  }
}
