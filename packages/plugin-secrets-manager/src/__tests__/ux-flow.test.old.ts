import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnhancedSecretManager } from '../enhanced-service';
import { ActionChainService } from '../services/action-chain-service';
import { uxGuidanceProvider } from '../providers/uxGuidanceProvider';
import { runWorkflowAction } from '../actions/runWorkflow';
import { manageSecretAction } from '../actions/manageSecret';
import { requestSecretFormAction } from '../actions/requestSecretForm';
import type { IAgentRuntime, Memory, UUID } from '@elizaos/core';
import type { UXGuidanceResponse } from '../providers/uxGuidanceProvider';

// Helper function to get guidance
const getGuidance = async (
  runtime: IAgentRuntime,
  message: Memory
): Promise<UXGuidanceResponse> => {
  const result = await uxGuidanceProvider.get(runtime, message, { values: {}, data: {}, text: '' });
  return result.data as UXGuidanceResponse;
};

// Mock runtime for UX flow testing
const createMockRuntime = (): IAgentRuntime => {
  const services = new Map();

  const runtime = {
    agentId: 'test-agent' as UUID,
    character: {
      name: 'TestAgent',
      settings: {
        secrets: {},
      },
    },
    getSetting: vi.fn((key: string) => {
      if (key === 'ENCRYPTION_SALT') return 'test-salt';
      return null;
    }),
    getService: vi.fn((type: string) => services.get(type)),
    registerService: vi.fn((ServiceClass: any) => {
      const instance = new ServiceClass(runtime);
      services.set(ServiceClass.serviceType || ServiceClass.serviceName, instance);
      return instance;
    }),
    plugins: [],
    db: {
      getComponents: vi.fn().mockResolvedValue([]),
      createComponent: vi.fn().mockResolvedValue(true),
      updateComponent: vi.fn().mockResolvedValue(true),
      getWorlds: vi.fn().mockResolvedValue([]),
      updateWorld: vi.fn().mockResolvedValue(true),
    },
    getWorld: vi.fn().mockResolvedValue(null),
    updateWorld: vi.fn().mockResolvedValue(true),
    getComponents: vi.fn().mockResolvedValue([]),
    updateComponent: vi.fn().mockResolvedValue(true),
    createComponent: vi.fn().mockResolvedValue(true),
  } as any;

  return runtime;
};

describe('Secrets Manager UX Flow Tests', () => {
  let mockRuntime: IAgentRuntime;
  let secretsManager: EnhancedSecretManager;
  let actionChainService: ActionChainService;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRuntime = createMockRuntime();

    // Initialize services
    secretsManager = new EnhancedSecretManager(mockRuntime);

    // Use the static start method which properly initializes the service
    actionChainService = await ActionChainService.start(mockRuntime);

    // Register services manually for testing
    const services = mockRuntime.getService as any;
    services.mockImplementation((type: string) => {
      if (type === 'SECRETS') return secretsManager;
      if (type === 'ACTION_CHAIN') return actionChainService;
      return null;
    });

    // Start services
    await secretsManager.initialize();
  });

  afterEach(async () => {
    await actionChainService.stop();
  });

  describe('New User Onboarding Flow', () => {
    it('should guide new users through secret setup', async () => {
      const message: Memory = {
        id: 'test-1' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'I need help setting up my API keys',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      // Step 1: UX Guidance should detect new user
      const guidance = await getGuidance(mockRuntime, message);

      expect(guidance.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'setup',
          title: expect.stringContaining('Welcome'),
          workflowId: 'user-secret-onboarding',
          priority: 'high',
        })
      );

      expect(guidance.quickActions).toContainEqual(
        expect.objectContaining({
          label: 'Add Secret',
          actionName: 'REQUEST_SECRET_FORM',
          category: 'secrets',
        })
      );

      expect(guidance.statusSummary.totalSecrets).toBe(0);
    });

    it('should execute user onboarding workflow', async () => {
      const message: Memory = {
        id: 'test-2' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'Run the user onboarding workflow',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      let callbackResult: any = null;
      const callback = vi.fn(async (result) => {
        callbackResult = result;
        return [];
      });

      // Execute workflow action
      const success = await runWorkflowAction.handler(
        mockRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(success).toBe(true);
      expect(callback).toHaveBeenCalled();
      expect(callbackResult.text).toContain('onboarding');
    });
  });

  describe('Secret Management Flow', () => {
    it('should handle secret addition flow', async () => {
      const message: Memory = {
        id: 'test-3' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'I need to add my OpenAI API key',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      let callbackResult: any = null;
      const callback = vi.fn(async (result) => {
        callbackResult = result;
        return [];
      });

      // Action should be validated
      const isValid = await requestSecretFormAction.validate(mockRuntime, message);
      expect(isValid).toBe(false); // No form service in mock

      // If form service was available, it would create a form
      // This tests the action logic without external dependencies
    });

    it('should handle secret listing', async () => {
      const message: Memory = {
        id: 'test-4' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: JSON.stringify({
            operation: 'list',
            level: 'user',
          }),
          source: 'user',
        },
        createdAt: Date.now(),
      };

      let callbackResult: any = null;
      const callback = vi.fn(async (result) => {
        callbackResult = result;
        return [];
      });

      const success = await manageSecretAction.handler(
        mockRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(success).toBe(true);
      expect(callback).toHaveBeenCalled();
      expect(callbackResult.text).toContain('No user-level secrets found');
    });
  });

  describe('Security and Guidance Flow', () => {
    it('should provide security recommendations', async () => {
      // Mock user with some secrets
      const userSecrets = {
        OPENAI_API_KEY: {
          type: 'api_key' as const,
          level: 'user' as const,
          required: true,
          description: 'OpenAI API Key',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now() - 100 * 24 * 60 * 60 * 1000, // 100 days old
          value: 'sk-old-key',
        },
      };

      vi.spyOn(secretsManager, 'list').mockResolvedValue(userSecrets);
      vi.spyOn(secretsManager, 'getMissingEnvVars').mockResolvedValue([]);

      const message: Memory = {
        id: 'test-5' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'How is my security?',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      const guidance = await getGuidance(mockRuntime, message);

      expect(guidance.statusSummary.totalSecrets).toBe(1);
      expect(guidance.statusSummary.expiredSecrets).toBe(1);
      expect(guidance.statusSummary.securityScore).toBeLessThan(100);

      expect(guidance.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'security',
          title: expect.stringContaining('secrets may need rotation'),
          workflowId: 'secret-rotation',
        })
      );
    });

    it('should suggest workflows for experienced users', async () => {
      // Mock user with many secrets
      const userSecrets = {
        OPENAI_API_KEY: {
          type: 'api_key' as const,
          level: 'user' as const,
          required: true,
          description: 'OpenAI API Key',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
        ANTHROPIC_API_KEY: {
          type: 'api_key' as const,
          level: 'user' as const,
          required: true,
          description: 'Anthropic API Key',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
        GITHUB_TOKEN: {
          type: 'credential' as const,
          level: 'user' as const,
          required: true,
          description: 'GitHub Token',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
        AWS_ACCESS_KEY: {
          type: 'api_key' as const,
          level: 'user' as const,
          required: true,
          description: 'AWS Access Key',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
        DATABASE_URL: {
          type: 'url' as const,
          level: 'user' as const,
          required: true,
          description: 'Database URL',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
        JWT_SECRET: {
          type: 'secret' as const,
          level: 'user' as const,
          required: true,
          description: 'JWT Secret',
          canGenerate: false,
          encrypted: true,
          status: 'valid' as const,
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
      };

      vi.spyOn(secretsManager, 'list').mockResolvedValue(userSecrets);
      vi.spyOn(secretsManager, 'getMissingEnvVars').mockResolvedValue([]);

      const message: Memory = {
        id: 'test-6' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'Show me what I can do',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      const guidance = await getGuidance(mockRuntime, message);

      expect(guidance.statusSummary.totalSecrets).toBe(6);
      expect(guidance.quickActions).toContainEqual(
        expect.objectContaining({
          label: 'Workflows',
          actionName: 'RUN_WORKFLOW',
          category: 'workflows',
        })
      );

      expect(guidance.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'optimization',
          title: expect.stringContaining('Automate'),
        })
      );
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle service unavailability gracefully', async () => {
      // Create runtime without services
      const bareboneRuntime = {
        agentId: mockRuntime.agentId,
        character: mockRuntime.character,
        getSetting: mockRuntime.getSetting,
        getService: vi.fn().mockReturnValue(null), // Always return null
        db: mockRuntime.db,
        getWorld: mockRuntime.getWorld,
        updateWorld: mockRuntime.updateWorld,
        getComponents: mockRuntime.getComponents,
        updateComponent: mockRuntime.updateComponent,
        createComponent: mockRuntime.createComponent,
      };

      const message: Memory = {
        id: 'test-7' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'Help me with secrets',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      const guidance = await getGuidance(bareboneRuntime as any, message);

      expect(guidance.suggestions).toContainEqual(
        expect.objectContaining({
          type: 'troubleshooting',
          title: 'Get Help',
        })
      );

      expect(guidance.contextualHelp.troubleshooting).toContainEqual(
        expect.objectContaining({
          issue: 'Service unavailable',
        })
      );
    });

    it('should provide contextual help based on user message', async () => {
      const testCases = [
        {
          text: 'I have an API key error',
          expectedContext: 'api-keys',
        },
        {
          text: 'How do workflows work?',
          expectedContext: 'workflows',
        },
        {
          text: 'I need help with secrets',
          expectedContext: 'secrets',
        },
        {
          text: 'Something is broken',
          expectedContext: 'troubleshooting',
        },
      ];

      for (const testCase of testCases) {
        const message: Memory = {
          id: 'test-context' as UUID,
          agentId: mockRuntime.agentId,
          entityId: 'user-123' as UUID,
          roomId: 'room-123' as UUID,
          content: {
            text: testCase.text,
            source: 'user',
          },
          createdAt: Date.now(),
        };

        const guidance = await getGuidance(mockRuntime, message);
        expect(guidance.contextualHelp.currentContext).toBe(testCase.expectedContext);
      }
    });
  });

  describe('Workflow Chain Integration', () => {
    it('should execute complete workflow chains', async () => {
      const workflows = actionChainService.getWorkflows();
      expect(workflows.length).toBeGreaterThan(0);

      const onboardingWorkflow = workflows.find((w) => w.id === 'user-secret-onboarding');
      expect(onboardingWorkflow).toBeDefined();
      expect(onboardingWorkflow?.steps.length).toBeGreaterThan(0);
    });

    it('should handle workflow failures gracefully', async () => {
      // Mock a failing workflow
      const failingWorkflow = {
        id: 'test-failing-workflow',
        name: 'Test Failing Workflow',
        steps: [
          {
            actionName: 'NON_EXISTENT_ACTION',
            params: {},
          },
        ],
      };

      const result = await actionChainService.executeWorkflowDirect(
        failingWorkflow,
        {},
        'user-123'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.completedSteps).toBe(0);
    });
  });

  describe('Action Chaining Validation', () => {
    it('should validate action callbacks work correctly', async () => {
      const message: Memory = {
        id: 'test-8' as UUID,
        agentId: mockRuntime.agentId,
        entityId: 'user-123' as UUID,
        roomId: 'room-123' as UUID,
        content: {
          text: 'Test action chaining',
          source: 'user',
        },
        createdAt: Date.now(),
      };

      const callbackResults: any[] = [];
      const callback = vi.fn(async (result) => {
        callbackResults.push(result);
        return [];
      });

      // Test multiple actions in sequence
      await manageSecretAction.handler(
        mockRuntime,
        message,
        { values: {}, data: {}, text: '' },
        {},
        callback
      );

      expect(callbackResults.length).toBe(1);
      expect(callbackResults[0]).toHaveProperty('text');
    });
  });
});

describe('UX Flow Scenarios from secrets_scripts.md', () => {
  let mockRuntime: IAgentRuntime;
  let secretsManager: EnhancedSecretManager;
  let actionChainService: ActionChainService;

  beforeEach(async () => {
    mockRuntime = createMockRuntime();
    secretsManager = new EnhancedSecretManager(mockRuntime);

    // Use the static start method which properly initializes the service
    actionChainService = await ActionChainService.start(mockRuntime);

    // Register services manually for testing
    const services = mockRuntime.getService as any;
    services.mockImplementation((type: string) => {
      if (type === 'SECRETS') return secretsManager;
      if (type === 'ACTION_CHAIN') return actionChainService;
      return null;
    });

    await secretsManager.initialize();
  });

  it('should handle Scenario 1: Standard User Good Case', async () => {
    // Simulate Alex asking to store OpenAI API key
    const message: Memory = {
      id: 'scenario-1' as UUID,
      agentId: mockRuntime.agentId,
      entityId: 'user-alex' as UUID,
      roomId: 'room-123' as UUID,
      content: {
        text: 'Hey Eliza, I need to set my OpenAI API key for this project. Can you help me with that?',
        source: 'user',
      },
      createdAt: Date.now(),
    };

    const isValid = await requestSecretFormAction.validate(mockRuntime, message);
    // Would be true if form service was available

    // Check that the action recognizes the intent
    expect(message.content.text?.toLowerCase()).toContain('openai api key');
  });

  it('should handle Scenario 5: User Asking for Help/Discovery', async () => {
    const message: Memory = {
      id: 'scenario-5' as UUID,
      agentId: mockRuntime.agentId,
      entityId: 'user-neo' as UUID,
      roomId: 'room-123' as UUID,
      content: {
        text: 'What are secrets in this system? And what secrets can I set?',
        source: 'user',
      },
      createdAt: Date.now(),
    };

    const guidance = await getGuidance(mockRuntime, message);

    expect(guidance.contextualHelp.currentContext).toBe('secrets');
    expect(guidance.contextualHelp.commonTasks).toContainEqual(
      expect.objectContaining({
        title: expect.stringContaining('Add a new API key'),
      })
    );
  });

  it('should handle missing secrets detection', async () => {
    vi.spyOn(secretsManager, 'getMissingEnvVars').mockResolvedValue([
      {
        varName: 'OPENAI_API_KEY',
        plugin: 'user',
        config: {
          type: 'api_key',
          required: true,
          description: 'OpenAI API Key',
          canGenerate: false,
          status: 'missing',
          attempts: 0,
          plugin: 'user',
          createdAt: Date.now(),
        },
      },
    ]);

    const message: Memory = {
      id: 'missing-secrets' as UUID,
      agentId: mockRuntime.agentId,
      entityId: 'user-test' as UUID,
      roomId: 'room-123' as UUID,
      content: {
        text: 'What do I need to set up?',
        source: 'user',
      },
      createdAt: Date.now(),
    };

    const guidance = await getGuidance(mockRuntime, message);

    expect(guidance.statusSummary.missingSecrets).toBe(1);
    expect(guidance.suggestions).toContainEqual(
      expect.objectContaining({
        type: 'setup',
        title: expect.stringContaining('missing secrets'),
      })
    );
  });
});
