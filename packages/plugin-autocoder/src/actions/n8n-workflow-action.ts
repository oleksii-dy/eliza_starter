import { Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionResult } from '@elizaos/core';
import { N8nWorkflowService } from '../services/N8nWorkflowService';
import { validatePrompt } from '../utils/validation';
import { z } from 'zod';

// Schema for n8n workflow specification
const N8nWorkflowSpecSchema = z.object({
  name: z.string().min(3, 'Workflow name must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  nodes: z
    .array(
      z.object({
        type: z.string(),
        name: z.string(),
        parameters: z.record(z.any()).optional(),
        position: z.array(z.number()).length(2).optional(),
      })
    )
    .optional(),
  connections: z.record(z.any()).optional(),
  triggers: z.array(z.string()).optional(),
  settings: z.record(z.any()).optional(),
});

export const n8nWorkflowAction: Action = {
  name: 'createN8nWorkflow',
  description: 'Create an n8n workflow from specification or natural language description',
  similes: [
    'build n8n workflow',
    'create workflow',
    'generate n8n automation',
    'make n8n flow',
    'build automation workflow',
    'create n8n integration',
  ],
  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'Create an n8n workflow that monitors a GitHub repository for new issues and sends them to Slack',
        },
      },
      {
        name: 'agent',
        content: {
          text: "I'll create an n8n workflow that monitors GitHub for new issues and sends notifications to Slack.",
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Build a workflow that fetches weather data every morning and emails a daily report',
        },
      },
      {
        name: 'agent',
        content: {
          text: "I'll create an n8n workflow with a scheduled trigger to fetch weather data and send daily email reports.",
        },
      },
    ],
  ],
  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const service = runtime.getService<N8nWorkflowService>('n8n-workflow');
    if (!service) {
      return false;
    }

    // Check if there's already an active workflow creation
    const activeJobs = service.getActiveJobs();
    if (activeJobs.length > 0) {
      return false;
    }

    return validatePrompt(_message);
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const service = runtime.getService<N8nWorkflowService>('n8n-workflow');
      if (!service) {
        throw new Error('N8n workflow service not available');
      }

      const messageText = message.content.text;
      if (!messageText) {
        throw new Error('No workflow description provided');
      }

      let workflowSpec: any;
      let isNaturalLanguage = true;

      // Try to parse as JSON first
      try {
        workflowSpec = JSON.parse(messageText);
        N8nWorkflowSpecSchema.parse(workflowSpec);
        isNaturalLanguage = false;
      } catch {
        // Not JSON or invalid spec, treat as natural language
        workflowSpec = await generateWorkflowFromDescription(runtime, messageText);
      }

      // Create the workflow
      const jobId = await service.createWorkflow(workflowSpec);

      const response = `🚀 N8n workflow creation started!

**Job ID:** ${jobId}
**Workflow:** ${workflowSpec.name}
**Type:** ${isNaturalLanguage ? 'Generated from description' : 'From specification'}

I'll create an n8n workflow with the following components:
${formatWorkflowComponents(workflowSpec)}

Use 'checkN8nWorkflowStatus' to monitor progress.`;

      if (callback) {
        await callback({
          text: response,
          action: 'N8N_WORKFLOW_CREATED',
          data: {
            jobId,
            workflowName: workflowSpec.name,
          },
        });
      }

      return {
        text: response,
        data: {
          jobId,
          workflowName: workflowSpec.name,
          success: true,
        },
      };
    } catch (error) {
      const errorMessage = `Failed to create n8n workflow: ${error instanceof Error ? error.message : String(error)}`;

      if (callback) {
        await callback({
          text: errorMessage,
          error: true,
        });
      }

      return {
        text: errorMessage,
        data: {
          error: errorMessage,
          success: false,
        },
      };
    }
  },
};

// Helper function to generate workflow spec from natural language
async function generateWorkflowFromDescription(
  runtime: IAgentRuntime,
  description: string
): Promise<any> {
  const prompt = `Generate an n8n workflow specification from this description:

"${description}"

Create a JSON specification with:
- name: A descriptive workflow name
- description: Clear explanation of what the workflow does
- nodes: Array of n8n nodes needed (triggers, actions, etc.)
- connections: How nodes connect to each other
- triggers: What initiates the workflow

Focus on common n8n nodes like:
- Webhook, Cron, or other triggers
- HTTP Request nodes for APIs
- Code nodes for data transformation
- Communication nodes (Email, Slack, Discord)
- Database nodes if needed

Return ONLY valid JSON, no explanation.`;

  const response = await runtime.useModel('gpt-4', {
    prompt,
    temperature: 0.7,
    maxTokens: 2000,
  });

  try {
    return JSON.parse(response);
  } catch {
    // Fallback to a basic workflow structure
    return {
      name: 'custom-workflow',
      description,
      nodes: [
        {
          type: 'n8n-nodes-base.webhook',
          name: 'Webhook',
          parameters: {},
        },
      ],
    };
  }
}

// Helper function to format workflow components for display
function formatWorkflowComponents(spec: any): string {
  const components: string[] = [];

  if (spec.nodes && spec.nodes.length > 0) {
    components.push(`- **Nodes:** ${spec.nodes.map((n: any) => n.name || n.type).join(', ')}`);
  }

  if (spec.triggers && spec.triggers.length > 0) {
    components.push(`- **Triggers:** ${spec.triggers.join(', ')}`);
  }

  if (spec.settings) {
    components.push('- **Settings:** Custom configuration included');
  }

  return components.join('\n');
}

// Check workflow status action
export const checkN8nWorkflowStatusAction: Action = {
  name: 'checkN8nWorkflowStatus',
  description: 'Check the status of n8n workflow creation',
  similes: ['n8n status', 'workflow progress', 'check n8n workflow'],
  validate: async (runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<boolean> => {
    const service = runtime.getService<N8nWorkflowService>('n8n-workflow');
    return service && service.getActiveJobs().length > 0;
  },
  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: { [key: string]: unknown },
    _callback?: HandlerCallback
  ): Promise<ActionResult> => {
    const service = runtime.getService<N8nWorkflowService>('n8n-workflow');
    const jobs = service.getAllJobs();

    if (jobs.length === 0) {
      return {
        text: 'No n8n workflow creation jobs found.',
        data: { jobs: [] },
      };
    }

    const latestJob = jobs[jobs.length - 1];
    const status = service.getJobStatus(latestJob.id);

    if (!status) {
      return {
        text: 'Job status not found.',
        data: { error: 'Job not found' },
      };
    }

    const response = `📊 N8n Workflow Creation Status

**Job ID:** ${status.id}
**Workflow:** ${status.specification.name}
**Status:** ${status.status.toUpperCase()}
**Progress:** ${status.progress}%

${status.status === 'completed' ? '✅ Workflow created successfully!' : ''}
${status.status === 'failed' ? `❌ Creation failed: ${status.error}` : ''}
${status.status === 'generating' ? '⚙️ Generating workflow...' : ''}
${status.status === 'validating' ? '🔍 Validating workflow...' : ''}`;

    return {
      text: response,
      data: status,
    };
  },
};
