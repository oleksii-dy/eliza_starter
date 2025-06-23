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

// Helper to generate workflow specifications
async function generateWorkflowSpecs(runtime: IAgentRuntime, description: string): Promise<any[]> {
  const anthropic = runtime.getSetting('ANTHROPIC_API_KEY') ? 
    new (await import('@anthropic-ai/sdk')).default({ 
      apiKey: runtime.getSetting('ANTHROPIC_API_KEY') 
    }) : null;

  if (!anthropic) {
    // Fallback: create basic workflow specs
    return [{
      name: 'Main Workflow',
      description: description,
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
}

// Helper to generate plugin name
function generatePluginName(description: string): string {
  const words = description.toLowerCase().split(/\s+/);
  const mainWord = words.find(w => w.length > 4) || words[0] || 'plugin';
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
    const allCompleted = jobIds.every(id => {
      const job = service.getJobStatus(id);
      return job && (job.status === 'completed' || job.status === 'failed');
    });
    
    if (allCompleted) {
      return;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  elizaLogger.warn('[CreatePlugin] Workflow generation timeout - proceeding anyway');
}

/**
 * Action to create ElizaOS plugins using natural language descriptions
 * Internally uses n8n workflows to power the plugin generation
 */
export const createPluginAction: Action = {
  name: 'createPlugin',
  description: 'Create a complete ElizaOS plugin from a natural language description. The system will automatically design and implement the necessary components.',
  similes: [
    'create plugin',
    'make plugin', 
    'build plugin',
    'generate plugin',
    'plugin for',
    'plugin that',
    'I need a plugin',
    'create elizaos plugin',
  ],
  
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Create a weather monitoring plugin that checks temperature every hour and alerts on extreme conditions',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: `I'll create a weather monitoring plugin for you with the following features:

📊 **Components I'll generate:**
- **Scheduled Service**: Checks weather every hour automatically
- **Manual Action**: Check weather on demand
- **Data Provider**: Provides weather context to the agent
- **Caching**: Reduces API calls and improves performance
- **Alerts**: Notifies on extreme weather conditions

The plugin will be production-ready with full tests and documentation.

Let me start building this for you...`,
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'I need a plugin that can track cryptocurrency prices and send alerts when they change significantly',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: `I'll create a cryptocurrency price tracking plugin with these capabilities:

💰 **What I'll build:**
- **Price Monitoring Service**: Continuously tracks selected cryptocurrencies
- **Alert System**: Notifies when prices change by your specified threshold
- **Price Check Action**: Get current prices on demand
- **Market Data Provider**: Supplies crypto market context to conversations
- **Historical Tracking**: Maintains price history for analysis

All components will include smart caching and state management.

Starting the plugin generation now...`,
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
        throw new Error('Plugin creation service not available');
      }

      let spec: PluginGenerationSpec;
      const content = message.content.text;

      // Check if user provided a specification or existing workflows (advanced feature)
      const specMatch = content.match(/\{[\s\S]*\}/);
      
      if (specMatch) {
        // Advanced: User provided a specification
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
        // Standard flow: Generate everything from natural language
        const description = content
          .replace(/create|make|build|generate|plugin|elizaos|I need a?/gi, '')
          .trim();
        
        // First, design the workflows needed for this plugin
        elizaLogger.info('[CreatePlugin] Designing plugin architecture from description');
        const workflowSpecs = await generateWorkflowSpecs(runtime, description);
        
        // Create the n8n workflows behind the scenes
        const n8nService = runtime.getService('n8n-workflow') as N8nWorkflowService;
        if (n8nService) {
          const workflowJobIds: string[] = [];
          for (const workflowSpec of workflowSpecs) {
            const jobId = await n8nService.createWorkflow(workflowSpec);
            workflowJobIds.push(jobId);
          }
          
          // Wait briefly for workflows to be created
          await waitForWorkflows(n8nService, workflowJobIds, 10000);
        }
        
        // Generate plugin specification
        spec = {
          name: generatePluginName(description),
          description: description,
          workflows: workflowSpecs,
          config: {
            enableCaching: true,
            enableStateManagement: true,
            generateTests: true,
            generateDocs: true,
          },
        };
      }

      // Start the plugin generation
      const jobId = await n8nToPluginService.convertWorkflowsToPlugin(spec);
      
      const response = `🚀 **Plugin Creation Started!**

📦 **Plugin Details:**
- **Name**: ${spec.name}
- **Description**: ${spec.description}
- **Job ID**: ${jobId}

🔧 **What I'm Building:**
${spec.workflows.map((w, i) => {
  const type = w.triggers?.some(t => t.type.includes('schedule')) ? 'Service' :
               w.triggers?.some(t => t.type.includes('webhook')) ? 'Action' :
               w.nodes?.some(n => n.type.includes('httpRequest')) ? 'Provider' : 'Component';
  return `${i + 1}. **${w.name}** → ${type}\n   ${w.description}`;
}).join('\n\n')}

⚙️ **Features:**
${spec.config?.enableCaching ? '✅ Smart caching for performance' : ''}
${spec.config?.enableStateManagement ? '✅ State management for persistence' : ''}
${spec.config?.generateTests ? '✅ Comprehensive test suite' : ''}
${spec.config?.generateDocs ? '✅ Full documentation' : ''}

Use \`checkPluginStatus ${jobId}\` to monitor progress.
The plugin will be ready in a few minutes!`;

      if (callback) {
        await callback({
          text: response,
          action: 'PLUGIN_CREATION_STARTED',
          data: { jobId, spec },
        });
      }
    } catch (error) {
      const errorMessage = `Failed to create plugin: ${error instanceof Error ? error.message : String(error)}`;
      elizaLogger.error('[CreatePlugin]', error);
      
      if (callback) {
        await callback({
          text: errorMessage,
          error: true,
        });
      }
    }
  },
};

/**
 * Legacy action name for backward compatibility
 */
export const convertN8nToPluginAction = createPluginAction;

/**
 * Action to check plugin generation status
 */
export const checkPluginStatusAction: Action = {
  name: 'checkPluginStatus',
  description: 'Check the status of plugin generation',
  similes: ['plugin status', 'check plugin', 'plugin progress', 'generation status'],
  
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
    const service = runtime.getService('n8n-to-plugin') as N8nToPluginService | undefined;
    
    if (!service) {
      throw new Error('Plugin generation service not available');
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

    const response = `📊 **Plugin Generation Status**

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

  let details = `${statusEmoji} **Job ${job.id}**
├─ **Plugin**: ${job.spec.name}
├─ **Status**: ${job.status}
├─ **Progress**: ${job.progress}%`;

  if (job.mappings.length > 0) {
    details += '\n├─ **Components Generated**:';
    const actionCount = job.mappings.filter(m => m.componentType === 'action').length;
    const providerCount = job.mappings.filter(m => m.componentType === 'provider').length;
    const serviceCount = job.mappings.filter(m => m.componentType === 'service').length;
    
    if (actionCount > 0) details += `\n│  ├─ Actions: ${actionCount}`;
    if (providerCount > 0) details += `\n│  ├─ Providers: ${providerCount}`;
    if (serviceCount > 0) details += `\n│  └─ Services: ${serviceCount}`;
  }

  if (job.status === 'completed' && job.outputPath) {
    details += `\n├─ **Output Path**: \`${job.outputPath}\``;
    details += '\n└─ ✅ **Plugin is ready to use!**';
  } else if (job.status === 'failed' && job.error) {
    details += `\n└─ ❌ **Error**: ${job.error}`;
  } else {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    details += `\n└─ ⏱️ **Time Elapsed**: ${minutes}m ${seconds}s`;
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
 * Legacy action names for backward compatibility
 */
export const checkN8nPluginStatusAction = checkPluginStatusAction;

/**
 * Advanced action: Create plugin by explicitly defining workflows first
 * This is for users who want more control over the workflow design
 */
export const createPluginWithWorkflowsAction: Action = {
  name: 'createPluginWithWorkflows',
  description: 'Advanced: Create a plugin by first designing specific workflows, then converting them to plugin components',
  similes: [
    'design plugin workflows',
    'create plugin with custom workflows',
    'advanced plugin creation',
  ],
  
  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Create a plugin with custom workflows for monitoring social media mentions',
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: `I'll create a social media monitoring plugin by designing custom workflows first.

📋 **Workflow Design**:
1. **Mention Scanner** (Service): Continuously scans for mentions
2. **Mention Fetcher** (Provider): Retrieves recent mentions on demand
3. **Reply Action** (Action): Responds to specific mentions
4. **Analytics Tracker** (Service): Tracks engagement metrics

This advanced approach gives you full control over the workflow design before generating the plugin.

Let me start designing these workflows...`,
        },
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
      const n8nService = runtime.getService('n8n-workflow') as N8nWorkflowService | undefined;
      const n8nToPluginService = runtime.getService('n8n-to-plugin') as N8nToPluginService | undefined;
      
      if (!n8nService || !n8nToPluginService) {
        throw new Error('Required services not available');
      }

      // Extract plugin details from message
      const description = message.content.text
        .replace(/create|plugin|n8n|workflow|elizaos|custom|advanced/gi, '')
        .trim();

      // Step 1: Generate workflow specifications
      elizaLogger.info('[CreatePluginWithWorkflows] Designing custom workflows');
      
      const workflowSpecs = await generateWorkflowSpecs(runtime, description);
      
      // Step 2: Create n8n workflows
      const workflowJobIds: string[] = [];
      for (const spec of workflowSpecs) {
        const jobId = await n8nService.createWorkflow(spec);
        workflowJobIds.push(jobId);
      }

      // Wait for workflows to complete
      await waitForWorkflows(n8nService, workflowJobIds, 30000);

      // Step 3: Convert workflows to plugin
      const pluginSpec: PluginGenerationSpec = {
        name: generatePluginName(description),
        description: description,
        workflows: workflowSpecs,
        config: {
          enableCaching: true,
          enableStateManagement: true,
          generateTests: true,
          generateDocs: true,
        },
      };

      const pluginJobId = await n8nToPluginService.convertWorkflowsToPlugin(pluginSpec);

      const response = `🎯 **Advanced Plugin Creation Started!**

📋 **Workflow Design Phase**:
${workflowSpecs.map((spec, i) => `${i + 1}. **${spec.name}**\n   ${spec.description}`).join('\n\n')}

🔄 **Workflow Generation**: ${workflowJobIds.length} workflows created
  Job IDs: ${workflowJobIds.map(id => `\`${id}\``).join(', ')}

📦 **Plugin Assembly**:
  • Job ID: \`${pluginJobId}\`
  • Name: ${pluginSpec.name}
  • Components: Being determined from workflow analysis

The system is now:
1. ✅ Workflows designed and created
2. 🔄 Analyzing workflow patterns
3. 📝 Generating plugin components
4. 🧪 Creating tests and documentation

Monitor progress: \`checkPluginStatus ${pluginJobId}\``;

      if (callback) {
        await callback({
          text: response,
          action: 'ADVANCED_PLUGIN_CREATION_STARTED',
          data: { workflowJobIds, pluginJobId, pluginSpec },
        });
      }
    } catch (error) {
      const errorMessage = `Failed to create plugin with workflows: ${error instanceof Error ? error.message : String(error)}`;
      elizaLogger.error('[CreatePluginWithWorkflows]', error);
      
      if (callback) {
        await callback({
          text: errorMessage,
          error: true,
        });
      }
    }
  },
};

/**
 * Legacy action name for backward compatibility
 */
export const createN8nPluginFromDescriptionAction = createPluginWithWorkflowsAction; 