import { describe, it, expect, beforeEach, vi } from 'vitest';
import { elizaDevPlugin, validateElizaDevConfig, checkElizaDevHealth } from '../src/index.js';
import type { IAgentRuntime } from '@elizaos/core';

// Mock runtime for testing
const createMockRuntime = (): IAgentRuntime => ({
  agentId: 'test-agent',
  getSetting: vi.fn((key: string) => {
    const settings: Record<string, string> = {
      'GITHUB_TOKEN': 'ghp_test_token_123',
      'GITHUB_OWNER': 'test-owner',
      'GITHUB_REPO': 'test-repo',
      'SPARC_DEFAULT_COVERAGE': '95',
      'SPARC_QUALITY_THRESHOLD': '0.9',
      'SPARC_MAX_RETRIES': '3'
    };
    return settings[key];
  }),
  getService: vi.fn(),
  // Add other required IAgentRuntime methods as needed
} as any);

describe('ElizaDev Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment variables
    delete process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_OWNER;
    delete process.env.GITHUB_REPO;
  });

  describe('Plugin Structure', () => {
    it('should have correct plugin metadata', () => {
      expect(elizaDevPlugin.name).toBe('eliza-dev');
      expect(elizaDevPlugin.description).toContain('SPARC methodology');
      expect(elizaDevPlugin.dependencies).toContain('@elizaos/plugin-bootstrap');
      expect(elizaDevPlugin.priority).toBe(100);
    });

    it('should have required actions', () => {
      expect(elizaDevPlugin.actions).toHaveLength(5);
      
      const actionNames = elizaDevPlugin.actions?.map(action => action.name) || [];
      expect(actionNames).toContain('CAPTURE_FEATURE');
      expect(actionNames).toContain('IMPLEMENT_FEATURE');
      expect(actionNames).toContain('REVIEW_PR');
      expect(actionNames).toContain('EVAL_PROMPT');
      expect(actionNames).toContain('SHIP_REPORT');
    });

    it('should have required providers', () => {
      expect(elizaDevPlugin.providers).toHaveLength(4);
      
      const providerNames = elizaDevPlugin.providers?.map(provider => provider.name) || [];
      expect(providerNames).toContain('GITHUB_CONTEXT');
      expect(providerNames).toContain('SPARC_PHASE');
      expect(providerNames).toContain('IMPLEMENTATION_STATUS');
      expect(providerNames).toContain('QUALITY_METRICS');
    });

    it('should have required services', () => {
      expect(elizaDevPlugin.services).toHaveLength(2);
      // Services are classes, so we check their serviceType property
      const serviceTypes = elizaDevPlugin.services?.map((ServiceClass: any) => ServiceClass.serviceType) || [];
      expect(serviceTypes).toContain('GITHUB_INTEGRATION');
      expect(serviceTypes).toContain('SPARC_WORKFLOW');
    });

    it('should have required evaluators', () => {
      expect(elizaDevPlugin.evaluators).toHaveLength(1);
      
      const evaluatorNames = elizaDevPlugin.evaluators?.map(evaluator => evaluator.name) || [];
      expect(evaluatorNames).toContain('SPARC_COMPLIANCE');
    });
  });

  describe('Plugin Initialization', () => {
    it('should initialize successfully with valid config', async () => {
      const runtime = createMockRuntime();
      const config = {
        GITHUB_TOKEN: 'ghp_test_token_123',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo'
      };

      expect(async () => {
        await elizaDevPlugin.init?.(config, runtime);
      }).not.toThrow();
    });

    it('should throw error with missing required config', async () => {
      const runtime = createMockRuntime();
      runtime.getSetting = vi.fn(() => undefined); // No settings available
      
      const config = {}; // Empty config

      await expect(async () => {
        await elizaDevPlugin.init?.(config, runtime);
      }).rejects.toThrow('Missing required configuration: GITHUB_TOKEN');
    });

    it('should warn about invalid GitHub token format', async () => {
      const runtime = createMockRuntime();
      const config = {
        GITHUB_TOKEN: 'invalid_token_format',
        GITHUB_OWNER: 'test-owner',
        GITHUB_REPO: 'test-repo'
      };

      // Should not throw, but might log a warning
      expect(async () => {
        await elizaDevPlugin.init?.(config, runtime);
      }).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate correct configuration', () => {
      process.env.GITHUB_TOKEN = 'ghp_test_token_123';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';
      process.env.SPARC_DEFAULT_COVERAGE = '95';
      process.env.SPARC_QUALITY_THRESHOLD = '0.9';

      const result = validateElizaDevConfig();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required configuration', () => {
      const result = validateElizaDevConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: GITHUB_TOKEN');
      expect(result.errors).toContain('Missing required environment variable: GITHUB_OWNER');
      expect(result.errors).toContain('Missing required environment variable: GITHUB_REPO');
    });

    it('should detect invalid numeric configuration', () => {
      process.env.GITHUB_TOKEN = 'ghp_test_token_123';
      process.env.GITHUB_OWNER = 'test-owner';
      process.env.GITHUB_REPO = 'test-repo';
      process.env.SPARC_DEFAULT_COVERAGE = '150'; // Invalid: > 100
      process.env.SPARC_QUALITY_THRESHOLD = '2.0'; // Invalid: > 1.0

      const result = validateElizaDevConfig();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid SPARC_DEFAULT_COVERAGE: must be between 50 and 100');
      expect(result.errors).toContain('Invalid SPARC_QUALITY_THRESHOLD: must be between 0.5 and 1');
    });
  });

  describe('Health Check', () => {
    it('should report healthy when all services are available', async () => {
      const runtime = createMockRuntime();
      runtime.getService = vi.fn((serviceType: string) => {
        if (serviceType === 'GITHUB_INTEGRATION' || serviceType === 'SPARC_WORKFLOW') {
          return { serviceType }; // Mock service
        }
        return null;
      });

      const health = await checkElizaDevHealth(runtime);
      
      expect(health.healthy).toBe(true);
      expect(health.services.github).toBe(true);
      expect(health.services.sparc).toBe(true);
      expect(health.details).toContain('GitHub integration service active');
      expect(health.details).toContain('SPARC workflow service active');
    });

    it('should report unhealthy when services are missing', async () => {
      const runtime = createMockRuntime();
      runtime.getService = vi.fn(() => null); // No services available

      const health = await checkElizaDevHealth(runtime);
      
      expect(health.healthy).toBe(false);
      expect(health.services.github).toBe(false);
      expect(health.services.sparc).toBe(false);
      expect(health.details).toContain('GitHub integration service not available');
      expect(health.details).toContain('SPARC workflow service not available');
    });
  });

  describe('Actions Validation', () => {
    it('should have capture feature action with correct properties', () => {
      const captureAction = elizaDevPlugin.actions?.find(action => action.name === 'CAPTURE_FEATURE');
      
      expect(captureAction).toBeDefined();
      expect(captureAction?.description).toContain('SPARC specification');
      expect(captureAction?.similes).toContain('CREATE_FEATURE_SPEC');
      expect(captureAction?.validate).toBeDefined();
      expect(captureAction?.handler).toBeDefined();
      expect(captureAction?.examples).toBeDefined();
    });
  });

  describe('Providers Validation', () => {
    it('should have GitHub context provider with correct properties', () => {
      const githubProvider = elizaDevPlugin.providers?.find(provider => provider.name === 'GITHUB_CONTEXT');
      
      expect(githubProvider).toBeDefined();
      expect(githubProvider?.description).toContain('GitHub repository context');
      expect(githubProvider?.get).toBeDefined();
    });

    it('should have SPARC phase provider with correct properties', () => {
      const sparcProvider = elizaDevPlugin.providers?.find(provider => provider.name === 'SPARC_PHASE');
      
      expect(sparcProvider).toBeDefined();
      expect(sparcProvider?.description).toContain('SPARC methodology phase');
      expect(sparcProvider?.get).toBeDefined();
    });
  });
});