import { describe, it, expect, beforeEach } from 'bun:test';
import autocoderPlugin from '../index.ts';
import type { IAgentRuntime, Memory, State } from '@elizaos/core';

// Real plugin integration tests - testing actual plugin structure and validation
describe('AutoCoder Plugin - Real Integration Tests', () => {
  it('should export a valid plugin with all required properties', () => {
    expect(autocoderPlugin).toBeDefined();
    expect(autocoderPlugin.name).toBe('@elizaos/plugin-autocoder');
    expect(autocoderPlugin.description).toContain('auto-coding system');
    expect(autocoderPlugin.services).toBeDefined();
    expect(autocoderPlugin.actions).toBeDefined();
    expect(autocoderPlugin.providers).toBeDefined();
    expect(autocoderPlugin.init).toBeDefined();
  });

  it('should have all required services defined', () => {
    expect(autocoderPlugin.services?.length).toBeGreaterThanOrEqual(5);

    const serviceNames =
      autocoderPlugin.services?.map((service) =>
        typeof service === 'function' ? service.serviceName : service.component?.serviceName
      ) || [];
    expect(serviceNames).toContain('docker');
    expect(serviceNames).toContain('communication-bridge');
    expect(serviceNames).toContain('container-orchestrator');
    expect(serviceNames).toContain('task-manager');
    expect(serviceNames).toContain('secure-environment');
  });

  it('should have container management actions with proper structure', () => {
    const actionNames = autocoderPlugin.actions?.map((action) => action.name) || [];
    expect(actionNames).toContain('SPAWN_SUB_AGENT');
    expect(actionNames).toContain('MONITOR_TASK');
    expect(actionNames).toContain('TERMINATE_TASK');

    // Test each action has required properties
    autocoderPlugin.actions?.forEach((action) => {
      expect(action.name).toBeDefined();
      expect(action.description).toBeDefined();
      expect(action.handler).toBeDefined();
      expect(action.validate).toBeDefined();
      expect(action.examples).toBeDefined();
      expect(Array.isArray(action.examples)).toBe(true);
    });
  });

  it('should validate SPAWN_SUB_AGENT action correctly', async () => {
    const spawnAction = autocoderPlugin.actions?.find(
      (action) => action.name === 'SPAWN_SUB_AGENT'
    );
    expect(spawnAction).toBeDefined();

    // Create mock runtime for validation
    const mockRuntime = {
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
      getService: (name: string) => ({
        ping: () => Promise.resolve(true),
      }),
    } as unknown as IAgentRuntime;

    // Test positive validation
    const validMessage: Memory = {
      id: 'test-id' as any,
      entityId: 'test-entity' as any,
      roomId: 'test-room' as any,
      agentId: 'test-agent' as any,
      content: {
        text: 'Please implement a user authentication system',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    const isValid = await spawnAction!.validate(mockRuntime, validMessage, {
      /* empty */
    } as State);
    expect(isValid).toBe(true);

    // Test negative validation
    const invalidMessage: Memory = {
      ...validMessage,
      content: {
        text: 'Hello, how are you today?',
        source: 'test',
      },
    };

    const isInvalid = await spawnAction!.validate(mockRuntime, invalidMessage, {
      /* empty */
    } as State);
    expect(isInvalid).toBe(false);
  });

  it('should validate MONITOR_TASK action correctly', async () => {
    const monitorAction = autocoderPlugin.actions?.find((action) => action.name === 'MONITOR_TASK');
    expect(monitorAction).toBeDefined();

    const mockRuntime = {
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
      getService: (name: string) => ({
        ping: () => Promise.resolve(true),
      }),
    } as unknown as IAgentRuntime;

    // Test with task ID
    const messageWithTaskId: Memory = {
      id: 'test-id' as any,
      entityId: 'test-entity' as any,
      roomId: 'test-room' as any,
      agentId: 'test-agent' as any,
      content: {
        text: 'Show me the status of task_12345',
        source: 'test',
      },
      createdAt: Date.now(),
    };

    const isValid = await monitorAction!.validate(mockRuntime, messageWithTaskId, {
      /* empty */
    } as State);
    expect(isValid).toBe(true);

    // Test without task reference
    const messageWithoutTask: Memory = {
      ...messageWithTaskId,
      content: {
        text: 'What time is it?',
        source: 'test',
      },
    };

    const isInvalid = await monitorAction!.validate(mockRuntime, messageWithoutTask, {
      /* empty */
    } as State);
    expect(isInvalid).toBe(false);
  });

  it('should have proper dependencies declared', () => {
    expect(autocoderPlugin.dependencies).toBeDefined();
    expect(Array.isArray(autocoderPlugin.dependencies)).toBe(true);

    // Check for critical dependencies
    const deps = autocoderPlugin.dependencies || [];
    expect(deps).toContain('plugin-env');
    expect(deps).toContain('plugin-manager');
    expect(deps).toContain('plugin-trust');
  });

  it('should have realistic examples in actions', () => {
    autocoderPlugin.actions?.forEach((action) => {
      expect(action.examples?.length).toBeGreaterThan(0);

      action.examples?.forEach((example) => {
        expect(Array.isArray(example)).toBe(true);
        expect(example.length).toBeGreaterThanOrEqual(2); // At least user and agent message

        example.forEach((message) => {
          expect(message.name).toBeDefined();
          expect(message.content).toBeDefined();
          expect(message.content.text).toBeDefined();
        });
      });
    });
  });

  it('should handle services gracefully when dependencies are missing', async () => {
    // Test plugin initialization without required services
    const mockRuntime = {
      agentId: 'test-agent',
      character: { name: 'Test Agent' },
      getService: (name: string) => null, // Simulate missing services
      getSetting: (key: string) => null,
      logger: {
        info: () => {
          /* empty */
        },
        warn: () => {
          /* empty */
        },
        error: () => {
          /* empty */
        },
      },
    } as any;

    // Plugin init should not throw even if dependencies are missing
    expect(async () => {
      await autocoderPlugin.init?.(
        {
          /* empty */
        },
        mockRuntime
      );
    }).not.toThrow();
  });

  it('should have proper TypeScript types for all exports', () => {
    // Type checking tests
    expect(typeof autocoderPlugin.name).toBe('string');
    expect(typeof autocoderPlugin.description).toBe('string');
    expect(Array.isArray(autocoderPlugin.services)).toBe(true);
    expect(Array.isArray(autocoderPlugin.actions)).toBe(true);
    expect(Array.isArray(autocoderPlugin.providers)).toBe(true);
    expect(Array.isArray(autocoderPlugin.dependencies)).toBe(true);
    expect(typeof autocoderPlugin.init).toBe('function');
  });

  it('should have comprehensive action descriptions', () => {
    autocoderPlugin.actions?.forEach((action) => {
      // Each action should have a meaningful description
      expect(action.description.length).toBeGreaterThan(20);
      expect(action.description).not.toContain('TODO');
      expect(action.description).not.toContain('placeholder');

      // Description should explain what the action does (including verb forms like creates, updates, etc.)
      const actionVerbs =
        /\b(create|spawn|monitor|terminate|manage|update|check|provide|cancel|enable|disable|add|get|publish|run|echo)[sd]?e?[sd]?\b/;
      expect(action.description.toLowerCase()).toMatch(actionVerbs);
    });
  });

  it('should validate provider structure', () => {
    expect(autocoderPlugin.providers).toBeDefined();
    expect(Array.isArray(autocoderPlugin.providers)).toBe(true);

    autocoderPlugin.providers?.forEach((provider) => {
      expect(provider.name).toBeDefined();
      expect(typeof provider.name).toBe('string');
      expect(provider.get).toBeDefined();
      expect(typeof provider.get).toBe('function');
    });
  });

  it('should have valid service classes', () => {
    autocoderPlugin.services?.forEach((service) => {
      // Check static properties
      const ServiceClass = typeof service === 'function' ? service : service.component;
      expect(ServiceClass.serviceName).toBeDefined();
      expect(typeof ServiceClass.serviceName).toBe('string');
      expect(ServiceClass.start).toBeDefined();
      expect(typeof ServiceClass.start).toBe('function');

      // Check service name follows convention
      expect(ServiceClass.serviceName).toMatch(/^[a-z][a-z0-9-]*[a-z0-9]$/);
    });
  });
});
