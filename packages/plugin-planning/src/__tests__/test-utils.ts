import { vi } from 'vitest';
import type { 
  IAgentRuntime, 
  Memory, 
  State, 
  Character,
  UUID,
} from '@elizaos/core';
import { 
  createMockRuntime as baseMockRuntime,
  createMockMemory as baseMockMemory,
  createMockState as baseMockState,
} from '@elizaos/core/test-utils';

/**
 * Create a comprehensive mock runtime for planning tests
 * Extends the base mock runtime with planning-specific overrides
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  // Use the centralized mock runtime with planning-specific defaults
  return baseMockRuntime({
    character: {
      name: 'TestAgent',
      bio: ['Test bio for planning tests'],
      system: 'You are a test agent for planning system validation',
      messageExamples: [],
      postExamples: [],
      topics: ['planning', 'testing'],
      adjectives: ['helpful', 'accurate'],
      knowledge: [],
      clients: [],
      plugins: ['@elizaos/plugin-planning'],
    } as Character,

    getSetting: vi.fn((key: string) => {
      const settings: Record<string, string> = {
        OPENAI_API_KEY: 'test-api-key',
        MODEL_NAME: 'gpt-4',
        PLANNING_TIMEOUT: '30000',
        LOG_LEVEL: 'info',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    getService: vi.fn((name: string) => {
      const services: Record<string, any> = {
        'planning': {
          createSimplePlan: vi.fn(),
          createComprehensivePlan: vi.fn(),
          executePlan: vi.fn(),
          validatePlan: vi.fn(),
          adaptPlan: vi.fn(),
        },
        'memory': {
          getMemories: vi.fn().mockResolvedValue([]),
          createMemory: vi.fn().mockResolvedValue(true),
          searchMemories: vi.fn().mockResolvedValue([]),
        },
        ...(overrides as any).services,
      };
      return services[name];
    }),

    useModel: vi.fn().mockImplementation(async (modelType: string, params: any) => {
      // Mock different model responses based on type and prompt
      if (modelType === 'TEXT_LARGE') {
        if (params.prompt?.includes('plan')) {
          return JSON.stringify({
            goal: 'Test planning goal',
            steps: [
              {
                actionName: 'REPLY',
                parameters: { text: 'Test response' },
                expectedOutput: 'Confirmation',
              },
            ],
            executionModel: 'sequential',
          });
        }
        return 'Mock LLM response for planning';
      }
      if (modelType === 'TEXT_SMALL') {
        return 'Mock small model response';
      }
      return 'Mock model response';
    }),

    actions: [
      {
        name: 'REPLY',
        similes: ['RESPOND', 'ANSWER'],
        description: 'Send a text response',
        handler: vi.fn().mockResolvedValue({ text: 'Mock reply response' }),
        validate: vi.fn().mockResolvedValue(true),
        examples: [],
      },
      {
        name: 'THINK',
        similes: ['REFLECT', 'ANALYZE'],
        description: 'Internal thinking process',
        handler: vi.fn().mockResolvedValue({ thought: 'Mock thinking process' }),
        validate: vi.fn().mockResolvedValue(true),
        examples: [],
      },
      {
        name: 'SEND_EMAIL',
        similes: ['EMAIL'],
        description: 'Send an email message',
        handler: vi.fn().mockResolvedValue({ text: 'Email sent successfully' }),
        validate: vi.fn().mockResolvedValue(true),
        examples: [],
      },
      {
        name: 'SEARCH',
        similes: ['LOOKUP', 'FIND'],
        description: 'Search for information',
        handler: vi.fn().mockResolvedValue({ text: 'Search results found' }),
        validate: vi.fn().mockResolvedValue(true),
        examples: [],
      },
    ],

    providers: [
      {
        name: 'TIME',
        description: 'Current time information',
        get: vi.fn().mockResolvedValue({
          text: 'Current time: ' + new Date().toISOString(),
          values: { currentTime: new Date().toISOString() },
        }),
      },
      {
        name: 'CHARACTER',
        description: 'Agent character information',
        get: vi.fn().mockResolvedValue({
          text: 'Agent: TestAgent',
          values: { agentName: 'TestAgent' },
        }),
      },
    ],

    composeState: vi.fn().mockResolvedValue({
      values: {
        currentTime: new Date().toISOString(),
        userName: 'TestUser',
      },
      data: {
        conversationHistory: [],
        providers: {},
      },
      text: 'Current state context',
    }),

    ...overrides,
  });
}

/**
 * Create a mock memory object for planning tests
 * Uses the centralized mock with planning-specific defaults
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return baseMockMemory({
    content: {
      text: 'Test message content for planning',
      source: 'planning-test',
    },
    metadata: {
      type: 'message',
      source: 'planning-test',
    },
    ...overrides,
  });
}

/**
 * Create a mock state object for planning tests
 * Uses the centralized mock with planning-specific defaults
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return baseMockState({
    values: {
      currentTime: new Date().toISOString(),
      userName: 'TestUser',
      conversationLength: 5,
    },
    data: {
      conversationHistory: [
        {
          role: 'user',
          content: 'Previous message',
          timestamp: Date.now() - 60000,
        },
      ],
      providers: {
        TIME: { currentTime: new Date().toISOString() },
        CHARACTER: { agentName: 'TestAgent' },
      },
    },
    text: 'Current conversation context for planning',
    ...overrides,
  });
}

/**
 * Create a mock planning context for comprehensive planning tests
 */
export function createMockPlanningContext(overrides: any = {}): any {
  return {
    goal: 'Test planning goal',
    constraints: [
      {
        type: 'time',
        value: '30 seconds',
        description: 'Time constraint for testing',
      },
      {
        type: 'resource',
        value: ['REPLY', 'THINK'],
        description: 'Available actions for testing',
      },
    ],
    availableActions: ['REPLY', 'THINK', 'SEND_EMAIL', 'SEARCH'],
    availableProviders: ['TIME', 'CHARACTER'],
    preferences: {
      executionModel: 'sequential',
      maxSteps: 5,
      timeoutMs: 30000,
    },
    ...overrides,
  };
}

/**
 * Create a mock action plan for testing execution
 */
export function createMockActionPlan(overrides: any = {}): any {
  return {
    id: 'test-plan-id' as UUID,
    goal: 'Test action plan',
    steps: [
      {
        id: 'step-1' as UUID,
        actionName: 'REPLY',
        parameters: { text: 'Test step 1' },
        expectedOutput: 'Confirmation message',
      },
      {
        id: 'step-2' as UUID,
        actionName: 'THINK',
        parameters: { thought: 'Test thinking step' },
        expectedOutput: 'Analysis result',
      },
    ],
    executionModel: 'sequential',
    constraints: [],
    createdAt: Date.now(),
    estimatedDuration: 5000,
    ...overrides,
  };
}

/**
 * Helper to simulate async delays in tests
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Helper to create mock action results
 */
export function createMockActionResult(overrides: any = {}): any {
  return {
    values: {
      success: true,
      timestamp: Date.now(),
    },
    data: {
      executionDetails: 'Mock execution details',
    },
    text: 'Mock action completed successfully',
    ...overrides,
  };
}

/**
 * Helper to validate plan structure in tests
 */
export function validatePlanStructure(plan: any): boolean {
  return (
    plan &&
    typeof plan.id === 'string' &&
    typeof plan.goal === 'string' &&
    Array.isArray(plan.steps) &&
    typeof plan.executionModel === 'string' &&
    Array.isArray(plan.constraints) &&
    typeof plan.createdAt === 'number' &&
    typeof plan.estimatedDuration === 'number'
  );
}

/**
 * Helper to simulate LLM responses for planning prompts
 */
export function createMockLLMResponse(prompt: string): string {
  if (prompt.includes('simple plan')) {
    return JSON.stringify({
      goal: 'Simple plan goal',
      steps: [
        {
          actionName: 'REPLY',
          parameters: { text: 'Simple response' },
          expectedOutput: 'Confirmation',
        },
      ],
      executionModel: 'sequential',
    });
  }

  if (prompt.includes('comprehensive plan')) {
    return JSON.stringify({
      goal: 'Comprehensive plan goal',
      steps: [
        {
          actionName: 'THINK',
          parameters: { thought: 'Analyzing request' },
          expectedOutput: 'Analysis complete',
        },
        {
          actionName: 'REPLY',
          parameters: { text: 'Comprehensive response' },
          expectedOutput: 'Detailed confirmation',
        },
      ],
      executionModel: 'sequential',
    });
  }

  if (prompt.includes('adapt plan')) {
    return JSON.stringify({
      goal: 'Adapted plan goal',
      steps: [
        {
          actionName: 'REPLY',
          parameters: { text: 'Fallback response' },
          expectedOutput: 'Alternative confirmation',
        },
      ],
      executionModel: 'sequential',
    });
  }

  return 'Default mock LLM response';
}