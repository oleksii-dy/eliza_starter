import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import type { E2BService } from '../services/E2BService.js';

export const manageSandboxAction: Action = {
  name: 'MANAGE_SANDBOX',
  description: 'Create, list, or manage E2B sandboxes. Allows sandbox lifecycle management.',

  validate: async (runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    try {
      // Check if E2B service is available
      const e2bService = runtime.getService<E2BService>('e2b');
      if (!e2bService) {
        return false;
      }

      const text = message.content.text?.toLowerCase() || '';

      // Check for sandbox management keywords
      const sandboxKeywords = [
        'sandbox', 'create sandbox', 'new sandbox', 'list sandbox',
        'kill sandbox', 'stop sandbox', 'sandbox status',
        'environment', 'container', 'isolated'
      ];

      return sandboxKeywords.some(keyword => text.includes(keyword));
    } catch (error) {
      elizaLogger.error('Error validating manage sandbox action', { error: error.message });
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      elizaLogger.info('Managing sandbox', { messageId: message.id });

      const e2bService = runtime.getService<E2BService>('e2b');
      if (!e2bService) {
        throw new Error('E2B service not available');
      }

      const text = message.content.text?.toLowerCase() || '';
      let action = 'list'; // default action
      let responseText = '';
      let actionData: any = {};

      // Determine the requested action
      if (text.includes('create') || text.includes('new')) {
        action = 'create';
      } else if (text.includes('kill') || text.includes('stop') || text.includes('terminate')) {
        action = 'kill';
      } else if (text.includes('list') || text.includes('show') || text.includes('status')) {
        action = 'list';
      }

      switch (action) {
        case 'create': {
          // Parse any specific requirements from the message
          const metadata: Record<string, string> = {
            createdBy: 'eliza-agent',
            purpose: 'user-request',
            timestamp: new Date().toISOString(),
          };

          // Check for timeout specification
          let timeoutMs = 300000; // default 5 minutes
          const timeoutMatch = text.match(/(\d+)\s*(minutes?|mins?|seconds?|secs?|hours?)/);
          if (timeoutMatch) {
            const value = parseInt(timeoutMatch[1], 10);
            const unit = timeoutMatch[2];
            if (unit.startsWith('hour')) {
              timeoutMs = value * 60 * 60 * 1000;
            } else if (unit.startsWith('min')) {
              timeoutMs = value * 60 * 1000;
            } else if (unit.startsWith('sec')) {
              timeoutMs = value * 1000;
            }
          }

          const sandboxId = await e2bService.createSandbox({
            timeoutMs,
            metadata,
          });

          responseText = '✅ **New sandbox created successfully!**\n\n' +
                        `**Sandbox ID:** \`${sandboxId}\`\n` +
                        `**Timeout:** ${timeoutMs / 1000} seconds\n` +
                        '**Status:** Active and ready for code execution\n\n' +
                        'You can now execute code, and it will run in this isolated environment.';

          actionData = { sandboxId, timeoutMs, metadata };
          break;
        }

        case 'kill': {
          // Try to extract sandbox ID from the message
          const idMatch = text.match(/sandbox[:\s]+([a-f0-9-]+)/i);
          const sandboxes = e2bService.listSandboxes();

          if (idMatch) {
            const sandboxId = idMatch[1];
            await e2bService.killSandbox(sandboxId);
            responseText = `✅ **Sandbox killed successfully**\n\nSandbox \`${sandboxId}\` has been terminated and all resources have been cleaned up.`;
            actionData = { killedSandboxId: sandboxId };
          } else if (sandboxes.length > 0) {
            // Kill the most recent sandbox if no ID specified
            const latestSandbox = sandboxes.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())[0];
            await e2bService.killSandbox(latestSandbox.sandboxId);
            responseText = `✅ **Latest sandbox killed successfully**\n\nSandbox \`${latestSandbox.sandboxId}\` has been terminated.`;
            actionData = { killedSandboxId: latestSandbox.sandboxId };
          } else {
            responseText = 'ℹ️ **No sandboxes to kill**\n\nThere are currently no active sandboxes running.';
            actionData = { message: 'no_sandboxes' };
          }
          break;
        }

        case 'list':
        default: {
          const sandboxes = e2bService.listSandboxes();

          if (sandboxes.length === 0) {
            responseText = 'ℹ️ **No active sandboxes**\n\nThere are currently no running sandboxes. Use "create sandbox" to start a new one.';
          } else {
            responseText = `📋 **Active Sandboxes (${sandboxes.length})**\n\n`;

            sandboxes.forEach((sandbox, index) => {
              const uptime = Date.now() - sandbox.createdAt.getTime();
              const uptimeStr = formatUptime(uptime);
              const lastActivity = Date.now() - sandbox.lastActivity.getTime();
              const lastActivityStr = formatUptime(lastActivity);

              responseText += `**${index + 1}.** \`${sandbox.sandboxId}\`\n`;
              responseText += `   • **Status:** ${sandbox.isActive ? '🟢 Active' : '🔴 Inactive'}\n`;
              responseText += `   • **Template:** ${sandbox.template}\n`;
              responseText += `   • **Uptime:** ${uptimeStr}\n`;
              responseText += `   • **Last Activity:** ${lastActivityStr} ago\n`;
              if (sandbox.metadata) {
                responseText += `   • **Metadata:** ${Object.keys(sandbox.metadata).length} properties\n`;
              }
              responseText += '\n';
            });
          }

          actionData = { sandboxes: sandboxes.map(s => ({
            id: s.sandboxId,
            isActive: s.isActive,
            uptime: Date.now() - s.createdAt.getTime(),
            lastActivity: Date.now() - s.lastActivity.getTime()
          })) };
          break;
        }
      }

      const actionResult: ActionResult = {
        text: responseText,
        values: {
          success: true,
          action,
          sandboxCount: e2bService.listSandboxes().length,
        },
        data: {
          action,
          ...actionData,
          allSandboxes: e2bService.listSandboxes()
        }
      };

      elizaLogger.info('Sandbox management completed', { action, success: true });

      if (callback) {
        const content = {
          text: actionResult.text,
          ...(actionResult.values && Object.keys(actionResult.values).length > 0 && actionResult.values)
        };
        await callback(content);
      }

      return actionResult;

    } catch (error) {
      elizaLogger.error('Manage sandbox action failed', { error: error.message });

      const errorResult: ActionResult = {
        text: `❌ **Sandbox management failed**\n\nError: ${error.message}`,
        values: { success: false, error: error.message },
        data: { error: error.message }
      };

      if (callback) {
        const content = {
          text: errorResult.text,
          ...(errorResult.values && Object.keys(errorResult.values).length > 0 && errorResult.values)
        };
        await callback(content);
      }

      return errorResult;
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: { text: 'Can you create a new sandbox for me?' }
      },
      {
        name: '{{agentName}}',
        content: { text: '✅ **New sandbox created successfully!**\n\n**Sandbox ID:** `sbx-abc123def456`\n**Timeout:** 300 seconds\n**Status:** Active and ready for code execution' }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'List all my sandboxes' }
      },
      {
        name: '{{agentName}}',
        content: { text: '📋 **Active Sandboxes (2)**\n\n**1.** `sbx-abc123def456`\n   • **Status:** 🟢 Active\n   • **Template:** base\n   • **Uptime:** 5m 23s\n   • **Last Activity:** 30s ago' }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Kill sandbox sbx-abc123def456' }
      },
      {
        name: '{{agentName}}',
        content: { text: '✅ **Sandbox killed successfully**\n\nSandbox `sbx-abc123def456` has been terminated and all resources have been cleaned up.' }
      }
    ],
    [
      {
        name: '{{user1}}',
        content: { text: 'Create a sandbox with 10 minute timeout' }
      },
      {
        name: '{{agentName}}',
        content: { text: '✅ **New sandbox created successfully!**\n\n**Sandbox ID:** `sbx-xyz789abc123`\n**Timeout:** 600 seconds\n**Status:** Active and ready for code execution' }
      }
    ]
  ]
};

// Helper function to format uptime
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}
