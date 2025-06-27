import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  elizaLogger,
} from '@elizaos/core';

export interface SecretRequirement {
  key: string;
  name: string;
  description: string;
  required: boolean;
  type: 'text' | 'password' | 'url' | 'token';
  validation?: RegExp;
  placeholder?: string;
}

export interface SecretsFormRequest {
  id: string;
  title: string;
  description: string;
  secrets: SecretRequirement[];
  projectId?: string;
  context: {
    action: string;
    details: string;
    priority: 'low' | 'medium' | 'high';
  };
}

export const requestSecretsFormAction: Action = {
  name: 'REQUEST_SECRETS_FORM',
  similes: [
    'SHOW_SECRETS_FORM',
    'COLLECT_SECRETS',
    'NEED_API_KEYS',
    'REQUEST_CREDENTIALS',
    'SETUP_SECRETS',
  ],
  description:
    'Request secrets from the user through a dynamic form interface in the autocoder workspace',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    try {
      // Check if we're in an autocoder context
      const isAutocoderContext =
        message.content.source === 'autocoder' ||
        state?.values?.projectType === 'autocoder' ||
        message.roomId?.includes('autocoder');

      if (!isAutocoderContext) {
        return false;
      }

      // Check if secrets manager is available
      const secretsService = runtime.getService('SECRETS');
      if (!secretsService) {
        elizaLogger.warn('Secrets service not available for form request');
        return false;
      }

      // Validate that we can parse secret requirements from the message
      const text = message.content.text?.toLowerCase() || '';

      const needsSecrets =
        text.includes('api key') ||
        text.includes('token') ||
        text.includes('secret') ||
        text.includes('credential') ||
        text.includes('password') ||
        text.includes('config') ||
        text.includes('environment variable') ||
        text.includes('missing') ||
        text.includes('setup') ||
        // Check for service-specific keywords that would trigger secret requirements
        text.includes('openai') ||
        text.includes('gpt') ||
        text.includes('discord') ||
        text.includes('stripe') ||
        text.includes('github') ||
        text.includes('database') ||
        text.includes('postgres') ||
        text.includes('mysql') ||
        text.includes('mongodb') ||
        state?.values?.missingSecrets;

      return needsSecrets;
    } catch (error) {
      elizaLogger.error('Error validating secrets form request:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ) => {
    try {
      elizaLogger.info('Starting secrets form request process');

      // Analyze the message to determine what secrets are needed
      const secretRequirements = await analyzeSecretRequirements(runtime, message, state);

      if (secretRequirements.length === 0) {
        await callback?.({
          text: "I couldn't determine what specific secrets or API keys you need. Could you please be more specific about what you're trying to set up?",
          thought: 'No specific secret requirements could be parsed from the request',
        });
        return { text: 'No secrets identified' };
      }

      // Create form request
      const formRequest: SecretsFormRequest = {
        id: `secrets-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Configuration Required',
        description: 'Please provide the following configuration values to continue:',
        secrets: secretRequirements,
        projectId: state?.values?.projectId || message.roomId,
        context: {
          action: extractActionFromMessage(message),
          details: message.content.text || 'Setting up project configuration',
          priority: determinePriority(secretRequirements),
        },
      };

      // Get secrets manager service
      const secretsService = runtime.getService('SECRETS');
      if (!secretsService) {
        throw new Error('Secrets service not available');
      }

      // Create the form and get the secure URL
      const formResponse = await (secretsService as any).createSecretForm({
        formId: formRequest.id,
        title: formRequest.title,
        description: formRequest.description,
        fields: secretRequirements.map((req) => ({
          name: req.key,
          label: req.name,
          description: req.description,
          type: req.type,
          required: req.required,
          validation: req.validation?.source,
          placeholder: req.placeholder,
        })),
        metadata: {
          projectId: formRequest.projectId,
          context: formRequest.context,
          agentId: runtime.agentId,
          requestTime: new Date().toISOString(),
        },
      });

      elizaLogger.info('Created secrets form:', { formId: formRequest.id, url: formResponse.url });

      // Broadcast form injection request via WebSocket
      await broadcastFormInjection(runtime, formRequest, formResponse.url);

      // Store form request for tracking
      await runtime.createMemory(
        {
          entityId: runtime.agentId,
          roomId: message.roomId,
          content: {
            text: `Secrets form requested: ${formRequest.title}`,
            source: 'autocoder',
            type: 'secrets_form_request',
            formData: formRequest,
            formUrl: formResponse.url,
          },
          metadata: {
            type: 'secrets_form',
            formId: formRequest.id,
            status: 'pending',
          },
        },
        'memories'
      );

      // Provide immediate response to user
      const responseText = `I need some configuration values to continue. I've opened a secure form in your workspace where you can enter the required information:

${secretRequirements.map((req) => `• **${req.name}**: ${req.description}`).join('\n')}

Please fill out the form above to proceed with the setup.`;

      await callback?.({
        text: responseText,
        thought: `Created secrets form with ${secretRequirements.length} required fields. Waiting for user input.`,
        action: 'REQUEST_SECRETS_FORM',
        metadata: {
          formId: formRequest.id,
          secretsCount: secretRequirements.length,
          formUrl: formResponse.url,
        },
      });

      return {
        text: responseText,
        data: {
          formRequest,
          formUrl: formResponse.url,
          status: 'form_created',
        },
      };
    } catch (error) {
      elizaLogger.error('Error in secrets form request:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      await callback?.({
        text: 'I encountered an error while trying to set up the configuration form. Let me try a different approach to collect the needed information.',
        thought: `Error creating secrets form: ${errorMessage}`,
      });

      throw error;
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: { text: "I want to create a Discord bot but I don't have the API key set up" },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I need some configuration values to create your Discord bot. I've opened a secure form in your workspace where you can enter the required information:\n\n• **Discord Bot Token**: Your Discord application bot token from the Discord Developer Portal\n• **Discord Client ID**: Your Discord application client ID\n\nPlease fill out the form above to proceed with the setup.",
          action: 'REQUEST_SECRETS_FORM',
        },
      },
    ],
    [
      {
        user: '{{user}}',
        content: { text: 'Create a web scraper that uses OpenAI for analysis' },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I need some configuration values to continue. I've opened a secure form in your workspace where you can enter the required information:\n\n• **OpenAI API Key**: Your OpenAI API key for AI analysis features\n\nPlease fill out the form above to proceed with the setup.",
          action: 'REQUEST_SECRETS_FORM',
        },
      },
    ],
    [
      {
        user: '{{user}}',
        content: { text: 'The build is failing because DATABASE_URL is missing' },
      },
      {
        user: '{{agent}}',
        content: {
          text: "I need some configuration values to continue. I've opened a secure form in your workspace where you can enter the required information:\n\n• **Database URL**: Connection string for your database (postgres://user:pass@host:port/db)\n\nPlease fill out the form above to proceed with the setup.",
          action: 'REQUEST_SECRETS_FORM',
        },
      },
    ],
  ],
};

// Helper function to analyze message and determine required secrets
async function analyzeSecretRequirements(
  runtime: IAgentRuntime,
  message: Memory,
  state?: State
): Promise<SecretRequirement[]> {
  const requirements: SecretRequirement[] = [];
  const text = message.content.text?.toLowerCase() || '';

  // Common API patterns
  const patterns = [
    {
      keywords: ['openai', 'gpt', 'ai analysis', 'llm'],
      secret: {
        key: 'OPENAI_API_KEY',
        name: 'OpenAI API Key',
        description: 'Your OpenAI API key for AI features',
        required: true,
        type: 'password' as const,
        validation: /^sk-[a-zA-Z0-9]{32,}$/,
        placeholder: 'sk-...',
      },
    },
    {
      keywords: ['discord', 'discord bot', 'discord api'],
      secret: {
        key: 'DISCORD_TOKEN',
        name: 'Discord Bot Token',
        description: 'Your Discord application bot token from the Discord Developer Portal',
        required: true,
        type: 'password' as const,
        placeholder: 'Your Discord bot token',
      },
    },
    {
      keywords: ['database', 'db', 'postgres', 'mysql', 'mongodb'],
      secret: {
        key: 'DATABASE_URL',
        name: 'Database URL',
        description: 'Connection string for your database (postgres://user:pass@host:port/db)',
        required: true,
        type: 'url' as const,
        placeholder: 'postgres://username:password@localhost:5432/dbname',
      },
    },
    {
      keywords: ['stripe', 'payment', 'billing'],
      secret: {
        key: 'STRIPE_SECRET_KEY',
        name: 'Stripe Secret Key',
        description: 'Your Stripe secret key for payment processing',
        required: true,
        type: 'password' as const,
        validation: /^sk_(test|live)_[a-zA-Z0-9]{24,}$/,
        placeholder: 'sk_test_...',
      },
    },
    {
      keywords: ['github', 'git', 'repository'],
      secret: {
        key: 'GITHUB_TOKEN',
        name: 'GitHub Personal Access Token',
        description: 'GitHub token for repository access and API calls',
        required: true,
        type: 'password' as const,
        placeholder: 'ghp_...',
      },
    },
    {
      keywords: ['sendgrid', 'email', 'smtp'],
      secret: {
        key: 'SENDGRID_API_KEY',
        name: 'SendGrid API Key',
        description: 'SendGrid API key for email sending',
        required: true,
        type: 'password' as const,
        placeholder: 'SG...',
      },
    },
  ];

  // Check for missing secrets in state
  if (state?.values?.missingSecrets) {
    const missing = Array.isArray(state.values.missingSecrets)
      ? state.values.missingSecrets
      : [state.values.missingSecrets];

    for (const secretKey of missing) {
      const pattern = patterns.find(
        (p) =>
          p.secret.key === secretKey || p.secret.key.toLowerCase().includes(secretKey.toLowerCase())
      );

      if (pattern) {
        requirements.push(pattern.secret);
      } else {
        // Generic secret requirement
        requirements.push({
          key: secretKey,
          name: secretKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          description: `Environment variable: ${secretKey}`,
          required: true,
          type: 'text',
          placeholder: `Your ${secretKey.toLowerCase()} value`,
        });
      }
    }
  }

  // Pattern matching in message text
  for (const pattern of patterns) {
    const matches = pattern.keywords.some((keyword) => text.includes(keyword));
    if (matches && !requirements.some((req) => req.key === pattern.secret.key)) {
      requirements.push(pattern.secret);
    }
  }

  return requirements;
}

// Helper to extract the main action from the message
function extractActionFromMessage(message: Memory): string {
  const text = message.content.text || '';

  if (text.includes('create') || text.includes('build')) return 'create';
  if (text.includes('deploy') || text.includes('publish')) return 'deploy';
  if (text.includes('setup') || text.includes('configure')) return 'setup';
  if (text.includes('fix') || text.includes('error')) return 'fix';

  return 'configure';
}

// Helper to determine priority based on secret requirements
function determinePriority(requirements: SecretRequirement[]): 'low' | 'medium' | 'high' {
  if (requirements.length === 0) return 'low';
  if (requirements.length >= 3) return 'high';

  const criticalKeys = ['DATABASE_URL', 'OPENAI_API_KEY', 'STRIPE_SECRET_KEY'];
  const hasCritical = requirements.some((req) => criticalKeys.includes(req.key));

  return hasCritical ? 'high' : 'medium';
}

// Helper to broadcast form injection request
async function broadcastFormInjection(
  runtime: IAgentRuntime,
  formRequest: SecretsFormRequest,
  formUrl: string
) {
  try {
    // Check if there's a WebSocket service or messaging service
    const wsService = runtime.getService('websocket') || runtime.getService('messaging');

    if (wsService && typeof (wsService as any).broadcast === 'function') {
      await (wsService as any).broadcast('secrets_form_injection', {
        type: 'INJECT_SECRETS_FORM',
        data: {
          formRequest,
          formUrl,
          timestamp: new Date().toISOString(),
        },
      });

      elizaLogger.info('Broadcasted form injection request via WebSocket');
    } else {
      elizaLogger.warn('No WebSocket service available for form injection broadcast');
    }
  } catch (error) {
    elizaLogger.error('Error broadcasting form injection:', error);
    // Don't throw - this is not critical for the main flow
  }
}
