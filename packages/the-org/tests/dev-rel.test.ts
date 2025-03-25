import { beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { type IAgentRuntime, type UUID } from '@elizaos/core';
import devRel from '../src/devRel';
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

describe('Developer Relations (DevRel) Scenario Tests', () => {
  let runtime: IAgentRuntime;
  let testScenario: TestScenario;

  beforeEach(async () => {
    clearAllMocks();

    // Initialize runtime with character
    runtime = createTestRuntime(devRel.character);
    await (runtime as any).initialize();

    // Setup test scenario
    testScenario = new TestScenario(runtime);
    await testScenario.setup();
  });

  describe('Developer Support Scenarios', () => {
    it('should provide API integration guidance', async () => {
      const response = await testScenario.runScenario(
        'New Developer',
        "I'm having trouble integrating the ElizaOS API with my Node.js application. Can you help me get started?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/api|integration|sdk/);
        expect(response.toLowerCase()).toMatch(/node\.js|javascript|code/);
        expect(response.toLowerCase()).toMatch(/documentation|guide|example/);
      }
    });

    it('should handle documentation questions', async () => {
      const response = await testScenario.runScenario(
        'Community Developer',
        'Where can I find documentation about creating custom plugins for ElizaOS?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/documentation|docs|guide/);
        expect(response.toLowerCase()).toMatch(/plugins|custom plugins|extensions/);
        expect(response.toLowerCase()).toMatch(/create|develop|build/);
      }
    });

    it('should address technical debugging questions', async () => {
      const response = await testScenario.runScenario(
        'Plugin Developer',
        "I'm getting an error when trying to register my custom action: 'Action validation failed'. What might be causing this?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/error|issue|debug/);
        expect(response.toLowerCase()).toMatch(/action|validation/);
        expect(response.toLowerCase()).toMatch(/check|verify|ensure/);
      }
    });

    it('should facilitate community contributions', async () => {
      const response = await testScenario.runScenario(
        'Open Source Contributor',
        "I'd like to contribute to the ElizaOS project. What areas would benefit most from community contributions right now?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/contribute|contribution|open source/);
        expect(response.toLowerCase()).toMatch(/project|areas|focus/);
        expect(response.toLowerCase()).toMatch(/community|developers|help/);
      }
    });

    it('should provide best practices advice', async () => {
      const response = await testScenario.runScenario(
        'Junior Developer',
        'What are some best practices for designing conversational agents with ElizaOS?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/best practices|guidelines|principles/);
        expect(response.toLowerCase()).toMatch(/design|conversation|agent/);
        expect(response.toLowerCase()).toMatch(/tips|approach|recommend/);
      }
    });

    it('should engage with feature requests', async () => {
      const response = await testScenario.runScenario(
        'Power User',
        'Would it be possible to add support for custom embeddings models in a future release?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/feature|request|support/);
        expect(response.toLowerCase()).toMatch(/custom|embeddings|models/);
        expect(response.toLowerCase()).toMatch(/roadmap|future|feedback/);
      }
    });
  });
});
