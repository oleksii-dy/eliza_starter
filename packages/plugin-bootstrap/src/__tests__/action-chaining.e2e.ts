import {
  type IAgentRuntime,
  type Action,
  type Memory,
  type State,
  type TestSuite,
  type ActionState,
  asUUID,
} from '@elizaos/core';
import { v4 } from 'uuid';

const actionA: Action = {
  name: 'ACTION_A_TEST',
  description: 'Returns a static value in the action state.',
  validate: async () => true,
  handler: async (): Promise<ActionState | void> => {
    return {
      values: {
        status: 'online',
        source: 'action_a',
      },
      text: 'Action A executed and returned a status.',
    };
  },
};

const actionB: Action = {
  name: 'ACTION_B_TEST',
  description: 'Requires a value from a previous action.',
  validate: async () => true,
  handler: async (runtime: IAgentRuntime): Promise<void> => {
    // This action relies on the output of Action A
    const previousState = (runtime as any).currentActionRunState;
    if (previousState?.values?.status !== 'online') {
      throw new Error(
        `Action B failed: Did not receive correct state from Action A. Got: ${JSON.stringify(
          previousState?.values
        )}`
      );
    }
  },
};

export const actionChainingTest = {
  name: 'e2e-action-chaining-and-state-passing',
  description: 'Tests if state can be passed between actions in a single run.',
  fn: async (runtime: IAgentRuntime) => {
    console.log('--- Running Action Chaining E2E Test ---');

    // Register the mock actions directly into the runtime for this test
    runtime.registerAction(actionA);
    runtime.registerAction(actionB);

    const message: Memory = {
      id: asUUID(v4()),
      agentId: runtime.agentId,
      entityId: asUUID(v4()),
      roomId: asUUID(v4()),
      content: {
        text: 'test message',
        actions: ['ACTION_A_TEST', 'ACTION_B_TEST'],
      },
      createdAt: Date.now(),
    };

    const responses: Memory[] = [message];
    const state: State = {
      values: {},
      data: {},
      text: '',
    };
    const callback = async () => [];

    try {
      await runtime.processActions(message, responses, state, callback);
      console.log('✅ Action Chaining E2E Test PASSED');
    } catch (error) {
      console.error('❌ Action Chaining E2E Test FAILED:', error);
      throw error;
    }
    console.log('--- Action Chaining E2E Test Complete ---');
  },
};

export const actionChainingTestSuite: TestSuite[] = [
  {
    name: 'Action Chaining Tests',
    tests: [actionChainingTest],
  },
];
