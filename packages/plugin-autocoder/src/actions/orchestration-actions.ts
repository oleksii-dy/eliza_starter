import type { Action, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type {
  PluginCreationService,
  PluginSpecification,
} from '../services/PluginCreationService.js';
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
    const text = message.content.text?.toLowerCase() || '';
    const service = _runtime.getService<PluginCreationService>('plugin_creation');
    return !!service && text.includes('create') && text.includes('plugin');
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    try {
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        return { text: 'Plugin creation service is not available.' };
      }

      const text = message.content.text || '';
      const nameMatch = text.match(/named ["']([^"']+)["']/);
      const description = text.includes('that')
        ? text.substring(text.indexOf('that') + 5).trim()
        : 'A new ElizaOS plugin';

      const name = nameMatch ? nameMatch[1] : `plugin-${Date.now()}`;

      const validation = CreatePluginProjectSchema.safeParse({ name, description });
      if (!validation.success) {
        return {
          text: `Invalid project details: ${validation.error.errors.map((e) => e.message).join(', ')}`,
        };
      }

      // Create plugin specification
      const specification: PluginSpecification = {
        name,
        description,
        version: '1.0.0',
      };

      const jobId = await service.createPlugin(specification);
      elizaLogger.info(`[ORCHESTRATION] Started plugin creation job: ${jobId}`);

      return {
        text: `✅ Started creating ${name} plugin! Job ID: ${jobId}. Use GET_JOB_STATUS to monitor progress.`,
        success: true,
        values: { jobId, pluginName: name },
      };
    } catch (error) {
      elizaLogger.error('[ORCHESTRATION] Plugin creation failed:', error);
      return {
        text: `Failed to create plugin: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
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
    const text = message.content.text?.toLowerCase() || '';
    const service = _runtime.getService<PluginCreationService>('plugin_creation');
    return !!service && (text.includes('status') || text.includes('progress'));
  },
  handler: async (runtime: IAgentRuntime, message: Memory, _state?: State) => {
    try {
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        return { text: 'Plugin creation service is not available.' };
      }

      const text = message.content.text || '';
      const jobIdMatch = text.match(/job[- ]?([a-zA-Z0-9-]+)/);
      const jobId = jobIdMatch ? jobIdMatch[1] : null;

      if (jobId) {
        const job = service.getJobStatus(jobId);
        if (!job) {
          return { text: `Job with ID ${jobId} not found.` };
        }
        return {
          text: `Job ${jobId} status: ${job.status}`,
          success: true,
          values: { jobId, status: job.status },
        };
      }

      // Show all active jobs
      const allJobs = service.getAllJobs();
      if (allJobs.length === 0) {
        return { text: 'No active plugin creation jobs.' };
      }

      const jobsList = allJobs
        .map((job) => `- ${job.id}: ${job.specification.name} (${job.status})`)
        .join('\n');

      return {
        text: `Active plugin creation jobs:\n${jobsList}`,
        success: true,
        values: { totalJobs: allJobs.length },
      };
    } catch (error) {
      elizaLogger.error('[ORCHESTRATION] Status check failed:', error);
      return {
        text: `Failed to check status: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
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
    const text = message.content.text?.toLowerCase() || '';
    const service = _runtime.getService<PluginCreationService>('plugin_creation');
    return (
      !!service &&
      (text.includes('list') || text.includes('show') || text.includes('all')) &&
      text.includes('job')
    );
  },
  handler: async (runtime: IAgentRuntime, _message: Memory, _state?: State) => {
    try {
      const service = runtime.getService<PluginCreationService>('plugin_creation');
      if (!service) {
        return { text: 'Plugin creation service is not available.' };
      }

      const allJobs = service.getAllJobs();
      if (allJobs.length === 0) {
        return { text: 'No plugin creation jobs found.' };
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
          return `${statusIcon} ${job.id}: ${job.specification.name} (${job.status})`;
        })
        .join('\n');

      return {
        text: `Plugin Creation Jobs (${allJobs.length} total):\n${jobsList}`,
        success: true,
        values: {
          totalJobs: allJobs.length,
          jobs: allJobs.map((j) => ({ id: j.id, name: j.specification.name, status: j.status })),
        },
      };
    } catch (error) {
      elizaLogger.error('[ORCHESTRATION] Job listing failed:', error);
      return {
        text: `Failed to list jobs: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
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
