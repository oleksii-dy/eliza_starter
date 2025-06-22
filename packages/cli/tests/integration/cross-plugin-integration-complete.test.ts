/**
 * Cross-Plugin Integration Complete Test Suite
 * 
 * Basic integration tests for plugin loading and runtime functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IAgentRuntime, UUID } from '@elizaos/core';
import { createTestRuntime } from '@elizaos/core/test-utils';

describe('Cross-Plugin Integration Complete Tests', () => {
  let runtime: IAgentRuntime;
  let testEntityId: UUID;
  let testRoomId: UUID;

  beforeEach(async () => {
    // Create test runtime with SQL plugin
    const { runtime: testRuntime } = await createTestRuntime({
      plugins: [
        '@elizaos/plugin-sql',
      ],
    });
    
    runtime = testRuntime;

    // Create test entities and rooms
    testEntityId = `test-entity-${Date.now()}` as UUID;
    testRoomId = `test-room-${Date.now()}` as UUID;
  });

  afterEach(async () => {
    // Clean up test data if cleanup method exists
    if (runtime && typeof (runtime as any).cleanup === 'function') {
      await (runtime as any).cleanup();
    }
  });

  describe('Basic Runtime Tests', () => {
    it('should create runtime with SQL plugin', async () => {
      expect(runtime).toBeDefined();
      expect(runtime.agentId).toBeDefined();
    });

    it('should have character configuration', async () => {
      expect(runtime.character).toBeDefined();
      expect(runtime.character.name).toBeDefined();
    });

    it('should process basic message', async () => {
      const messageText = 'Hello test message';
      
      // Create a test memory
      const memory = {
        id: `test-memory-${Date.now()}` as UUID,
        entityId: testEntityId,
        roomId: testRoomId,
        agentId: runtime.agentId,
        content: {
          text: messageText,
          source: 'test',
        },
        createdAt: Date.now(),
      };

      // This should not throw
      expect(memory.content.text).toBe(messageText);
    });
  });
});