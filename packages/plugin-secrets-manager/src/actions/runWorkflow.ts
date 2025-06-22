import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type HandlerCallback,
  logger,
  elizaLogger,
  parseJSONObjectFromText,
} from '@elizaos/core';
import { ActionChainService } from '../services/action-chain-service';
import type { ActionChainWorkflow } from '../services/action-chain-service';

interface RunWorkflowParams {
  workflowId?: string;
  workflow?: ActionChainWorkflow;
  params?: any;
  mode?: 'async' | 'sync';
}

export const runWorkflowAction: Action = {
  name: 'RUN_WORKFLOW',
  description:
    'Execute a predefined workflow or custom workflow for complex secret management operations',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const hasService = !!runtime.getService('ACTION_CHAIN');
    if (!hasService) {
      logger.warn('[RunWorkflow] Action chain service not available');
      return false;
    }

    const text = message.content.text?.toLowerCase();
    if (!text) return false;
    const keywords = [
      'run workflow',
      'execute workflow',
      'start workflow',
      'workflow',
      'onboard',
      'setup secrets',
      'rotate secrets',
      'import secrets',
      'setup wizard',
    ];

    return keywords.some((keyword) => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: any,
    options: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    elizaLogger.info('[RunWorkflow] Starting workflow execution');

    const actionChainService = runtime.getService('ACTION_CHAIN') as ActionChainService;
    if (!actionChainService) {
      if (callback) {
        callback({
          text: 'Workflow execution service is not available.',
          error: true,
        });
      }
      return false;
    }

    try {
      // Parse parameters from message
      const messageText = message.content.text;
      if (!messageText) {
        if (callback) {
          callback({
            text: 'Message text is required for workflow execution',
            error: true,
          });
        }
        return false;
      }

      const params =
        (parseJSONObjectFromText(messageText) as RunWorkflowParams) ||
        extractWorkflowParams(messageText);

      let workflowResult: any;
      let responseText: string;

      if (params.workflowId) {
        // Execute predefined workflow
        elizaLogger.info(`[RunWorkflow] Executing predefined workflow: ${params.workflowId}`);

        workflowResult = await actionChainService.executeWorkflow(
          params.workflowId,
          params.params || {},
          message.entityId,
          message.roomId
        );

        responseText = generateWorkflowResponse(params.workflowId, workflowResult);
      } else if (params.workflow) {
        // Execute custom workflow
        elizaLogger.info(`[RunWorkflow] Executing custom workflow: ${params.workflow.name}`);

        workflowResult = await actionChainService.executeWorkflowDirect(
          params.workflow,
          params.params || {},
          message.entityId,
          message.roomId
        );

        responseText = generateWorkflowResponse(params.workflow.id, workflowResult);
      } else {
        // Show available workflows
        const workflows = actionChainService.getWorkflows();
        responseText = generateWorkflowListResponse(workflows);
      }

      if (callback) {
        callback({
          text: responseText,
          data: {
            workflowResult,
            sessionId: workflowResult?.sessionId,
          },
        });
      }

      return true;
    } catch (error) {
      elizaLogger.error('[RunWorkflow] Error:', error);

      if (callback) {
        callback({
          text: `Error executing workflow: ${error instanceof Error ? error.message : String(error)}`,
          error: true,
        });
      }

      return false;
    }
  },

  examples: [
    [
      {
        name: 'user',
        content: {
          text: 'I need help setting up my API keys',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll start the secret onboarding workflow to help you set up your API keys.",
          action: 'RUN_WORKFLOW',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Run the user onboarding workflow',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'Starting the user secret onboarding workflow.',
          action: 'RUN_WORKFLOW',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'I want to rotate my API keys',
        },
      },
      {
        name: 'assistant',
        content: {
          text: "I'll start the secret rotation workflow to help you safely update your API keys.",
          action: 'RUN_WORKFLOW',
        },
      },
    ],
    [
      {
        name: 'user',
        content: {
          text: 'Show me available workflows',
        },
      },
      {
        name: 'assistant',
        content: {
          text: 'Here are the available workflows I can help you with.',
          action: 'RUN_WORKFLOW',
        },
      },
    ],
  ],
};

// Helper function to extract workflow parameters from natural language
function extractWorkflowParams(text: string): RunWorkflowParams {
  const lowerText = text.toLowerCase();

  // Map common phrases to workflow IDs
  if (
    lowerText.includes('onboard') ||
    lowerText.includes('setup') ||
    lowerText.includes('new user')
  ) {
    return {
      workflowId: 'user-secret-onboarding',
      mode: 'async',
    };
  }

  if (
    lowerText.includes('rotate') ||
    lowerText.includes('update keys') ||
    lowerText.includes('change keys')
  ) {
    return {
      workflowId: 'secret-rotation',
      mode: 'sync',
    };
  }

  if (
    lowerText.includes('import') ||
    lowerText.includes('bulk') ||
    lowerText.includes('multiple secrets')
  ) {
    return {
      workflowId: 'bulk-secret-import',
      mode: 'async',
    };
  }

  // Extract custom workflow ID if mentioned
  const workflowMatch = text.match(/workflow[:\s]+([a-z-]+)/i);
  if (workflowMatch) {
    return {
      workflowId: workflowMatch[1],
      mode: 'sync',
    };
  }

  return { mode: 'sync' };
}

// Generate response for workflow execution
function generateWorkflowResponse(workflowId: string, result: any): string {
  if (!result.success) {
    return (
      `❌ Workflow "${workflowId}" failed: ${result.error}\n\n` +
      `Completed ${result.completedSteps} of ${result.totalSteps} steps.`
    );
  }

  const duration =
    result.results.length > 0
      ? result.results.reduce((sum: number, r: any) => sum + r.duration, 0)
      : 0;

  let response = `✅ Workflow "${workflowId}" completed successfully!\n\n`;
  response += `📊 **Summary:**\n`;
  response += `- Steps completed: ${result.completedSteps}/${result.totalSteps}\n`;
  response += `- Duration: ${duration}ms\n`;
  response += `- Session ID: ${result.sessionId}\n\n`;

  if (result.results.length > 0) {
    response += `📋 **Steps executed:**\n`;
    result.results.forEach((step: any, index: number) => {
      const status = step.success ? '✅' : '❌';
      response += `${index + 1}. ${status} ${step.actionName}\n`;
      if (!step.success && step.error) {
        response += `   Error: ${step.error}\n`;
      }
    });
  }

  // Add specific workflow completion messages
  switch (workflowId) {
    case 'user-secret-onboarding':
      response += `\n🎉 Welcome aboard! Your API keys are now configured and ready to use.`;
      break;
    case 'secret-rotation':
      response += `\n🔄 Your secrets have been rotated successfully. All dependent services will use the new keys.`;
      break;
    case 'bulk-secret-import':
      response += `\n📥 Bulk import completed. All secrets have been imported and validated.`;
      break;
  }

  return response;
}

// Generate response listing available workflows
function generateWorkflowListResponse(workflows: ActionChainWorkflow[]): string {
  if (workflows.length === 0) {
    return 'No workflows are currently available.';
  }

  let response = '🔧 **Available Workflows:**\n\n';

  workflows.forEach((workflow, index) => {
    response += `${index + 1}. **${workflow.name}** (${workflow.id})\n`;
    if (workflow.description) {
      response += `   ${workflow.description}\n`;
    }
    response += `   Steps: ${workflow.steps.length}\n\n`;
  });

  response += `To run a workflow, say something like:\n`;
  response += `- "Run the user onboarding workflow"\n`;
  response += `- "I need to rotate my secrets"\n`;
  response += `- "Help me import multiple secrets"\n`;

  return response;
}
