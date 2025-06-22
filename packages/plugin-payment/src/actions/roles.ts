import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  type ActionExample,
  logger,
  Role,
  ModelType,
  parseJSONObjectFromText,
  type UUID
} from "@elizaos/core";

// Helper function to check if a role can modify another role
const canModifyRole = (currentRole: Role, targetRole: Role | null, newRole: Role): boolean => {
  // Owners can do anything
  if (currentRole === Role.OWNER) return true;
  
  // Admins can modify members and add new members/admins
  if (currentRole === Role.ADMIN) {
    if (!targetRole) return newRole !== Role.OWNER;
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
  name: "UPDATE_ROLE",
  description: "Update a user's role in the world",
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Check if world management is available
    const world = state?.world;
    if (!world) return false;
    
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
          text: "World context not available",
          error: true
        });
        return {};
      }
      
      const senderRole = world.roles?.[message.entityId];
      if (!senderRole || (senderRole !== Role.OWNER && senderRole !== Role.ADMIN)) {
        callback?.({
          text: "You don't have permission to update roles",
          error: true
        });
        return {};
      }
      
      // Parse the role update request
      const prompt = updateRoleTemplate.replace('{{userMessage}}', message.content.text || '');
      
      // TODO: Fix runtime.generate method call
      // const response = await runtime.generateText({
      //   context: prompt,
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
          text: "Could not parse role update request",
          error: true
        });
        return {};
      }
      
      // Validate the new role
      const newRole = roleData.newRole.toUpperCase() as keyof typeof Role;
      if (!Role[newRole]) {
        callback?.({
          text: `Invalid role: ${roleData.newRole}. Must be owner, admin, or member`,
          error: true
        });
        return {};
      }
      
      // Find the target user
      let targetUserId: UUID | undefined = roleData.targetUserId;
      if (!targetUserId && roleData.targetUser) {
        // TODO: Resolve user name to ID using entity resolution
        callback?.({
          text: "User name resolution not yet implemented. Please provide user ID",
          error: true
        });
        return {};
      }
      
      if (!targetUserId) {
        callback?.({
          text: "No target user specified",
          error: true
        });
        return {};
      }
      
      // Check current role of target
      const currentTargetRole = world.roles?.[targetUserId] || null;
      
      // Validate permission to make this change
      if (!canModifyRole(senderRole as Role, currentTargetRole as Role | null, Role[newRole])) {
        callback?.({
          text: "You don't have permission to make this role change",
          error: true
        });
        return {};
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
        data: {
          targetUserId,
          oldRole: currentTargetRole,
          newRole: Role[newRole],
          updatedBy: message.entityId
        }
      };
    } catch (error) {
      logger.error("Error updating role:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      callback?.({
        text: errorMessage,
        error: true
      });
      return {};
    }
  },
  
  examples: [
    [
      {
        name: "Alice",
        content: {
          text: "Make Bob an admin"
        }
      },
      {
        name: "System",
        content: {
          text: "Bob has been promoted to admin role",
          action: "UPDATE_ROLE"
        }
      }
    ],
    [
      {
        name: "Owner",
        content: {
          text: "Update user-123 role to member"
        }
      },
      {
        name: "System",
        content: {
          text: "user-123 role has been updated to member",
          action: "UPDATE_ROLE"
        }
      }
    ]
  ]
}; 