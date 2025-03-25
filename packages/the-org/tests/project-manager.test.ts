import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { type IAgentRuntime, type UUID } from '@elizaos/core';
import projectManager from '../src/projectManager';
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

describe('Project Manager Scenario Tests', () => {
  let runtime: IAgentRuntime;
  let testScenario: TestScenario;

  beforeEach(async () => {
    clearAllMocks();

    // Initialize runtime with character
    runtime = createTestRuntime(projectManager.character);
    await (runtime as any).initialize();

    // Setup test scenario
    testScenario = new TestScenario(runtime);
    await testScenario.setup();
  });

  describe('Project Management Scenarios', () => {
    it('should provide project status updates', async () => {
      const response = await testScenario.runScenario(
        'Team Lead',
        "What's the current status of the mobile app project?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/status|progress|update/);
        expect(response.toLowerCase()).toMatch(/project|mobile app/);
        expect(response.toLowerCase()).toMatch(/timeline|milestone|deadline/);
      }
    });

    it('should handle task assignment requests', async () => {
      const response = await testScenario.runScenario(
        'Project Lead',
        'We need to assign the database migration tasks to the backend team. Can you coordinate that?'
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/assign|task|coordinate/);
        expect(response.toLowerCase()).toMatch(/backend|team/);
        expect(response.toLowerCase()).toMatch(/database|migration/);
      }
    });

    it('should facilitate sprint planning', async () => {
      const response = await testScenario.runScenario(
        'Scrum Master',
        "Let's plan our next sprint. What features should we prioritize for the next two weeks?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/sprint|plan|planning/);
        expect(response.toLowerCase()).toMatch(/prioritize|priority|feature/);
        expect(response.toLowerCase()).toMatch(/next|timeline|two weeks/);
      }
    });

    it('should handle resource allocation', async () => {
      const response = await testScenario.runScenario(
        'Product Owner',
        "We're short on frontend developers for the new UI implementation. How should we reallocate resources?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/resource|allocate|developer/);
        expect(response.toLowerCase()).toMatch(/frontend|ui/);
        expect(response.toLowerCase()).toMatch(/solution|approach|strategy/);
      }
    });

    it('should address timeline concerns', async () => {
      const response = await testScenario.runScenario(
        'Stakeholder',
        "I'm concerned about the project timeline. Are we going to meet the Q3 deadline?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/timeline|deadline|schedule/);
        expect(response.toLowerCase()).toMatch(/concern|risk|challenge/);
        expect(response.toLowerCase()).toMatch(/meet|q3|plan/);
      }
    });

    it('should handle dependency management', async () => {
      const response = await testScenario.runScenario(
        'Developer',
        "The API team is delayed, and that's blocking our frontend work. How should we proceed?"
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.toLowerCase()).toMatch(/dependency|blocking|delay/);
        expect(response.toLowerCase()).toMatch(/api|frontend/);
        expect(response.toLowerCase()).toMatch(/proceed|alternative|solution/);
      }
    });
  });
});
