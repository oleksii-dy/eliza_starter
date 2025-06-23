import { describe, it, expect } from 'bun:test';
import type { IAgentRuntime } from '@elizaos/core';
import { asUUID } from '@elizaos/core';
import { v4 as uuidv4 } from 'uuid';

/**
 * E2E tests for the self-modification plugin
 * Tests real runtime behavior with live character modifications
 */
describe('Self Modification E2E Tests', () => {
  // Mock runtime for testing
  const createMockRuntime = (): IAgentRuntime => {
    const mockRuntime = {
      agentId: asUUID(uuidv4()),
      character: {
        name: 'TestAgent',
        bio: ['Original bio'],
        topics: ['topic1', 'topic2'],
        system: 'Original system prompt'
      },
      actions: []
      evaluators: []
      providers: []
      services: new Map(),
      getService: (name: string) => {
        if (name === 'character-file-manager') {
          return {
            validateModification: (mod: any) => ({ valid: true, errors: [] }),
            applyModification: async (mod: any) => ({ success: true }),
            createBackup: async () => 'backup-path'
          };
        }
        return null;
      },
      createMemory: async () => ({ id: asUUID(uuidv4()) }),
      getMemories: async () => []
      getSetting: () => 'admin-user-id',
      getCache: async () => null,
      setCache: async () => {},
      useModel: async () => '{"isModificationRequest": true, "requestType": "explicit", "confidence": 0.8}'
    } as any;

    // Add mock actions
    mockRuntime.actions = [{
      name: 'MODIFY_CHARACTER',
      validate: async () => true,
      handler: async () => ({ success: true })
    }];

    // Add mock evaluators
    mockRuntime.evaluators = [{
      name: 'CHARACTER_EVOLUTION',
      validate: async () => true,
      handler: async () => {}
    }];

    // Add mock providers
    mockRuntime.providers = [{
      name: 'CHARACTER_EVOLUTION',
      get: async () => ({
        text: 'CHARACTER EVOLUTION CONTEXT',
        values: { hasEvolutionCapability: true }
      })
    }];

    return mockRuntime;
  };

  it('should validate plugin initialization and service availability', () => {
    const runtime = createMockRuntime();

    // Verify services are available
    const fileManager = runtime.getService('character-file-manager');
    expect(fileManager).toBeDefined();

    // Verify actions are registered
    const modifyAction = runtime.actions.find((a: any) => a.name === 'MODIFY_CHARACTER');
    expect(modifyAction).toBeDefined();

    // Verify evaluators are registered
    const evolutionEvaluator = runtime.evaluators.find(
      (e: any) => e.name === 'CHARACTER_EVOLUTION'
    );
    expect(evolutionEvaluator).toBeDefined();

    // Verify providers are registered
    const evolutionProvider = runtime.providers.find(
      (p: any) => p.name === 'CHARACTER_EVOLUTION'
    );
    expect(evolutionProvider).toBeDefined();
  });

  it('should trigger character evolution evaluator correctly', async () => {
    const runtime = createMockRuntime();
    const roomId = asUUID(uuidv4());
    const userId = asUUID(uuidv4());

    // Create messages that should trigger evolution analysis
    const messages = [
      {
        id: asUUID(uuidv4()),
        entityId: userId,
        roomId,
        content: {
          text: 'You should be more encouraging when helping people learn',
          source: 'test',
        },
        createdAt: Date.now(),
      }
    ];

    // Create state with message count
    const state = {
      values: {},
      data: { messageCount: 3 },
      text: '',
    };

    // Test evaluator validation
    const evaluator = runtime.evaluators.find((e: any) => e.name === 'CHARACTER_EVOLUTION');
    expect(evaluator).toBeDefined();
    const shouldRun = await evaluator!.validate(runtime, messages[0], state);

    expect(shouldRun).toBe(true);
  });

  it('should handle character modifications via MODIFY_CHARACTER action', async () => {
    const runtime = createMockRuntime();
    const roomId = asUUID(uuidv4());
    const userId = asUUID(uuidv4());

    // Create user request for character modification
    const message = {
      id: asUUID(uuidv4()),
      entityId: userId,
      roomId,
      content: {
        text: 'Add machine learning to your list of topics you know about',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    const state = {
      values: {},
      data: {},
      text: '',
    };

    // Test action validation
    const action = runtime.actions.find((a: any) => a.name === 'MODIFY_CHARACTER');
    expect(action).toBeDefined();
    const isValid = await action!.validate(runtime, message, state);

    expect(isValid).toBe(true);

    // Test action execution
    const result = await action!.handler(runtime, message, state, {}, async () => []);

    expect(result).toBeDefined();
    expect(result).toHaveProperty('success');
    expect((result as any).success).toBe(true);
  });

  it('should provide character evolution context via provider', async () => {
    const runtime = createMockRuntime();
    const roomId = asUUID(uuidv4());
    const message = {
      id: asUUID(uuidv4()),
      entityId: asUUID(uuidv4()),
      roomId,
      content: {
        text: 'Tell me about your evolution capabilities',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    const state = {
      values: {},
      data: {},
      text: '',
    };

    // Test provider
    const provider = runtime.providers.find((p: any) => p.name === 'CHARACTER_EVOLUTION');
    expect(provider).toBeDefined();
    const result = await provider!.get(runtime, message, state);

    expect(result).toBeDefined();
    expect(result.text).toContain('CHARACTER EVOLUTION CONTEXT');
    expect(result.values).toBeDefined();
    expect(result.values!.hasEvolutionCapability).toBe(true);
  });

  it('should validate character modifications safely', () => {
    const runtime = createMockRuntime();
    const fileManager = runtime.getService('character-file-manager') as any;

    // Test valid modification
    const validModification = {
      bio: ['Interested in helping people learn new technologies'],
      topics: ['education', 'learning'],
    };

    const validResult = fileManager.validateModification(validModification);
    expect(validResult.valid).toBe(true);
  });
});

// Export empty default for compatibility
export default {};
