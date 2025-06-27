import type { Action, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type {
  PluginCreationService,
  PluginSpecification,
} from '../services/PluginCreationService.ts';

/**
 * Action to create a new plugin using the PluginCreationService
 */
export const createPluginAction: Action = {
  name: 'CREATE_PLUGIN',
  similes: ['CREATE_PLUGIN', 'GENERATE_PLUGIN', 'BUILD_PLUGIN', 'MAKE_PLUGIN'],
  description:
    'Creates a new ElizaOS plugin with specified actions, providers, and services using AI assistance',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if plugin creation service is available
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        elizaLogger.warn('Plugin creation service not available for validation');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.debug('No text content provided for plugin creation validation');
        return false;
      }

      const text = message.content.text.toLowerCase();
      
      // Check for minimum content requirements
      if (text.length < 5) {
        elizaLogger.debug('Message too short for plugin creation');
        return false;
      }

      // Check for plugin creation keywords
      const hasCreateKeyword = /\b(create|make|build|generate|develop)\b/.test(text);
      const hasPluginKeyword = /\b(plugin|calculator|weather|todo|action|service|provider)\b/.test(text);
      
      if (!hasCreateKeyword || !hasPluginKeyword) {
        elizaLogger.debug('Message does not contain plugin creation keywords');
        return false;
      }

      // Additional validation for message length
      if (text.length > 1000) {
        elizaLogger.warn('Message too long for plugin creation', { messageLength: text.length });
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during plugin creation validation', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any = {},
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      elizaLogger.info('Starting plugin creation', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      // Validate service availability
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        throw new Error('Plugin creation service not available');
      }

      // Enhanced input validation
      if (!message.content?.text) {
        throw new Error('No message content provided');
      }

      const text = message.content.text;
      
      // Validate text length
      if (text.length < 5) {
        throw new Error('Message too short - please provide more details about the plugin you want to create');
      }

      if (text.length > 1000) {
        throw new Error('Message too long - please provide a more concise description');
      }

      // Extract plugin details from the message with enhanced validation
      let pluginName = 'custom-plugin';
      let pluginDescription = 'A custom ElizaOS plugin';

      // Try to extract plugin name and description with validation
      const nameMatch = text.match(/(?:plugin|called|named)\s+["\']?([^"'\s,]+)["\']?/i);
      if (nameMatch) {
        const extractedName = nameMatch[1].toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        // Validate plugin name
        if (extractedName.length < 2) {
          elizaLogger.warn('Extracted plugin name too short, using default');
        } else if (extractedName.length > 50) {
          elizaLogger.warn('Extracted plugin name too long, truncating');
          pluginName = extractedName.substring(0, 50);
        } else {
          pluginName = extractedName;
        }
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

      // Validate final plugin name
      if (!pluginName || pluginName.length < 2) {
        throw new Error('Invalid plugin name - please provide a valid name');
      }

      // Build plugin specification based on the request
      const specification: PluginSpecification = {
        name: pluginName,
        description: pluginDescription,
        version: '1.0.0',
        actions: [],
        providers: [],
        services: [],
        dependencies: [],
      };

      elizaLogger.debug('Built plugin specification', { 
        name: pluginName, 
        description: pluginDescription 
      });

      // Add actions based on plugin type
      if (text.includes('calculator') || text.includes('math')) {
        specification.actions = [
          {
            name: 'ADD',
            description: 'Add two numbers',
            parameters: { a: 'number', b: 'number' },
          },
          {
            name: 'SUBTRACT',
            description: 'Subtract two numbers',
            parameters: { a: 'number', b: 'number' },
          },
          {
            name: 'MULTIPLY',
            description: 'Multiply two numbers',
            parameters: { a: 'number', b: 'number' },
          },
          {
            name: 'DIVIDE',
            description: 'Divide two numbers',
            parameters: { a: 'number', b: 'number' },
          },
        ];
        specification.providers = [
          {
            name: 'CALCULATOR_PROVIDER',
            description: 'Provides calculator history and state',
          },
        ];
      } else if (text.includes('weather')) {
        specification.actions = [
          {
            name: 'GET_WEATHER',
            description: 'Get current weather for a location',
            parameters: { location: 'string', units: 'string' },
          },
          {
            name: 'GET_FORECAST',
            description: 'Get weather forecast',
            parameters: { location: 'string', days: 'number' },
          },
        ];
        specification.services = [
          {
            name: 'WeatherAPIService',
            description: 'Service for weather API integration',
          },
        ];
        specification.dependencies = ['axios'];
      } else if (text.includes('todo')) {
        specification.actions = [
          {
            name: 'CREATE_TODO',
            description: 'Create a new todo item',
            parameters: { title: 'string', description: 'string' },
          },
          {
            name: 'LIST_TODOS',
            description: 'List all todo items',
          },
          {
            name: 'COMPLETE_TODO',
            description: 'Mark a todo as completed',
            parameters: { id: 'string' },
          },
        ];
        specification.providers = [
          {
            name: 'TODO_PROVIDER',
            description: 'Provides todo list data',
          },
        ];
      }

      // Create the plugin with enhanced error handling
      elizaLogger.info(`Creating plugin: ${pluginName}`, { specification });
      
      const jobId = await service.createPlugin(specification);
      
      if (!jobId) {
        throw new Error('Failed to create plugin job - no job ID returned');
      }

      elizaLogger.info('Plugin creation job started successfully', { 
        jobId, 
        pluginName 
      });

      const responseText = `✅ Started creating ${pluginName} plugin!

🆔 Job ID: ${jobId}
📝 Description: ${pluginDescription}
🔧 Components: ${specification.actions?.length || 0} actions, ${specification.providers?.length || 0} providers, ${specification.services?.length || 0} services

The plugin is now being generated. You can check its progress with GET_JOB_STATUS.`;

      if (callback) {
        callback({
          text: responseText,
          actions: ['CREATE_PLUGIN'],
        });
      }

      return {
        text: responseText,
        success: true,
        values: {
          jobId,
          pluginName,
          specification,
        },
        data: {
          actionName: 'CREATE_PLUGIN',
          jobId,
          pluginName,
          specification,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Plugin creation failed', error);

      const errorMsg = `❌ **Plugin Creation Failed**\n\n` +
                      `**Error:** ${errorMessage}\n\n` +
                      `Please check your request and try again with a clear plugin description.`;

      if (callback) {
        callback({
          text: errorMsg,
          content: {
            action: 'CREATE_PLUGIN',
            status: 'failed',
            error: errorMessage,
          },
        });
      }

      return {
        data: {
          actionName: 'CREATE_PLUGIN',
          success: false,
          error: errorMessage,
        },
        values: {
          pluginCreated: false,
          error: errorMessage,
        },
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Create a calculator plugin with basic math operations',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Started creating calculator-plugin!\n\n🆔 Job ID: abc123\n📝 Description: A calculator plugin with basic mathematical operations\n🔧 Components: 4 actions, 1 providers, 0 services',
          actions: ['CREATE_PLUGIN'],
        },
      },
    ],
  ],
};

/**
 * Action to check the status of a plugin creation job
 */
export const getJobStatusAction: Action = {
  name: 'GET_JOB_STATUS',
  similes: ['CHECK_STATUS', 'JOB_STATUS', 'PLUGIN_STATUS'],
  description: 'Checks the status of a plugin creation job',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if plugin creation service is available
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        elizaLogger.warn('Plugin creation service not available for job status validation');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.debug('No text content provided for job status validation');
        return false;
      }

      const text = message.content.text.toLowerCase();
      
      // Check for minimum content requirements
      if (text.length < 3) {
        elizaLogger.debug('Message too short for job status check');
        return false;
      }

      // Check for job status keywords
      const hasStatusKeyword = /\b(status|progress|job|check|show)\b/.test(text);
      
      if (!hasStatusKeyword) {
        elizaLogger.debug('Message does not contain job status keywords');
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during job status validation', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any = {},
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      elizaLogger.info('Checking job status', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      // Validate service availability
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        throw new Error('Plugin creation service not available');
      }

      // Enhanced input validation
      if (!message.content?.text) {
        throw new Error('No message content provided');
      }

      const text = message.content.text;
      
      // Validate text length
      if (text.length < 3) {
        throw new Error('Message too short - please specify a job ID or ask for status');
      }

      // Extract job ID from message or use the most recent job with enhanced validation
      let jobId: string | null = null;
      const jobIdMatch = text.match(/job[:\s]+([a-f0-9-]+)/i);
      
      if (jobIdMatch) {
        jobId = jobIdMatch[1];
        elizaLogger.debug('Found job ID in message', { jobId });
        
        // Validate job ID format
        if (!/^[a-f0-9-]{8,}$/i.test(jobId)) {
          throw new Error('Invalid job ID format');
        }
      } else {
        // Get the most recent job
        elizaLogger.debug('No job ID specified, using most recent job');
        const allJobs = service.getAllJobs();
        if (allJobs.length > 0) {
          jobId = allJobs[allJobs.length - 1].id;
          elizaLogger.debug('Using most recent job', { jobId });
        }
      }

      if (!jobId) {
        throw new Error('No job ID found. Please specify a job ID or create a plugin first.');
      }

      const job = service.getJobStatus(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      elizaLogger.debug('Retrieved job status', { 
        jobId, 
        status: job.status,
        pluginName: job.specification.name 
      });

      // Format status response
      const statusEmoji =
        {
          pending: '⏳',
          running: '🔄',
          completed: '✅',
          failed: '❌',
          cancelled: '🚫',
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
        responseText += `\n\n📋 Recent Logs:\n${recentLogs.map((log) => `  • ${log}`).join('\n')}`;
      }

      if (callback) {
        callback({
          text: responseText,
          actions: ['GET_JOB_STATUS'],
        });
      }

      return {
        text: responseText,
        success: true,
        values: {
          jobId: job.id,
          status: job.status,
          pluginName: job.specification.name,
          duration: job.completedAt ? job.completedAt.getTime() - job.createdAt.getTime() : null,
        },
        data: {
          actionName: 'GET_JOB_STATUS',
          job: {
            id: job.id,
            status: job.status,
            pluginName: job.specification.name,
            error: job.error,
            outputPath: job.outputPath,
          },
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Job status check failed', error);

      const errorMsg = `❌ **Job Status Check Failed**\n\n` +
                      `**Error:** ${errorMessage}\n\n` +
                      `Please try again or create a new plugin.`;

      if (callback) {
        callback({
          text: errorMsg,
          content: {
            action: 'GET_JOB_STATUS',
            status: 'failed',
            error: errorMessage,
          },
        });
      }

      return {
        data: {
          actionName: 'GET_JOB_STATUS',
          success: false,
          error: errorMessage,
        },
        values: {
          statusChecked: false,
          error: errorMessage,
        },
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Check the status of my plugin creation job',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '✅ Plugin Creation Job Status\n\n🆔 Job ID: abc123\n📝 Plugin: calculator-plugin\n📊 Status: COMPLETED\n⏰ Created: 12/25/2024, 2:30:15 PM',
          actions: ['GET_JOB_STATUS'],
        },
      },
    ],
  ],
};

/**
 * Action to list all plugin creation jobs
 */
export const listJobsAction: Action = {
  name: 'LIST_JOBS',
  similes: ['ALL_JOBS', 'SHOW_JOBS', 'JOB_LIST'],
  description: 'Lists all plugin creation jobs and their status',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if plugin creation service is available
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        elizaLogger.warn('Plugin creation service not available for list jobs validation');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.debug('No text content provided for list jobs validation');
        return false;
      }

      const text = message.content.text.toLowerCase();
      
      // Check for minimum content requirements
      if (text.length < 3) {
        elizaLogger.debug('Message too short for job listing');
        return false;
      }

      // Check for job listing keywords
      const hasListKeyword = /\b(all|list|show|display)\b/.test(text);
      const hasJobKeyword = /\b(job|jobs|plugin|plugins|task|tasks)\b/.test(text);
      
      if (!hasListKeyword || !hasJobKeyword) {
        elizaLogger.debug('Message does not contain job listing keywords');
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during list jobs validation', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    _options: any = {},
    callback?: HandlerCallback
  ): Promise<any> => {
    try {
      elizaLogger.info('Listing plugin creation jobs', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      // Validate service availability
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        throw new Error('Plugin creation service not available');
      }

      // Enhanced input validation
      if (!message.content?.text) {
        throw new Error('No message content provided');
      }

      const text = message.content.text;
      
      // Validate text length
      if (text.length < 3) {
        throw new Error('Message too short - please ask to list jobs');
      }

      const allJobs = service.getAllJobs();
      
      elizaLogger.debug('Retrieved all jobs', { jobCount: allJobs.length });

      if (allJobs.length === 0) {
        const msg = '📋 **No Plugin Creation Jobs Found**\n\nCreate a plugin first to see jobs listed here!';
        
        if (callback) {
          callback({
            text: msg,
            content: {
              action: 'LIST_JOBS',
              status: 'empty',
              jobCount: 0,
            },
          });
        }
        
        return {
          data: {
            actionName: 'LIST_JOBS',
            success: true,
            totalJobs: 0,
          },
          values: {
            jobCount: 0,
            jobsListed: true,
          },
        };
      }

      let responseText = `📋 Plugin Creation Jobs (${allJobs.length} total)\n\n`;

      // Sort by creation date (newest first)
      const sortedJobs = allJobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      for (const job of sortedJobs.slice(0, 10)) {
        // Show latest 10
        const statusEmoji =
          {
            pending: '⏳',
            running: '🔄',
            completed: '✅',
            failed: '❌',
            cancelled: '🚫',
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
          actions: ['LIST_JOBS'],
        });
      }

      return {
        text: responseText,
        success: true,
        values: {
          jobCount: allJobs.length,
          jobs: allJobs.map((job) => ({
            id: job.id,
            name: job.specification.name,
            status: job.status,
            createdAt: job.createdAt,
          })),
        },
        data: {
          actionName: 'LIST_JOBS',
          totalJobs: allJobs.length,
          recentJobs: sortedJobs.slice(0, 10),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Job listing failed', error);

      const errorMsg = `❌ **Job Listing Failed**\n\n` +
                      `**Error:** ${errorMessage}\n\n` +
                      `Please try again or check the plugin creation service.`;

      if (callback) {
        callback({
          text: errorMsg,
          content: {
            action: 'LIST_JOBS',
            status: 'failed',
            error: errorMessage,
          },
        });
      }

      return {
        data: {
          actionName: 'LIST_JOBS',
          success: false,
          error: errorMessage,
        },
        values: {
          jobsListed: false,
          error: errorMessage,
        },
      };
    }
  },

  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Show me all my plugin creation jobs',
        },
      },
      {
        name: 'Assistant',
        content: {
          text: '📋 Plugin Creation Jobs (3 total)\n\n✅ **calculator-plugin**\n   🆔 abc123...\n   📊 COMPLETED\n   ⏰ 12/25/2024, 2:30:15 PM',
          actions: ['LIST_JOBS'],
        },
      },
    ],
  ],
};

// Export all plugin creation actions
export const pluginCreationActions = [createPluginAction, getJobStatusAction, listJobsAction];
