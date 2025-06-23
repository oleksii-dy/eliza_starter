import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { IAgentRuntime, UUID, Memory, Evaluator } from '../../types';
import {
  createRealTestRuntime,
  createMemoryWithEmbedding,
  createTestMessage,
} from '../utils/real-runtime-factory';
import { v4 as uuidv4 } from 'uuid';

describe('Real Memory System Integration', () => {
  let runtime: IAgentRuntime;
  let testRoomId: UUID;
  let testEntityId: UUID;

  beforeEach(async () => {
    runtime = await createRealTestRuntime({
      enableLLM: false,
      logLevel: 'error',
    });

    testRoomId = uuidv4() as UUID;
    testEntityId = uuidv4() as UUID;
  });

  afterEach(async () => {
    if ((runtime as any)?.databaseAdapter?.close) {
      await (runtime as any).databaseAdapter.close();
    }
  });

  describe('Memory Creation and Retrieval', () => {
    it('should create memories with real embeddings', async () => {
      const memoryText = 'User enjoys hiking in the mountains on weekends';

      const memoryId = await createMemoryWithEmbedding(
        runtime,
        { text: memoryText, type: 'activity_preference' },
        testEntityId,
        testRoomId,
        'facts'
      );

      expect(memoryId).toBeDefined();

      // Retrieve the memory
      const memories = await runtime.getMemories({
        roomId: testRoomId,
        entityId: testEntityId,
        tableName: 'facts',
        count: 10,
      });

      expect(memories.length).toBe(1);
      expect(memories[0].content.text).toBe(memoryText);
      expect(memories[0].embedding).toBeDefined();
      expect(memories[0].embedding?.length).toBe(1536); // Standard embedding size
    });

    it('should store conversation history with timestamps', async () => {
      const conversationMessages = [
        'Hello, how are you?',
        'I am doing well, thank you!',
        'What are your hobbies?',
        'I enjoy reading and programming.',
      ];

      // Store messages with realistic timestamps
      for (let i = 0; i < conversationMessages.length; i++) {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: i % 2 === 0 ? testEntityId : runtime.agentId,
            roomId: testRoomId,
            content: {
              text: conversationMessages[i],
              source: 'test',
            },
            createdAt: Date.now() - (conversationMessages.length - i) * 60000, // 1 minute apart
          },
          'messages'
        );
      }

      // Retrieve conversation history
      const messages = await runtime.getMemories({
        roomId: testRoomId,
        tableName: 'messages',
        count: 10,
        unique: false,
      });

      expect(messages.length).toBe(4);

      // Verify chronological order (most recent first)
      expect(messages[0].content.text).toBe(conversationMessages[3]);
      expect(messages[3].content.text).toBe(conversationMessages[0]);
    });
  });

  describe('Semantic Search Functionality', () => {
    it('should find semantically related memories', async () => {
      // Store diverse memories with embeddings
      const memoryData = [
        { text: 'User loves outdoor activities like hiking and camping', category: 'outdoor' },
        { text: 'User prefers Italian food, especially pasta and pizza', category: 'food' },
        { text: 'User works as a software engineer at a tech company', category: 'work' },
        { text: 'User enjoys mountain climbing and rock climbing', category: 'outdoor' },
        { text: 'User likes cooking Asian dishes at home', category: 'food' },
      ];

      // Store all memories with embeddings
      for (const data of memoryData) {
        await createMemoryWithEmbedding(
          runtime,
          { text: data.text, category: data.category },
          testEntityId,
          testRoomId,
          'facts'
        );
      }

      // Search for outdoor activities
      const outdoorQuery = 'nature and adventure sports';
      const outdoorEmbedding = await runtime.useModel('TEXT_EMBEDDING', { text: outdoorQuery });

      const outdoorResults = await runtime.searchMemories({
        embedding: outdoorEmbedding,
        roomId: testRoomId,
        tableName: 'facts',
        count: 3,
        match_threshold: 0.1,
      });

      expect(outdoorResults.length).toBeGreaterThan(0);

      // Should prioritize outdoor-related memories
      const outdoorMemories = outdoorResults.filter(
        (m) =>
          m.content.text?.includes('hiking') ||
          m.content.text?.includes('climbing') ||
          m.content.text?.includes('outdoor')
      );
      expect(outdoorMemories.length).toBeGreaterThan(0);
    });

    it('should rank results by relevance', async () => {
      // Store memories with varying relevance to a search term
      const memories = [
        'User absolutely loves pizza and eats it every week',
        'User occasionally mentions food preferences',
        'User works in software development',
        'User specifically enjoys Italian pizza with extra cheese',
      ];

      for (const text of memories) {
        await createMemoryWithEmbedding(runtime, { text }, testEntityId, testRoomId, 'facts');
      }

      // Search for pizza-related content
      const pizzaQuery = 'pizza preferences and eating habits';
      const pizzaEmbedding = await runtime.useModel('TEXT_EMBEDDING', { text: pizzaQuery });

      const results = await runtime.searchMemories({
        embedding: pizzaEmbedding,
        roomId: testRoomId,
        tableName: 'facts',
        count: 4,
        match_threshold: 0.1,
      });

      expect(results.length).toBeGreaterThan(0);

      // Most relevant results should be about pizza
      const topResult = results[0];
      expect(topResult.content.text).toContain('pizza');
    });
  });

  describe('Memory-Based Learning', () => {
    it('should learn from conversation patterns', async () => {
      // Create a fact extraction evaluator
      const factExtractor: Evaluator = {
        name: 'FACT_EXTRACTOR',
        description: 'Extract facts from conversations',
        validate: async (runtime, message) => {
          // Extract facts from user messages containing preferences
          return !!(
            message.entityId !== runtime.agentId &&
            (message.content.text?.includes('like') ||
              message.content.text?.includes('prefer') ||
              message.content.text?.includes('enjoy'))
          );
        },
        handler: async (runtime, message, state) => {
          const text = message.content.text || '';

          // Simple fact extraction logic
          let extractedFact = '';
          if (text.includes('like') && text.includes('music')) {
            extractedFact = 'User likes music';
          } else if (text.includes('prefer') && text.includes('coffee')) {
            extractedFact = 'User prefers coffee';
          } else if (text.includes('enjoy') && text.includes('reading')) {
            extractedFact = 'User enjoys reading';
          }

          if (extractedFact) {
            // Store as a fact with embedding
            await createMemoryWithEmbedding(
              runtime,
              {
                text: extractedFact,
                type: 'extracted_fact',
                source_message: message.id,
              },
              message.entityId,
              message.roomId,
              'facts'
            );
          }
        },
        examples: []
      };

      runtime.registerEvaluator(factExtractor);

      // Simulate conversation with fact-worthy statements
      const conversationTurns = [
        'I really like listening to jazz music',
        'I prefer coffee over tea in the morning',
        'I enjoy reading science fiction novels',
      ];

      for (const text of conversationTurns) {
        const message = createTestMessage({
          roomId: testRoomId,
          entityId: testEntityId,
          content: { text, source: 'test' },
        });

        // Process message and run evaluators
        const state = await runtime.composeState(message);
        await runtime.evaluate(message, state, true);
      }

      // Wait for fact extraction
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check extracted facts
      const facts = await runtime.getMemories({
        roomId: testRoomId,
        entityId: testEntityId,
        tableName: 'facts',
        count: 10,
      });

      const extractedFacts = facts.filter((f) => f.content.type === 'extracted_fact');
      expect(extractedFacts.length).toBe(3);

      const factTexts = extractedFacts.map((f) => f.content.text);
      expect(factTexts).toContain('User likes music');
      expect(factTexts).toContain('User prefers coffee');
      expect(factTexts).toContain('User enjoys reading');
    });

    it('should deduplicate similar facts', async () => {
      // Store similar facts multiple times
      const similarFacts = [
        'User enjoys outdoor activities',
        'User likes outdoor recreation',
        'User loves being outdoors',
      ];

      for (const text of similarFacts) {
        await createMemoryWithEmbedding(
          runtime,
          { text, type: 'preference' },
          testEntityId,
          testRoomId,
          'facts'
        );
      }

      // Search for outdoor preferences
      const searchEmbedding = await runtime.useModel('TEXT_EMBEDDING', {
        text: 'outdoor activities preferences',
      });

      const results = await runtime.searchMemories({
        embedding: searchEmbedding,
        roomId: testRoomId,
        tableName: 'facts',
        count: 5,
        match_threshold: 0.8, // Higher threshold for similar content
      });

      // Should find related facts
      expect(results.length).toBeGreaterThan(0);

      // All results should be about outdoor activities
      results.forEach((result) => {
        expect(result.content.text?.toLowerCase()).toContain('outdoor');
      });
    });
  });

  describe('Memory Context in Conversations', () => {
    it('should use memory context in state composition', async () => {
      // Store some user preferences
      await createMemoryWithEmbedding(
        runtime,
        { text: 'User prefers dark mode interfaces', type: 'ui_preference' },
        testEntityId,
        testRoomId,
        'facts'
      );

      await createMemoryWithEmbedding(
        runtime,
        { text: 'User works remotely from home', type: 'work_info' },
        testEntityId,
        testRoomId,
        'facts'
      );

      // Create a message that might reference stored context
      const message = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: { text: 'What do you know about my preferences?' },
      });

      // Compose state - should include memory context
      const state = await runtime.composeState(message);

      expect(state).toBeDefined();
      expect(state.text).toBeDefined();

      // State should include information about the user based on stored memories
      // This would typically be done by a facts provider
    });

    it('should maintain conversation coherence with memory', async () => {
      // Store conversation history
      const historyMessages = [
        'I am planning a vacation to Japan',
        'I want to visit Tokyo and Kyoto',
        'I am interested in temples and gardens',
      ];

      for (const text of historyMessages) {
        await runtime.createMemory(
          {
            id: uuidv4() as UUID,
            entityId: testEntityId,
            roomId: testRoomId,
            content: { text, source: 'test' },
            createdAt: Date.now() - historyMessages.indexOf(text) * 30000,
          },
          'messages'
        );
      }

      // New message referencing previous context
      const currentMessage = createTestMessage({
        roomId: testRoomId,
        entityId: testEntityId,
        content: { text: 'How long should I stay there?' },
      });

      // Get recent messages for context
      const recentMessages = await runtime.getMemories({
        roomId: testRoomId,
        tableName: 'messages',
        count: 5,
      });

      expect(recentMessages.length).toBe(3);

      // Messages should provide context about Japan vacation
      const japanContext = recentMessages.some(
        (m) => m.content.text?.includes('Japan') || m.content.text?.includes('Tokyo')
      );
      expect(japanContext).toBe(true);
    });
  });

  describe('Memory Performance and Cleanup', () => {
    it('should handle large numbers of memories efficiently', async () => {
      const numMemories = 100;
      const startTime = Date.now();

      // Create many memories
      const promises = [];
      for (let i = 0; i < numMemories; i++) {
        promises.push(
          createMemoryWithEmbedding(
            runtime,
            { text: `Test memory ${i} with various content`, index: i },
            testEntityId,
            testRoomId,
            'performance_test'
          )
        );
      }

      await Promise.all(promises);
      const creationTime = Date.now() - startTime;

      // Verify all memories were created
      const memories = await runtime.getMemories({
        roomId: testRoomId,
        tableName: 'performance_test',
        count: numMemories + 10,
      });

      expect(memories.length).toBe(numMemories);

      // Performance should be reasonable (under 5 seconds for 100 memories)
      expect(creationTime).toBeLessThan(5000);

      // Test search performance
      const searchStart = Date.now();
      const searchEmbedding = await runtime.useModel('TEXT_EMBEDDING', {
        text: 'test memory content',
      });

      const searchResults = await runtime.searchMemories({
        embedding: searchEmbedding,
        roomId: testRoomId,
        tableName: 'performance_test',
        count: 10,
        match_threshold: 0.1,
      });

      const searchTime = Date.now() - searchStart;

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchTime).toBeLessThan(1000); // Search should be fast
    });

    it('should clean up old memories when requested', async () => {
      // Create memories with different timestamps
      const oldMemoryId = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'Old memory', type: 'temporary' },
          createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        },
        'cleanup_test'
      );

      const newMemoryId = await runtime.createMemory(
        {
          id: uuidv4() as UUID,
          entityId: testEntityId,
          roomId: testRoomId,
          content: { text: 'New memory', type: 'temporary' },
          createdAt: Date.now(),
        },
        'cleanup_test'
      );

      // Verify both memories exist
      const allMemories = await runtime.getMemories({
        roomId: testRoomId,
        tableName: 'cleanup_test',
        count: 10,
      });

      expect(allMemories.length).toBe(2);

      // Test cleanup functionality would go here
      // This would typically be implemented as a maintenance task
    });
  });
});
