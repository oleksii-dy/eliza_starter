import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { logger } from '@elizaos/core';
import type { PluginCreationService, PluginSpecification } from '../services/PluginCreationService.js';

/**
 * Action to create a new plugin using the PluginCreationService
 */
export const createPluginAction: Action = {
  name: 'CREATE_PLUGIN',
  similes: ['CREATE_PLUGIN', 'GENERATE_PLUGIN', 'BUILD_PLUGIN', 'MAKE_PLUGIN'],
  description: 'Creates a new ElizaOS plugin with specified actions, providers, and services using AI assistance',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const service = runtime.getService<PluginCreationService>('plugin_creation');
    if (!service) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    return text.includes('create') && (
      text.includes('plugin') ||
      text.includes('calculator') ||
      text.includes('weather') ||
      text.includes('todo') ||
      text.includes('action')
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any = {},
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        const errorMsg = 'Plugin creation service not available';
        if (callback) {
          callback({ text: errorMsg, error: true });
        }
        return { text: errorMsg, success: false };
      }

      const text = message.content.text || '';

      // Extract plugin details from the message
      let pluginName = 'custom-plugin';
      let pluginDescription = 'A custom ElizaOS plugin';

      // Try to extract plugin name and description
      const nameMatch = text.match(/(?:plugin|called|named)\s+["\']?([^"'\s,]+)["\']?/i);
      if (nameMatch) {
        pluginName = nameMatch[1].toLowerCase().replace(/[^a-z0-9-]/g, '-');
      }

      // Extract description or generate based on context
      if (text.includes('calculator')) {
        pluginName = 'calculator-plugin';
        pluginDescription = 'A calculator plugin with basic mathematical operations';
      } else if (text.includes('weather')) {
        pluginName = 'weather-plugin';
        pluginDescription = 'A weather plugin that fetches weather data and forecasts';
      } else if (text.includes('todo')) {
        pluginName = 'todo-plugin';
        pluginDescription = 'A todo management plugin for task tracking';
      }

      // Build plugin specification based on the request
      const specification: PluginSpecification = {
        name: pluginName,
        description: pluginDescription,
        version: '1.0.0',
        actions: [],
        providers: [],
        services: [],
        dependencies: []
      };

      // Add actions based on plugin type
      if (text.includes('calculator') || text.includes('math')) {
        specification.actions = [
          {
            name: 'ADD',
            description: 'Add two numbers',
            parameters: { a: 'number', b: 'number' }
          },
          {
            name: 'SUBTRACT',
            description: 'Subtract two numbers',
            parameters: { a: 'number', b: 'number' }
          },
          {
            name: 'MULTIPLY',
            description: 'Multiply two numbers',
            parameters: { a: 'number', b: 'number' }
          },
          {
            name: 'DIVIDE',
            description: 'Divide two numbers',
            parameters: { a: 'number', b: 'number' }
          }
        ];
        specification.providers = [
          {
            name: 'CALCULATOR_PROVIDER',
            description: 'Provides calculator history and state'
          }
        ];
      } else if (text.includes('weather')) {
        specification.actions = [
          {
            name: 'GET_WEATHER',
            description: 'Get current weather for a location',
            parameters: { location: 'string', units: 'string' }
          },
          {
            name: 'GET_FORECAST',
            description: 'Get weather forecast',
            parameters: { location: 'string', days: 'number' }
          }
        ];
        specification.services = [
          {
            name: 'WeatherAPIService',
            description: 'Service for weather API integration'
          }
        ];
        specification.dependencies = ['axios'];
      } else if (text.includes('todo')) {
        specification.actions = [
          {
            name: 'CREATE_TODO',
            description: 'Create a new todo item',
            parameters: { title: 'string', description: 'string' }
          },
          {
            name: 'LIST_TODOS',
            description: 'List all todo items'
          },
          {
            name: 'COMPLETE_TODO',
            description: 'Mark a todo as completed',
            parameters: { id: 'string' }
          }
        ];
        specification.providers = [
          {
            name: 'TODO_PROVIDER',
            description: 'Provides todo list data'
          }
        ];
      }

      // Create the plugin
      logger.info(`Creating plugin: ${pluginName}`);
      const jobId = await service.createPlugin(specification);

      const responseText = `✅ Started creating ${pluginName} plugin!

🆔 Job ID: ${jobId}
📝 Description: ${pluginDescription}
🔧 Components: ${specification.actions?.length || 0} actions, ${specification.providers?.length || 0} providers, ${specification.services?.length || 0} services

The plugin is now being generated. You can check its progress with GET_JOB_STATUS.`;

      if (callback) {
        callback({
          text: responseText,
          actions: ['CREATE_PLUGIN']
        });
      }

      return {
        text: responseText,
        success: true,
        values: {
          jobId,
          pluginName,
          specification
        },
        data: {
          actionName: 'CREATE_PLUGIN',
          jobId,
          pluginName,
          specification
        }
      };

    } catch (error) {
      logger.error('Error in CREATE_PLUGIN action:', error);
      const errorMsg = `Failed to create plugin: ${error instanceof Error ? error.message : String(error)}`;

      if (callback) {
        callback({ text: errorMsg, error: true });
      }

      return {
        text: errorMsg,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Create a calculator plugin with basic math operations'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Started creating calculator-plugin!\n\n🆔 Job ID: abc123\n📝 Description: A calculator plugin with basic mathematical operations\n🔧 Components: 4 actions, 1 providers, 0 services',
          actions: ['CREATE_PLUGIN']
        }
      }
    ]
  ]
};

/**
 * Action to check the status of a plugin creation job
 */
export const getJobStatusAction: Action = {
  name: 'GET_JOB_STATUS',
  similes: ['CHECK_STATUS', 'JOB_STATUS', 'PLUGIN_STATUS'],
  description: 'Checks the status of a plugin creation job',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const service = runtime.getService<PluginCreationService>('plugin_creation');
    if (!service) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    return text.includes('status') || text.includes('progress') || text.includes('job');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any = {},
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        const errorMsg = 'Plugin creation service not available';
        if (callback) {
          callback({ text: errorMsg, error: true });
        }
        return { text: errorMsg, success: false };
      }

      const text = message.content.text || '';

      // Extract job ID from message or use the most recent job
      let jobId: string | null = null;
      const jobIdMatch = text.match(/job[:\s]+([a-f0-9-]+)/i);
      if (jobIdMatch) {
        jobId = jobIdMatch[1];
      } else {
        // Get the most recent job
        const allJobs = service.getAllJobs();
        if (allJobs.length > 0) {
          jobId = allJobs[allJobs.length - 1].id;
        }
      }

      if (!jobId) {
        const errorMsg = 'No job ID found. Please specify a job ID or create a plugin first.';
        if (callback) {
          callback({ text: errorMsg, error: true });
        }
        return { text: errorMsg, success: false };
      }

      const job = service.getJobStatus(jobId);
      if (!job) {
        const errorMsg = `Job ${jobId} not found`;
        if (callback) {
          callback({ text: errorMsg, error: true });
        }
        return { text: errorMsg, success: false };
      }

      // Format status response
      const statusEmoji = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        cancelled: '🚫'
      }[job.status] || '❓';

      let responseText = `${statusEmoji} Plugin Creation Job Status

🆔 Job ID: ${job.id}
📝 Plugin: ${job.specification.name}
📊 Status: ${job.status.toUpperCase()}
⏰ Created: ${job.createdAt.toLocaleString()}`;

      if (job.startedAt) {
        responseText += `\n🚀 Started: ${job.startedAt.toLocaleString()}`;
      }

      if (job.completedAt) {
        responseText += `\n🏁 Completed: ${job.completedAt.toLocaleString()}`;
        const duration = job.completedAt.getTime() - job.createdAt.getTime();
        responseText += `\n⏱️ Duration: ${Math.round(duration / 1000)}s`;
      }

      if (job.error) {
        responseText += `\n❌ Error: ${job.error}`;
      }

      if (job.outputPath && job.status === 'completed') {
        responseText += `\n📁 Output: ${job.outputPath}`;
      }

      // Show recent logs
      if (job.logs.length > 0) {
        const recentLogs = job.logs.slice(-3);
        responseText += `\n\n📋 Recent Logs:\n${recentLogs.map(log => `  • ${log}`).join('\n')}`;
      }

      if (callback) {
        callback({
          text: responseText,
          actions: ['GET_JOB_STATUS']
        });
      }

      return {
        text: responseText,
        success: true,
        values: {
          jobId: job.id,
          status: job.status,
          pluginName: job.specification.name,
          duration: job.completedAt ? job.completedAt.getTime() - job.createdAt.getTime() : null
        },
        data: {
          actionName: 'GET_JOB_STATUS',
          job: {
            id: job.id,
            status: job.status,
            pluginName: job.specification.name,
            error: job.error,
            outputPath: job.outputPath
          }
        }
      };

    } catch (error) {
      logger.error('Error in GET_JOB_STATUS action:', error);
      const errorMsg = `Failed to get job status: ${error instanceof Error ? error.message : String(error)}`;

      if (callback) {
        callback({ text: errorMsg, error: true });
      }

      return {
        text: errorMsg,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Check the status of my plugin creation job'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Plugin Creation Job Status\n\n🆔 Job ID: abc123\n📝 Plugin: calculator-plugin\n📊 Status: COMPLETED\n⏰ Created: 12/25/2024, 2:30:15 PM',
          actions: ['GET_JOB_STATUS']
        }
      }
    ]
  ]
};

/**
 * Action to list all plugin creation jobs
 */
export const listJobsAction: Action = {
  name: 'LIST_JOBS',
  similes: ['ALL_JOBS', 'SHOW_JOBS', 'JOB_LIST'],
  description: 'Lists all plugin creation jobs and their status',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const service = runtime.getService<PluginCreationService>('plugin_creation');
    if (!service) {
      return false;
    }

    const text = message.content.text?.toLowerCase() || '';
    return text.includes('all') && text.includes('job') ||
           text.includes('list') && text.includes('job') ||
           text.includes('show') && text.includes('job');
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any = {},
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        const errorMsg = 'Plugin creation service not available';
        if (callback) {
          callback({ text: errorMsg, error: true });
        }
        return { text: errorMsg, success: false };
      }

      const allJobs = service.getAllJobs();

      if (allJobs.length === 0) {
        const msg = 'No plugin creation jobs found. Create a plugin first!';
        if (callback) {
          callback({ text: msg });
        }
        return { text: msg, success: true, values: { jobCount: 0 } };
      }

      let responseText = `📋 Plugin Creation Jobs (${allJobs.length} total)\n\n`;

      // Sort by creation date (newest first)
      const sortedJobs = allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      for (const job of sortedJobs.slice(0, 10)) { // Show latest 10
        const statusEmoji = {
          pending: '⏳',
          running: '🔄',
          completed: '✅',
          failed: '❌',
          cancelled: '🚫'
        }[job.status] || '❓';

        responseText += `${statusEmoji} **${job.specification.name}**\n`;
        responseText += `   🆔 ${job.id.substring(0, 8)}...\n`;
        responseText += `   📊 ${job.status.toUpperCase()}\n`;
        responseText += `   ⏰ ${job.createdAt.toLocaleString()}\n`;

        if (job.error) {
          responseText += `   ❌ ${job.error.substring(0, 50)}...\n`;
        }

        responseText += '\n';
      }

      if (allJobs.length > 10) {
        responseText += `\n... and ${allJobs.length - 10} more jobs`;
      }

      if (callback) {
        callback({
          text: responseText,
          actions: ['LIST_JOBS']
        });
      }

      return {
        text: responseText,
        success: true,
        values: {
          jobCount: allJobs.length,
          jobs: allJobs.map(job => ({
            id: job.id,
            name: job.specification.name,
            status: job.status,
            createdAt: job.createdAt
          }))
        },
        data: {
          actionName: 'LIST_JOBS',
          totalJobs: allJobs.length,
          recentJobs: sortedJobs.slice(0, 10)
        }
      };

    } catch (error) {
      logger.error('Error in LIST_JOBS action:', error);
      const errorMsg = `Failed to list jobs: ${error instanceof Error ? error.message : String(error)}`;

      if (callback) {
        callback({ text: errorMsg, error: true });
      }

      return {
        text: errorMsg,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Show me all my plugin creation jobs'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: '📋 Plugin Creation Jobs (3 total)\n\n✅ **calculator-plugin**\n   🆔 abc123...\n   📊 COMPLETED\n   ⏰ 12/25/2024, 2:30:15 PM',
          actions: ['LIST_JOBS']
        }
      }
    ]
  ]
};

// Export all plugin creation actions
export const pluginCreationActions = [
  createPluginAction,
  getJobStatusAction,
  listJobsAction
];
