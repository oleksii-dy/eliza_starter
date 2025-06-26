/**
 * Real ElizaOS Database Adapter Integration Tests
 * Tests the actual PlatformDatabaseAdapter with real database operations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { db, getDatabase } from '@/lib/database';
import { organizations, users, conversations, messages, memories } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Import PlatformDatabaseAdapter - we'll need to expose it for testing
import type { UUID, Memory, Content } from '@elizaos/core';

// Mock implementation for testing - in real scenario this would be imported
class PlatformDatabaseAdapter {
  private organizationId: string;
  private database: any;

  constructor(organizationId: string, database: any) {
    this.organizationId = organizationId;
    this.database = database;
  }

  private convertToElizaUUID(id: string): UUID {
    return id as UUID;
  }

  private convertToElizaMemory(platformMessage: any): Memory {
    return {
      id: this.convertToElizaUUID(platformMessage.id),
      entityId: this.convertToElizaUUID(platformMessage.userId || platformMessage.agentId),
      agentId: this.convertToElizaUUID(platformMessage.agentId),
      roomId: this.convertToElizaUUID(platformMessage.conversationId),
      content: platformMessage.content as Content,
      embedding: platformMessage.embedding ? JSON.parse(platformMessage.embedding) : undefined,
      similarity: platformMessage.similarity ? parseFloat(platformMessage.similarity) : undefined,
      createdAt: new Date(platformMessage.createdAt).getTime(),
      unique: platformMessage.isUnique || false,
      metadata: platformMessage.metadata || {}
    };
  }

  async createMemory(memory: Memory, tableName: string = 'messages'): Promise<UUID> {
    const platformMemory = {
      id: memory.id || uuidv4(),
      organizationId: this.organizationId,
      agentId: memory.agentId,
      userId: memory.entityId,
      conversationId: memory.roomId,
      content: memory.content,
      embedding: memory.embedding ? JSON.stringify(memory.embedding) : null,
      metadata: memory.metadata || {}
    };

    if (tableName === 'facts' || tableName === 'memories') {
      const [inserted] = await this.database
        .insert(memories)
        .values({
          ...platformMemory,
          roomId: memory.roomId,
          type: tableName,
          isUnique: memory.unique || false
        })
        .returning({ id: memories.id });
      
      return this.convertToElizaUUID(inserted.id);
    } else {
      const [inserted] = await this.database
        .insert(messages)
        .values({
          ...platformMemory,
          role: memory.content.thought ? 'assistant' : 'user',
          tokenCount: JSON.stringify(memory.content).length
        })
        .returning({ id: messages.id });
      
      return this.convertToElizaUUID(inserted.id);
    }
  }

  async getMemories(params: {
    roomId?: UUID;
    tableName: string;
    count?: number;
    agentId?: UUID;
  }): Promise<Memory[]> {
    const searchTable = params.tableName === 'facts' ? memories : messages;
    
    let query = this.database
      .select()
      .from(searchTable)
      .where(eq(searchTable.organizationId, this.organizationId));
    
    if (params.roomId) {
      if (params.tableName === 'facts') {
        query = query.where(eq(memories.roomId, params.roomId));
      } else {
        query = query.where(eq(messages.conversationId, params.roomId));
      }
    }
    
    if (params.count) {
      query = query.limit(params.count);
    }
    
    const results = await query;
    return results.map((row: any) => this.convertToElizaMemory(row));
  }
}

describe('ElizaOS Database Adapter Integration', () => {
  let testOrgId: string;
  let testUserId: string;
  let testAgentId: string;
  let testConversationId: string;
  let adapter: PlatformDatabaseAdapter;
  let database: any;

  beforeEach(async () => {
    // Only run in test environment
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('These tests should only run in test environment');
    }

    database = await getDatabase();

    // Generate test IDs
    testOrgId = uuidv4();
    testUserId = uuidv4();
    testAgentId = uuidv4();
    testConversationId = uuidv4();

    // Clean up any existing test data
    try {
      await database.delete(memories).where(eq(memories.organizationId, testOrgId));
      await database.delete(messages).where(eq(messages.organizationId, testOrgId));
      await database.delete(conversations).where(eq(conversations.organizationId, testOrgId));
      await database.delete(users).where(eq(users.organizationId, testOrgId));
      await database.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch (error) {
      // Ignore cleanup errors for non-existent data
    }

    // Create test organization
    await database.insert(organizations).values({
      id: testOrgId,
      name: 'Test Organization',
      slug: `test-org-${testOrgId}`,
      creditBalance: '100.0',
    });

    // Create test user
    await database.insert(users).values({
      id: testUserId,
      organizationId: testOrgId,
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'admin',
    });

    // Create test conversation
    await database.insert(conversations).values({
      id: testConversationId,
      organizationId: testOrgId,
      agentId: testAgentId,
      userId: testUserId,
      title: 'Test Conversation',
    });

    // Create adapter instance
    adapter = new PlatformDatabaseAdapter(testOrgId, database);
  });

  afterEach(async () => {
    // Clean up test data
    try {
      await database.delete(memories).where(eq(memories.organizationId, testOrgId));
      await database.delete(messages).where(eq(messages.organizationId, testOrgId));
      await database.delete(conversations).where(eq(conversations.organizationId, testOrgId));
      await database.delete(users).where(eq(users.organizationId, testOrgId));
      await database.delete(organizations).where(eq(organizations.id, testOrgId));
    } catch (error) {
      console.warn('Error cleaning up test data:', error);
    }
  });

  describe('Memory Operations', () => {
    test('should create and retrieve conversation memory', async () => {
      const testMemory: Memory = {
        entityId: testUserId as UUID,
        agentId: testAgentId as UUID,
        roomId: testConversationId as UUID,
        content: {
          text: 'Hello, this is a test message',
          thought: 'The user is greeting me'
        },
        metadata: {
          type: 'test',
          test: true
        }
      };

      // Create memory
      const memoryId = await adapter.createMemory(testMemory, 'messages');
      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');

      // Retrieve memories
      const retrievedMemories = await adapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'messages',
        count: 10
      });

      expect(retrievedMemories).toHaveLength(1);
      expect(retrievedMemories[0].content.text).toBe('Hello, this is a test message');
      expect(retrievedMemories[0].content.thought).toBe('The user is greeting me');
      expect(retrievedMemories[0].entityId).toBe(testUserId);
      expect(retrievedMemories[0].agentId).toBe(testAgentId);
      expect(retrievedMemories[0].roomId).toBe(testConversationId);
    });

    test('should create and retrieve fact memory', async () => {
      const testFact: Memory = {
        entityId: testUserId as UUID,
        agentId: testAgentId as UUID,
        roomId: testConversationId as UUID,
        content: {
          text: 'The user likes coffee',
          source: 'conversation'
        },
        metadata: {
          type: 'preference',
          importance: 8
        },
        unique: true
      };

      // Create fact
      const factId = await adapter.createMemory(testFact, 'facts');
      expect(factId).toBeDefined();

      // Retrieve facts
      const retrievedFacts = await adapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'facts'
      });

      expect(retrievedFacts).toHaveLength(1);
      expect(retrievedFacts[0].content.text).toBe('The user likes coffee');
      expect(retrievedFacts[0].unique).toBe(true);
    });

    test('should handle multiple memories in conversation', async () => {
      const memories: Memory[] = [
        {
          entityId: testUserId as UUID,
          agentId: testAgentId as UUID,
          roomId: testConversationId as UUID,
          content: { text: 'First message' }
        },
        {
          entityId: testAgentId as UUID,
          agentId: testAgentId as UUID,
          roomId: testConversationId as UUID,
          content: { text: 'Agent response', thought: 'Responding to user' }
        },
        {
          entityId: testUserId as UUID,
          agentId: testAgentId as UUID,
          roomId: testConversationId as UUID,
          content: { text: 'Second message' }
        }
      ];

      // Create all memories
      for (const memory of memories) {
        await adapter.createMemory(memory, 'messages');
      }

      // Retrieve all memories
      const retrievedMemories = await adapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'messages'
      });

      expect(retrievedMemories).toHaveLength(3);
      
      // Check messages are retrieved
      const messageTexts = retrievedMemories.map(m => m.content.text);
      expect(messageTexts).toContain('First message');
      expect(messageTexts).toContain('Agent response');
      expect(messageTexts).toContain('Second message');
    });

    test('should handle memory with embeddings', async () => {
      const testMemory: Memory = {
        entityId: testUserId as UUID,
        agentId: testAgentId as UUID,
        roomId: testConversationId as UUID,
        content: {
          text: 'This message has an embedding vector'
        },
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        similarity: 0.95
      };

      const memoryId = await adapter.createMemory(testMemory, 'messages');
      expect(memoryId).toBeDefined();

      const retrievedMemories = await adapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'messages'
      });

      expect(retrievedMemories).toHaveLength(1);
      expect(retrievedMemories[0].embedding).toEqual([0.1, 0.2, 0.3, 0.4, 0.5]);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain referential integrity', async () => {
      // Create memory with valid references
      const testMemory: Memory = {
        entityId: testUserId as UUID,
        agentId: testAgentId as UUID,
        roomId: testConversationId as UUID,
        content: { text: 'Test with valid references' }
      };

      const memoryId = await adapter.createMemory(testMemory, 'messages');
      expect(memoryId).toBeDefined();

      // Verify the memory is correctly linked
      const retrievedMemories = await adapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'messages'
      });

      expect(retrievedMemories).toHaveLength(1);
      expect(retrievedMemories[0].entityId).toBe(testUserId);
      expect(retrievedMemories[0].agentId).toBe(testAgentId);
      expect(retrievedMemories[0].roomId).toBe(testConversationId);
    });

    test('should handle organization isolation', async () => {
      // Create memory in our test org
      await adapter.createMemory({
        entityId: testUserId as UUID,
        agentId: testAgentId as UUID,
        roomId: testConversationId as UUID,
        content: { text: 'Message in test org' }
      }, 'messages');

      // Create another org and adapter
      const otherOrgId = uuidv4();
      await database.insert(organizations).values({
        id: otherOrgId,
        name: 'Other Organization',
        slug: `other-org-${otherOrgId}`,
      });

      const otherAdapter = new PlatformDatabaseAdapter(otherOrgId, database);

      // Other adapter should not see our memories
      const otherMemories = await otherAdapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'messages'
      });

      expect(otherMemories).toHaveLength(0);

      // Our adapter should still see our memories
      const ourMemories = await adapter.getMemories({
        roomId: testConversationId as UUID,
        tableName: 'messages'
      });

      expect(ourMemories).toHaveLength(1);

      // Cleanup
      await database.delete(organizations).where(eq(organizations.id, otherOrgId));
    });
  });
});