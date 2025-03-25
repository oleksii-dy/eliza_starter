import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { ScenarioService, type IAgentRuntime, type UUID } from '@elizaos/core';
import { character } from '../src/communityManager';
import { createTestRuntime, clearAllMocks } from './setup';

describe('Community Manager (Eliza) Scenario Tests', () => {
  let runtime: IAgentRuntime;
  let scenarioService: ScenarioService;
  let worldId: UUID;
  let roomId: UUID;
  let testUserId: UUID;

  beforeEach(async () => {
    clearAllMocks();

    // Initialize runtime and scenario service
    runtime = createTestRuntime(character);
    await runtime.initialize();

    // Create scenario service
    scenarioService = new ScenarioService(runtime);
    runtime.registerService('scenario', scenarioService);

    // Setup test environment
    worldId = await scenarioService.createWorld('Test Community', 'Test Owner');
    roomId = await scenarioService.createRoom(worldId, 'general');
    testUserId = uuidv4() as UUID;

    // Add participants
    await scenarioService.addParticipant(worldId, roomId, runtime.agentId);
    await scenarioService.addParticipant(worldId, roomId, testUserId);
  });

  afterEach(async () => {
    await scenarioService.cleanup();
  });

  describe('Community Management Scenarios', () => {
    it('should handle new user onboarding', async () => {
      // Create a runtime for the test user
      const testUser = {
        agentId: testUserId,
        character: { name: 'New User' },
      } as IAgentRuntime;

      // User sends initial message
      await scenarioService.sendMessage(
        testUser,
        worldId,
        roomId,
        "Hi everyone! I'm new here and just joined the community. What should I do first?"
      );

      // Wait for processing and response
      const completed = await scenarioService.waitForCompletion(5000);
      expect(completed).toBe(true);

      // Validate response using the message handler and memory
      const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
      expect(memories.length).toBeGreaterThan(0);

      const latestMessage = memories[memories.length - 1];
      expect(latestMessage.content.text).toBeDefined();
      expect(latestMessage.content.text.toLowerCase()).toContain('welcome');
      expect(latestMessage.content.text.toLowerCase()).toContain('community');
    });

    it('should respond to moderation requests', async () => {
      // Create a runtime for the test user
      const testUser = {
        agentId: testUserId,
        character: { name: 'Moderator' },
      } as IAgentRuntime;

      // User reports problematic behavior
      await scenarioService.sendMessage(
        testUser,
        worldId,
        roomId,
        'This user keeps derailing technical discussions with personal problems.'
      );

      // Wait for processing and response
      const completed = await scenarioService.waitForCompletion(5000);
      expect(completed).toBe(true);

      // Validate response
      const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
      const latestMessage = memories[memories.length - 1];
      expect(latestMessage.content.text).toBeDefined();
      expect(latestMessage.content.text).toContain('DM');
    });

    it('should handle channel toxicity reports', async () => {
      // Create a runtime for the test user
      const testUser = {
        agentId: testUserId,
        character: { name: 'Community Member' },
      } as IAgentRuntime;

      // User reports channel toxicity
      await scenarioService.sendMessage(
        testUser,
        worldId,
        roomId,
        'The #dev channel is getting really toxic lately.'
      );

      // Wait for processing and response
      const completed = await scenarioService.waitForCompletion(5000);
      expect(completed).toBe(true);

      // Validate response
      const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
      const latestMessage = memories[memories.length - 1];
      expect(latestMessage.content.text).toBeDefined();
      expect(latestMessage.content.text).toContain('watching');
      expect(latestMessage.content.text).toContain('DM');
    });

    it('should respond to moderator burnout', async () => {
      // Create a runtime for the test user
      const testUser = {
        agentId: testUserId,
        character: { name: 'Tired Moderator' },
      } as IAgentRuntime;

      // Moderator expresses burnout
      await scenarioService.sendMessage(
        testUser,
        worldId,
        roomId,
        "I can't handle being a mod anymore. It's affecting my mental health."
      );

      // Wait for processing and response
      const completed = await scenarioService.waitForCompletion(5000);
      expect(completed).toBe(true);

      // Validate response
      const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
      const latestMessage = memories[memories.length - 1];
      expect(latestMessage.content.text).toBeDefined();
      expect(latestMessage.content.text).toContain('first');
      expect(latestMessage.content.text).toContain('break');
    });

    it('should provide guidance for dealing with drama', async () => {
      // Create a runtime for the test user
      const testUser = {
        agentId: testUserId,
        character: { name: 'Community Admin' },
      } as IAgentRuntime;

      // Admin asks about banning
      await scenarioService.sendMessage(
        testUser,
        worldId,
        roomId,
        "Should we ban this person? They're not breaking rules but creating drama."
      );

      // Wait for processing and response
      const completed = await scenarioService.waitForCompletion(5000);
      expect(completed).toBe(true);

      // Validate response
      const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
      const latestMessage = memories[memories.length - 1];
      expect(latestMessage.content.text).toBeDefined();
      expect(latestMessage.content.text).toContain('project');
      expect(latestMessage.content.text.toLowerCase()).toContain('bored');
    });

    it('should appropriately ignore non-community messages', async () => {
      // Create a runtime for the test user
      const testUser = {
        agentId: testUserId,
        character: { name: 'Random User' },
      } as IAgentRuntime;

      // User sends off-topic message
      await scenarioService.sendMessage(
        testUser,
        worldId,
        roomId,
        'Hey everyone, check out my new social media growth strategy!'
      );

      // Wait for processing and response
      const completed = await scenarioService.waitForCompletion(5000);
      expect(completed).toBe(true);

      // Validate that there is no response (it should be ignored)
      const memories = await runtime.adapter.getMemories(runtime.agentId, roomId);
      // Expect only the original message, no response from Eliza
      expect(memories.filter((m) => m.entityId === runtime.agentId).length).toBe(0);
    });
  });
});
