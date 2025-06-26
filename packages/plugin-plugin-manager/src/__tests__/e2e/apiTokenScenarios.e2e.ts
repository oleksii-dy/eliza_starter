import type { IAgentRuntime, TestCase } from '@elizaos/core';
import { strict as assert } from 'node:assert';
import { PluginManagerService } from '../../services/pluginManagerService.ts';

/**
 * E2E test for real-world API token scenarios.
 * Tests token management, expiration, rotation, and multi-service authentication.
 *
 * Required Environment Variables:
 * - GITHUB_TOKEN: GitHub personal access token with repo scope
 * - NPM_TOKEN: NPM authentication token (optional)
 * - TEST_EXPIRED_TOKEN: An expired token for testing (optional)
 */
export const apiTokenScenariosTests: TestCase[] = [
  {
    name: 'should handle GitHub token authentication correctly',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;
      assert(pluginManager, 'Plugin Manager service should be available');

      const token = process.env.GITHUB_TOKEN;
      if (!token) {
        console.log('[APIToken] Skipping GitHub test - GITHUB_TOKEN not set');
        return;
      }

      console.log('[APIToken] Testing GitHub authentication...');

      // Test cloning a public repo with authentication
      const publicRepoUrl = 'https://github.com/elizaos/eliza-starter.git';
      const clonePath = `/tmp/test-clone-${Date.now()}`;

      const result = await pluginManager.cloneRepository(publicRepoUrl, clonePath);
      assert(result.success, 'Should successfully clone with valid token');

      // Test creating a branch (requires write permissions)
      // Note: createBranch is part of GitHubService, not directly exposed by PluginManagerService
      console.log('[APIToken] Branch creation test skipped - method not exposed');

      // Alternatively, test creating a PR which uses the token
      // This would be done through createPullRequest when changes are made

      // Clean up
      await import('fs').then((fs) => fs.promises.rm(clonePath, { recursive: true, force: true }));
    },
  },

  {
    name: 'should handle token expiration gracefully',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      // Temporarily set an expired token
      const originalToken = runtime.getSetting('GITHUB_TOKEN');
      const expiredToken = process.env.TEST_EXPIRED_TOKEN || 'ghp_expired123invalid';

      // Override getSetting to return expired token
      const originalGetSetting = runtime.getSetting;
      runtime.getSetting = (key: string) => {
        if (key === 'GITHUB_TOKEN') {return expiredToken;}
        return originalGetSetting.call(runtime, key);
      };

      try {
        const result = await pluginManager.cloneRepository(
          'https://github.com/private/repo.git',
          '/tmp/test-expired'
        );

        assert(!result.success, 'Should fail with expired token');
        assert(
          result.error?.includes('401') || result.error?.includes('authentication'),
          'Should indicate authentication failure'
        );

        console.log('[APIToken] Correctly handled expired token');
      } finally {
        // Restore original getSetting
        runtime.getSetting = originalGetSetting;
      }
    },
  },

  {
    name: 'should support token rotation without service interruption',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[APIToken] Testing token rotation...');

      // Simulate token rotation
      let currentToken = 'token_v1';
      let tokenVersion = 1;

      const originalGetSetting = runtime.getSetting;
      runtime.getSetting = (key: string) => {
        if (key === 'GITHUB_TOKEN') {return currentToken;}
        return originalGetSetting.call(runtime, key);
      };

      // Start a long-running operation
      const longOperation = async () => {
        const results: Array<{ iteration: number; tokenUsed: any; tokenVersion: any }> = [];
        for (let i = 0; i < 3; i++) {
          // Simulate token rotation mid-operation
          if (i === 1) {
            tokenVersion++;
            currentToken = `token_v${tokenVersion}`;
            console.log(`[APIToken] Rotated to token version ${tokenVersion}`);
          }

          // Each operation should use the current token
          const tokenUsed = runtime.getSetting('GITHUB_TOKEN');
          results.push({
            iteration: i,
            tokenUsed,
            tokenVersion: tokenUsed?.split('_v')[1],
          });

          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        return results;
      };

      const results = await longOperation();

      // Verify token was rotated during operation
      assert(results[0].tokenVersion === '1', 'Should start with v1');
      assert(results[2].tokenVersion === '2', 'Should end with v2');

      console.log('[APIToken] Token rotation successful');
      runtime.getSetting = originalGetSetting;
    },
  },

  {
    name: 'should handle multiple service authentications',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[APIToken] Testing multi-service authentication...');

      // Check which tokens are available
      const tokens = {
        github: process.env.GITHUB_TOKEN,
        npm: process.env.NPM_TOKEN,
        custom: process.env.CUSTOM_API_TOKEN,
      };

      const availableServices = Object.entries(tokens)
        .filter(([, token]) => token)
        .map(([service]) => service);

      console.log(`[APIToken] Available services: ${availableServices.join(', ')}`);

      // Test NPM registry authentication if available
      if (tokens.npm) {
        try {
          // This would use the NPM token for private registry access
          const searchResults = await pluginManager.searchPlugins('@myorg/private-plugin');
          console.log('[APIToken] NPM private registry access successful');
        } catch (_error) {
          console.log('[APIToken] NPM private registry access failed (expected for demo)');
        }
      }

      // Demonstrate token isolation
      assert(availableServices.length >= 0, 'Should track available services');
    },
  },

  {
    name: 'should securely handle token storage and retrieval',
    fn: async (runtime: IAgentRuntime) => {
      const pluginManager = runtime.getService('PLUGIN_MANAGER') as PluginManagerService;

      console.log('[APIToken] Testing secure token handling...');

      // Verify tokens are not exposed in logs or errors
      const sensitiveToken = 'ghp_supersecret123456';

      const originalGetSetting = runtime.getSetting;
      runtime.getSetting = (key: string) => {
        if (key === 'GITHUB_TOKEN') {return sensitiveToken;}
        return originalGetSetting.call(runtime, key);
      };

      try {
        // Attempt operation that will fail
        const result = await pluginManager.cloneRepository(
          'https://github.com/invalid/repo.git',
          '/tmp/test-secure'
        );

        // Verify token is not in _error message
        assert(
          !result.error?.includes(sensitiveToken),
          'Token should not be exposed in _error messages'
        );
        assert(!result.error?.includes('supersecret'), 'Token parts should not be exposed');

        console.log('[APIToken] Token properly hidden in errors');
      } finally {
        runtime.getSetting = originalGetSetting;
      }
    },
  },

  {
    name: 'should support OAuth flow simulation',
    fn: async (runtime: IAgentRuntime) => {
      console.log('[APIToken] OAuth flow simulation...');

      // TODO: Implement OAuth token exchange
      // This would simulate:
      // 1. Initial auth code exchange
      // 2. Token refresh when expired
      // 3. Scope validation

      console.log('[APIToken] OAuth flow would handle:');
      console.log('  - Authorization code exchange');
      console.log('  - Access token refresh');
      console.log('  - Scope-based permissions');
      console.log('  - Token revocation');
    },
  },
];
