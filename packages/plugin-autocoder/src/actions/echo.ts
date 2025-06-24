import type { Action, ActionExample, ActionResult, Content, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';

/**
 * Configuration interface for the echo action
 */
export interface EchoConfig {
  prefix?: string; // Optional prefix for echoed messages
  suffix?: string; // Optional suffix for echoed messages
  uppercase?: boolean; // Transform to uppercase
  addTimestamp?: boolean; // Include timestamp in response
}

/**
 * Echo action that repeats user input with optional formatting
 */
export const echoAction: Action = {
  name: 'ECHO_MESSAGE',
  similes: ['ECHO', 'REPEAT', 'SAY_BACK'],
  description: "Echoes back the user's input with optional formatting. Returns formatted text and configuration data for action chaining.",

  /**
   * Validates if the action should be triggered
   * Looks for echo-related keywords in the message
   */
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    try {
      const text = message.content.text?.toLowerCase() || '';

      // Check if message contains echo trigger words
      const triggers = ['echo', 'repeat', 'say back', 'say again'];
      const hasEchoTrigger = triggers.some((trigger) => text.includes(trigger));

      // Also validate if there's actual content to echo
      const hasContent = message.content.text && message.content.text.trim().length > 0;

      logger.debug(
        `Echo validation - hasEchoTrigger: ${hasEchoTrigger}, hasContent: ${hasContent}`
      );

      return Boolean(hasEchoTrigger && hasContent);
    } catch (error) {
      logger.error('Error in echo action validation:', error);
      return false;
    }
  },

  /**
   * Handles the echo action execution
   */
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback,
    responses?: Memory[]
  ): Promise<ActionResult> => {
    try {
      logger.info('Executing ECHO_MESSAGE action');

      // Get configuration from character settings
      const config = (runtime.character?.settings?.echo as EchoConfig) || {};

      // Extract the text to echo (remove trigger words)
      const originalText = message.content.text || '';
      const triggers = ['echo', 'repeat', 'say back', 'say again'];

      let textToEcho = originalText;

      // Remove trigger words from the beginning
      for (const trigger of triggers) {
        const regex = new RegExp(`^${trigger}\\s*:?\\s*`, 'i');
        textToEcho = textToEcho.replace(regex, '').trim();
      }

      // If no text remains after removing triggers, use original text
      if (!textToEcho) {
        textToEcho = originalText;
      }

      // Apply formatting based on configuration
      let formattedText = textToEcho;

      if (config.uppercase) {
        formattedText = formattedText.toUpperCase();
      }

      if (config.prefix) {
        formattedText = `${config.prefix} ${formattedText}`;
      }

      if (config.suffix) {
        formattedText = `${formattedText} ${config.suffix}`;
      }

      if (config.addTimestamp) {
        const timestamp = new Date().toISOString();
        formattedText = `[${timestamp}] ${formattedText}`;
      }

      // Create response content
      const responseContent: Content = {
        text: formattedText,
        actions: ['ECHO_MESSAGE'],
        source: message.content.source,
      };

      // Store echo in memory for context
      await runtime.createMemory(
        {
          ...message,
          content: {
            ...responseContent,
            metadata: {
              isEcho: true,
              originalText: textToEcho,
              config,
            },
          },
        },
        'messages'
      );

      // Send response via callback
      if (callback) {
        await callback(responseContent);
      }

      logger.info(`Echo action completed successfully. Echoed: "${formattedText}"`);
      
      return {
        text: formattedText,
        values: {
          success: true,
          originalText: textToEcho,
          formatted: true,
          configApplied: config,
        },
        data: {
          actionName: 'ECHO_MESSAGE',
          originalMessage: originalText,
          formattedText,
          config,
          timestamp: config.addTimestamp ? new Date().toISOString() : undefined,
        },
      };
    } catch (error) {
      logger.error('Error in echo action handler:', error);
      return {
        text: 'Error processing echo request',
        values: {
          success: false,
          error: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
        data: {
          actionName: 'ECHO_MESSAGE',
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: 'handler_error',
        },
      };
    }
  },

  /**
   * Example usage patterns for the echo action
   */
  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'echo Hello World!',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Hello World!',
          thought: 'The user wants me to echo their message back to them.',
          actions: ['ECHO_MESSAGE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'please repeat what I just said and then log it',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'what I just said',
          thought: 'User wants me to echo their message and also log the action for later reference.',
          actions: ['ECHO_MESSAGE', 'LOG_ACTION'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'echo this message and then create a reminder about it',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'this message',
          thought: 'User wants me to echo the message first, then create a reminder based on it.',
          actions: ['ECHO_MESSAGE', 'CREATE_REMINDER'],
        },
      },
    ],
  ] as ActionExample[][],
};
