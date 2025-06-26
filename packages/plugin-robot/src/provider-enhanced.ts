import { Provider, type IAgentRuntime, type Memory, type State, logger } from '@elizaos/core';
import { VisionService } from './service';
import { EntityTracker } from './entity-tracker';
import type { TrackedEntity as _TrackedEntity } from './types';

export const visionEnhancedProvider: Provider = {
  name: 'VISION_ENHANCED',
  description: 'Provides enhanced visual context including entity tracking and recognition',

  async get(runtime: IAgentRuntime, message: Memory, _state: State) {
    try {
      const visionService = runtime.getService<VisionService>('VISION') | null;

      if (!visionService || !visionService.isActive()) {
        return {
          text: 'Visual perception with entity tracking is not currently available.',
          values: {
            visionAvailable: false,
            hasCamera: false,
          },
        };
      }

      // Get current scene description
      const scene = await visionService.getSceneDescription();
      if (!scene) {
        return {
          text: 'No visual information available yet.',
          values: {
            visionAvailable: true,
            hasCamera: true,
            processing: true,
          },
        };
      }

      // Get entity tracker (would be initialized in service)
      const worldId = message.worldId || 'default-world';
      const entityTracker = new EntityTracker(worldId);

      // Update entities with current detections
      const _trackedEntities = await entityTracker.updateEntities(
        scene.objects,
        scene.people,
        undefined, // Face profiles would come from FaceRecognition service
        runtime
      );

      // Get world state
      const worldState = entityTracker.getWorldState();
      const activeEntities = entityTracker.getActiveEntities();
      const recentlyLeft = entityTracker.getRecentlyLeft();
      const stats = entityTracker.getStatistics();

      // Build enhanced context
      let contextText = `Visual Context (Enhanced):\n${scene.description}\n\n`;

      // Add entity information
      if (activeEntities.length > 0) {
        contextText += 'Currently Present:\n';
        for (const entity of activeEntities) {
          const name = entity.attributes.name || `Unknown ${entity.entityType}`;
          const duration = Date.now() - entity.firstSeen;
          const durationStr =
            duration < 60000
              ? `${Math.round(duration / 1000)}s`
              : `${Math.round(duration / 60000)}m`;

          contextText += `- ${name} (present for ${durationStr})`;

          if (entity.entityType === 'person' && entity.appearances.length > 0) {
            const lastAppearance = entity.appearances[entity.appearances.length - 1];
            contextText += ` at position (${Math.round(lastAppearance.boundingBox.x)}, ${Math.round(lastAppearance.boundingBox.y)})`;
          }
          contextText += '\n';
        }
      }

      if (recentlyLeft.length > 0) {
        contextText += '\nRecently Left:\n';
        for (const { entity, leftAt } of recentlyLeft) {
          const name = entity.attributes.name || `Unknown ${entity.entityType}`;
          const timeAgo = Date.now() - leftAt;
          const timeStr =
            timeAgo < 60000
              ? `${Math.round(timeAgo / 1000)}s ago`
              : `${Math.round(timeAgo / 60000)}m ago`;
          contextText += `- ${name} left ${timeStr}\n`;
        }
      }

      // Add statistics
      contextText += '\nTracking Statistics:\n';
      contextText += `- Total entities tracked: ${stats.totalEntities}\n`;
      contextText += `- Currently active: ${stats.activeEntities}\n`;
      contextText += `- People: ${stats.people}, Objects: ${stats.objects}\n`;

      // Build structured data
      const entityData = activeEntities.map((e) => ({
        id: e.id,
        type: e.entityType,
        name: e.attributes.name,
        firstSeen: e.firstSeen,
        duration: Date.now() - e.firstSeen,
        position: e.lastPosition,
        attributes: e.attributes,
      }));

      return {
        text: contextText,
        values: {
          visionAvailable: true,
          hasCamera: true,
          sceneDescription: scene.description,
          sceneChanged: scene.sceneChanged,
          changePercentage: scene.changePercentage,
          activeEntities: entityData,
          recentlyLeft: recentlyLeft.map(({ entity, leftAt }) => ({
            id: entity.id,
            name: entity.attributes.name,
            leftAt,
            timeAgo: Date.now() - leftAt,
          })),
          statistics: stats,
          worldId,
        },
        data: {
          objects: scene.objects,
          people: scene.people,
          trackedEntities: Array.from(worldState.entities.values()),
        },
      };
    } catch (error) {
      logger.error('[VisionEnhancedProvider] Error:', error);
      return {
        text: 'Error accessing enhanced visual information.',
        values: {
          visionAvailable: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },
};
