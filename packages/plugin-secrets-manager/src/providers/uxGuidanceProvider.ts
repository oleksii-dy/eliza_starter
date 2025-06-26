import {
  type IAgentRuntime,
  type Memory,
  type State,
  type Provider,
  type ProviderResult,
  logger as elizaLogger,
} from '@elizaos/core';
import { EnhancedSecretManager } from '../enhanced-service';
import { ActionChainService } from '../services/action-chain-service';
import type { SecretContext } from '../types';

export interface UXGuidanceResponse {
  suggestions: UXSuggestion[];
  quickActions: QuickAction[];
  contextualHelp: ContextualHelp;
  statusSummary: StatusSummary;
}

export interface UXSuggestion {
  id: string;
  type: 'setup' | 'security' | 'optimization' | 'workflow' | 'troubleshooting';
  title: string;
  description: string;
  actionId?: string;
  workflowId?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dismissible: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  actionName: string;
  params?: any;
  icon?: string;
  category: 'secrets' | 'workflows' | 'security' | 'help';
}

export interface ContextualHelp {
  currentContext: string;
  relevantDocs: DocLink[];
  commonTasks: CommonTask[];
  troubleshooting: TroubleshootingTip[];
}

export interface DocLink {
  title: string;
  url: string;
  description: string;
}

export interface CommonTask {
  title: string;
  description: string;
  steps: string[];
  actionName?: string;
}

export interface TroubleshootingTip {
  issue: string;
  solution: string;
  actionName?: string;
}

export interface StatusSummary {
  totalSecrets: number;
  missingSecrets: number;
  expiredSecrets: number;
  weakSecrets: number;
  lastActivity: string;
  securityScore: number;
}

export const uxGuidanceProvider: Provider = {
  name: 'UX_GUIDANCE',
  description:
    'Provides interactive UI guidance, contextual help suggestions, and smart workflows for secure secret management when user needs assistance with API keys or configuration',

  get: async (runtime: IAgentRuntime, message: Memory, _state: State): Promise<ProviderResult> => {
    elizaLogger.info('[UXGuidanceProvider] Generating UX guidance');

    const secretsManager = runtime.getService(EnhancedSecretManager);
    const actionChainService = runtime.getService(ActionChainService);

    const context: SecretContext = {
      level: 'user',
      userId: message.entityId,
      agentId: runtime.agentId,
      requesterId: message.entityId,
    };

    try {
      // Check if services are available
      if (!secretsManager || !actionChainService) {
        return {
          text: JSON.stringify({
            suggestions: [
              {
                id: 'service-unavailable',
                type: 'troubleshooting',
                title: 'Get Help',
                description:
                  'Secret management services are not available. Please contact support.',
                priority: 'high',
                dismissible: false,
              },
            ],
            quickActions: [],
            contextualHelp: {
              currentContext: 'service-error',
              relevantDocs: [],
              commonTasks: [],
              troubleshooting: [
                {
                  issue: 'Service unavailable',
                  solution: 'Contact support for assistance',
                },
              ],
            },
            statusSummary: {
              totalSecrets: 0,
              missingSecrets: 0,
              expiredSecrets: 0,
              weakSecrets: 0,
              lastActivity: 'Unknown',
              securityScore: 0,
            },
          }),
          data: {
            suggestions: [
              {
                id: 'service-unavailable',
                type: 'troubleshooting',
                title: 'Get Help',
                description:
                  'Secret management services are not available. Please contact support.',
                priority: 'high',
                dismissible: false,
              },
            ],
            quickActions: [],
            contextualHelp: {
              currentContext: 'service-error',
              relevantDocs: [],
              commonTasks: [],
              troubleshooting: [
                {
                  issue: 'Service unavailable',
                  solution: 'Contact support for assistance',
                },
              ],
            },
            statusSummary: {
              totalSecrets: 0,
              missingSecrets: 0,
              expiredSecrets: 0,
              weakSecrets: 0,
              lastActivity: 'Unknown',
              securityScore: 0,
            },
          },
        };
      }

      // Get current state
      const userSecrets = await secretsManager.list(context);
      const missingSecrets = await secretsManager.getMissingEnvVars();
      const workflows = actionChainService.getWorkflows();

      // Analyze user's secret management state
      const statusSummary = generateStatusSummary(userSecrets, missingSecrets);

      // Generate contextual suggestions
      const suggestions = generateSuggestions(
        userSecrets,
        missingSecrets,
        workflows,
        statusSummary
      );

      // Generate quick actions
      const quickActions = generateQuickActions(userSecrets, missingSecrets, workflows);

      // Generate contextual help
      const contextualHelp = generateContextualHelp(message, userSecrets, statusSummary);

      const guidance: UXGuidanceResponse = {
        suggestions,
        quickActions,
        contextualHelp,
        statusSummary,
      };

      return {
        text: JSON.stringify(guidance),
        data: guidance,
      };
    } catch (error) {
      elizaLogger.error('[UXGuidanceProvider] Error generating guidance:', error);

      // Return fallback guidance
      const fallbackGuidance: UXGuidanceResponse = {
        suggestions: [
          {
            id: 'fallback-help',
            type: 'troubleshooting',
            title: 'Get Help',
            description: 'Something went wrong. Ask me for help with secret management.',
            priority: 'medium',
            dismissible: true,
          },
        ],
        quickActions: [
          {
            id: 'basic-help',
            label: 'Get Help',
            description: 'Ask for help with secret management',
            actionName: 'REQUEST_SECRET_FORM',
            category: 'help',
          },
        ],
        contextualHelp: {
          currentContext: 'error',
          relevantDocs: [],
          commonTasks: [],
          troubleshooting: [
            {
              issue: 'Service unavailable',
              solution: 'The secret management service may be down. Try again in a moment.',
            },
          ],
        },
        statusSummary: {
          totalSecrets: 0,
          missingSecrets: 0,
          expiredSecrets: 0,
          weakSecrets: 0,
          lastActivity: 'Unknown',
          securityScore: 0,
        },
      };

      return {
        text: JSON.stringify(fallbackGuidance),
        data: fallbackGuidance,
      };
    }
  },
};

function generateStatusSummary(
  userSecrets: Record<string, any>,
  missingSecrets: any[]
): StatusSummary {
  const totalSecrets = Object.keys(userSecrets).length;
  const missingCount = missingSecrets.filter((s) => s.plugin === 'user').length;

  // Analyze secret quality
  let weakSecrets = 0;
  let expiredSecrets = 0;

  Object.values(userSecrets).forEach((secret: any) => {
    if (secret.createdAt && Date.now() - secret.createdAt > 90 * 24 * 60 * 60 * 1000) {
      expiredSecrets++; // Older than 90 days
    }

    if (secret.type === 'api_key' && secret.value && secret.value.length < 32) {
      weakSecrets++; // Suspiciously short API key
    }
  });

  // Calculate security score (0-100)
  let securityScore = 100;
  if (missingCount > 0) {
    securityScore -= missingCount * 10;
  }
  if (expiredSecrets > 0) {
    securityScore -= expiredSecrets * 15;
  }
  if (weakSecrets > 0) {
    securityScore -= weakSecrets * 20;
  }
  securityScore = Math.max(0, securityScore);

  return {
    totalSecrets,
    missingSecrets: missingCount,
    expiredSecrets,
    weakSecrets,
    lastActivity: new Date().toISOString(),
    securityScore,
  };
}

function generateSuggestions(
  userSecrets: Record<string, any>,
  missingSecrets: any[],
  workflows: any[],
  statusSummary: StatusSummary
): UXSuggestion[] {
  const suggestions: UXSuggestion[] = [];

  // New user suggestions
  if (statusSummary.totalSecrets === 0) {
    suggestions.push({
      id: 'welcome-setup',
      type: 'setup',
      title: "Welcome! Let's set up your first secrets",
      description: 'I can help you securely store your API keys and other sensitive information.',
      workflowId: 'user-secret-onboarding',
      priority: 'high',
      dismissible: false,
    });
  }

  // Missing secrets
  if (statusSummary.missingSecrets > 0) {
    suggestions.push({
      id: 'missing-secrets',
      type: 'setup',
      title: `You have ${statusSummary.missingSecrets} missing secrets`,
      description: 'Some plugins require additional API keys to function properly.',
      actionId: 'REQUEST_SECRET_FORM',
      priority: 'high',
      dismissible: true,
    });
  }

  // Security suggestions
  if (statusSummary.securityScore < 80) {
    suggestions.push({
      id: 'security-improvement',
      type: 'security',
      title: 'Improve your security score',
      description: `Your security score is ${statusSummary.securityScore}/100. Let me help you improve it.`,
      workflowId: 'security-audit',
      priority: 'medium',
      dismissible: true,
    });
  }

  // Expired secrets
  if (statusSummary.expiredSecrets > 0) {
    suggestions.push({
      id: 'rotate-expired',
      type: 'security',
      title: 'Some secrets may need rotation',
      description: `${statusSummary.expiredSecrets} secrets are older than 90 days and may need updating.`,
      workflowId: 'secret-rotation',
      priority: 'medium',
      dismissible: true,
    });
  }

  // Workflow suggestions
  if (workflows.length > 0 && statusSummary.totalSecrets > 5) {
    suggestions.push({
      id: 'workflow-optimization',
      type: 'optimization',
      title: 'Automate your secret management',
      description: 'Use workflows to automate common secret management tasks.',
      actionId: 'RUN_WORKFLOW',
      priority: 'low',
      dismissible: true,
    });
  }

  return suggestions;
}

function generateQuickActions(
  userSecrets: Record<string, any>,
  missingSecrets: any[],
  workflows: any[]
): QuickAction[] {
  const actions: QuickAction[] = [
    {
      id: 'add-secret',
      label: 'Add Secret',
      description: 'Add a new API key or secret',
      actionName: 'REQUEST_SECRET_FORM',
      icon: '🔐',
      category: 'secrets',
    },
    {
      id: 'list-secrets',
      label: 'View Secrets',
      description: 'See all your configured secrets',
      actionName: 'MANAGE_SECRET',
      params: { operation: 'list' },
      icon: '📋',
      category: 'secrets',
    },
  ];

  // Add conditional actions
  if (Object.keys(userSecrets).length > 0) {
    actions.push({
      id: 'rotate-secrets',
      label: 'Rotate Secrets',
      description: 'Update your API keys safely',
      actionName: 'RUN_WORKFLOW',
      params: { workflowId: 'secret-rotation' },
      icon: '🔄',
      category: 'security',
    });
  }

  if (workflows.length > 0) {
    actions.push({
      id: 'view-workflows',
      label: 'Workflows',
      description: 'View available automation workflows',
      actionName: 'RUN_WORKFLOW',
      icon: '⚡',
      category: 'workflows',
    });
  }

  actions.push({
    id: 'help-docs',
    label: 'Help & Docs',
    description: 'Get help with secret management',
    actionName: 'SHOW_HELP',
    icon: '❓',
    category: 'help',
  });

  return actions;
}

function generateContextualHelp(
  message: Memory,
  _userSecrets: Record<string, any>,
  _statusSummary: StatusSummary
): ContextualHelp {
  const messageText = message.content.text?.toLowerCase() || '';

  let currentContext = 'general';

  // Check for specific contexts first (more specific patterns win)
  if (messageText.includes('api key')) {
    currentContext = 'api-keys';
  } else if (messageText.includes('workflow')) {
    currentContext = 'workflows';
  } else if (messageText.includes('secret')) {
    currentContext = 'secrets';
  } else if (messageText.includes('help')) {
    currentContext = 'help';
  } else if (
    messageText.includes('error') ||
    messageText.includes('problem') ||
    messageText.includes('broken')
  ) {
    currentContext = 'troubleshooting';
  }

  const relevantDocs: DocLink[] = [
    {
      title: 'Secret Management Guide',
      url: '#secrets-guide',
      description: 'Learn how to securely manage your API keys and secrets',
    },
    {
      title: 'Security Best Practices',
      url: '#security-guide',
      description: 'Follow these practices to keep your secrets safe',
    },
    {
      title: 'Workflow Automation',
      url: '#workflows-guide',
      description: 'Automate common secret management tasks',
    },
  ];

  const commonTasks: CommonTask[] = [
    {
      title: 'Add a new API key',
      description: 'Store a new API key securely',
      steps: [
        'Say "I need to add an API key"',
        'Fill out the secure form that appears',
        'Your key will be encrypted and stored safely',
      ],
      actionName: 'REQUEST_SECRET_FORM',
    },
    {
      title: 'View your secrets',
      description: 'See all configured secrets (values hidden for security)',
      steps: [
        'Say "show my secrets" or "list my secrets"',
        'Review the list of configured secrets',
        'Names and types are shown, but values remain hidden',
      ],
      actionName: 'MANAGE_SECRET',
    },
    {
      title: 'Rotate API keys',
      description: 'Safely update API keys',
      steps: [
        'Say "I need to rotate my keys"',
        'Follow the guided workflow',
        'Old keys are backed up before replacement',
      ],
      actionName: 'RUN_WORKFLOW',
    },
  ];

  const troubleshooting: TroubleshootingTip[] = [
    {
      issue: 'Secret form not loading',
      solution: 'Check if the ngrok service is running and your internet connection is stable.',
    },
    {
      issue: 'API key validation failed',
      solution: 'Make sure you copied the complete API key without extra spaces or characters.',
    },
    {
      issue: 'Permission denied error',
      solution:
        "You can only access your own secrets. Check if you're trying to access the right level (user/world/global).",
    },
  ];

  return {
    currentContext,
    relevantDocs,
    commonTasks,
    troubleshooting,
  };
}
