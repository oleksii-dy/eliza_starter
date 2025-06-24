import {
  type Action,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type UUID,
  logger,
  type ActionExample,
  parseJSONObjectFromText,
} from '@elizaos/core';
import type { ElevationRequest } from '../types/permissions';

export const requestElevationAction: Action = {
  name: 'REQUEST_ELEVATION',
  description: 'Request temporary elevation of permissions for a specific action. Validates user trust levels and grants temporary higher privileges with justification. Can be chained with EVALUATE_TRUST to check eligibility first or RECORD_TRUST_INTERACTION to log approval/denial outcomes.',

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const permissionSystem = runtime.getService('contextual-permissions');
    return !!permissionSystem;
  },

  handler: async (runtime: IAgentRuntime, message: Memory): Promise<ActionResult> => {
    const permissionSystem = runtime.getService('contextual-permissions') as any;
    const trustEngine = runtime.getService('trust-engine') as any;

    if (!permissionSystem || !trustEngine) {
      throw new Error('Required services not available');
    }

    // Parse the elevation request
    const text = message.content.text || '';
    const parsed = parseJSONObjectFromText(text);
    const requestData = parsed as {
      action?: string;
      resource?: string;
      justification?: string;
      duration?: number; // minutes
    } | null;

    if (!requestData || !requestData.action) {
      return {
        text: 'Please specify the action you need elevated permissions for. Example: "I need to manage roles to help moderate the channel"',
        data: {
          actionName: 'REQUEST_ELEVATION',
          error: 'Missing action specification',
        },
        values: {
          success: false,
          approved: false,
        },
      };
    }

    // Get current trust profile
    const trustProfile = await trustEngine.evaluateTrust(message.entityId, runtime.agentId, {
      roomId: message.roomId,
    });

    // Create elevation request
    const elevationRequest: ElevationRequest = {
      entityId: message.entityId,
      requestedPermission: {
        action: requestData.action as UUID,
        resource: (requestData.resource || '*') as UUID,
      },
      justification: (requestData.justification || text) as UUID,
      context: {
        roomId: message.roomId,
        platform: 'discord' as UUID,
        timestamp: Date.now(),
      },
      duration: (requestData.duration || 60) * 60 * 1000, // Convert minutes to ms
    };

    try {
      const result = await permissionSystem.requestElevation(elevationRequest);

      if (result.approved) {
        const expiryTime = new Date(result.expiresAt!).toLocaleString();
        return {
          text: `✅ Elevation approved! You have been granted temporary ${requestData.action} permissions until ${expiryTime}.

Please use these permissions responsibly. All actions will be logged for audit.`,
          data: {
            actionName: 'REQUEST_ELEVATION',
            approved: true,
            elevationId: result.elevationId,
            expiresAt: result.expiresAt,
            permissions: result.grantedPermissions,
            requestedAction: requestData.action,
          },
          values: {
            success: true,
            approved: true,
            elevationId: result.elevationId,
            expiresAt: result.expiresAt,
          },
        };
      } else {
        // Provide helpful feedback on denial
        let denialMessage = `❌ Elevation request denied: ${result.reason}`;

        if (result.trustDeficit && result.trustDeficit > 0) {
          denialMessage += `\n\nYour current trust score is ${trustProfile.overallTrust}/100. You need ${Math.ceil(result.trustDeficit)} more trust points for this permission.`;
        }

        if (result.suggestions && result.suggestions.length > 0) {
          denialMessage +=
            `\n\nSuggestions:\n${result.suggestions.map((s) => `• ${s}`).join('\n')}`;
        }

        return {
          text: denialMessage,
          data: {
            actionName: 'REQUEST_ELEVATION',
            approved: false,
            reason: result.reason,
            currentTrust: trustProfile.overallTrust,
            requiredTrust: result.requiredTrust,
            trustDeficit: result.trustDeficit,
            suggestions: result.suggestions,
          },
          values: {
            success: true,
            approved: false,
            currentTrust: trustProfile.overallTrust,
            requiredTrust: result.requiredTrust,
          },
        };
      }
    } catch (error) {
      logger.error('[RequestElevation] Error processing elevation request:', error);
      return {
        text: 'Failed to process elevation request. Please try again.',
        data: {
          actionName: 'REQUEST_ELEVATION',
          error: error instanceof Error ? error.message : String(error),
        },
        values: {
          success: false,
          approved: false,
        },
      };
    }
  },

  examples: [
    // Multi-action: Check trust then request elevation
    [
      {
        name: '{{user}}',
        content: {
          text: 'Check my trust score and then request admin permissions to moderate the channel',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll evaluate your trust level and then process your elevation request for moderation permissions.",
          thought: 'User wants trust check followed by permission request',
          actions: ['EVALUATE_TRUST', 'REQUEST_ELEVATION'],
        },
      },
    ],
    // Multi-action: Request elevation then record outcome
    [
      {
        name: '{{user}}',
        content: {
          text: 'Request temporary admin access and log the decision for audit purposes',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: "I'll process your elevation request and then record the outcome for audit tracking.",
          thought: 'User wants permission request followed by audit logging',
          actions: ['REQUEST_ELEVATION', 'RECORD_TRUST_INTERACTION'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'I need permission to manage roles to help moderate spam in the channel',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '✅ Elevation approved! You have been granted temporary manage_roles permissions until 12/20/2024, 5:30:00 PM.\n\nPlease use these permissions responsibly. All actions will be logged for audit.',
          actions: ['REQUEST_ELEVATION'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Grant me admin access',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: '❌ Elevation request denied: Insufficient justification provided\n\nYour current trust score is 45/100. You need 15 more trust points for this permission.\n\nSuggestions:\n• Provide a specific justification for why you need admin access\n• Build trust through consistent positive contributions\n• Request more specific permissions instead of full admin access',
          actions: ['REQUEST_ELEVATION'],
        },
      },
    ],
  ] as ActionExample[][],

  similes: [
    'request elevated permissions',
    'need temporary access',
    'request higher privileges',
    'need admin permission',
    'elevate my permissions',
    'grant me access',
    'temporary permission request',
    'need special access',
  ],
};
