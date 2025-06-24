import {
  type Action,
  type ActionExample,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  logger,
  Role,
  parseJSONObjectFromText,
  type UUID
} from '@elizaos/core';

// Helper function to check if a role can modify another role
const canModifyRole = (currentRole: Role, targetRole: Role | null, newRole: Role): boolean => {
  // Owners can do anything
  if (currentRole === Role.OWNER) {return true;}

  // Admins can modify members and add new members/admins
  if (currentRole === Role.ADMIN) {
    if (!targetRole) {return newRole !== Role.OWNER;}
    // Admin can only modify if target is not an owner
    return targetRole !== Role.OWNER;
  }

  // Members can't modify roles
  return false;
};

const updateRoleTemplate = `
You are managing role assignments. Extract the user identification and new role from the request.

Current request: {{userMessage}}

Extract:
1. The target user (by name, username, or ID)
2. The new role to assign (owner, admin, or member)

Respond with a JSON object containing:
{
  "targetUser": "username or name",
  "targetUserId": "user ID if provided",
  "newRole": "owner" | "admin" | "member"
}
`;

export const updateRoleAction: Action = {
  name: 'UPDATE_ROLE',
  description: "Update a user's role in the world with proper permission validation. Supports action chaining by providing role change data for audit trails, notification workflows, or access control updates.",

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Check if world management is available
    const world = state?.world;
    if (!world) {return false;}

    // Check if the message sender has appropriate permissions
    const senderRole = world.roles?.[message.entityId];
    return senderRole === Role.OWNER || senderRole === Role.ADMIN;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const world = state?.world;
      if (!world) {
        callback?.({
          text: 'World context not available',
          error: true
        });
        return {
          text: 'World context not available',
          values: { success: false, error: 'no_world_context' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      const senderRole = world.roles?.[message.entityId];
      if (!senderRole || (senderRole !== Role.OWNER && senderRole !== Role.ADMIN)) {
        callback?.({
          text: "You don't have permission to update roles",
          error: true
        });
        return {
          text: "You don't have permission to update roles",
          values: { success: false, error: 'insufficient_permissions' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      // Parse the role update request
      const _prompt = updateRoleTemplate.replace('{{userMessage}}', message.content.text || '');

      // TODO: Fix runtime.generate method call
      // const response = await runtime.generateText({
      //   context: _prompt,
      //   modelClass: ModelType.SMALL
      // });

      // For now, parse directly from the message
      const response = message.content.text || '';

      const roleData = parseJSONObjectFromText(response) as {
        targetUser?: string;
        targetUserId?: UUID;
        newRole?: string;
      };

      if (!roleData || !roleData.newRole) {
        callback?.({
          text: 'Could not parse role update request',
          error: true
        });
        return {
          text: 'Could not parse role update request',
          values: { success: false, error: 'parse_error' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      // Validate the new role
      const newRole = roleData.newRole.toUpperCase() as keyof typeof Role;
      if (!Role[newRole]) {
        callback?.({
          text: `Invalid role: ${roleData.newRole}. Must be owner, admin, or member`,
          error: true
        });
        return {
          text: `Invalid role: ${roleData.newRole}. Must be owner, admin, or member`,
          values: { success: false, error: 'invalid_role' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      // Find the target user
      const targetUserId: UUID | undefined = roleData.targetUserId;
      if (!targetUserId && roleData.targetUser) {
        // TODO: Resolve user name to ID using entity resolution
        callback?.({
          text: 'User name resolution not yet implemented. Please provide user ID',
          error: true
        });
        return {
          text: 'User name resolution not yet implemented. Please provide user ID',
          values: { success: false, error: 'name_resolution_unavailable' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      if (!targetUserId) {
        callback?.({
          text: 'No target user specified',
          error: true
        });
        return {
          text: 'No target user specified',
          values: { success: false, error: 'no_target_user' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      // Check current role of target
      const currentTargetRole = world.roles?.[targetUserId] || null;

      // Validate permission to make this change
      if (!canModifyRole(senderRole as Role, currentTargetRole as Role | null, Role[newRole])) {
        callback?.({
          text: "You don't have permission to make this role change",
          error: true
        });
        return {
          text: "You don't have permission to make this role change",
          values: { success: false, error: 'role_change_forbidden' },
          data: { action: 'UPDATE_ROLE' }
        };
      }

      // Update the role in the world
      if (!world.roles) {
        world.roles = {};
      }
      world.roles[targetUserId] = Role[newRole];

      // Persist the change
      // TODO: Call world persistence service

      logger.info(`Role updated: ${targetUserId} is now ${newRole}`);

      callback?.({
        text: `Role updated: ${targetUserId} is now ${newRole.toLowerCase()}`
      });

      return {
        text: `Role updated: ${targetUserId} is now ${newRole.toLowerCase()}`,
        values: {
          success: true,
          targetUserId,
          oldRole: currentTargetRole,
          newRole: Role[newRole],
          updatedBy: message.entityId
        },
        data: {
          action: 'UPDATE_ROLE',
          roleChangeData: {
            targetUserId,
            oldRole: currentTargetRole,
            newRole: Role[newRole],
            updatedBy: message.entityId,
            timestamp: new Date().toISOString()
          }
        }
      };
    } catch (error) {
      logger.error('Error updating role:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      callback?.({
        text: errorMessage,
        error: true
      });
      return {
        text: errorMessage,
        values: {
          success: false,
          error: errorMessage
        },
        data: {
          action: 'UPDATE_ROLE',
          errorType: 'role_update_error',
          errorDetails: error instanceof Error ? error.stack : undefined
        }
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Make Bob an admin'
        }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Bob has been promoted to admin role',
          actions: ['UPDATE_ROLE']
        }
      }
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Promote Alice to admin and then notify all members about the change'
        }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll promote Alice to admin and then notify all members about the role change.',
          thought: 'User wants me to update Alice\'s role and then broadcast the change - I should handle the role update first, then notify members.',
          actions: ['UPDATE_ROLE']
        }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Alice has been promoted to admin! Now notifying all members about this change...',
          thought: 'Role update completed successfully. I can now send notifications to all members about Alice\'s promotion.',
          actions: ['NOTIFY_MEMBERS']
        }
      }
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Demote user-123 to member and log this action for audit purposes'
        }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'I\'ll update user-123\'s role to member and create an audit log entry.',
          thought: 'User wants role demotion followed by audit logging - I should process the role change first, then create the audit record.',
          actions: ['UPDATE_ROLE']
        }
      },
      {
        name: '{{agent}}',
        content: {
          text: 'user-123 role has been updated to member. Now creating audit log entry...',
          thought: 'Role change completed. I can now log this action with the role change details for audit purposes.',
          actions: ['CREATE_AUDIT_LOG']
        }
      }
    ]
  ] as ActionExample[][]
};
