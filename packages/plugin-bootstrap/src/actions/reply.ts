import { asUUID, Content } from '@elizaos/core';
import {
  type Action,
  type ActionExample,
  composePromptFromState,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type State,
  logger,
} from '@elizaos/core';
import { v4 } from 'uuid';

/**
 * Template for generating dialog and actions for a character.
 *
 * @type {string}
 */
/**
 * Template for generating dialog and actions for a character.
 *
 * @type {string}
 */
const replyTemplate = `# Task: Generate dialog for the character {{agentName}}.
{{providers}}
# Instructions: Write the next message for {{agentName}}.
"thought" should be a short description of what the agent is thinking about and planning.
"message" should be the next message for {{agentName}} which they will send to the conversation.

Response format should be formatted in a valid JSON block like this:
\`\`\`json
{
    "thought": "<string>",
    "message": "<string>"
}
\`\`\`

Your response should include the valid JSON block and nothing else.`;

function getFirstAvailableField(obj: Record<string, any>, fields: string[]): string | null {
  for (const field of fields) {
    if (typeof obj[field] === 'string' && obj[field].trim() !== '') {
      return obj[field];
    }
  }
  return null;
}

function extractReplyContent(response: Memory, replyFieldKeys: string[]): Content | null {
  // Skip agent plans - they are internal and should not be processed as replies
  if ('isPlan' in response && response.isPlan) {
    return null;
  }

  const hasReplyAction = response.content.actions?.includes('REPLY');
  const text = getFirstAvailableField(response.content, replyFieldKeys);

  if (!hasReplyAction || !text) return null;

  return {
    ...response.content,
    thought: response.content.thought,
    text,
    actions: ['REPLY'],
  };
}

/**
 * Represents an action that allows the agent to reply to the current conversation with a generated message.
 *
 * This action can be used as an acknowledgement at the beginning of a chain of actions, or as a final response at the end of a chain of actions.
 *
 * @typedef {Object} replyAction
 * @property {string} name - The name of the action ("REPLY").
 * @property {string[]} similes - An array of similes for the action.
 * @property {string} description - A description of the action and its usage.
 * @property {Function} validate - An asynchronous function for validating the action runtime.
 * @property {Function} handler - An asynchronous function for handling the action logic.
 * @property {ActionExample[][]} examples - An array of example scenarios for the action.
 */
export const replyAction = {
  name: 'REPLY',
  similes: ['GREET', 'REPLY_TO_MESSAGE', 'SEND_REPLY', 'RESPOND', 'RESPONSE'],
  description:
    'Replies to the current conversation with the text from the generated message. Default if the agent is responding with a message and no other action. Use REPLY at the beginning of a chain of actions as an acknowledgement, and at the end of a chain of actions as a final response.',
  validate: async (_runtime: IAgentRuntime) => {
    return true;
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    options: any,
    callback: HandlerCallback,
    responses?: Memory[]
  ) => {
    const replyFieldKeys = ['message', 'text'];

    // Check if we have an action queue service available in options
    const actionQueue = options?.actionQueue;
    const shouldUseQueue = actionQueue?.shouldQueueAction(message.roomId, 'REPLY');
    
    if (shouldUseQueue?.shouldQueue && shouldUseQueue.planId) {
      logger.debug(`[Reply] Using action queue for REPLY action in plan ${shouldUseQueue.planId}`);
      
      // Register this callback with the action queue
      const registered = actionQueue.registerStepCallback(
        shouldUseQueue.planId,
        'REPLY',
        callback
      );
      
      if (registered) {
        // Process the reply content and complete the step
        const existingReplies =
          responses
            ?.map((r) => extractReplyContent(r, replyFieldKeys))
            .filter((reply): reply is Content => reply !== null) ?? [];

        const allProviders = responses?.flatMap((res) => res.content?.providers ?? []) ?? [];

        let replyContent: Content;

        if (existingReplies.length > 0 && allProviders.length === 0) {
          // Use existing reply content
          replyContent = existingReplies[0];
        } else {
          // Generate new reply using LLM
          const composedState = await runtime.composeState(message, [...(allProviders ?? []), 'RECENT_MESSAGES']);

          const prompt = composePromptFromState({
            state: composedState,
            template: replyTemplate,
          });

          const response = await runtime.useModel(ModelType.OBJECT_LARGE, {
            prompt,
          });

          replyContent = {
            thought: response.thought,
            text: (response.message as string) || '',
          };
        }

        // Complete the step in the action queue
        await actionQueue.completeStep(shouldUseQueue.planId, 'REPLY', replyContent);
        
        logger.debug(`[Reply] Completed REPLY step in action queue plan ${shouldUseQueue.planId}`);
        return true;
      } else {
        logger.warn(`[Reply] Failed to register callback with action queue for plan ${shouldUseQueue.planId}`);
      }
    }

    // Fallback to original behavior if not using queue
    logger.debug(`[Reply] Using original (non-queued) REPLY behavior`);
    
    const existingReplies =
      responses
        ?.map((r) => extractReplyContent(r, replyFieldKeys))
        .filter((reply): reply is Content => reply !== null) ?? [];

    // Check if any responses had providers associated with them
    const allProviders = responses?.flatMap((res) => res.content?.providers ?? []) ?? [];

    if (existingReplies.length > 0 && allProviders.length === 0) {
      for (const reply of existingReplies) {
        await callback(reply);
      }
      return;
    }

    // Only generate response using LLM if no suitable response was found
    state = await runtime.composeState(message, [...(allProviders ?? []), 'RECENT_MESSAGES']);

    const prompt = composePromptFromState({
      state,
      template: replyTemplate,
    });

    const response = await runtime.useModel(ModelType.OBJECT_LARGE, {
      prompt,
    });

    const responseContent = {
      thought: response.thought,
      text: (response.message as string) || '',
      // IF we would add actions: ['REPLY'],
      // here that would cause a loop in this action.
      // So never add this to responses unless this is decided
      // by the agent and you want to try loop.
    };

    const replyMessage = {
      id: asUUID(v4()),
      entityId: runtime.agentId,
      agentId: runtime.agentId,
      content: responseContent,
      roomId: message.roomId,
      createdAt: Date.now(),
    };

    await runtime.createMemory(
      {
        ...replyMessage,
        content: {
          ...replyMessage.content,
          actions: ['REPLY'],
        },
      },
      'messages'
    );

    return true;
  },
  examples: [
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Hello there!',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Hi! How can I help you today?',
          actions: ['REPLY'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: "What's your favorite color?",
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'I really like deep shades of blue. They remind me of the ocean and the night sky.',
          actions: ['REPLY'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Can you explain how neural networks work?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: 'Let me break that down for you in simple terms...',
          actions: ['REPLY'],
        },
      },
    ],
    [
      {
        name: '{{name1}}',
        content: {
          text: 'Could you help me solve this math problem?',
        },
      },
      {
        name: '{{name2}}',
        content: {
          text: "Of course! Let's work through it step by step.",
          actions: ['REPLY'],
        },
      },
    ],
  ] as ActionExample[][],
} as Action;
