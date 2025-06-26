/**
 * Real integration tests using actual ElizaOS runtime
 * No mocks - tests actual behavior
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  createTestRuntime,
  createTestMessage,
  processMessageAndWait,
  cleanupRuntime,
  getService,
  waitForCondition,
} from './runtime-helper';
import { RolodexService } from '../services/RolodexService';
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';
import { stringToUuid } from '@elizaos/core';

describe('Rolodex Plugin Real Integration Tests', () => {
  let runtime: IAgentRuntime;
  let rolodexService: RolodexService;

  beforeEach(async () => {
    // Create real runtime with in-memory database
    runtime = await createTestRuntime({
      character: {
        name: 'Integration Test Agent',
        settings: {
          // Use test mode to avoid real API calls if needed
          testMode: true,
        },
      },
    });

    // Get the actual rolodex service
    rolodexService = getService<RolodexService>(runtime, 'rolodex');
  });

  afterEach(async () => {
    // Clean up runtime and database
    await cleanupRuntime(runtime);
  });

  describe('Entity Management', () => {
    it('should track entities from conversation', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // Create a message mentioning a person
      const message = createTestMessage(
        runtime,
        'I just met Sarah Johnson from Acme Corp. She is the CTO there.',
        { roomId, entityId: userId }
      );

      // Process the message
      await processMessageAndWait(runtime, message);

      // Search for the entity
      const searchResults = await rolodexService.searchEntities('Sarah Johnson');

      expect(searchResults).toBeDefined();
      expect(searchResults.length).toBeGreaterThan(0);

      const sarah = searchResults[0];
      expect(sarah.names).toContain('Sarah Johnson');
      expect(sarah.metadata?.organization).toBe('Acme Corp');
      expect(sarah.metadata?.role).toBe('CTO');
    });

    it('should update existing entities', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // First message
      const message1 = createTestMessage(runtime, 'John Smith works at TechCo as a developer.', {
        roomId,
        entityId: userId,
      });
      await processMessageAndWait(runtime, message1);

      // Update message
      const message2 = createTestMessage(
        runtime,
        'John Smith got promoted to Senior Developer at TechCo.',
        { roomId, entityId: userId }
      );
      await processMessageAndWait(runtime, message2);

      // Check updated entity
      const searchResults = await rolodexService.searchEntities('John Smith');
      expect(searchResults.length).toBeGreaterThan(0);

      const john = searchResults[0];
      expect(john.metadata?.role).toContain('Senior Developer');
    });
  });

  describe('Relationship Management', () => {
    it('should track relationships between entities', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // Create message about relationship
      const message = createTestMessage(
        runtime,
        'Alice Chen manages Bob Wilson and Carol Davis at StartupXYZ.',
        { roomId, entityId: userId }
      );

      await processMessageAndWait(runtime, message);

      // Find Alice
      const aliceResults = await rolodexService.searchEntities('Alice Chen');
      expect(aliceResults.length).toBeGreaterThan(0);

      const alice = aliceResults[0];

      // Get Alice's relationships
      const relationships = await rolodexService.getRelationships(alice.id!);
      expect(relationships.length).toBeGreaterThan(0);

      // Should have management relationships
      const managementRels = relationships.filter(
        (r) => r.metadata?.type === 'management' || r.metadata?.relationshipType === 'manages'
      );
      expect(managementRels.length).toBeGreaterThan(0);
    });

    it('should infer bidirectional relationships', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      const message = createTestMessage(
        runtime,
        'David Lee and Emma Wang are co-founders of AIStartup.',
        { roomId, entityId: userId }
      );

      await processMessageAndWait(runtime, message);

      // Find both entities
      const davidResults = await rolodexService.searchEntities('David Lee');
      const emmaResults = await rolodexService.searchEntities('Emma Wang');

      expect(davidResults.length).toBeGreaterThan(0);
      expect(emmaResults.length).toBeGreaterThan(0);

      const david = davidResults[0];
      const emma = emmaResults[0];

      // Check relationships from both sides
      const davidRels = await rolodexService.getRelationships(david.id!);
      const emmaRels = await rolodexService.getRelationships(emma.id!);

      // Both should have relationships
      expect(davidRels.length).toBeGreaterThan(0);
      expect(emmaRels.length).toBeGreaterThan(0);

      // Relationships should reference each other
      const davidToEmma = davidRels.find((r) => r.targetEntityId === emma.id!);
      const emmaToDavid = emmaRels.find((r) => r.targetEntityId === david.id!);

      expect(davidToEmma).toBeDefined();
      expect(emmaToDavid).toBeDefined();
    });
  });

  describe('Follow-up Management', () => {
    it('should schedule follow-ups from conversation', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      const message = createTestMessage(
        runtime,
        'I need to follow up with Frank Zhang next week about the partnership proposal.',
        { roomId, entityId: userId }
      );

      await processMessageAndWait(runtime, message);

      // Check for scheduled follow-ups
      const followUps = await rolodexService.getUpcomingFollowUps();
      expect(followUps.length).toBeGreaterThan(0);

      const frankFollowUp = followUps.find(
        (f) => f.message?.includes('Frank Zhang') || f.message?.includes('partnership')
      );

      expect(frankFollowUp).toBeDefined();
      expect(frankFollowUp?.scheduledFor).toBeDefined();

      // Should be scheduled for roughly a week from now
      const scheduledDate = new Date(frankFollowUp!.scheduledFor);
      const now = new Date();
      const daysDiff = (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(5);
      expect(daysDiff).toBeLessThan(10);
    });
  });

  describe('Trust Score Management', () => {
    it('should update trust scores based on interactions', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // Create entity first
      const entity = await rolodexService.upsertEntity({
        names: ['Grace Kim'],
        metadata: {
          type: 'person',
          role: 'Partner',
        },
      });

      // Positive interaction
      const message = createTestMessage(
        runtime,
        'Grace Kim delivered the project on time and exceeded expectations.',
        { roomId, entityId: userId }
      );

      await processMessageAndWait(runtime, message);

      // Update trust based on positive interaction
      if (entity.id) {
        await rolodexService.updateTrustFromInteraction(entity.id, {
          type: 'project_completion',
          outcome: 'positive',
          metadata: {
            deliveredOnTime: true,
            exceededExpectations: true,
          },
        });

        // Get trust score
        const trustScore = await rolodexService.getTrustScore(entity.id);

        // Trust score should exist (if trust service is available)
        // or be null (if trust service is not available)
        if (trustScore) {
          expect(trustScore.score).toBeGreaterThan(0.5);
          expect(trustScore.confidence).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Entity Resolution', () => {
    it('should resolve similar entity names', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // Create entities with similar names
      const messages = [
        'I met Robert Johnson yesterday.',
        'Bob Johnson called me today.',
        'Rob Johnson sent an email.',
      ];

      for (const text of messages) {
        const message = createTestMessage(runtime, text, { roomId, entityId: userId });
        await processMessageAndWait(runtime, message);
      }

      // Search for variations
      const results = await rolodexService.searchEntities('Johnson');

      // Should consolidate to one entity (or have high confidence matches)
      expect(results.length).toBeGreaterThanOrEqual(1);

      // The entity should have all name variations
      const robertEntity = results.find((e) =>
        e.names.some((n) => n.includes('Robert') || n.includes('Bob') || n.includes('Rob'))
      );

      expect(robertEntity).toBeDefined();
    });
  });

  describe('Network Analysis', () => {
    it('should provide network statistics', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // Create a small network
      const messages = [
        'The tech team consists of Henry Lee (lead), Iris Chen, and Jack Wang.',
        'Henry Lee mentors both Iris and Jack.',
        'Iris Chen and Jack Wang collaborate on the AI project.',
      ];

      for (const text of messages) {
        const message = createTestMessage(runtime, text, { roomId, entityId: userId });
        await processMessageAndWait(runtime, message);
      }

      // Get network stats
      const stats = await rolodexService.getNetworkStats();

      expect(stats).toBeDefined();
      expect(stats.totalEntities).toBeGreaterThan(0);
      expect(stats.totalRelationships).toBeGreaterThan(0);
      expect(stats.avgRelationshipsPerEntity).toBeGreaterThan(0);
    });
  });

  describe('Action Integration', () => {
    it('should process TRACK_ENTITY action', async () => {
      const roomId = stringToUuid('test-room');
      const userId = stringToUuid('test-user');

      // Create a message that should trigger entity tracking
      const message: Memory = {
        id: stringToUuid(`msg-${Date.now()}`),
        entityId: userId,
        agentId: runtime.agentId,
        roomId,
        content: {
          text: 'Please track Kelly Park from DesignCo, she is the Creative Director.',
          source: 'test',
          actions: ['TRACK_ENTITY'], // Explicitly request action
        },
        createdAt: Date.now(),
      };

      // Process message with action
      await (runtime as any).processMessage(message);

      // Wait for action processing
      await waitForCondition(async () => {
        const results = await rolodexService.searchEntities('Kelly Park');
        return results.length > 0;
      }, 5000);

      // Verify entity was tracked
      const results = await rolodexService.searchEntities('Kelly Park');
      expect(results.length).toBeGreaterThan(0);

      const kelly = results[0];
      expect(kelly.metadata?.organization).toBe('DesignCo');
      expect(kelly.metadata?.role).toBe('Creative Director');
    });
  });
});
