import {
  Action,
  type ActionExample,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  logger,
} from '@elizaos/core';
import { VisionService } from './service';
import { EntityTracker } from './entity-tracker';

export const nameEntityAction: Action = {
  name: 'NAME_ENTITY',
  description: 'Assign a name to a person or object currently visible in the camera view. Returns entity identification data and naming status for action chaining.',
  similes: [
    'call the person {name}',
    'the person in front is {name}',
    'name the person {name}',
    'that person is {name}',
    'the object is a {name}',
    'call that {name}',
  ],
  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'The person wearing the blue shirt is named Alice',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I've identified the person in the blue shirt as Alice. I'll remember them for future interactions.",
          actions: ['NAME_ENTITY'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Call the person on the left Bob',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I've named the person on the left as Bob. Their face profile has been updated.",
          actions: ['NAME_ENTITY'],
        },
      },
    ],
  ] as ActionExample[][],

  async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
    const visionService = runtime.getService('VISION') as VisionService | null;
    return visionService?.isActive() || false;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      const visionService = runtime.getService('VISION') as VisionService;
      const scene = await visionService.getSceneDescription();

      if (!scene || scene.people.length === 0) {
        const thought = 'No people visible to name.';
        const text = "I don't see any people in the current scene to name.";
        if (callback) {
          await callback({ thought, text, actions: ['NAME_ENTITY'] });
        }
        return {
          text: 'No people visible to name',
          values: {
            success: false,
            peopleVisible: false,
            sceneProcessed: true,
          },
          data: {
            actionName: 'NAME_ENTITY',
            error: 'No people found in scene',
          },
        };
      }

      // Extract name from message
      const messageText = message.content.text?.toLowerCase() || '';
      const nameMatch = messageText.match(/(?:named?|call(?:ed)?|is)\s+(\w+)/i);

      if (!nameMatch) {
        const text = 'I couldn\'t understand what name to assign. Please say something like "The person is named Alice".';
        if (callback) {
          await callback({
            text,
            actions: ['NAME_ENTITY'],
          });
        }
        return {
          text,
          values: {
            success: false,
            nameExtracted: false,
            peopleVisible: scene.people.length > 0,
          },
          data: {
            actionName: 'NAME_ENTITY',
            error: 'Could not extract name from message',
            messageText: message.content.text,
          },
        };
      }

      const name = nameMatch[1];

      // Get entity tracker
      const worldId = message.worldId || 'default-world';
      const entityTracker = new EntityTracker(worldId);

      // Update entities
      await entityTracker.updateEntities(scene.objects, scene.people, undefined, runtime);
      const activeEntities = entityTracker.getActiveEntities();
      const people = activeEntities.filter((e) => e.entityType === 'person');

      if (people.length === 0) {
        const text = "I can see someone but haven't established tracking yet. Please try again in a moment.";
        if (callback) {
          await callback({
            text,
            actions: ['NAME_ENTITY'],
          });
        }
        return {
          text,
          values: {
            success: false,
            trackingEstablished: false,
            peopleInScene: scene.people.length,
          },
          data: {
            actionName: 'NAME_ENTITY',
            error: 'Tracking not yet established',
          },
        };
      }

      // For now, assign to the most prominent person (largest bounding box)
      let targetPerson = people[0];
      if (people.length > 1) {
        targetPerson = people.reduce((prev, curr) => {
          const prevArea = prev.lastPosition.width * prev.lastPosition.height;
          const currArea = curr.lastPosition.width * curr.lastPosition.height;
          return currArea > prevArea ? curr : prev;
        });
      }

      // Assign the name
      const success = entityTracker.assignNameToEntity(targetPerson.id, name);

      if (success) {
        // Success response
        const thought = `Named entity "${name}" and associated with person in scene.`;
        const text = `I've identified the person as ${name}. I'll remember them for future interactions.`;

        if (callback) {
          await callback({
            thought,
            text,
            actions: ['NAME_ENTITY'],
            data: { entityId: targetPerson.id, name },
          });
        }

        logger.info(`[NameEntityAction] Assigned name "${name}" to entity ${targetPerson.id}`);
        
        return {
          text,
          values: {
            success: true,
            nameAssigned: true,
            entityId: targetPerson.id,
            assignedName: name,
            trackingActive: true,
          },
          data: {
            actionName: 'NAME_ENTITY',
            entityId: targetPerson.id,
            name,
            targetPerson,
            thought,
          },
        };
      } else {
        const text = 'There was an error assigning the name. Please try again.';
        if (callback) {
          await callback({
            text,
            actions: ['NAME_ENTITY'],
          });
        }
        return {
          text,
          values: {
            success: false,
            nameAssigned: false,
            entityId: targetPerson.id,
            assignedName: name,
          },
          data: {
            actionName: 'NAME_ENTITY',
            error: 'Failed to assign name to entity',
            targetPerson,
          },
        };
      }
    } catch (error) {
      logger.error('[NameEntityAction] Error:', error);
      const thought = 'Failed to name entity.';
      const text = `Sorry, I couldn't name the entity: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({ thought, text, actions: ['NAME_ENTITY'] });
      }
      return {
        text,
        values: {
          success: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        data: {
          actionName: 'NAME_ENTITY',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'exception',
        },
      };
    }
  },
};

export const identifyPersonAction: Action = {
  name: 'IDENTIFY_PERSON',
  description: 'Identify a person in view if they have been seen before. Returns identification data and recognition details for action chaining.',
  similes: [
    'who is that',
    'who is the person',
    'identify the person',
    'do you recognize them',
    'have you seen them before',
  ],
  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Who is the person in front of you?',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "That's Alice. I last saw her about 5 minutes ago. She's been here for the past 20 minutes.",
          actions: ['IDENTIFY_PERSON'],
        },
      },
    ],
  ] as ActionExample[][],

  async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
    const visionService = runtime.getService('VISION') as VisionService | null;
    return visionService?.isActive() || false;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      const visionService = runtime.getService('VISION') as VisionService;
      const scene = await visionService.getSceneDescription();

      if (!scene || scene.people.length === 0) {
        const thought = 'No people visible to identify.';
        const text = "I don't see any people in the current scene.";
        if (callback) {
          await callback({ thought, text, actions: ['IDENTIFY_PERSON'] });
        }
        return {
          text,
          values: {
            success: false,
            peopleVisible: false,
            sceneProcessed: true,
          },
          data: {
            actionName: 'IDENTIFY_PERSON',
            error: 'No people found in scene',
          },
        };
      }

      // Get entity tracker
      const worldId = message.worldId || 'default-world';
      const entityTracker = new EntityTracker(worldId);

      // Update entities
      await entityTracker.updateEntities(scene.objects, scene.people, undefined, runtime);
      const activeEntities = entityTracker.getActiveEntities();
      const people = activeEntities.filter((e) => e.entityType === 'person');

      if (people.length === 0) {
        const text = "I can see someone but I'm still processing their identity.";
        if (callback) {
          await callback({
            text,
            actions: ['IDENTIFY_PERSON'],
          });
        }
        return {
          text,
          values: {
            success: false,
            trackingEstablished: false,
            peopleInScene: scene.people.length,
          },
          data: {
            actionName: 'IDENTIFY_PERSON',
            error: 'Identity processing in progress',
          },
        };
      }

      // Build response about visible people
      let recognizedCount = 0;
      let unknownCount = 0;
      const identifications: string[] = [];

      for (const person of people) {
        const name = person.attributes.name;
        const duration = Date.now() - person.firstSeen;
        const durationStr =
          duration < 60000
            ? `${Math.round(duration / 1000)} seconds`
            : `${Math.round(duration / 60000)} minutes`;

        if (name) {
          recognizedCount++;
          const personInfo = `I can see ${name}. They've been here for ${durationStr}.`;
          identifications.push(personInfo);

          // Add more context if available
          if (person.appearances.length > 5) {
            identifications.push("I've been tracking them consistently.");
          }
        } else {
          unknownCount++;
          const personInfo = `I see an unidentified person who has been here for ${durationStr}.`;
          identifications.push(personInfo);

          if (person.attributes.faceId) {
            identifications.push(
              "I've captured their face profile but they haven't been named yet."
            );
          }
        }
      }

      // Check for recently departed people
      const recentlyLeft = entityTracker.getRecentlyLeft();
      if (recentlyLeft.length > 0) {
        identifications.push('\nRecently departed:');
        for (const { entity, leftAt } of recentlyLeft) {
          if (entity.entityType === 'person' && entity.attributes.name) {
            const timeAgo = Date.now() - leftAt;
            const timeStr =
              timeAgo < 60000
                ? `${Math.round(timeAgo / 1000)} seconds ago`
                : `${Math.round(timeAgo / 60000)} minutes ago`;
            identifications.push(`${entity.attributes.name} left ${timeStr}.`);
          }
        }
      }

      const thought = `Identified ${recognizedCount} known people and ${unknownCount} unknown people.`;
      const text = identifications.join(' ');

      if (callback) {
        await callback({
          thought,
          text,
          actions: ['IDENTIFY_PERSON'],
          data: { identifications: people },
        });
      }

      return {
        text,
        values: {
          success: true,
          peopleIdentified: true,
          recognizedCount,
          unknownCount,
          totalPeople: people.length,
        },
        data: {
          actionName: 'IDENTIFY_PERSON',
          people,
          identifications,
          thought,
          recentlyLeft: entityTracker.getRecentlyLeft(),
        },
      };
    } catch (error) {
      logger.error('[identifyPersonAction] Error:', error);
      const thought = 'Failed to identify people.';
      const text = `Sorry, I couldn't identify people: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({ thought, text, actions: ['IDENTIFY_PERSON'] });
      }
      return {
        text,
        values: {
          success: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        data: {
          actionName: 'IDENTIFY_PERSON',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'exception',
        },
      };
    }
  },
};

export const trackEntityAction: Action = {
  name: 'TRACK_ENTITY',
  description: 'Start tracking a specific person or object in view. Returns tracking statistics and entity data for action chaining.',
  similes: [
    'track the {description}',
    'follow the {description}',
    'keep an eye on the {description}',
    'watch the {description}',
  ],
  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Track the person wearing the red shirt',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'm now tracking the person in the red shirt. I'll notify you of any significant movements or if they leave the scene.",
          actions: ['TRACK_ENTITY'],
        },
      },
    ],
  ] as ActionExample[][],

  async validate(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> {
    const visionService = runtime.getService('VISION') as VisionService | null;
    return visionService?.isActive() || false;
  },

  async handler(
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> {
    try {
      const visionService = runtime.getService('VISION') as VisionService;
      const scene = await visionService.getSceneDescription();

      if (!scene) {
        const text = 'I need a moment to process the visual scene before I can track entities.';
        if (callback) {
          await callback({
            text,
            actions: ['TRACK_ENTITY'],
          });
        }
        return {
          text,
          values: {
            success: false,
            sceneProcessed: false,
            trackingActive: false,
          },
          data: {
            actionName: 'TRACK_ENTITY',
            error: 'Scene not yet processed',
          },
        };
      }

      // Get entity tracker
      const worldId = message.worldId || 'default-world';
      const entityTracker = new EntityTracker(worldId);

      // Update entities
      await entityTracker.updateEntities(scene.objects, scene.people, undefined, runtime);
      const stats = entityTracker.getStatistics();

      const thought = `Tracking ${stats.activeEntities} entities in the scene.`;
      const summary = [
        `I'm now tracking ${stats.activeEntities} entities in the scene`,
        `(${stats.people} people, ${stats.objects} objects).`,
        'The visual tracking system will maintain persistent IDs for all entities',
        'and notify you of significant changes.',
      ];
      const responseText = summary.join(' ');

      if (callback) {
        await callback({
          thought,
          text: responseText,
          actions: ['TRACK_ENTITY'],
          data: { entities: stats.activeEntities },
        });
      }

      logger.info(`[TrackEntityAction] Tracking ${stats.activeEntities} entities`);

      return {
        text: responseText,
        values: {
          success: true,
          trackingActive: true,
          totalEntities: stats.activeEntities,
          peopleCount: stats.people,
          objectsCount: stats.objects,
        },
        data: {
          actionName: 'TRACK_ENTITY',
          stats,
          thought,
          scene,
          worldId,
        },
      };
    } catch (error) {
      logger.error('[trackEntityAction] Error:', error);
      const thought = 'Failed to track entities.';
      const text = `Sorry, I couldn't track entities: ${error instanceof Error ? error.message : 'Unknown error'}`;
      if (callback) {
        await callback({ thought, text, actions: ['TRACK_ENTITY'] });
      }
      return {
        text,
        values: {
          success: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        data: {
          actionName: 'TRACK_ENTITY',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'exception',
        },
      };
    }
  },
};
