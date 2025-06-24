import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import type { IAgentRuntime, Memory, UUID, Action } from '../../types';
import {
  createRealTestRuntime,
  createTestMessage,
  processMessageWithActions,
} from '../utils/real-runtime-factory';
import { v4 as uuidv4 } from 'uuid';

describe('Real Message Processing Integration', () => {
  let runtime: IAgentRuntime;
  let testRoomId: UUID;
  let testEntityId: UUID;

  beforeEach(async () => {
    // Create test actions for real integration testing
    const testActions: Action[] = [
      {
        name: 'STORE_PREFERENCE',
        description: 'Store user preference',
        validate: async (runtime, message) => {
          return !!(
            message.content.text?.includes('prefer') || message.content.text?.includes('favorite')
          );
        },
        handler: async (runtime, message, state, options, callback) => {
          const text = message.content.text || '';
          let preference = '';
          let key = '';

          if (text.includes('color')) {
            const colorMatch = text.match(/(?:color is|favorite color is) (\w+)/i);
            if (colorMatch) {
              preference = colorMatch[1];
              key = 'favorite_color';
            }
          }

          if (preference && key) {
            // Store as memory with embedding
            await runtime.createMemory(
              {
                id: uuidv4() as UUID,
                entityId: message.entityId,
                roomId: message.roomId,
                content: {
                  text: `User preference: ${key} = ${preference}`,
                  type: 'preference',
                  key,
                  value: preference,
                },
                createdAt: Date.now(),
              },
              'facts'
            );

            if (callback) {
              await callback({
                text: `I'll remember that your ${key.replace('_', ' ')} is ${preference}.`,
                actions: ['STORE_PREFERENCE'],
              });
            }

            return {
              values: { [key]: preference },
              data: { stored: true, key, value: preference },
              text: `Stored preference: ${key} = ${preference}`,
            };
          }

          return { text: 'No preference detected' };
        },
        similes: ['SAVE_PREFERENCE', 'REMEMBER_PREFERENCE'],
      },
      {
        name: 'RECALL_PREFERENCE',
        description: 'Recall stored user preference',
        validate: async (runtime, message) => {
          return !!(
            message.content.text?.includes('what') &&
            (message.content.text?.includes('color') || message.content.text?.includes('prefer'))
          );
        },
        handler: async (runtime, message, state, options, callback) => {
          // Search for preferences in memory
          const memories = await runtime.getMemories({
            roomId: message.roomId,
            entityId: message.entityId,
            tableName: 'facts',
            count: 10,
          });

          const preferences = memories.filter((m) => m.content.type === 'preference');

          if (preferences.length > 0) {
            const colorPref = preferences.find((p) => p.content.key === 'favorite_color');
            if (colorPref && callback) {
              await callback({
                text: `Your favorite color is ${colorPref.content.value}.`,
                actions: ['RECALL_PREFERENCE'],
              });

              return {
                values: { recalled_preference: colorPref.content.value },
                data: { found: true, preference: colorPref.content },
                text: `Recalled: favorite_color = ${colorPref.content.value}`,
              };
            }
          }

          if (callback) {
            await callback({
              text: "I don't have any preferences stored for you yet.",
              actions: ['RECALL_PREFERENCE'],
            });
          }

          return { text: 'No preferences found' };
        },
        similes: ['GET_PREFERENCE', 'WHAT_PREFERENCE'],
      },
    ];

    runtime = await createRealTestRuntime({
      enableLLM: false,
      enablePlanning: true,
      logLevel: 'error',
    });

    // Register test actions
    testActions.forEach((action) => runtime.registerAction(action));

    testRoomId = uuidv4() as UUID;
    testEntityId = uuidv4() as UUID;
  });

  afterEach(async () => {
    if ((runtime as any)?.databaseAdapter?.close) {
      await (runtime as any).databaseAdapter.close();
    }
  });

  describe('Full Message Pipeline', () => {
    it('should process message through complete pipeline with real components', async () => {
      // Debug runtime state
      console.log(
        '🔍 Runtime actions:',
        runtime.actions.map((a) => a.name)
      );
      console.log(
        '🔍 Runtime providers:',
        runtime.providers.map((p) => p.name)
      );

      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'My favorite color is blue',
          source: 'test',
        },
      });

      // Process message through full pipeline
      const responses: any[] = [];
      const callback = async (content: any) => {
        console.log('📝 Response received:', content);
        responses.push(content);
        return [];
      };

      // Process through complete pipeline
      const { responses: generatedResponses, actionResults } = await processMessageWithActions(
        runtime,
        message,
        callback
      );

      console.log('📊 Total responses:', responses.length);
      console.log('📊 Generated responses:', generatedResponses.length);
      console.log('📊 Action results:', actionResults.length);

      // Verify response was generated
      expect(generatedResponses.length).toBeGreaterThan(0);

      // Verify response contains content
      const response = generatedResponses[0];
      expect(response).toHaveProperty('content');
      expect(response.content).toHaveProperty('text');
      expect(typeof response.content.text).toBe('string');
    });

    it('should maintain conversation context across multiple messages', async () => {
      // First message: store preference
      const message1 = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'My favorite color is blue',
          source: 'test',
        },
      });

      // Process first message
      const { responses: responses1 } = await processMessageWithActions(
        runtime,
        message1,
        async (content) => {
          return [];
        }
      );

      // Wait for memory to be stored
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second message: recall preference
      const message2 = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'What is my favorite color?',
          source: 'test',
        },
      });

      // Process second message
      const { responses: responses2 } = await processMessageWithActions(
        runtime,
        message2,
        async (content) => {
          return [];
        }
      );

      // Verify context was maintained
      expect(responses1.length).toBeGreaterThan(0);
      expect(responses2.length).toBeGreaterThan(0);
      expect(responses1[0].content.text).toContain('remember');
      expect(responses2[0].content.text).toContain('blue');
    });

    it('should handle action failures gracefully in real pipeline', async () => {
      // Create action that always fails
      const failingAction: Action = {
        name: 'FAILING_ACTION',
        description: 'Action that always fails',
        validate: async () => true,
        handler: async () => {
          throw new Error('Intentional test failure');
        },
        similes: [],
      };

      runtime.registerAction(failingAction);

      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: {
          text: 'Test failing action',
          actions: ['FAILING_ACTION'], // Force this action
        },
      });

      let errorCaught = false;
      const responses: any[] = [];

      try {
        await runtime.processActions(message, [], undefined, async (content) => {
          responses.push(content);
          return [];
        });
      } catch (error) {
        errorCaught = true;
      }

      // Runtime should handle the error gracefully
      expect(errorCaught).toBe(false);
    });
  });

  describe('Memory and State Integration', () => {
    it('should create and retrieve memories with real embeddings', async () => {
      const memoryText = 'User loves outdoor activities and hiking';

      // Create memory with embedding
      const memoryId = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId: testEntityId,
          roomId: testRoomId,
          content: {
            text: memoryText,
            type: 'preference',
          },
          embedding: await runtime.useModel('TEXT_EMBEDDING', { text: memoryText }),
          createdAt: Date.now(),
        },
        'facts'
      );

      expect(memoryId).toBeDefined();

      // Retrieve memories
      const memories = await runtime.getMemories({
        roomId: testRoomId,
        entityId: testEntityId,
        tableName: 'facts',
        count: 10,
      });

      expect(memories.length).toBeGreaterThan(0);
      const storedMemory = memories.find((m) => m.content.text === memoryText);
      expect(storedMemory).toBeDefined();
      expect(storedMemory?.embedding).toBeDefined();
    });

    it('should search memories by semantic similarity', async () => {
      // Store multiple memories with embeddings
      const memories = [
        'User enjoys hiking and mountain climbing',
        'User prefers Italian cuisine and pasta',
        'User works as a software engineer',
      ];

      for (const memoryText of memories) {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: testEntityId,
            roomId: testRoomId,
            content: { text: memoryText },
            embedding: await runtime.useModel('TEXT_EMBEDDING', { text: memoryText }),
            createdAt: Date.now(),
          },
          'facts'
        );
      }

      // Search for outdoor activities (should match hiking memory)
      const searchEmbedding = await runtime.useModel('TEXT_EMBEDDING', {
        text: 'outdoor sports and activities',
      });

      const searchResults = await runtime.searchMemories({
        embedding: searchEmbedding,
        roomId: testRoomId,
        tableName: 'facts',
        count: 3,
        match_threshold: 0.1,
      });

      expect(searchResults.length).toBeGreaterThan(0);
      // Should find memories, with hiking being most relevant
      const hikingMemory = searchResults.find((r) => r.content.text?.includes('hiking'));
      expect(hikingMemory).toBeDefined();
    });
  });

  describe('State Composition and Providers', () => {
    it('should compose state from real providers', async () => {
      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
      });

      // Compose state using real providers
      const state = await runtime.composeState(message);

      expect(state).toBeDefined();
      expect(state.values).toBeDefined();
      expect(state.data).toBeDefined();
      expect(state.text).toBeDefined();

      // Should include character information
      expect(state.text).toContain('TestAgent');
    });

    it('should include recent messages in state composition', async () => {
      // Create some message history
      const messages = ['Hello there!', 'How are you today?', 'I love programming'];

      for (const text of messages) {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: testEntityId,
            roomId: testRoomId,
            content: { text, source: 'test' },
            createdAt: Date.now() - messages.indexOf(text) * 1000,
          },
          'messages'
        );
      }

      const currentMessage = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: { text: 'What did we talk about?' },
      });

      const state = await runtime.composeState(currentMessage);

      // State should include recent message context
      expect(state.text).toContain('programming');
    });
  });

  describe('Evaluators Integration', () => {
    it('should run evaluators after message processing', async () => {
      const evaluationResults: any[] = [];

      // Create test evaluator
      const testEvaluator = {
        name: 'TEST_EVALUATOR',
        description: 'Test evaluator for integration testing',
        validate: async () => true,
        handler: async (runtime: any, message: any, state: any) => {
          evaluationResults.push({
            evaluator: 'TEST_EVALUATOR',
            messageText: message.content.text,
            timestamp: Date.now(),
          });
        },
        examples: [],
      };

      runtime.registerEvaluator(testEvaluator);

      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: { text: 'Test message for evaluation' },
      });

      // Process message and run evaluators
      await runtime.processActions(message, [], undefined, async () => []);
      const state = await runtime.composeState(message);
      await runtime.evaluate(message, state, true);

      // Verify evaluator ran
      expect(evaluationResults.length).toBeGreaterThan(0);
      expect(evaluationResults[0].messageText).toContain('Test message');
    });
  });
});
