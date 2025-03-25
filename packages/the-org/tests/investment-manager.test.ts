import { beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { type IAgentRuntime, type UUID } from '@elizaos/core';
import investmentManager from '../src/investmentManager';
import { createTestRuntime, clearAllMocks } from './setup';

// We're using a class-based approach to avoid import issues with ScenarioService
class TestScenario {
  private runtime: IAgentRuntime;
  private worldId: UUID;
  private roomId: UUID;
  private testUserId: UUID;

  constructor(runtime: IAgentRuntime) {
    this.runtime = runtime;
  }

  async setup() {
    // Create a test service on the runtime
    const scenarioService = {
      createWorld: async (name: string, owner: string) => {
        this.worldId = uuidv4() as UUID;
        return this.worldId;
      },
      createRoom: async (worldId: UUID, name: string) => {
        this.roomId = uuidv4() as UUID;
        return this.roomId;
      },
      addParticipant: async (worldId: UUID, roomId: UUID, entityId: UUID) => {
        return true;
      },
      sendMessage: async (sender: any, worldId: UUID, roomId: UUID, text: string) => {
        // Simulate message processing
        const message = {
          entityId: sender.agentId,
          roomId: this.roomId,
          content: {
            text,
            source: 'test',
            name: sender.character?.name || 'Test User',
          },
        };

        // Process the message if sent from test user to agent
        if (sender.agentId === this.testUserId) {
          await (this.runtime as any).processMessage(message);
        }
      },
      waitForCompletion: async (timeout: number) => {
        // Simple implementation - just wait a bit
        await new Promise((resolve) => setTimeout(resolve, 500));
        return true;
      },
      cleanup: async () => {
        // Nothing to do in this mock
      },
    };

    (this.runtime as any).registerService('scenario', scenarioService);

    // Create test user ID
    this.testUserId = uuidv4() as UUID;
  }

  async runScenario(userName: string, message: string): Promise<string | undefined> {
    // Create a test user runtime
    const testUser = {
      agentId: this.testUserId,
      character: { name: userName },
    };

    // Send message
    await (this.runtime as any)
      .getService('scenario')
      .sendMessage(testUser, this.worldId, this.roomId, message);

    // Wait for processing
    await (this.runtime as any).getService('scenario').waitForCompletion(5000);

    // Get memories
    const memories = await (this.runtime as any).adapter.getMemories(
      this.runtime.agentId,
      this.roomId
    );

    if (memories.length > 0) {
      const latestMessage = memories[memories.length - 1];
      return latestMessage.content.text;
    }

    return undefined;
  }
}

describe('Investment Manager Scenario Tests', () => {
  let runtime: IAgentRuntime;
  let testScenario: TestScenario;

  beforeEach(async () => {
    clearAllMocks();

    // Initialize runtime with character
    runtime = createTestRuntime(investmentManager.character);
    await (runtime as any).initialize();

    // Setup test scenario
    testScenario = new TestScenario(runtime);
    await testScenario.setup();
  });

  describe('Investment Management Scenarios', () => {
    it('should analyze investment opportunities', async () => {
      const response = await testScenario.runScenario(
        'Startup Founder',
        "We're developing a new AI-powered healthcare platform. Would you be interested in investing?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/investment|opportunity|venture/);
        expect(response.toLowerCase()).toMatch(/analysis|evaluate|assess/);
        expect(response.toLowerCase()).toMatch(/information|details|criteria/);
      }
    });

    it('should perform portfolio risk assessment', async () => {
      const response = await testScenario.runScenario(
        'Portfolio Manager',
        'Given the current market volatility, should we rebalance our crypto investments?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/risk|volatility|exposure/);
        expect(response.toLowerCase()).toMatch(/portfolio|investment|asset/);
        expect(response.toLowerCase()).toMatch(/strategy|approach|rebalance/);
      }
    });

    it('should discuss market trends and analysis', async () => {
      const response = await testScenario.runScenario(
        'Analyst',
        "What's your take on the emerging AI infrastructure market? Is it worth investing in now?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/market|trend|sector/);
        expect(response.toLowerCase()).toMatch(/analysis|perspective|outlook/);
        expect(response.toLowerCase()).toMatch(/ai|infrastructure|technology/);
      }
    });

    it('should handle due diligence requests', async () => {
      const response = await testScenario.runScenario(
        'Investment Associate',
        'We need to conduct due diligence on a fintech startup. What metrics should we focus on?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/due diligence|assessment|evaluation/);
        expect(response.toLowerCase()).toMatch(/metrics|kpi|performance/);
        expect(response.toLowerCase()).toMatch(/fintech|startup|company/);
      }
    });

    it('should provide exit strategy advice', async () => {
      const response = await testScenario.runScenario(
        'Venture Partner',
        'One of our portfolio companies is considering an acquisition offer. How should we evaluate it?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/exit|acquisition|offer/);
        expect(response.toLowerCase()).toMatch(/evaluate|assess|consider/);
        expect(response.toLowerCase()).toMatch(/value|terms|strategic/);
      }
    });

    it('should address fundraising questions', async () => {
      const response = await testScenario.runScenario(
        'Entrepreneur',
        "We're preparing for our Series B round. What should our pitch deck focus on to attract investors?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/fundraising|series b|funding/);
        expect(response.toLowerCase()).toMatch(/pitch|deck|presentation/);
        expect(response.toLowerCase()).toMatch(/investor|attract|focus/);
      }
    });
  });
});
