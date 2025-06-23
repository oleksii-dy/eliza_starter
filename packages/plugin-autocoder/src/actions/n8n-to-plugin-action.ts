import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionExample,
  elizaLogger,
} from '@elizaos/core';
import { z } from 'zod';
import { N8nToPluginService, PluginGenerationSpec } from '../services/n8n-to-plugin-service.js';
import { N8nWorkflowService } from '../services/n8n-workflow-service.js';

// Schema for plugin generation from workflows
const PluginGenerationSchema = z.object({
  pluginName: z.string().describe('Name of the plugin to generate'),
  pluginDescription: z.string().describe('Description of the plugin'),
  workflows: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        nodes: z.array(z.any()).optional(),
        triggers: z.array(z.any()).optional(),
        connections: z.array(z.any()).optional(),
      })
    )
    .optional(),
  workflowIds: z.array(z.string()).optional().describe('IDs of existing workflows to convert'),
  config: z
    .object({
      enableCaching: z.boolean().optional().default(true),
      enableStateManagement: z.boolean().optional().default(true),
      cacheTTL: z.number().optional().default(300),
      generateTests: z.boolean().optional().default(true),
      generateDocs: z.boolean().optional().default(true),
    })
    .optional(),
});

// Helper functions
function extractPluginDescription(text: string): string {
  return text.replace(/create|make|build|generate|plugin|elizaos|I need a?/gi, '').trim();
}

function extractProjectId(text: string): string | null {
  // Extract UUID pattern from text
  const match = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
  return match ? match[0] : null;
}

// Helper to generate workflow specifications
async function generateWorkflowSpecs(runtime: IAgentRuntime, description: string): Promise<any[]> {
  const anthropic = runtime.getSetting('ANTHROPIC_API_KEY')
    ? new (await import('@anthropic-ai/sdk')).default({
        apiKey: runtime.getSetting('ANTHROPIC_API_KEY'),
      })
    : null;

  if (!anthropic) {
    // Fallback: create basic workflow specs
    return [
      {
        name: 'Main Workflow',
        description: description,
        nodes: [{ type: 'n8n-nodes-base.webhook', name: 'Webhook' }],
      },
    ];
  }

  const prompt = `Design n8n workflows for this plugin requirement:

"${description}"

Create an array of workflow specifications. Consider:
- User-triggered actions (webhook workflows)
- Data fetching operations (HTTP request workflows)  
- Scheduled/background tasks (cron workflows)
- Integration points with external services

Each workflow should have:
- name: Clear workflow name
- description: What it does
- nodes: Array of n8n nodes needed
- triggers: Any trigger configurations
- connections: How nodes connect

Return ONLY a JSON array of workflow specifications.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response from Claude');
  }

  const jsonMatch = content.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON array found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

// Helper to generate plugin name
function generatePluginName(description: string): string {
  const words = description.toLowerCase().split(/\s+/);
  const mainWord = words.find((w) => w.length > 4) || words[0] || 'plugin';
  return `@elizaos/plugin-${mainWord.replace(/[^a-z0-9]/g, '')}`;
}

// Helper to wait for workflows to complete
async function waitForWorkflows(
  service: N8nWorkflowService,
  jobIds: string[],
  timeout: number
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const allCompleted = jobIds.every((id) => {
      const job = service.getJobStatus(id);
      return job && (job.status === 'completed' || job.status === 'failed');
    });

    if (allCompleted) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  elizaLogger.warn('[CreatePlugin] Workflow generation timeout - proceeding anyway');
}

/**
 * @description Action to create ElizaOS plugins from natural language descriptions.
 * Users can describe what they want the plugin to do, and the system will
 * automatically generate n8n workflows and convert them to plugin components.
 */
export const createPluginAction: Action = {
  name: 'createPlugin',
  similes: [
    'create a plugin',
    'make a plugin',
    'build a plugin',
    'generate a plugin',
    'plugin for',
    'plugin that',
    'I need a plugin',
    'create elizaos plugin',
  ],
  description: 'Create a new ElizaOS plugin from a natural language description',
  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Create a plugin that monitors GitHub repositories for new issues',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll create a GitHub monitoring plugin for you. The plugin will check for new issues and notify you when they appear.",
          actions: ['createPlugin'],
        },
      },
    ],
    [
      {
        name: '{{userName}}',
        content: {
          text: 'I need a plugin to analyze social media sentiment',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll create a social media sentiment analysis plugin. It will fetch posts and analyze their sentiment.",
          actions: ['createPlugin'],
        },
      },
    ],
  ] as ActionExample[][],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService('n8n-to-plugin');
    return !!service;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      elizaLogger.info('[CreatePlugin] Designing plugin architecture from description');

      // Extract plugin description from message
      const description = extractPluginDescription(message.content?.text || '');

      if (!description) {
        await callback?.({
          text: 'Please describe what you want the plugin to do. For example: "Create a plugin that monitors weather and sends alerts"',
          content: { error: 'No plugin description provided' },
        });
        return;
      }

      // Get the N8nToPluginService
      const service = runtime.getService('n8n-to-plugin') as any;
      if (!service) {
        throw new Error('N8n to plugin service not available');
      }

      // Create plugin from description
      const result = await service.createPluginFromDescription(description);

      await callback?.({
        text: `Creating plugin from description: "${description}"\n\nProject ID: ${result.projectId}\nStatus: ${result.status}`,
        content: result,
      });
    } catch (error) {
      elizaLogger.error('[CreatePlugin]', { error });
      await callback?.({
        text: `Failed to create plugin: ${error instanceof Error ? error.message : 'Unknown error'}`,
        content: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  },
};

/**
 * @description Action to check the status of plugin generation
 */
export const checkPluginStatusAction: Action = {
  name: 'checkPluginStatus',
  similes: [
    'check plugin status',
    'plugin status',
    'check plugin',
    'plugin progress',
    'generation status',
  ],
  description: 'Check the status of a plugin generation job',
  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Check the status of my plugin generation',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll check the status of your plugin generation.",
          actions: ['checkPluginStatus'],
        },
      },
    ],
  ] as ActionExample[][],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService('n8n-to-plugin');
    return !!service;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    const service = runtime.getService('n8n-to-plugin') as any;

    if (!service) {
      throw new Error('Plugin generation service not available');
    }

    // Extract project ID from message
    const projectId = extractProjectId(message.content?.text || '');

    if (!projectId) {
      await callback?.({
        text: 'Please provide the project ID to check status. You can find it in the response when you created the plugin.',
        content: { error: 'No project ID provided' },
      });
      return;
    }

    try {
      const status = await service.checkPluginStatus(projectId);

      let statusText = '';
      if (status.status === 'completed') {
        statusText = `Plugin generation completed!\n\nPlugin Path: ${status.result?.pluginPath}\n\nComponents created:\n`;
        if (status.result?.components) {
          statusText += `- Actions: ${status.result.components.actions?.join(', ') || 'None'}\n`;
          statusText += `- Providers: ${status.result.components.providers?.join(', ') || 'None'}\n`;
          statusText += `- Services: ${status.result.components.services?.join(', ') || 'None'}`;
        }
      } else if (status.status === 'failed') {
        statusText = `Plugin generation failed: ${status.error || 'Unknown error'}`;
      } else {
        statusText = `Plugin generation is ${status.status}`;
        if (status.progress) {
          statusText += ` (${status.progress}% complete)`;
        }
      }

      await callback?.({
        text: statusText,
        content: status,
      });
    } catch (error) {
      await callback?.({
        text: `Failed to check plugin status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        content: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  },
};

/**
 * @description Advanced action for creating plugins with custom n8n workflows
 */
export const createPluginWithWorkflowsAction: Action = {
  name: 'createPluginWithWorkflows',
  similes: [
    'create plugin with workflows',
    'design plugin workflows',
    'create plugin with custom workflows',
    'advanced plugin creation',
  ],
  description: 'Create a plugin with custom n8n workflow designs',
  examples: [
    [
      {
        name: '{{userName}}',
        content: {
          text: 'Create a plugin with custom workflows for data processing',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll create a plugin with custom workflow designs for data processing.",
          actions: ['createPluginWithWorkflows'],
        },
      },
    ],
  ] as ActionExample[][],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
    const service = runtime.getService('n8n-to-plugin');
    return !!service;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      elizaLogger.info('[CreatePluginWithWorkflows] Designing custom workflows');

      const service = runtime.getService('n8n-to-plugin') as any;
      if (!service) {
        throw new Error('N8n to plugin service not available');
      }

      // Extract description and workflows
      const description = extractPluginDescription(message.content?.text || '');
      const workflows = (message.content as any)?.workflows || [];

      const result = await service.createPluginWithWorkflows(
        description,
        workflows.length > 0 ? workflows : undefined
      );

      await callback?.({
        text: `Creating plugin with custom workflows\n\nProject ID: ${result.projectId}\nStatus: ${result.status}`,
        content: result,
      });
    } catch (error) {
      elizaLogger.error('[CreatePluginWithWorkflows]', { error });
      await callback?.({
        text: `Failed to create plugin with workflows: ${error instanceof Error ? error.message : 'Unknown error'}`,
        content: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
    }
  },
};

/**
 * Legacy action name for backward compatibility
 */
export const convertN8nToPluginAction = createPluginAction;

/**
 * Legacy action names for backward compatibility
 */
export const checkN8nPluginStatusAction = checkPluginStatusAction;

/**
 * Legacy action name for backward compatibility
 */
export const createN8nPluginFromDescriptionAction = createPluginWithWorkflowsAction;
