import { Action, IAgentRuntime, Memory, State, HandlerCallback, Content } from '@elizaos/core';
import { PluginCreationService } from '../services/plugin-creation-service.ts';
import {
  VERIFICATION_SCENARIOS,
  VerificationScenario,
  runVerificationWorkflow,
} from '../scenarios/plugin-verification-scenarios.ts';

export const pluginVerificationAction: Action = {
  name: 'VERIFY_PLUGIN',
  description: 'Guide user through plugin setup and verification',
  similes: [
    'verify plugin',
    'test plugin',
    'setup plugin',
    'configure plugin',
    'check plugin setup',
    'validate plugin',
    'help me set up the plugin',
    'guide me through plugin setup',
  ],

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    return (
      (text.includes('verify') ||
        text.includes('setup') ||
        text.includes('configure') ||
        text.includes('test') ||
        text.includes('help') ||
        text.includes('guide')) &&
      (text.includes('plugin') || text.includes('integration') || text.includes('api'))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<Content> => {
    const service = runtime.getService('plugin_creation') as PluginCreationService;

    if (!service) {
      return {
        text: 'Plugin creation service is not available.',
        success: false,
      };
    }

    const text = message.content.text?.toLowerCase() || '';

    try {
      // Check if user mentioned a specific plugin they just created
      const recentJobs = service.listJobs().filter((job) => job.status === 'completed');
      const lastJob = recentJobs[recentJobs.length - 1];

      // Try to detect plugin type from message or recent job
      let detectedType: string | null = null;
      let scenario: VerificationScenario | null = null;

      // Check for keywords to identify plugin type
      if (text.includes('weather') || text.includes('stock') || text.includes('api')) {
        scenario = VERIFICATION_SCENARIOS.find((s) => s.pluginType === 'api') || null;
        detectedType = 'api';
      } else if (text.includes('database') || text.includes('sql') || text.includes('postgres')) {
        scenario = VERIFICATION_SCENARIOS.find((s) => s.pluginType === 'database') || null;
        detectedType = 'database';
      } else if (text.includes('oauth') || text.includes('google') || text.includes('github')) {
        scenario = VERIFICATION_SCENARIOS.find((s) => s.pluginType === 'oauth') || null;
        detectedType = 'oauth';
      } else if (text.includes('file') || text.includes('directory') || text.includes('folder')) {
        scenario = VERIFICATION_SCENARIOS.find((s) => s.pluginType === 'filesystem') || null;
        detectedType = 'filesystem';
      } else if (text.includes('email') || text.includes('sms') || text.includes('slack')) {
        scenario = VERIFICATION_SCENARIOS.find((s) => s.pluginType === 'external-service') || null;
        detectedType = 'external-service';
      }

      // If no specific type detected, ask user
      if (!scenario) {
        if (callback) {
          await callback({
            text: `I can help you verify and set up your plugin! 

Which type of plugin would you like to configure?

1. **API Integration** (Weather, Stock prices, etc.)
2. **Database Connection** (PostgreSQL, MySQL, etc.)
3. **OAuth Integration** (Google, GitHub, Microsoft)
4. **File System Access** (Read/write files)
5. **External Service** (Email, SMS, Slack)

Please tell me the plugin type or number (1-5):`,
          });
        }

        return {
          text: 'Please specify the plugin type to continue with verification.',
          action: 'WAITING_FOR_PLUGIN_TYPE',
          success: true,
        };
      }

      // If we have a recent job, provide context
      if (lastJob && lastJob.status === 'completed' && callback) {
        await callback({
          text: `I see you recently created: **${lastJob.specification.name}**

Let me help you verify and set up this plugin properly.`,
        });
      }

      // Run the verification workflow
      if (callback) {
        await runVerificationWorkflow(scenario, runtime, message, callback);
      }

      // Store verification state for follow-up
      return {
        text: `Plugin verification workflow initiated for ${scenario.name}.`,
        success: true,
        data: {
          scenario: scenario.name,
          pluginType: detectedType,
          jobId: lastJob?.id,
        },
      };
    } catch (error) {
      console.error('Plugin verification error:', error);
      return {
        text: `Error during plugin verification: ${error instanceof Error ? error.message : String(error)}`,
        success: false,
      };
    }
  },
};
