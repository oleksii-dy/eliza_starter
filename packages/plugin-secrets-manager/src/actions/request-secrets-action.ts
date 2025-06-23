/**
 * TEMPORARILY DISABLED: This action depends on services that have been removed
 * during the service architecture refactoring. The functionality will be restored
 * once the SecretFormService is enhanced with channel callback and request tracking
 * capabilities as internal managers.
 *
 * TODO: Re-enable once SecretFormService includes:
 * - ChannelCallbackManager
 * - RequestTrackingManager
 */

import {
  Action,
  type Handler,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
  ModelType,
} from '@elizaos/core';
import type { SecretContext, CallbackChannel, SecretRequirement, SecretRequest } from '../types';
// TEMPORARILY DISABLED: These services no longer exist as separate services
// import { ChannelCallbackService } from '../services/channel-callback-service';
// import { RequestTrackingService } from '../services/request-tracking-service';

/**
 * Action for requesting secrets from users via secure channels
 * Enables agents to request sensitive information with proper verification
 *
 * TEMPORARILY DISABLED - See comment at top of file
 */
export const requestSecretsAction: Action = {
  name: 'REQUEST_SECRETS_DISABLED',
  similes: [],
  description: 'DISABLED: Request secrets functionality is temporarily unavailable',

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    // Always return false while disabled
    return false;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: any
  ) => {
    await callback({
      text: 'Secret request functionality is temporarily disabled while we upgrade the service architecture.',
      thought: 'RequestSecretsAction is disabled during service refactoring',
    });
  },

  examples: [],
};

/**
 * Analyze message content to determine what secrets are needed
 */
async function analyzeSecretRequest(
  runtime: IAgentRuntime,
  message: Memory,
  state: State
): Promise<SecretAnalysis> {
  // Build context for analysis
  const template = `
Analyze the following message to determine what secrets or credentials the user wants to provide:

Message: ${message.content.text}

Based on the message, identify:
1. What specific secrets/credentials are needed (be specific with key names)
2. Whether identity verification should be required
3. Appropriate title and description for the request
4. Security level (global, world, or user)

Common secret patterns:
- "API key" → SERVICENAME_API_KEY
- "token" → SERVICENAME_TOKEN  
- "password" → SERVICENAME_PASSWORD
- "database" → DATABASE_URL, DB_PASSWORD
- "Discord" → DISCORD_TOKEN
- "OpenAI" → OPENAI_API_KEY
- "GitHub" → GITHUB_TOKEN
- "Twitter" → TWITTER_API_KEY, TWITTER_API_SECRET

Respond in JSON format:
{
  "secrets": ["SECRET_KEY_1", "SECRET_KEY_2"],
  "requireVerification": true/false,
  "verificationMethods": ["oauth", "wallet"],
  "level": "global/world/user",
  "title": "Request Title",
  "description": "Detailed description of what's needed",
  "expiresIn": 1800000
}
    `;

  try {
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt: template,
      temperature: 0.3,
    });

    const analysis = JSON.parse(response.trim());
    return {
      secrets: analysis.secrets || [],
      requireVerification: analysis.requireVerification || false,
      verificationMethods: analysis.verificationMethods || ['oauth'],
      level: analysis.level || 'user',
      title: analysis.title,
      description: analysis.description,
      expiresIn: analysis.expiresIn || 30 * 60 * 1000,
    };
  } catch (error) {
    logger.error('[RequestSecretsAction] Error analyzing secret request:', error);

    // Fallback analysis
    const text = message.content.text?.toLowerCase() || '';
    const secrets: string[] = [];

    if (text.includes('openai') || text.includes('gpt')) {
      secrets.push('OPENAI_API_KEY');
    }
    if (text.includes('discord')) {
      secrets.push('DISCORD_TOKEN');
    }
    if (text.includes('github')) {
      secrets.push('GITHUB_TOKEN');
    }
    if (text.includes('database') || text.includes('postgres')) {
      secrets.push('DATABASE_URL');
    }

    return {
      secrets,
      requireVerification: secrets.length > 1,
      verificationMethods: ['oauth'],
      level: 'user',
      title: 'Secret Information Request',
      description: 'Please provide the requested credentials securely',
    };
  }
}

/**
 * Determine channel type from message source
 */
function determineChannelType(message: Memory): 'discord' | 'telegram' | 'slack' | 'memory' {
  const source = message.content.source?.toLowerCase();

  if (source?.includes('discord')) return 'discord';
  if (source?.includes('telegram')) return 'telegram';
  if (source?.includes('slack')) return 'slack';

  return 'memory'; // Default to memory-based notifications
}

/**
 * Generate confirmation message for secret request
 */
function generateRequestConfirmation(analysis: SecretAnalysis, request: SecretRequest): string {
  let message = `🔐 **Secure Information Request Created**\n\n`;
  message += `I've set up a secure way for you to provide:\n`;

  for (const secret of analysis.secrets) {
    message += `• ${secret.replace(/_/g, ' ').toLowerCase()}\n`;
  }

  message += `\n`;

  if (analysis.requireVerification) {
    const methods = analysis.verificationMethods?.join(' or ') || 'verification';
    message += `🛡️ **Identity verification required** (${methods})\n`;
  }

  message += `📝 **Next steps:**\n`;
  message += `1. You'll receive a notification with instructions\n`;
  message += `2. Click the secure portal link\n`;
  if (analysis.requireVerification) {
    message += `3. Complete identity verification\n`;
    message += `4. Provide your information safely\n`;
  } else {
    message += `3. Provide your information safely\n`;
  }

  message += `\n⏰ This request expires in ${Math.round((analysis.expiresIn || 30 * 60 * 1000) / 60000)} minutes\n`;
  message += `🔒 All information is encrypted and secure`;

  return message;
}

/**
 * Handle successful secret submission
 */
async function handleSecretSuccess(
  runtime: IAgentRuntime,
  originalMessage: Memory,
  secretKeys: string[],
  data: Record<string, any>
): Promise<void> {
  try {
    // Create success notification
    await runtime.createMemory(
      {
        entityId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: originalMessage.roomId,
        content: {
          text: `✅ **Information Received Successfully**\n\nThank you! I've securely received and stored your ${secretKeys.length} credential(s). The information is now available for use and has been encrypted for security.`,
          source: runtime.agentId,
          metadata: {
            type: 'secret_success_notification',
            secretCount: secretKeys.length,
            secretKeys: secretKeys,
          },
        },
      },
      'notifications'
    );

    logger.info(
      `[RequestSecretsAction] Successfully received ${secretKeys.length} secrets from user`
    );
  } catch (error) {
    logger.error('[RequestSecretsAction] Error handling secret success:', error);
  }
}

/**
 * Handle failed secret submission
 */
async function handleSecretFailure(
  runtime: IAgentRuntime,
  originalMessage: Memory,
  error: string
): Promise<void> {
  try {
    await runtime.createMemory(
      {
        entityId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: originalMessage.roomId,
        content: {
          text: `❌ **Information Request Failed**\n\nThere was an issue with your secure information submission: ${error}\n\nPlease try creating a new request or contact support if you need assistance.`,
          source: runtime.agentId,
          metadata: {
            type: 'secret_failure_notification',
            error: error,
          },
        },
      },
      'notifications'
    );

    logger.warn(`[RequestSecretsAction] Secret request failed: ${error}`);
  } catch (err) {
    logger.error('[RequestSecretsAction] Error handling secret failure:', err);
  }
}

/**
 * Handle secret request timeout
 */
async function handleSecretTimeout(runtime: IAgentRuntime, originalMessage: Memory): Promise<void> {
  try {
    await runtime.createMemory(
      {
        entityId: runtime.agentId,
        agentId: runtime.agentId,
        roomId: originalMessage.roomId,
        content: {
          text: `⏰ **Information Request Expired**\n\nThe secure information request has expired. If you still need to provide this information, please ask me to create a new secure request.`,
          source: runtime.agentId,
          metadata: {
            type: 'secret_timeout_notification',
          },
        },
      },
      'notifications'
    );

    logger.info('[RequestSecretsAction] Secret request timed out');
  } catch (error) {
    logger.error('[RequestSecretsAction] Error handling secret timeout:', error);
  }
}

// Supporting interfaces
interface SecretAnalysis {
  secrets: string[];
  requireVerification: boolean;
  verificationMethods?: ('oauth' | 'wallet')[];
  level: 'global' | 'world' | 'user';
  title?: string;
  description?: string;
  expiresIn?: number;
}
