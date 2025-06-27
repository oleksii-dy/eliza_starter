import type { IAgentRuntime, Memory, State } from '@elizaos/core';
import { createMockRuntime as createCoreMockRuntime } from '@elizaos/core/test-utils';
import { v4 as uuidv4 } from 'uuid';

export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the unified mock runtime from core with planning-specific overrides
  return createCoreMockRuntime({
    // Planning-specific settings
    getSetting: (key: string) => {
      const defaultSettings: Record<string, any> = {
        OPENAI_API_KEY: 'test-api-key',
        MODEL_NAME: 'gpt-4',
        PLANNING_TIMEOUT: '30000',
        LOG_LEVEL: 'info',
      };
      return defaultSettings[key] || null;
    },

    // Mock the useModel method to return predictable responses for planning tests
    useModel: (modelType: string, params: any) => {
      // Mock planning responses based on the prompt content
      const prompt = params.prompt || '';

      // For email-related prompts
      if (prompt.includes('Send an email') || prompt.includes('email')) {
        return Promise.resolve(
          JSON.stringify({
            goal: 'Execute actions: SEND_EMAIL',
            steps: [
              {
                id: 'step-1',
                actionName: 'SEND_EMAIL',
                description: 'Send email to recipient',
                dependencies: [],
                estimatedDuration: 1000,
              },
            ],
          })
        );
      }

      // For research/search prompts
      if (prompt.includes('research') || prompt.includes('search')) {
        return Promise.resolve(
          JSON.stringify({
            goal: 'Execute actions: SEARCH, REPLY',
            steps: [
              {
                id: 'step-1',
                actionName: 'SEARCH',
                description: 'Search for information',
                dependencies: [],
                estimatedDuration: 2000,
              },
              {
                id: 'step-2',
                actionName: 'REPLY',
                description: 'Reply with findings',
                dependencies: ['step-1'],
                estimatedDuration: 1000,
              },
            ],
          })
        );
      }

      // Default response for other planning prompts
      return Promise.resolve(
        JSON.stringify({
          goal: 'Execute actions: REPLY',
          steps: [
            {
              id: 'step-1',
              actionName: 'REPLY',
              description: 'Provide response',
              dependencies: [],
              estimatedDuration: 500,
            },
          ],
        })
      );
    },

    // Planning-specific services
    getService: (name: string) => {
      const services: Record<string, any> = {
        planning: {
          createSimplePlan: async (runtime: any, message: any, state: any) => {
            // Mock based on message content
            const text = message?.content?.text || '';
            if (text.includes('send email')) {
              return {
                id: 'test-plan-id',
                goal: 'Execute actions: SEND_EMAIL',
                title: 'Email Plan',
                description: 'Send email task',
                steps: [
                  {
                    id: 'step-1',
                    action: 'SEND_EMAIL',
                    description: 'Send email',
                    status: 'pending',
                  },
                ],
              };
            }
            if (text.includes('research') || text.includes('search')) {
              return {
                id: 'test-plan-id',
                goal: 'Execute actions: SEARCH, REPLY',
                title: 'Research Plan',
                description: 'Research and reply task',
                steps: [
                  {
                    id: 'step-1',
                    action: 'SEARCH',
                    description: 'Search for information',
                    status: 'pending',
                  },
                  {
                    id: 'step-2',
                    action: 'REPLY',
                    description: 'Reply with findings',
                    status: 'pending',
                  },
                ],
              };
            }
            return {
              id: 'test-plan-id',
              goal: 'Execute actions: REPLY',
              title: 'Simple Plan',
              description: 'Basic task plan',
              steps: [
                { id: 'step-1', action: 'REPLY', description: 'Reply to user', status: 'pending' },
              ],
            };
          },
          createComprehensivePlan: async () => ({
            id: 'comprehensive-plan-id',
            title: 'Comprehensive Test Plan',
            description: 'A comprehensive test planning scenario',
            steps: [],
            metadata: {},
          }),
          executePlan: async () => ({ success: true, executedSteps: 2 }),
          validatePlan: async () => ({ isValid: true, errors: [] }),
          adaptPlan: async () => ({ adapted: true, changes: [] }),
        },
        memory: {
          getMemories: async () => [],
          createMemory: async () => true,
          searchMemories: async () => [],
        },
        ...(overrides as any)?.services,
      };
      return services[name];
    },

    ...overrides,
  }) as any;
}

export function createMockMemory(content: any = {}): Memory {
  return {
    id: uuidv4(),
    entityId: uuidv4(),
    content: {
      text: 'test message',
      ...content,
    },
    agentId: uuidv4(),
    roomId: uuidv4(),
    createdAt: Date.now(),
  } as Memory;
}

export function createMockState(): State {
  return {
    values: {},
    data: {},
    text: '',
  } as State;
}

export function createMockPlanningContext() {
  return {
    planId: uuidv4(),
    stepIndex: 0,
    totalSteps: 3,
    currentStep: {
      id: 'step-1',
      description: 'Initial step',
      status: 'pending',
    },
    metadata: {},
    resources: {},
    capabilities: [],
    constraints: [],
  };
}
