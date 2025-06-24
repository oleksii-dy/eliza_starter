import { mock  } from 'bun:test';
import type { IAgentRuntime, Memory, State, Character, UUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * Create a comprehensive mock runtime for planning tests
 */
export function createMockRuntime(overrides: Partial<IAgentRuntime> = {}): IAgentRuntime {
  return {
    agentId: uuidv4() as UUID,
    character: {
      name: 'TestAgent',
      bio: ['Test bio for planning tests'],
      system: 'You are a test agent for planning system validation',
      messageExamples: [],
      postExamples: [],
      topics: ['planning', 'testing'],
      knowledge: [],
      plugins: ['@elizaos/plugin-planning'],
    } as Character,

    getSetting: mock((key: string) => {
      const settings: Record<string, string> = {
        OPENAI_API_KEY: 'test-api-key',
        MODEL_NAME: 'gpt-4',
        PLANNING_TIMEOUT: '30000',
        LOG_LEVEL: 'info',
        ...(overrides as any).settings,
      };
      return settings[key];
    }),

    getService: mock((name: string) => {
      const services: Record<string, any> = {
        planning: {
          createSimplePlan: mock(),
          createComprehensivePlan: mock(),
          executePlan: mock(),
          validatePlan: mock(),
          adaptPlan: mock(),
        },
        memory: {
          getMemories: mock().mockResolvedValue([]),
          createMemory: mock().mockResolvedValue(true),
          searchMemories: mock().mockResolvedValue([]),
        },
        ...(overrides as any).services,
      };
      return services[name];
    }),

    useModel: mock().mockImplementation(async (modelType: string, params: any) => {
      // Mock different model responses based on type and prompt
      if (modelType === 'TEXT_LARGE') {
        if (params.prompt?.includes('Create a comprehensive action plan')) {
          // Return properly formatted XML for comprehensive planning
          const goal = params.prompt.match(/GOAL: ([^\n]+)/)?.[1] || 'Test comprehensive goal';
          const executionModel =
            params.prompt.match(/EXECUTION MODEL: ([^\n]+)/)?.[1] || 'sequential';

          let steps = '';
          if (goal.includes('timeline')) {
            steps = `<step>
<id>step_1</id>
<action>ANALYZE_INPUT</action>
<parameters>{"type": "timeline_requirements"}</parameters>
<dependencies>[]</dependencies>
<description>Analyze project requirements</description>
</step>
<step>
<id>step_2</id>
<action>CREATE_TASK</action>
<parameters>{"task": "Define milestones"}</parameters>
<dependencies>["step_1"]</dependencies>
<description>Create milestone tasks</description>
</step>
<step>
<id>step_3</id>
<action>SCHEDULE</action>
<parameters>{"duration": "2 weeks"}</parameters>
<dependencies>["step_2"]</dependencies>
<description>Schedule timeline</description>
</step>`;
          } else if (goal.includes('multiple tasks')) {
            steps = `<step>
<id>step_1</id>
<action>TASK_A</action>
<parameters>{}</parameters>
<dependencies>[]</dependencies>
<description>Execute task A</description>
</step>
<step>
<id>step_2</id>
<action>TASK_B</action>
<parameters>{}</parameters>
<dependencies>[]</dependencies>
<description>Execute task B in parallel</description>
</step>
<step>
<id>step_3</id>
<action>TASK_C</action>
<parameters>{}</parameters>
<dependencies>[]</dependencies>
<description>Execute task C in parallel</description>
</step>`;
          } else if (goal.includes('dependent tasks')) {
            steps = `<step>
<id>step_1</id>
<action>SETUP</action>
<parameters>{}</parameters>
<dependencies>[]</dependencies>
<description>Initial setup</description>
</step>
<step>
<id>step_2</id>
<action>PROCESS</action>
<parameters>{}</parameters>
<dependencies>["step_1"]</dependencies>
<description>Process after setup</description>
</step>
<step>
<id>step_3</id>
<action>FINALIZE</action>
<parameters>{}</parameters>
<dependencies>["step_2"]</dependencies>
<description>Finalize process</description>
</step>`;
          } else {
            steps = `<step>
<id>step_1</id>
<action>REPLY</action>
<parameters>{"text": "Executing plan"}</parameters>
<dependencies>[]</dependencies>
<description>Default step</description>
</step>`;
          }

          return `<plan>
<goal>${goal}</goal>
<execution_model>${executionModel}</execution_model>
<steps>
${steps}
</steps>
<estimated_duration>30000</estimated_duration>
</plan>`;
        }

        if (params.prompt?.includes('adapt plan')) {
          return `<plan>
<goal>Adapted plan goal</goal>
<execution_model>sequential</execution_model>
<steps>
<step>
<id>step_1</id>
<action>REPLY</action>
<parameters>{"text": "Adapted response"}</parameters>
<dependencies>[]</dependencies>
<description>Fallback step</description>
</step>
</steps>
<estimated_duration>5000</estimated_duration>
</plan>`;
        }

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
        handler: mock().mockResolvedValue({ text: 'Mock reply response' }),
        validate: mock().mockResolvedValue(true),
        examples: [],
      },
      {
        name: 'THINK',
        similes: ['REFLECT', 'ANALYZE'],
        description: 'Internal thinking process',
        handler: mock().mockResolvedValue({ thought: 'Mock thinking process' }),
        validate: mock().mockResolvedValue(true),
        examples: [],
      },
      {
        name: 'SEND_EMAIL',
        similes: ['EMAIL'],
        description: 'Send an email message',
        handler: mock().mockResolvedValue({ text: 'Email sent successfully' }),
        validate: mock().mockResolvedValue(true),
        examples: [],
      },
      {
        name: 'SEARCH',
        similes: ['LOOKUP', 'FIND'],
        description: 'Search for information',
        handler: mock().mockResolvedValue({ text: 'Search results found' }),
        validate: mock().mockResolvedValue(true),
        examples: [],
      },
    ],

    providers: [
      {
        name: 'TIME',
        description: 'Current time information',
        get: mock().mockResolvedValue({
          text: `Current time: ${new Date().toISOString()}`,
          values: { currentTime: new Date().toISOString() },
        }),
      },
      {
        name: 'CHARACTER',
        description: 'Agent character information',
        get: mock().mockResolvedValue({
          text: 'Agent: TestAgent',
          values: { agentName: 'TestAgent' },
        }),
      },
    ],

    composeState: mock().mockResolvedValue({
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

    // Additional mock methods
    messageManager: {
      createMemory: mock().mockResolvedValue(true),
      getMemories: mock().mockResolvedValue([]),
      updateMemory: mock().mockResolvedValue(true),
      deleteMemory: mock().mockResolvedValue(true),
      searchMemories: mock().mockResolvedValue([]),
      getLastMessages: mock().mockResolvedValue([]),
    },

    logger: {
      info: mock(),
      warn: mock(),
      error: mock(),
      debug: mock(),
    },

    ...overrides,
  } as unknown as IAgentRuntime;
}

/**
 * Create a mock memory object for planning tests
 */
export function createMockMemory(overrides: Partial<Memory> = {}): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    createdAt: Date.now(),
    content: {
      text: 'Test message content for planning',
      source: 'planning-test',
    },
    metadata: {
      type: 'message',
      source: 'planning-test',
    },
    ...overrides,
  } as Memory;
}

/**
 * Create a mock state object for planning tests
 */
export function createMockState(overrides: Partial<State> = {}): State {
  return {
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
  } as State;
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
    id: uuidv4() as UUID,
    goal: 'Test action plan',
    steps: [
      {
        id: uuidv4() as UUID,
        actionName: 'REPLY',
        parameters: { text: 'Test step 1' },
        expectedOutput: 'Confirmation message',
      },
      {
        id: uuidv4() as UUID,
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
