import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type UUID,
  logger,
  type ActionExample,
  parseJSONObjectFromText,
} from '@elizaos/core';
import type { TrustProfile } from '../types/trust';

export const evaluateTrustAction: Action = {
  name: 'EVALUATE_TRUST',
  description: 'Evaluates the trust score and profile for a specified entity',

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const trustEngine = runtime.getService('trust-engine');
    return !!trustEngine;
  },

  handler: async (runtime: IAgentRuntime, message: Memory) => {
    const trustEngine = runtime.getService('trust-engine') as any;

    if (!trustEngine) {
      throw new Error('Trust engine service not available');
    }

    // Parse the request
    const text = message.content.text || '';
    const parsed = parseJSONObjectFromText(text);
    const requestData = parsed as {
      entityId?: string;
      entityName?: string;
      detailed?: boolean;
    } | null;

    // Try to extract entity from message if not in parsed data
    let targetEntityId: UUID | undefined;
    if (requestData?.entityId) {
      targetEntityId = requestData.entityId as UUID;
    } else if (requestData?.entityName) {
      // Try to resolve entity name to ID
      // First check if we have a rolodex or entity service
      const entityService = runtime.getService('entities') as any;
      if (entityService && typeof entityService.findByName === 'function') {
        const entity = await entityService.findByName(requestData.entityName);
        if (entity) {
          targetEntityId = entity.id;
        }
      }
      
      // If no entity service or entity not found, try database query
      if (!targetEntityId && runtime.getEntitiesForRoom) {
        const entities = await runtime.getEntitiesForRoom(message.roomId);
        if (entities) {
          const matchingEntity = entities.find(
            e => e.names?.some(name => name.toLowerCase() === requestData.entityName!.toLowerCase())
          );
          if (matchingEntity) {
            targetEntityId = matchingEntity.id;
          }
        }
      }
      
      // If still not found, return helpful error
      if (!targetEntityId) {
        return {
          text: `Could not find entity with name "${requestData.entityName}". Please check the name or provide an entity ID instead.`,
          error: true,
        };
      }
    } else {
      // Default to evaluating the message sender
      targetEntityId = message.entityId;
    }

    try {
      const trustContext = {
        evaluatorId: runtime.agentId,
        roomId: message.roomId,
      };

      const trustProfile: TrustProfile = await trustEngine.evaluateTrust(
        targetEntityId,
        runtime.agentId,
        trustContext
      );

      // Format response based on detail level
      const detailed = requestData?.detailed ?? false;

      if (detailed) {
        const dimensionText = Object.entries(trustProfile.dimensions)
          .map(([dim, score]) => `- ${dim}: ${score}/100`)
          .join('\n');

        const trendText =
          trustProfile.trend.direction === 'increasing'
            ? `📈 Increasing (+${trustProfile.trend.changeRate.toFixed(1)} pts/day)`
            : trustProfile.trend.direction === 'decreasing'
              ? `📉 Decreasing (${trustProfile.trend.changeRate.toFixed(1)} pts/day)`
              : '➡️ Stable';

        return {
          text: `Trust Profile for ${targetEntityId}:

Overall Trust: ${trustProfile.overallTrust}/100
Confidence: ${(trustProfile.confidence * 100).toFixed(0)}%
Interactions: ${trustProfile.interactionCount}
Trend: ${trendText}

Trust Dimensions:
${dimensionText}

Last Updated: ${new Date(trustProfile.lastCalculated).toLocaleString()}`,
          data: trustProfile,
        };
      } else {
        const trustLevel =
          trustProfile.overallTrust >= 80
            ? 'High'
            : trustProfile.overallTrust >= 60
              ? 'Good'
              : trustProfile.overallTrust >= 40
                ? 'Moderate'
                : trustProfile.overallTrust >= 20
                  ? 'Low'
                  : 'Very Low';

        return {
          text: `Trust Level: ${trustLevel} (${trustProfile.overallTrust}/100) based on ${trustProfile.interactionCount} interactions`,
          data: {
            trustScore: trustProfile.overallTrust,
            trustLevel,
            confidence: trustProfile.confidence,
          },
        };
      }
    } catch (error) {
      logger.error('[EvaluateTrust] Error evaluating trust:', error);
      return {
        text: 'Failed to evaluate trust. Please try again.',
        error: true,
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'What is my trust score?',
        },
      },
      {
        name: 'Agent',
        content: {
          text: 'Trust Level: Good (65/100) based on 42 interactions',
        },
      },
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Show detailed trust profile for Alice',
        },
      },
      {
        name: 'Agent',
        content: {
          text: `Trust Profile for Alice:

Overall Trust: 78/100
Confidence: 85%
Interactions: 127
Trend: 📈 Increasing (+0.5 pts/day)

Trust Dimensions:
- reliability: 82/100
- competence: 75/100
- integrity: 80/100
- benevolence: 85/100
- transparency: 70/100

Last Updated: 12/20/2024, 3:45:00 PM`,
        },
      },
    ],
  ],

  similes: [
    'check trust score',
    'evaluate trust',
    'show trust level',
    'trust rating',
    'trust profile',
    'trust assessment',
    'check reputation',
    'show trust details',
  ],
};
