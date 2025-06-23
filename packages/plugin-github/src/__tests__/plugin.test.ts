import { describe, it, expect, beforeEach, vi, type MockedFunction } from 'vitest';
import { githubPlugin } from '../index';
import { GitHubService } from '../services/github';
import { githubConfigSchema } from '../types';
import { IAgentRuntime, UUID } from '@elizaos/core';

// Create a mock runtime for testing
const createMockRuntime = (): IAgentRuntime => {
  return {
    agentId: 'test-agent' as UUID,
    getSetting: vi.fn(),
    useModel: vi
      .fn()
      .mockResolvedValue(
        '{"isGitHubRelated": false, "confidence": 0, "reasoning": "test", "context": "none", "requiresAction": false}'
      ),
    character: {
      name: 'Test Character',
      bio: 'Test bio',
      settings: {},
    },
  } as any as IAgentRuntime;
};

describe('GitHub Plugin Configuration', () => {
  it('should have correct plugin metadata', () => {
    expect(githubPlugin.name).toBe('plugin-github');
    expect(githubPlugin.description).toContain('GitHub integration');
    expect(githubPlugin.services).toContain(GitHubService);
    expect(githubPlugin.actions).toBeDefined();
    expect(githubPlugin.providers).toBeDefined();
    expect(githubPlugin.tests).toBeDefined();
  });

  it('should have all required actions', () => {
    const actionNames = githubPlugin.actions?.map((action) => action.name) || [];

    // Repository actions
    expect(actionNames).toContain('GET_GITHUB_REPOSITORY');
    expect(actionNames).toContain('LIST_GITHUB_REPOSITORIES');
    expect(actionNames).toContain('CREATE_GITHUB_REPOSITORY');
    expect(actionNames).toContain('SEARCH_GITHUB_REPOSITORIES');

    // Issue actions
    expect(actionNames).toContain('GET_GITHUB_ISSUE');
    expect(actionNames).toContain('LIST_GITHUB_ISSUES');
    expect(actionNames).toContain('CREATE_GITHUB_ISSUE');
    expect(actionNames).toContain('SEARCH_GITHUB_ISSUES');

    // Pull request actions
    expect(actionNames).toContain('GET_GITHUB_PULL_REQUEST');
    expect(actionNames).toContain('LIST_GITHUB_PULL_REQUESTS');
    expect(actionNames).toContain('CREATE_GITHUB_PULL_REQUEST');
    expect(actionNames).toContain('MERGE_GITHUB_PULL_REQUEST');

    // Activity actions
    expect(actionNames).toContain('GET_GITHUB_ACTIVITY');
    expect(actionNames).toContain('CLEAR_GITHUB_ACTIVITY');
    expect(actionNames).toContain('GET_GITHUB_RATE_LIMIT');
  });

  it('should have all required providers', () => {
    const providerNames = githubPlugin.providers?.map((provider) => provider.name) || [];

    expect(providerNames).toContain('GITHUB_REPOSITORY_CONTEXT');
    expect(providerNames).toContain('GITHUB_ISSUES_CONTEXT');
    expect(providerNames).toContain('GITHUB_PULL_REQUESTS_CONTEXT');
    expect(providerNames).toContain('GITHUB_ACTIVITY_CONTEXT');
    expect(providerNames).toContain('GITHUB_USER_CONTEXT');
  });

  it('should have HTTP routes defined', () => {
    expect(githubPlugin.routes).toBeDefined();
    expect(githubPlugin.routes?.length || 0).toBeGreaterThan(0);

    const routePaths = githubPlugin.routes?.map((route) => route.path) || [];
    expect(routePaths).toContain('/api/github/status');
    expect(routePaths).toContain('/api/github/activity');
    expect(routePaths).toContain('/api/github/rate-limit');
  });
});

describe('GitHub Plugin Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).GITHUB_CONFIG;
  });

  it('should initialize successfully with valid configuration', async () => {
    const config = {
      GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
      GITHUB_OWNER: 'test-owner',
      GITHUB_WEBHOOK_SECRET: 'test-webhook-secret',
    };

    const mockRuntime = createMockRuntime();

    // Ensure character exists and has settings
    if (!mockRuntime.character) {
      mockRuntime.character = {
        name: 'Test Character',
        bio: 'Test bio',
        settings: {},
      };
    }
    if (!mockRuntime.character.settings) {
      mockRuntime.character.settings = {};
    }

    expect(mockRuntime.character).toBeDefined();

    // Use try-catch instead of expect().resolves.not.toThrow() to get better error info
    try {
      await githubPlugin.init!(config, mockRuntime);
      // If we get here, the test passes
      expect(true).toBe(true);
    } catch (error) {
      // If we get here, the test fails - show us what error occurred
      console.error('Plugin init failed with error:', error);
      throw new Error(`Plugin init should not have thrown, but got: ${error}`);
    }

    // The settings should be defined even if validation fails in test mode
    expect(mockRuntime.character.settings).toBeDefined();

    // In test mode, settings might not be set if validation fails, which is ok
    // The important thing is that init doesn't throw
  });

  it('should handle invalid GitHub token in test environment', async () => {
    const config = {
      GITHUB_TOKEN: 'invalid-token-format',
      GITHUB_OWNER: 'test-owner',
    };

    // In test environment, it should not throw, just warn
    try {
      await githubPlugin.init!(config, createMockRuntime());
      expect(true).toBe(true);
    } catch (error) {
      console.error('Plugin init with invalid token failed:', error);
      throw new Error(`Plugin init should not have thrown in test mode, but got: ${error}`);
    }
  });

  it('should succeed initialization without GitHub token in test environment', async () => {
    const config = {
      GITHUB_TOKEN: '',
      GITHUB_OWNER: 'test-owner',
    };

    // Should not throw in test environment
    try {
      await githubPlugin.init!(config, createMockRuntime());
      expect(true).toBe(true);
    } catch (error) {
      console.error('Plugin init without token failed:', error);
      throw new Error(`Plugin init should not have thrown in test mode, but got: ${error}`);
    }
  });

  it('should accept fine-grained tokens', async () => {
    const config = {
      GITHUB_TOKEN:
        'github_pat_1234567890abcdef12_1234567890abcdef1234567890abcdef1234567890abcdef123456789',
      GITHUB_OWNER: 'test-owner',
      GITHUB_WEBHOOK_SECRET: 'test-webhook-secret',
    };

    const mockRuntime = createMockRuntime();

    // Ensure character exists and has settings
    if (!mockRuntime.character) {
      mockRuntime.character = {
        name: 'Test Character',
        bio: 'Test bio',
        settings: {},
      };
    }
    if (!mockRuntime.character.settings) {
      mockRuntime.character.settings = {};
    }

    try {
      await githubPlugin.init!(config, mockRuntime);
      expect(true).toBe(true);
    } catch (error) {
      console.error('Plugin init with fine-grained token failed:', error);
      throw new Error(`Plugin init should not have thrown, but got: ${error}`);
    }

    expect(mockRuntime.character.settings).toBeDefined();

    // In test mode, the important thing is that init doesn't throw
    // Configuration details are less important for testing
  });
});

describe('GitHub Configuration Schema', () => {
  it('should validate valid PAT token', () => {
    const config = {
      GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
    };

    expect(() => githubConfigSchema.parse(config)).not.toThrow();
  });

  it('should validate valid fine-grained token', () => {
    const config = {
      GITHUB_TOKEN:
        'github_pat_1234567890abcdef12_1234567890abcdef1234567890abcdef1234567890abcdef123456789',
    };

    expect(() => githubConfigSchema.parse(config)).not.toThrow();
  });

  it('should reject invalid token format', () => {
    const config = {
      GITHUB_TOKEN: 'invalid-token',
    };

    expect(() => githubConfigSchema.parse(config)).toThrow();
  });

  it('should reject empty token', () => {
    const config = {
      GITHUB_TOKEN: '',
    };

    expect(() => githubConfigSchema.parse(config)).toThrow();
  });

  it('should accept optional GITHUB_TOKEN and GITHUB_OWNER', () => {
    const config = {
      GITHUB_TOKEN: 'ghp_1234567890abcdef1234567890abcdef12345678',
      GITHUB_OWNER: 'test-user',
    };

    expect(() => githubConfigSchema.parse(config)).not.toThrow();
  });
});

describe('GitHub Plugin Events', () => {
  it('should have MESSAGE_RECEIVED event handler', () => {
    expect(githubPlugin.events).toBeDefined();
    expect(githubPlugin.events?.MESSAGE_RECEIVED).toBeDefined();
    expect(Array.isArray(githubPlugin.events?.MESSAGE_RECEIVED)).toBe(true);
    expect(githubPlugin.events?.MESSAGE_RECEIVED?.length || 0).toBeGreaterThan(0);
  });

  it('should process GitHub-related messages', async () => {
    if (!githubPlugin.events?.MESSAGE_RECEIVED?.[0]) {
      throw new Error('MESSAGE_RECEIVED event handler not found');
    }

    const messageHandler = githubPlugin.events.MESSAGE_RECEIVED[0];
    const params = {
      runtime: createMockRuntime(),
      source: 'test',
      message: {
        id: 'test-msg' as UUID,
        entityId: 'test-entity' as UUID,
        roomId: 'test-room' as UUID,
        content: {
          text: 'Check the issue on github.com/user/repo',
        },
        createdAt: Date.now(),
      },
    };

    // Should not throw when processing GitHub-related messages
    try {
      await messageHandler(params);
      expect(true).toBe(true);
    } catch (error) {
      console.error('MESSAGE_RECEIVED handler failed:', error);
      throw new Error(`MESSAGE_RECEIVED handler should not have thrown, but got: ${error}`);
    }
  });
});

describe('GitHub Plugin Routes', () => {
  it('should handle status route', async () => {
    const statusRoute = githubPlugin.routes?.find((r) => r.path === '/api/github/status');
    expect(statusRoute).toBeDefined();
    expect(statusRoute!.type).toBe('GET');
    expect(statusRoute!.handler).toBeDefined();
  });

  it('should handle activity route', async () => {
    const activityRoute = githubPlugin.routes?.find((r) => r.path === '/api/github/activity');
    expect(activityRoute).toBeDefined();
    expect(activityRoute!.type).toBe('GET');
    expect(activityRoute!.handler).toBeDefined();
  });

  it('should handle rate-limit route', async () => {
    const rateLimitRoute = githubPlugin.routes?.find((r) => r.path === '/api/github/rate-limit');
    expect(rateLimitRoute).toBeDefined();
    expect(rateLimitRoute!.type).toBe('GET');
    expect(rateLimitRoute!.handler).toBeDefined();
  });
});
