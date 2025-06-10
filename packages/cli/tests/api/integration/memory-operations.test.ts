import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import type { UUID } from '@elizaos/core';
import {
  setupAPITestEnvironment,
  cleanupAPITestEnvironment,
  createTestAgent,
  startTestAgent,
  getAgentMemories,
  sendMessageToAgent,
  deleteTestAgent,
  apiAssertions,
  waitForCondition,
  type APITestContext,
} from '../api-test-utils';

describe('Memory Operations Integration Tests', () => {
  let context: APITestContext;
  let testAgentId: UUID;
  let createdAgentIds: UUID[] = [];

  beforeAll(async () => {
    context = await setupAPITestEnvironment();
    
    // Create and start a test agent for memory tests
    const { agentId } = await createTestAgent(context.httpClient, {
      name: 'MemoryTestAgent',
    });
    testAgentId = agentId;
    createdAgentIds.push(agentId);
    
    await startTestAgent(context.httpClient, testAgentId);
    
    // Wait for agent to be fully operational
    await waitForCondition(async () => {
      const statusResponse = await context.httpClient.get(`/agents/${testAgentId}`);
      return statusResponse.data.status === 'running' || statusResponse.data.running === true;
    }, 15000);
  }, 120000);

  afterAll(async () => {
    // Clean up created agents
    for (const agentId of createdAgentIds) {
      try {
        await deleteTestAgent(context.httpClient, agentId);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
    
    if (context) {
      await cleanupAPITestEnvironment(context);
    }
  });

  describe('Agent Memory Management', () => {
    it('should retrieve initial agent memories', async () => {
      const response = await getAgentMemories(context.httpClient, testAgentId);

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      // New agent might have no memories or some initialization memories
    });

    it('should create memories through message interaction', async () => {
      const testMessage = 'This is a test message that should create a memory';
      
      // Send a message to create memories
      await sendMessageToAgent(
        context.httpClient,
        testAgentId,
        testMessage,
        'memory-test-channel'
      );

      // Wait for memory to be created
      await new Promise(resolve => setTimeout(resolve, 2000));

      const response = await getAgentMemories(context.httpClient, testAgentId);
      
      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);

      // Check that our message created a memory
      const memories = response.data;
      const messageMemory = memories.find(m => 
        m.content?.text?.includes('test message') ||
        JSON.stringify(m).includes('test message')
      );
      expect(messageMemory).toBeDefined();
    });

    it('should create a specific memory directly', async () => {
      const memoryData = {
        type: 'knowledge',
        content: {
          text: 'Direct memory creation test',
          category: 'testing',
          importance: 'high',
        },
        metadata: {
          source: 'api_test',
          timestamp: Date.now(),
        },
      };

      const response = await context.httpClient.post(
        `/memory/agents/${testAgentId}`,
        memoryData
      );

      apiAssertions.isSuccessful(response);
      apiAssertions.hasDataStructure(response, ['id']);

      // Verify the memory was created
      const memoriesResponse = await getAgentMemories(context.httpClient, testAgentId);
      const memories = memoriesResponse.data;
      
      const createdMemory = memories.find(m => 
        m.content?.text === 'Direct memory creation test'
      );
      expect(createdMemory).toBeDefined();
    });

    it('should retrieve memories by type', async () => {
      // Create memories of different types
      const memoryTypes = ['message', 'knowledge', 'observation'];
      
      for (const type of memoryTypes) {
        await context.httpClient.post(`/memory/agents/${testAgentId}`, {
          type,
          content: {
            text: `Test ${type} memory`,
            category: 'testing',
          },
        });
      }

      // Wait for memories to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retrieve memories by type
      for (const type of memoryTypes) {
        const response = await getAgentMemories(context.httpClient, testAgentId, type);
        
        apiAssertions.hasStatus(response, 200);
        expect(Array.isArray(response.data)).toBe(true);
        
        // All returned memories should be of the requested type
        response.data.forEach(memory => {
          expect(memory.type).toBe(type);
        });
      }
    });

    it('should limit memory retrieval', async () => {
      const response = await getAgentMemories(context.httpClient, testAgentId, undefined, 5);
      
      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeLessThanOrEqual(5);
    });

    it('should update existing memory', async () => {
      // Create a memory first
      const createResponse = await context.httpClient.post(
        `/memory/agents/${testAgentId}`,
        {
          type: 'knowledge',
          content: {
            text: 'Original memory content',
            category: 'testing',
          },
        }
      );

      const memoryId = createResponse.data.id;
      expect(memoryId).toBeDefined();

      // Update the memory
      const updateData = {
        content: {
          text: 'Updated memory content',
          category: 'testing',
          updated: true,
        },
      };

      const updateResponse = await context.httpClient.put(
        `/memory/agents/${testAgentId}/${memoryId}`,
        updateData
      );

      apiAssertions.isSuccessful(updateResponse);

      // Verify the update
      const memoriesResponse = await getAgentMemories(context.httpClient, testAgentId);
      const updatedMemory = memoriesResponse.data.find(m => m.id === memoryId);
      
      expect(updatedMemory).toBeDefined();
      expect(updatedMemory.content.text).toBe('Updated memory content');
      expect(updatedMemory.content.updated).toBe(true);
    });

    it('should delete a memory', async () => {
      // Create a memory to delete
      const createResponse = await context.httpClient.post(
        `/memory/agents/${testAgentId}`,
        {
          type: 'temporary',
          content: {
            text: 'Memory to be deleted',
            category: 'testing',
          },
        }
      );

      const memoryId = createResponse.data.id;

      // Delete the memory
      const deleteResponse = await context.httpClient.delete(
        `/memory/agents/${testAgentId}/${memoryId}`
      );

      apiAssertions.isSuccessful(deleteResponse);

      // Verify deletion
      const memoriesResponse = await getAgentMemories(context.httpClient, testAgentId);
      const deletedMemory = memoriesResponse.data.find(m => m.id === memoryId);
      
      expect(deletedMemory).toBeUndefined();
    });
  });

  describe('Memory Search and Filtering', () => {
    beforeAll(async () => {
      // Create test memories with different characteristics
      const testMemories = [
        {
          type: 'knowledge',
          content: {
            text: 'JavaScript is a programming language',
            category: 'programming',
            tags: ['javascript', 'coding'],
          },
        },
        {
          type: 'knowledge',
          content: {
            text: 'Python is also a programming language',
            category: 'programming',
            tags: ['python', 'coding'],
          },
        },
        {
          type: 'observation',
          content: {
            text: 'User prefers concise responses',
            category: 'user_preference',
            tags: ['preference', 'style'],
          },
        },
      ];

      for (const memory of testMemories) {
        await context.httpClient.post(`/memory/agents/${testAgentId}`, memory);
      }

      // Wait for memories to be created
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    it('should search memories by text content', async () => {
      const response = await context.httpClient.get(
        `/memory/agents/${testAgentId}?search=programming language`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Should find memories containing "programming language"
      const matchingMemories = response.data.filter(m => 
        m.content?.text?.includes('programming language')
      );
      expect(matchingMemories.length).toBeGreaterThan(0);
    });

    it('should filter memories by category', async () => {
      const response = await context.httpClient.get(
        `/memory/agents/${testAgentId}?category=programming`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All returned memories should be in programming category
      response.data.forEach(memory => {
        expect(memory.content?.category).toBe('programming');
      });
    });

    it('should filter memories by tags', async () => {
      const response = await context.httpClient.get(
        `/memory/agents/${testAgentId}?tags=coding`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // All returned memories should have the 'coding' tag
      response.data.forEach(memory => {
        expect(memory.content?.tags).toContain('coding');
      });
    });

    it('should sort memories by relevance or date', async () => {
      const response = await context.httpClient.get(
        `/memory/agents/${testAgentId}?sort=createdAt&order=desc`
      );

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Verify sorting by checking timestamps
      if (response.data.length > 1) {
        for (let i = 0; i < response.data.length - 1; i++) {
          const current = new Date(response.data[i].createdAt || response.data[i].timestamp);
          const next = new Date(response.data[i + 1].createdAt || response.data[i + 1].timestamp);
          expect(current.getTime()).toBeGreaterThanOrEqual(next.getTime());
        }
      }
    });
  });

  describe('Group and Room Memory Management', () => {
    const testGroupId = 'test-memory-group';
    const testRoomId = 'test-memory-room';

    it('should create group memories', async () => {
      const groupMemoryData = {
        type: 'group_knowledge',
        content: {
          text: 'Shared group information',
          category: 'group_info',
        },
        groupId: testGroupId,
      };

      const response = await context.httpClient.post('/memory/groups', groupMemoryData);

      apiAssertions.isSuccessful(response);
      apiAssertions.hasDataStructure(response, ['id']);
    });

    it('should retrieve group memories', async () => {
      const response = await context.httpClient.get(`/memory/groups/${testGroupId}`);

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Should contain the group memory we created
      const groupMemory = response.data.find(m => 
        m.content?.text === 'Shared group information'
      );
      expect(groupMemory).toBeDefined();
    });

    it('should create room memories', async () => {
      const roomMemoryData = {
        type: 'room_state',
        content: {
          text: 'Room configuration data',
          category: 'room_info',
        },
        roomId: testRoomId,
      };

      const response = await context.httpClient.post('/memory/rooms', roomMemoryData);

      apiAssertions.isSuccessful(response);
      apiAssertions.hasDataStructure(response, ['id']);
    });

    it('should retrieve room memories', async () => {
      const response = await context.httpClient.get(`/memory/rooms/${testRoomId}`);

      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
      
      // Should contain the room memory we created
      const roomMemory = response.data.find(m => 
        m.content?.text === 'Room configuration data'
      );
      expect(roomMemory).toBeDefined();
    });
  });

  describe('Memory Persistence and Consistency', () => {
    it('should persist memories across agent restarts', async () => {
      // Create a specific memory
      const persistentMemoryData = {
        type: 'persistent_test',
        content: {
          text: 'This memory should persist across restarts',
          category: 'persistence_test',
          timestamp: Date.now(),
        },
      };

      const createResponse = await context.httpClient.post(
        `/memory/agents/${testAgentId}`,
        persistentMemoryData
      );

      const memoryId = createResponse.data.id;

      // Stop the agent
      await context.httpClient.post(`/agents/${testAgentId}/stop`);
      
      // Wait for agent to stop
      await waitForCondition(async () => {
        const statusResponse = await context.httpClient.get(`/agents/${testAgentId}`);
        return statusResponse.data.status === 'stopped' || statusResponse.data.running === false;
      }, 10000);

      // Restart the agent
      await context.httpClient.post(`/agents/${testAgentId}/start`);
      
      // Wait for agent to restart
      await waitForCondition(async () => {
        const statusResponse = await context.httpClient.get(`/agents/${testAgentId}`);
        return statusResponse.data.status === 'running' || statusResponse.data.running === true;
      }, 15000);

      // Check that the memory still exists
      const memoriesResponse = await getAgentMemories(context.httpClient, testAgentId);
      const persistentMemory = memoriesResponse.data.find(m => m.id === memoryId);
      
      expect(persistentMemory).toBeDefined();
      expect(persistentMemory.content.text).toBe('This memory should persist across restarts');
    });

    it('should maintain memory integrity with concurrent operations', async () => {
      // Create multiple memories concurrently
      const concurrentMemories = Array(5).fill(null).map((_, index) => ({
        type: 'concurrent_test',
        content: {
          text: `Concurrent memory ${index + 1}`,
          category: 'concurrency_test',
          index: index + 1,
        },
      }));

      const createPromises = concurrentMemories.map(memory => 
        context.httpClient.post(`/memory/agents/${testAgentId}`, memory)
      );

      const responses = await Promise.all(createPromises);
      
      // All should succeed
      responses.forEach(response => {
        apiAssertions.isSuccessful(response);
        expect(response.data.id).toBeDefined();
      });

      // Verify all memories were created
      const memoriesResponse = await getAgentMemories(context.httpClient, testAgentId);
      const concurrentMemoriesCreated = memoriesResponse.data.filter(m => 
        m.content?.category === 'concurrency_test'
      );
      
      expect(concurrentMemoriesCreated.length).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle requests for non-existent agent memories', async () => {
      const fakeAgentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await context.httpClient.get(`/memory/agents/${fakeAgentId}`);
      expect([404, 200]).toContain(response.status);
      
      // If it returns 200, it should be an empty array
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      }
    });

    it('should handle invalid memory data', async () => {
      const invalidMemoryData = {
        // Missing required fields
        invalidField: 'should be rejected',
      };

      const response = await context.httpClient.post(
        `/memory/agents/${testAgentId}`,
        invalidMemoryData
      );

      expect([400, 422]).toContain(response.status);
      expect(response.data.error).toBeDefined();
    });

    it('should handle memory operations on non-existent memories', async () => {
      const fakeMemoryId = '00000000-0000-0000-0000-000000000000';
      
      const getResponse = await context.httpClient.get(
        `/memory/agents/${testAgentId}/${fakeMemoryId}`
      );
      expect(getResponse.status).toBe(404);

      const updateResponse = await context.httpClient.put(
        `/memory/agents/${testAgentId}/${fakeMemoryId}`,
        { content: { text: 'update' } }
      );
      expect(updateResponse.status).toBe(404);

      const deleteResponse = await context.httpClient.delete(
        `/memory/agents/${testAgentId}/${fakeMemoryId}`
      );
      expect([404, 204]).toContain(deleteResponse.status);
    });

    it('should handle malformed search queries', async () => {
      const response = await context.httpClient.get(
        `/memory/agents/${testAgentId}?search=&category=&tags=`
      );

      // Should handle gracefully with empty parameters
      apiAssertions.hasStatus(response, 200);
      expect(Array.isArray(response.data)).toBe(true);
    });
  });
});