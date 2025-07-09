import type { Action, ActionExample, IAgentRuntime, Memory, ActionResult } from '@elizaos/core';

/**
 * Represents the none action.
 *
 * This action responds but performs no additional action. It is the default if the agent is speaking and not doing anything additional.
 *
 * @type {Action}
 */
/**
 * Represents an action that responds but performs no additional action.
 * This is the default behavior if the agent is speaking and not doing anything additional.
 * @type {Action}
 */
export const noneAction: Action = {
  name: 'NONE',
  similes: ['NO_ACTION', 'NO_RESPONSE', 'NO_REACTION'],
  validate: async (_runtime: IAgentRuntime, _message: Memory) => {
    return true;
  },
  description:
    'Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional. Can be used to acknowledge user input without triggering other actions. Returns acknowledgement status for action chaining.',
  handler: async (_runtime: IAgentRuntime, _message: Memory): Promise<ActionResult> => {
    return {
      text: 'No additional action performed',
      values: {
        success: true,
        acknowledged: true,
        timestamp: Date.now(),
      },
      data: {
        actionName: 'NONE',
        result: 'No action taken',
        conversationState: 'acknowledged',
      },
    };
  },
  effects: {
    provides: ['acknowledgement'],
    requires: [],
    modifies: [],
  },
  examples: [
    [
      {
        name: '{{user}}',
        content: { text: 'Hey whats up' },
      },
      {
        name: '{{agent}}',
        content: { text: 'oh hey', actions: ['NONE'] },
      },
    ],

    [
      {
        name: '{{user}}',
        content: {
          text: 'did u see some faster whisper just came out',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'yeah but its a pain to get into node.js',
          actions: ['NONE'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'the things that were funny 6 months ago are very cringe now',
          actions: ['NONE'],
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'lol true',
          actions: ['NONE'],
        },
      },
      {
        name: '{{user}}',
        content: { text: 'too real haha', actions: ['NONE'] },
      },
    ],
    [
      {
        name: '{{user}}',
        content: { text: 'gotta run', actions: ['NONE'] },
      },
      {
        name: '{{agent}}',
        content: { text: 'Okay, ttyl', actions: ['NONE'] },
      },
      {
        name: '{{user}}',
        content: { text: '', actions: ['IGNORE'] },
      },
    ],

    [
      {
        name: '{{user}}',
        content: { text: 'heyyyyyy', actions: ['NONE'] },
      },
      {
        name: '{{agent}}',
        content: { text: 'whats up long time no see' },
      },
      {
        name: '{{user}}',
        content: {
          text: 'chillin man. playing lots of fortnite. what about you',
          actions: ['NONE'],
        },
      },
    ],

    [
      {
        name: '{{user}}',
        content: { text: 'u think aliens are real', actions: ['NONE'] },
      },
      {
        name: '{{agent}}',
        content: { text: 'ya obviously', actions: ['NONE'] },
      },
    ],

    [
      {
        name: '{{user}}',
        content: { text: 'drop a joke on me', actions: ['NONE'] },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'why dont scientists trust atoms cuz they make up everything lmao',
          actions: ['NONE'],
        },
      },
      {
        name: '{{user}}',
        content: { text: 'haha good one', actions: ['NONE'] },
      },
    ],

    [
      {
        name: '{{user}}',
        content: {
          text: 'hows the weather where ur at',
          actions: ['NONE'],
        },
      },
      {
        name: '{{agent}}',
        content: { text: 'beautiful all week', actions: ['NONE'] },
      },
    ],
  ] as ActionExample[][],
} as Action;
