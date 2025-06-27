import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type {
  PluginCreationService,
  PluginSpecification,
} from '../services/PluginCreationService.ts';
import { z } from 'zod';

const CreatePluginProjectSchema = z.object({
  name: z.string().min(3, 'Plugin name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

/**
 * Action to create a new plugin development project using PluginCreationService
 */
export const createPluginProjectAction: Action = {
  name: 'CREATE_PLUGIN_PROJECT',
  similes: ['CREATE_PLUGIN_PROJECT', 'START_PLUGIN', 'BEGIN_PLUGIN', 'MAKE_PLUGIN'],
  description: 'Creates a new plugin development project using the plugin creation service',
  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Create a plugin named "my-awesome-plugin" that does awesome things.',
        },
      },
      {
        name: 'agent',
        content: {
          text: "I'll start creating the 'my-awesome-plugin' for you using the CREATE_PLUGIN action.",
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    try {
      // Check if plugin creation service is available
      const service = _runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        elizaLogger.warn('Plugin creation service not available for orchestration validation');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.debug('No text content provided for plugin project validation');
        return false;
      }

      const text = message.content.text.toLowerCase();
      
      // Check for minimum content requirements
      if (text.length < 5) {
        elizaLogger.debug('Message too short for plugin project creation');
        return false;
      }

      // Check for plugin project creation keywords
      const hasCreateKeyword = /\b(create|make|build|start|begin)\b/.test(text);
      const hasPluginKeyword = /\b(plugin|project)\b/.test(text);
      
      if (!hasCreateKeyword || !hasPluginKeyword) {
        elizaLogger.debug('Message does not contain plugin project creation keywords');
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during plugin project validation', error);
      return false;
    }
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    try {
      elizaLogger.info('Starting plugin project creation', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      // Validate service availability
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        throw new Error('Plugin creation service is not available');
      }

      // Enhanced input validation
      if (!message.content?.text) {
        throw new Error('No message content provided');
      }

      const text = message.content.text;
      
      // Validate text length
      if (text.length < 5) {
        throw new Error('Message too short - please provide more details about the plugin project');
      }

      if (text.length > 1000) {
        throw new Error('Message too long - please provide a more concise description');
      }

      // Enhanced name and description extraction
      const nameMatch = text.match(/named ["']([^"']+)["']/);
      const description = text.includes('that')
        ? text.substring(text.indexOf('that') + 5).trim()
        : 'A new ElizaOS plugin';

      const name = nameMatch ? nameMatch[1] : `plugin-${Date.now()}`;

      elizaLogger.debug('Extracted plugin details', { name, description });

      // Validate using schema
      const validation = CreatePluginProjectSchema.safeParse({ name, description });
      if (!validation.success) {
        const errorMessage = validation.error.errors.map((e) => e.message).join(', ');
        throw new Error(`Invalid project details: ${errorMessage}`);
      }

      // Create plugin specification
      const specification: PluginSpecification = {
        name,
        description,
        version: '1.0.0',
      };

      const jobId = await service.createPlugin(specification);
      
      if (!jobId) {
        throw new Error('Failed to create plugin job - no job ID returned');
      }

      elizaLogger.info('Plugin project creation job started successfully', { 
        jobId, 
        pluginName: name 
      });

      return {
        text: `✅ **Started Creating ${name} Plugin!**\n\n` +
              `🆔 **Job ID:** ${jobId}\n` +
              `📝 **Description:** ${description}\n\n` +
              `Use GET_JOB_STATUS to monitor progress.`,
        success: true,
        data: {
          actionName: 'CREATE_PLUGIN_PROJECT',
          jobId,
          pluginName: name,
          specification,
        },
        values: { 
          jobId, 
          pluginName: name,
          projectCreated: true,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Plugin project creation failed', error);

      return {
        text: `❌ **Plugin Project Creation Failed**\n\n` +
              `**Error:** ${errorMessage}\n\n` +
              `Please check your request and try again.`,
        success: false,
        data: {
          actionName: 'CREATE_PLUGIN_PROJECT',
          error: errorMessage,
        },
        values: {
          projectCreated: false,
          error: errorMessage,
        },
      };
    }
  },
};

/**
 * Action to check project status using job monitoring
 */
export const checkProjectStatusAction: Action = {
  name: 'CHECK_PROJECT_STATUS',
  similes: ['CHECK_PROJECT_STATUS', 'GET_STATUS', 'MONITOR_PROGRESS'],
  description: 'Checks the status of an ongoing plugin development project',
  examples: [
    [
      { name: 'user', content: { text: 'What is the status of job job-12345?' } },
      {
        name: 'agent',
        content: {
          text: 'Status of plugin job: in-progress, Phase: specification. Currently analyzing requirements.',
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    try {
      // Check if plugin creation service is available
      const service = _runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        elizaLogger.warn('Plugin creation service not available for project status validation');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.debug('No text content provided for project status validation');
        return false;
      }

      const text = message.content.text.toLowerCase();
      
      // Check for minimum content requirements
      if (text.length < 3) {
        elizaLogger.debug('Message too short for project status check');
        return false;
      }

      // Check for status keywords
      const hasStatusKeyword = /\b(status|progress|check|monitor|show)\b/.test(text);
      
      if (!hasStatusKeyword) {
        elizaLogger.debug('Message does not contain project status keywords');
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during project status validation', error);
      return false;
    }
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    try {
      elizaLogger.info('Checking project status', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      // Validate service availability
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        throw new Error('Plugin creation service is not available');
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

      // Enhanced job ID extraction with validation
      const jobIdMatch = text.match(/job[- ]?([a-zA-Z0-9-]+)/);
      const jobId = jobIdMatch ? jobIdMatch[1] : null;

      if (jobId) {
        elizaLogger.debug('Checking specific job status', { jobId });
        
        // Validate job ID format
        if (!/^[a-zA-Z0-9-]{8,}$/i.test(jobId)) {
          throw new Error('Invalid job ID format');
        }

        const job = service.getJobStatus(jobId);
        if (!job) {
          throw new Error(`Job with ID ${jobId} not found`);
        }

        return {
          text: `📊 **Job ${jobId} Status**\n\n` +
                `**Plugin:** ${job.specification.name}\n` +
                `**Status:** ${job.status.toUpperCase()}\n` +
                `**Created:** ${job.createdAt.toLocaleString()}`,
          success: true,
          data: {
            actionName: 'CHECK_PROJECT_STATUS',
            jobId,
            status: job.status,
            pluginName: job.specification.name,
          },
          values: { 
            jobId, 
            status: job.status,
            statusChecked: true,
          },
        };
      }

      // Show all active jobs with enhanced formatting
      elizaLogger.debug('Showing all jobs status');
      const allJobs = service.getAllJobs();
      
      if (allJobs.length === 0) {
        return {
          text: '📋 **No Active Plugin Creation Jobs**\n\nCreate a plugin project first to see jobs here!',
          success: true,
          data: {
            actionName: 'CHECK_PROJECT_STATUS',
            totalJobs: 0,
          },
          values: { 
            totalJobs: 0,
            statusChecked: true,
          },
        };
      }

      const jobsList = allJobs
        .map((job) => {
          const statusIcon = job.status === 'completed' ? '✅' : 
                            job.status === 'failed' ? '❌' : 
                            job.status === 'running' ? '🔄' : '⏳';
          return `${statusIcon} **${job.specification.name}**\n   🆔 ${job.id}\n   📊 ${job.status.toUpperCase()}`;
        })
        .join('\n\n');

      return {
        text: `📋 **Active Plugin Creation Jobs (${allJobs.length} total)**\n\n${jobsList}`,
        success: true,
        data: {
          actionName: 'CHECK_PROJECT_STATUS',
          totalJobs: allJobs.length,
          jobs: allJobs.map(j => ({ id: j.id, name: j.specification.name, status: j.status })),
        },
        values: { 
          totalJobs: allJobs.length,
          statusChecked: true,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Project status check failed', error);

      return {
        text: `❌ **Project Status Check Failed**\n\n` +
              `**Error:** ${errorMessage}\n\n` +
              `Please try again or check the plugin creation service.`,
        success: false,
        data: {
          actionName: 'CHECK_PROJECT_STATUS',
          error: errorMessage,
        },
        values: {
          statusChecked: false,
          error: errorMessage,
        },
      };
    }
  },
};

/**
 * Action to list all plugin creation jobs
 */
export const listJobsAction: Action = {
  name: 'LIST_JOBS',
  similes: ['LIST_JOBS', 'SHOW_JOBS', 'ALL_JOBS'],
  description: 'Lists all plugin creation jobs',
  examples: [
    [
      { name: 'user', content: { text: 'Show me all plugin creation jobs' } },
      {
        name: 'agent',
        content: {
          text: 'Active jobs:\n- job-1: calculator (completed)\n- job-2: weather-plugin (in-progress)',
        },
      },
    ],
  ],
  validate: async (_runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> => {
    try {
      // Check if plugin creation service is available
      const service = _runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        elizaLogger.warn('Plugin creation service not available for orchestration job listing validation');
        return false;
      }

      // Validate message content
      if (!message.content?.text) {
        elizaLogger.debug('No text content provided for orchestration job listing validation');
        return false;
      }

      const text = message.content.text.toLowerCase();
      
      // Check for minimum content requirements
      if (text.length < 3) {
        elizaLogger.debug('Message too short for orchestration job listing');
        return false;
      }

      // Check for job listing keywords
      const hasListKeyword = /\b(list|show|all|display)\b/.test(text);
      const hasJobKeyword = /\b(job|jobs|plugin|plugins|project|projects)\b/.test(text);
      
      if (!hasListKeyword || !hasJobKeyword) {
        elizaLogger.debug('Message does not contain orchestration job listing keywords');
        return false;
      }

      return true;
    } catch (error) {
      elizaLogger.error('Error during orchestration job listing validation', error);
      return false;
    }
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    try {
      elizaLogger.info('Listing orchestration jobs', { 
        messageId: message.id,
        roomId: message.roomId 
      });

      // Validate service availability
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        throw new Error('Plugin creation service is not available');
      }

      const allJobs = service.getAllJobs();
      
      elizaLogger.debug('Retrieved all orchestration jobs', { jobCount: allJobs.length });

      if (allJobs.length === 0) {
        return {
          text: '📋 **No Plugin Creation Jobs Found**\n\nCreate a plugin project first to see jobs listed here!',
          success: true,
          data: {
            actionName: 'LIST_JOBS',
            totalJobs: 0,
          },
          values: {
            totalJobs: 0,
            jobsListed: true,
          },
        };
      }

      const jobsList = allJobs
        .map((job) => {
          const statusIcon =
            job.status === 'completed'
              ? '✅'
              : job.status === 'failed'
                ? '❌'
                : job.status === 'running'
                  ? '🔄'
                  : '⏳';
          return `${statusIcon} **${job.specification.name}**\n   🆔 ${job.id}\n   📊 ${job.status.toUpperCase()}`;
        })
        .join('\n\n');

      return {
        text: `📋 **Plugin Creation Jobs (${allJobs.length} total)**\n\n${jobsList}`,
        success: true,
        data: {
          actionName: 'LIST_JOBS',
          totalJobs: allJobs.length,
          jobs: allJobs.map((j) => ({ id: j.id, name: j.specification.name, status: j.status })),
        },
        values: {
          totalJobs: allJobs.length,
          jobsListed: true,
          jobs: allJobs.map((j) => ({ id: j.id, name: j.specification.name, status: j.status })),
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      elizaLogger.error('Orchestration job listing failed', error);

      return {
        text: `❌ **Job Listing Failed**\n\n` +
              `**Error:** ${errorMessage}\n\n` +
              `Please try again or check the plugin creation service.`,
        success: false,
        data: {
          actionName: 'LIST_JOBS',
          error: errorMessage,
        },
        values: {
          jobsListed: false,
          error: errorMessage,
        },
      };
    }
  },
};

// Export orchestration actions - using the real plugin creation actions
export const orchestrationActions = [
  createPluginProjectAction,
  checkProjectStatusAction,
  listJobsAction,
];
