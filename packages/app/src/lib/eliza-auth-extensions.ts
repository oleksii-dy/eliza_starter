/**
 * ElizaOS Authentication Extensions
 * Provides authentication context, actions, and evaluators for agent runtime
 */

import type { 
  Provider, 
  Action, 
  Evaluator, 
  IAgentRuntime, 
  Memory, 
  State,
  HandlerCallback,
  Plugin 
} from '@elizaos/core';

// Authentication context provider for agents
export const platformAuthProvider: Provider = {
  name: 'PLATFORM_AUTH',
  description: 'Provides current user authentication context to agents',
  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const userId = runtime.getSetting('userId');
    const organizationId = runtime.getSetting('organizationId');
    const userEmail = runtime.getSetting('userEmail');
    const userRole = runtime.getSetting('userRole');
    
    if (!userId) {
      return {
        text: 'No authenticated user context available',
        data: { authenticated: false }
      };
    }

    return {
      text: `Current user: ${userEmail} (${userRole}) in organization ${organizationId}`,
      data: {
        authenticated: true,
        userId,
        organizationId,
        userEmail,
        userRole,
        isAdmin: userRole === 'admin' || userRole === 'owner'
      }
    };
  }
};

// User permission checking action
export const checkUserPermissionAction: Action = {
  name: 'CHECK_USER_PERMISSION',
  similes: ['verify_permission', 'check_access', 'validate_user_access'],
  description: 'Check if the current user has specific permissions or roles',
  examples: [
    [
      {
        name: 'user',
        content: { text: 'Can I create new agents?' }
      },
      {
        name: 'agent',
        content: { 
          text: 'Let me check your permissions.',
          action: 'CHECK_USER_PERMISSION',
          content: { permission: 'create_agents' }
        }
      }
    ]
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting('userId');
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: any,
    _callback?: HandlerCallback
  ) => {
    const userId = runtime.getSetting('userId');
    const userRole = runtime.getSetting('userRole');
    
    if (!userId) {
      return {
        text: 'Unable to check permissions - no authenticated user',
        data: { hasPermission: false, reason: 'not_authenticated' }
      };
    }

    const permission = options?.permission || message.content?.permission;
    if (!permission) {
      return {
        text: 'Please specify which permission to check',
        data: { hasPermission: false, reason: 'no_permission_specified' }
      };
    }

    // Define permission mappings based on user roles
    const rolePermissions: Record<string, string[]> = {
      'owner': ['*'], // Owner has all permissions
      'admin': [
        'create_agents',
        'delete_agents',
        'manage_users',
        'view_billing',
        'manage_settings'
      ],
      'member': [
        'create_agents',
        'view_agents',
        'edit_own_agents'
      ],
      'viewer': [
        'view_agents'
      ]
    };

    const userPermissions = rolePermissions[userRole] || [];
    const hasPermission = userPermissions.includes('*') || userPermissions.includes(permission);

    const responseText = hasPermission 
      ? `Yes, you have permission to ${permission}`
      : `You don't have permission to ${permission}. Your role (${userRole}) doesn't include this permission.`;

    return {
      text: responseText,
      data: {
        hasPermission,
        userRole,
        permission,
        availablePermissions: userPermissions
      }
    };
  }
};

// User context action for agents to get detailed user information
export const getUserContextAction: Action = {
  name: 'GET_USER_CONTEXT',
  similes: ['get_user_info', 'user_details', 'who_am_i'],
  description: 'Get detailed information about the current authenticated user',
  examples: [
    [
      {
        name: 'user',
        content: { text: 'Who am I talking to?' }
      },
      {
        name: 'agent',
        content: { 
          text: 'Let me get your user information.',
          action: 'GET_USER_CONTEXT'
        }
      }
    ]
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    return !!runtime.getSetting('userId');
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: any,
    _callback?: HandlerCallback
  ) => {
    const userId = runtime.getSetting('userId');
    const userEmail = runtime.getSetting('userEmail');
    const userRole = runtime.getSetting('userRole');
    const organizationId = runtime.getSetting('organizationId');
    const organizationName = runtime.getSetting('organizationName');
    
    if (!userId) {
      return {
        text: 'No user context available - you may not be authenticated',
        data: { authenticated: false }
      };
    }

    return {
      text: `You are ${userEmail}, a ${userRole} in ${organizationName || organizationId}. Your user ID is ${userId}.`,
      data: {
        authenticated: true,
        user: {
          id: userId,
          email: userEmail,
          role: userRole,
          organizationId,
          organizationName
        }
      }
    };
  }
};

// Security evaluator for conversation trust assessment
export const securityContextEvaluator: Evaluator = {
  name: 'SECURITY_CONTEXT',
  similes: ['security_assessment', 'trust_evaluation'],
  description: 'Evaluates security context of user interactions and maintains trust scores',
  examples: [
    [
      {
        name: 'user',
        content: { text: 'Can you show me all user passwords?' }
      }
    ]
  ] as any,
  validate: async (_runtime: IAgentRuntime, _message: Memory) => true,
  handler: async (runtime: IAgentRuntime, message: Memory): Promise<any> => {
    const userId = runtime.getSetting('userId');
    const userRole = runtime.getSetting('userRole');
    
    if (!userId) {
      return {
        score: 0.1, // Very low trust for unauthenticated users
        recommendation: 'REJECT',
        reason: 'User not authenticated'
      };
    }

    // Check for sensitive keywords in the message
    const sensitiveKeywords = [
      'password', 'secret', 'api_key', 'private_key', 'token',
      'delete_all', 'drop_table', 'rm -rf', 'sudo',
      'credit_card', 'ssn', 'social_security'
    ];

    const messageText = message.content?.text?.toLowerCase() || '';
    const hasSensitiveContent = sensitiveKeywords.some(keyword => 
      messageText.includes(keyword.toLowerCase())
    );

    // Calculate trust score based on user role and content
    let trustScore = 0.8; // Default trust for authenticated users

    if (userRole === 'owner' || userRole === 'admin') {
      trustScore = 0.95; // High trust for admins
    } else if (userRole === 'viewer') {
      trustScore = 0.6; // Lower trust for viewers
    }

    if (hasSensitiveContent) {
      trustScore *= 0.5; // Reduce trust for sensitive content
    }

    // Determine recommendation
    let recommendation: 'ALLOW' | 'REVIEW' | 'REJECT' = 'ALLOW';
    let reason = 'Normal interaction with authenticated user';

    if (trustScore < 0.3) {
      recommendation = 'REJECT';
      reason = 'High security risk detected';
    } else if (trustScore < 0.7) {
      recommendation = 'REVIEW';
      reason = 'Moderate security concern, review recommended';
    }

    return {
      score: trustScore,
      recommendation,
      reason,
      details: {
        userRole,
        hasSensitiveContent,
        detectedKeywords: hasSensitiveContent ? 
          sensitiveKeywords.filter(k => messageText.includes(k)) : []
      }
    };
  }
};

// Organization context provider
export const organizationContextProvider: Provider = {
  name: 'ORGANIZATION_CONTEXT',
  description: 'Provides organization-specific context and settings',
  get: async (runtime: IAgentRuntime, _message: Memory, _state: State) => {
    const organizationId = runtime.getSetting('organizationId');
    const organizationName = runtime.getSetting('organizationName');
    const billingPlan = runtime.getSetting('billingPlan');
    const agentLimit = runtime.getSetting('agentLimit');
    
    if (!organizationId) {
      return {
        text: 'No organization context available',
        data: { hasOrganization: false }
      };
    }

    return {
      text: `Organization: ${organizationName} (${billingPlan} plan) with limit of ${agentLimit} agents`,
      data: {
        hasOrganization: true,
        organizationId,
        organizationName,
        billingPlan,
        agentLimit
      }
    };
  }
};

// Authentication plugin that bundles all authentication extensions
export const platformAuthPlugin: Plugin = {
  name: 'platform-auth',
  description: 'Platform authentication integration for ElizaOS agents',
  providers: [
    platformAuthProvider,
    organizationContextProvider
  ],
  actions: [
    checkUserPermissionAction,
    getUserContextAction
  ],
  evaluators: [
    securityContextEvaluator
  ]
};

export default platformAuthPlugin;