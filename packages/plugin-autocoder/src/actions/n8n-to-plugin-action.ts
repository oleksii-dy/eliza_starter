import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import { z } from 'zod';
import { N8nToPluginService, PluginGenerationSpec } from '../services/n8n-to-plugin-service.js';
import { N8nWorkflowService } from '../services/n8n-workflow-service.js';

// Schema for plugin generation from workflows
const PluginGenerationSchema = z.object({
  pluginName: z.string().describe('Name of the plugin to generate'),
  pluginDescription: z.string().describe('Description of the plugin'),
  workflows: z.array(z.object({
    name: z.string(),
    description: z.string(),
    nodes: z.array(z.any()).optional(),
    triggers: z.array(z.any()).optional(),
    connections: z.array(z.any()).optional(),
  })).optional(),
  workflowIds: z.array(z.string()).optional().describe('IDs of existing workflows to convert'),
  config: z.object({
    enableCaching: z.boolean().optional().default(true),
    enableStateManagement: z.boolean().optional().default(true),
    cacheTTL: z.number().optional().default(300),
    generateTests: z.boolean().optional().default(true),
    generateDocs: z.boolean().optional().default(true),
  }).optional(),
});

/**
 * Action to convert n8n workflows into ElizaOS plugin
 */
export const convertN8nToPluginAction: Action = {
  name: 'convertN8nToPlugin',
  description: 'Convert n8n workflows into a complete ElizaOS plugin with actions, providers, and services',
  similes: [
    'convert n8n to plugin',
    'generate plugin from n8n',
    'create plugin from workflows',
    'transform workflows to plugin',
    'n8n workflow to elizaos',
  ],

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Convert my weather monitoring n8n workflow into an ElizaOS plugin',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: `I'll convert your weather monitoring workflow into an ElizaOS plugin. This will create appropriate actions, providers, or services based on the workflow characteristics.

The conversion will analyze your workflow and:
- Map webhook triggers to actions
- Convert data fetching nodes to providers  
- Transform scheduled/long-running workflows to services
- Add caching and state management where appropriate

Let me start the conversion process...`,
          actions: ['CONVERT_N8N_TO_PLUGIN'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Create a plugin from these n8n workflows with caching enabled',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: `I'll create a plugin from your n8n workflows with caching enabled. Each workflow will be analyzed and converted to the most appropriate ElizaOS component type.

The plugin will include:
- Proper component mapping based on workflow characteristics
- Caching for data providers and services
- State management for persistent data
- Generated tests for all components

Starting the plugin generation now...`,
          actions: ['CONVERT_N8N_TO_PLUGIN'],
        },
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const n8nToPluginService = runtime.getService('n8n-to-plugin');
    return !!n8nToPluginService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, any>,
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      const n8nToPluginService = runtime.getService('n8n-to-plugin') as N8nToPluginService;
      const n8nWorkflowService = runtime.getService('n8n-workflow') as N8nWorkflowService;

      if (!n8nToPluginService) {
        throw new Error('N8n to Plugin service not available');
      }

      let spec: PluginGenerationSpec;

      // Check if user provided a specification
      const content = message.content?.text || '';
      const specMatch = content.match(/\{[\s\S]*\}/);

      if (specMatch) {
        // Parse provided specification
        const parsedSpec = JSON.parse(specMatch[0]);
        PluginGenerationSchema.parse(parsedSpec);

        // If workflowIds provided, fetch the workflows
        if (parsedSpec.workflowIds && parsedSpec.workflowIds.length > 0) {
          const workflows = [];
          for (const id of parsedSpec.workflowIds) {
            const job = n8nWorkflowService?.getJobStatus(id);
            if (job?.result?.workflowJson) {
              workflows.push({
                name: job.specification.name,
                description: job.specification.description,
                ...job.specification,
              });
            }
          }
          parsedSpec.workflows = workflows;
        }

        spec = {
          name: parsedSpec.pluginName,
          description: parsedSpec.pluginDescription,
          workflows: parsedSpec.workflows || [],
          config: parsedSpec.config,
        };
      } else {
        // Generate from natural language
        const description = content
          .replace(/convert|create|generate|plugin|n8n|workflow|elizaos/gi, '')
          .trim();

        spec = await generateSpecFromDescription(runtime, description);
      }

      // Start conversion
      const jobId = await n8nToPluginService.convertWorkflowsToPlugin(spec);

      const response = `🚀 Plugin generation from n8n workflows started!

📋 Job ID: ${jobId}
📦 Plugin Name: ${spec.name}
📝 Description: ${spec.description}
🔄 Workflows to convert: ${spec.workflows.length}

Configuration:
${spec.config?.enableCaching ? '✅ Caching enabled' : '❌ Caching disabled'}
${spec.config?.enableStateManagement ? '✅ State management enabled' : '❌ State management disabled'}
${spec.config?.generateTests ? '✅ Tests will be generated' : '❌ No tests'}
${spec.config?.generateDocs ? '✅ Documentation will be generated' : '❌ No docs'}

The workflows will be analyzed and converted to appropriate ElizaOS components:
• Webhook triggers → Actions
• Data fetching workflows → Providers
• Long-running/scheduled workflows → Services

Use 'checkN8nPluginStatus' to monitor the generation progress.`;

      if (callback) {
        await callback({
          text: response,
          action: 'N8N_PLUGIN_GENERATION_STARTED',
          data: { jobId, spec },
        });
      }
    } catch (error) {
      const errorMessage = `Failed to convert n8n workflows to plugin: ${error instanceof Error ? error.message : String(error)}`;
      elizaLogger.error('[ConvertN8nToPlugin]', error);

      if (callback) {
        await callback({
          text: errorMessage,
          error: true,
        });
      }
    }
  },

  // Helper method to generate spec from description
  async generateSpecFromDescription(
    runtime: IAgentRuntime,
    description: string
  ): Promise<PluginGenerationSpec> {
    const anthropic = runtime.getSetting('ANTHROPIC_API_KEY') ?
      new (await import('@anthropic-ai/sdk')).default({
        apiKey: runtime.getSetting('ANTHROPIC_API_KEY')
      }) : null;

    if (!anthropic) {
      throw new Error('Anthropic API key required for natural language conversion');
    }

    const prompt = `Convert this description into a plugin generation specification:

"${description}"

Generate a JSON object with:
- pluginName: A valid npm package name (e.g., "@elizaos/plugin-weather")
- pluginDescription: Clear description of what the plugin does
- workflows: Array of n8n workflow specifications that would implement this functionality

Consider what types of workflows would be needed:
- Webhook-triggered workflows for user actions
- Data fetching workflows for information providers
- Scheduled workflows for background services

Return ONLY valid JSON.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response from Claude');
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      name: parsed.pluginName,
      description: parsed.pluginDescription,
      workflows: parsed.workflows || [],
      config: {
        enableCaching: true,
        enableStateManagement: true,
        generateTests: true,
        generateDocs: true,
      },
    };
  },
};

// Helper method to generate spec from description
async function generateSpecFromDescription(
  runtime: IAgentRuntime,
  description: string
): Promise<PluginGenerationSpec> {
  const anthropic = runtime.getSetting('ANTHROPIC_API_KEY') ?
    new (await import('@anthropic-ai/sdk')).default({
      apiKey: runtime.getSetting('ANTHROPIC_API_KEY')
    }) : null;

  if (!anthropic) {
    throw new Error('Anthropic API key required for natural language conversion');
  }

  const prompt = `Convert this description into a plugin generation specification:

"${description}"

Generate a JSON object with:
- pluginName: A valid npm package name (e.g., "@elizaos/plugin-weather")
- pluginDescription: Clear description of what the plugin does
- workflows: Array of n8n workflow specifications that would implement this functionality

Consider what types of workflows would be needed:
- Webhook-triggered workflows for user actions
- Data fetching workflows for information providers
- Scheduled workflows for background services

Return ONLY valid JSON.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response from Claude');
  }

  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    name: parsed.pluginName,
    description: parsed.pluginDescription,
    workflows: parsed.workflows || [],
    config: {
      enableCaching: true,
      enableStateManagement: true,
      generateTests: true,
      generateDocs: true,
    },
  };
}

/**
 * Action to check plugin generation status
 */
export const checkN8nPluginStatusAction: Action = {
  name: 'checkN8nPluginStatus',
  description: 'Check the status of n8n to plugin conversion job',
  similes: ['plugin status', 'conversion progress', 'check plugin generation'],

  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    const service = runtime.getService('n8n-to-plugin');
    return !!service;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, any>,
    callback?: HandlerCallback
  ): Promise<void> => {
    const service = runtime.getService('n8n-to-plugin') as N8nToPluginService;

    if (!service) {
      throw new Error('N8n to Plugin service not available');
    }

    const jobs = service.getAllJobs();

    if (jobs.length === 0) {
      if (callback) {
        await callback({
          text: 'No plugin generation jobs found.',
        });
      }
      return;
    }

    // Get specific job if ID provided
    const jobIdMatch = message.content.text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);

    if (jobIdMatch) {
      const job = service.getJobStatus(jobIdMatch[0]);
      if (!job) {
        if (callback) {
          await callback({
            text: `Job ${jobIdMatch[0]} not found.`,
          });
        }
        return;
      }

      jobs.length = 0;
      jobs.push(job);
    }

    const response = `📊 Plugin Generation Status

${jobs.map(job => {
    const statusEmoji = {
      pending: '⏳',
      analyzing: '🔍',
      generating: '⚙️',
      building: '🔨',
      testing: '🧪',
      completed: '✅',
      failed: '❌',
    }[job.status] || '❓';

    let details = `${statusEmoji} Job: ${job.id}
├─ Plugin: ${job.spec.name}
├─ Status: ${job.status}
├─ Progress: ${job.progress}%
├─ Workflows: ${job.spec.workflows.length}
├─ Mappings: ${job.mappings.length} components`;

    if (job.mappings.length > 0) {
      details += '\n├─ Components:';
      const actionCount = job.mappings.filter(m => m.componentType === 'action').length;
      const providerCount = job.mappings.filter(m => m.componentType === 'provider').length;
      const serviceCount = job.mappings.filter(m => m.componentType === 'service').length;

      if (actionCount > 0) {details += `\n│  ├─ Actions: ${actionCount}`;}
      if (providerCount > 0) {details += `\n│  ├─ Providers: ${providerCount}`;}
      if (serviceCount > 0) {details += `\n│  └─ Services: ${serviceCount}`;}
    }

    if (job.status === 'completed' && job.outputPath) {
      details += `\n├─ Output: ${job.outputPath}`;
      details += '\n└─ ✅ Plugin ready for use!';
    } else if (job.status === 'failed' && job.error) {
      details += `\n└─ ❌ Error: ${job.error}`;
    } else {
      details += `\n└─ ⏳ Started: ${new Date(job.startedAt).toLocaleString()}`;
    }

    return details;
  }).join('\n\n')}`;

    if (callback) {
      await callback({
        text: response,
        data: { jobs },
      });
    }
  },
};

/**
 * Action to create a complete ElizaOS plugin from n8n workflow description
 */
export const createN8nPluginFromDescriptionAction: Action = {
  name: 'createN8nPluginFromDescription',
  description: 'Create a complete ElizaOS plugin by first generating n8n workflows then converting them',
  similes: [
    'create plugin with n8n',
    'generate elizaos plugin using workflows',
    'build plugin from workflow description',
  ],

  examples: [
    [
      {
        user: 'Create a weather monitoring plugin that checks temperature every hour and alerts on extreme conditions',
        assistant: `I'll create a weather monitoring plugin for you. First, I'll design the n8n workflows needed, then convert them into an ElizaOS plugin.

This will include:
1. A scheduled workflow to check weather every hour (→ Service)
2. A webhook workflow for manual weather checks (→ Action)
3. A data fetching workflow for weather providers (→ Provider)

The plugin will have caching, state management, and alert functionality built-in.`,
      },
    ],
  ],

  validate: async (runtime: IAgentRuntime): Promise<boolean> => {
    const n8nService = runtime.getService('n8n-workflow');
    const n8nToPluginService = runtime.getService('n8n-to-plugin');
    return !!(n8nService && n8nToPluginService);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: Record<string, any>,
    callback?: HandlerCallback
  ): Promise<void> => {
    try {
      const n8nService = runtime.getService('n8n-workflow') as N8nWorkflowService;
      const n8nToPluginService = runtime.getService('n8n-to-plugin') as N8nToPluginService;

      if (!n8nService || !n8nToPluginService) {
        throw new Error('Required services not available');
      }

      // Extract plugin details from message
      const description = message.content.text
        .replace(/create|plugin|n8n|workflow|elizaos/gi, '')
        .trim();

      // Step 1: Generate workflow specifications
      elizaLogger.info('[CreateN8nPlugin] Generating workflow specifications from description');

      const workflowSpecs = await this.generateWorkflowSpecs(runtime, description);

      // Step 2: Create n8n workflows
      const workflowJobIds: string[] = [];
      for (const spec of workflowSpecs) {
        const jobId = await n8nService.createWorkflow(spec);
        workflowJobIds.push(jobId);
      }

      // Wait for workflows to complete (with timeout)
      await this.waitForWorkflows(n8nService, workflowJobIds, 30000); // 30 second timeout

      // Step 3: Convert workflows to plugin
      const pluginSpec: PluginGenerationSpec = {
        name: this.generatePluginName(description),
        description,
        workflows: workflowSpecs,
        config: {
          enableCaching: true,
          enableStateManagement: true,
          generateTests: true,
          generateDocs: true,
        },
      };

      const pluginJobId = await n8nToPluginService.convertWorkflowsToPlugin(pluginSpec);

      const response = `🎉 Full plugin creation pipeline started!

📋 Workflow Generation:
${workflowSpecs.map((spec, i) => `  ${i + 1}. ${spec.name} - ${spec.description}`).join('\n')}

🔄 Workflow Job IDs: ${workflowJobIds.join(', ')}

📦 Plugin Generation:
  • Job ID: ${pluginJobId}
  • Name: ${pluginSpec.name}
  • Components: Will be determined based on workflow analysis

The system will:
1. Generate ${workflowSpecs.length} n8n workflows
2. Analyze each workflow's characteristics
3. Map workflows to appropriate ElizaOS components
4. Generate complete plugin code with tests

Use 'checkN8nPluginStatus ${pluginJobId}' to monitor progress.`;

      if (callback) {
        await callback({
          text: response,
          action: 'FULL_PLUGIN_PIPELINE_STARTED',
          data: { workflowJobIds, pluginJobId, pluginSpec },
        });
      }
    } catch (error) {
      const errorMessage = `Failed to create plugin from description: ${error instanceof Error ? error.message : String(error)}`;
      elizaLogger.error('[CreateN8nPluginFromDescription]', error);

      if (callback) {
        await callback({
          text: errorMessage,
          error: true,
        });
      }
    }
  },

  // Helper to generate workflow specifications
  async generateWorkflowSpecs(runtime: IAgentRuntime, description: string): Promise<any[]> {
    const anthropic = runtime.getSetting('ANTHROPIC_API_KEY') ?
      new (await import('@anthropic-ai/sdk')).default({
        apiKey: runtime.getSetting('ANTHROPIC_API_KEY')
      }) : null;

    if (!anthropic) {
      // Fallback: create basic workflow specs
      return [{
        name: 'Main Workflow',
        description,
        nodes: [{ type: 'n8n-nodes-base.webhook', name: 'Webhook' }],
      }];
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
  },

  // Helper to generate plugin name
  generatePluginName(description: string): string {
    const words = description.toLowerCase().split(/\s+/);
    const mainWord = words.find(w => w.length > 4) || words[0] || 'plugin';
    return `@elizaos/plugin-${mainWord.replace(/[^a-z0-9]/g, '')}`;
  },

  // Helper to wait for workflows to complete
  async waitForWorkflows(
    service: N8nWorkflowService,
    jobIds: string[],
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const allCompleted = jobIds.every(id => {
        const job = service.getJobStatus(id);
        return job && (job.status === 'completed' || job.status === 'failed');
      });

      if (allCompleted) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    elizaLogger.warn('[CreateN8nPlugin] Workflow generation timeout - proceeding anyway');
  },
};
