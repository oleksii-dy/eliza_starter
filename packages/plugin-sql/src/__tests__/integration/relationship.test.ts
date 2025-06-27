import { AgentRuntime, type Entity, type UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';

import { PgAdapter } from '../../pg/adapter';
import { createIsolatedTestDatabase } from '../test-helpers';

describe('Relationship Integration Tests', () => {
  let adapter: PgAdapter;
  let runtime: AgentRuntime;
  let cleanup: () => Promise<void>;
  let testAgentId: UUID;
  let testEntityId: UUID;
  let testTargetEntityId: UUID;

  beforeAll(async () => {
    const setup = await createIsolatedTestDatabase('relationship-tests');
    adapter = setup.adapter;
    runtime = setup.runtime;
    cleanup = setup.cleanup;
    testAgentId = setup.testAgentId;

    // Generate random UUIDs for test data
    testEntityId = uuidv4() as UUID;
    testTargetEntityId = uuidv4() as UUID;

    // Create test entities
    await adapter.createEntities([
      { id: testEntityId, agentId: testAgentId, names: ['Test Entity'] } as Entity,
      { id: testTargetEntityId, agentId: testAgentId, names: ['Target Entity'] } as Entity,
    ]);
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  describe('Relationship Tests', () => {
    it('should create and retrieve a relationship', async () => {
      // Use unique entities for this test
      const entity1 = uuidv4() as UUID;
      const entity2 = uuidv4() as UUID;

      await adapter.createEntities([
        { id: entity1, agentId: testAgentId, names: ['Entity 1'] } as Entity,
        { id: entity2, agentId: testAgentId, names: ['Entity 2'] } as Entity,
      ]);

      const relationshipData = {
        sourceEntityId: entity1,
        targetEntityId: entity2,
        tags: ['friend'],
      };
      const result = await adapter.createRelationship(relationshipData);
      expect(result).toBe(true);

      const retrieved = await adapter.getRelationship({
        sourceEntityId: entity1,
        targetEntityId: entity2,
      });
      expect(retrieved).toBeDefined();
      expect(retrieved?.tags).toContain('friend');
    });

    it('should update an existing relationship', async () => {
      // Use unique entities for this test
      const entity3 = uuidv4() as UUID;
      const entity4 = uuidv4() as UUID;

      await adapter.createEntities([
        { id: entity3, agentId: testAgentId, names: ['Entity 3'] } as Entity,
        { id: entity4, agentId: testAgentId, names: ['Entity 4'] } as Entity,
      ]);

      const relationshipData = {
        sourceEntityId: entity3,
        targetEntityId: entity4,
        tags: ['friend'],
      };
      await adapter.createRelationship(relationshipData);

      const retrieved = await adapter.getRelationship({
        sourceEntityId: entity3,
        targetEntityId: entity4,
      });
      expect(retrieved).toBeDefined();

      const updatedRelationship = {
        ...retrieved!,
        tags: ['best_friend'],
        metadata: { since: '2023' },
      };
      await adapter.updateRelationship(updatedRelationship);

      const updatedRetrieved = await adapter.getRelationship({
        sourceEntityId: entity3,
        targetEntityId: entity4,
      });
      expect(updatedRetrieved?.tags).toContain('best_friend');
      expect(updatedRetrieved?.metadata).toEqual({ since: '2023' });
    });

    it('should retrieve relationships by entity ID and tags', async () => {
      // Use unique entities for this test
      const entity5 = uuidv4() as UUID;
      const entity6 = uuidv4() as UUID;
      const entity7 = uuidv4() as UUID;

      await adapter.createEntities([
        { id: entity5, agentId: testAgentId, names: ['Entity 5'] } as Entity,
        { id: entity6, agentId: testAgentId, names: ['Entity 6'] } as Entity,
        { id: entity7, agentId: testAgentId, names: ['Entity 7'] } as Entity,
      ]);

      await adapter.createRelationship({
        sourceEntityId: entity5,
        targetEntityId: entity6,
        tags: ['friend', 'colleague'],
      });

      await adapter.createRelationship({
        sourceEntityId: entity5,
        targetEntityId: entity7,
        tags: ['family'],
      });

      const results = await adapter.getRelationships({ entityId: entity5, tags: ['friend'] });
      expect(results).toHaveLength(1);
      expect(results[0].targetEntityId).toBe(entity6);
    });
  });
});
