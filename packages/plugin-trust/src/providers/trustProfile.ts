import { type Provider, type IAgentRuntime, type Memory, type State, logger } from '@elizaos/core';

export const trustProfileProvider: Provider = {
  name: 'trustProfile',
  description: 'Provides trust profile information for entities in the current context',

  get: async (runtime: IAgentRuntime, message: Memory, state: State) => {
    try {
      const trustEngine = runtime.getService('trust-engine') as any;

      if (!trustEngine) {
        return {
          text: 'Trust engine not available',
          values: {},
        };
      }

      // Get trust profile for the message sender
      const senderProfile = await trustEngine.evaluateTrust(message.entityId, runtime.agentId, {
        roomId: message.roomId,
      });

      // Get recent trust changes
      const recentInteractions = await trustEngine.getRecentInteractions(
        message.entityId,
        7 // Last 7 days
      );

      // Get the latest trust comment
      const trustDatabase = runtime.getService('trust-database') as any;
      let latestComment: {
        id: string;
        entityId: any;
        evaluatorId: any;
        trustScore: number;
        trustChange: number;
        comment: string;
        timestamp: number;
        metadata: any;
      } | null = null;
      if (trustDatabase?.trustDatabase) {
        latestComment = await trustDatabase.trustDatabase.getLatestTrustComment(
          message.entityId,
          runtime.agentId
        );
      }

      // Format trust information
      const trustLevel =
        senderProfile.overallTrust >= 80
          ? 'high trust'
          : senderProfile.overallTrust >= 60
            ? 'good trust'
            : senderProfile.overallTrust >= 40
              ? 'moderate trust'
              : senderProfile.overallTrust >= 20
                ? 'low trust'
                : 'very low trust';

      const trendText =
        senderProfile.trend.direction === 'increasing'
          ? 'improving'
          : senderProfile.trend.direction === 'decreasing'
            ? 'declining'
            : 'stable';

      // Create the base text
      let text = `The user has ${trustLevel} (${senderProfile.overallTrust}/100) with ${trendText} trust trend based on ${senderProfile.interactionCount} interactions.`;
      
      // Add the narrative comment if available
      if (latestComment) {
        text += `\n\nTrust Assessment: ${latestComment.comment}`;
      }

      return {
        text,
        values: {
          trustScore: senderProfile.overallTrust,
          trustLevel,
          trustTrend: senderProfile.trend.direction,
          reliability: senderProfile.dimensions.reliability,
          competence: senderProfile.dimensions.competence,
          integrity: senderProfile.dimensions.integrity,
          benevolence: senderProfile.dimensions.benevolence,
          transparency: senderProfile.dimensions.transparency,
          interactionCount: senderProfile.interactionCount,
          recentPositiveActions: recentInteractions.filter((i: any) => i.impact > 0).length,
          recentNegativeActions: recentInteractions.filter((i: any) => i.impact < 0).length,
          hasNarrativeAssessment: !!latestComment,
          lastAssessmentDate: latestComment ? new Date(latestComment.timestamp).toISOString() : null,
        },
        data: {
          profile: senderProfile,
          recentInteractions,
          latestComment,
        },
      };
    } catch (error) {
      logger.error('[TrustProfileProvider] Error fetching trust profile:', error);
      return {
        text: 'Unable to fetch trust profile',
        values: {},
      };
    }
  },
};
