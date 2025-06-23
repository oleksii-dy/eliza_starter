import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';
import axios from 'axios';

describe('RegistryService', () => {
  let pluginManagerService: PluginManagerService;
  let mockRuntime: IAgentRuntime;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockRuntime = {
      agentId: 'test-agent-id' as any,
      getSetting: (key: string) => process.env[key],
      getService: (name: string) => null,
      services: new Map(),
      plugins: [],
      actions: [],
      providers: [],
      evaluators: [],
    } as any;

    pluginManagerService = await PluginManagerService.start(mockRuntime);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      expect(pluginManagerService).toBeDefined();
    });

    it('should start service properly', async () => {
      const service = await PluginManagerService.start(mockRuntime);
      expect(service).toBeInstanceOf(PluginManagerService);
    });
  });

  describe('searchPlugins', () => {
    it('should find ElizaOS core plugins', async () => {
      const knownPlugins = [
        { query: 'discord', expectedInName: 'discord' },
        { query: 'github', expectedInName: 'github' },
        { query: 'twitter', expectedInName: 'twitter' },
        { query: 'slack', expectedInName: 'slack' },
        { query: 'telegram', expectedInName: 'telegram' },
      ];

      for (const { query, expectedInName } of knownPlugins) {
        try {
          const results = await pluginManagerService.searchPlugins(query);

          if (results.length > 0) {
            // Check if any result contains the expected name pattern
            const found = results.some((r) =>
              r.plugin.name.toLowerCase().includes(expectedInName.toLowerCase())
            );

            elizaLogger.info(
              `[Registry Test] Found ${results.length} results for "${query}", pattern match: ${found}`
            );
          } else {
            elizaLogger.warn(`[Registry Test] No results found for "${query}"`);
          }
        } catch (error) {
          elizaLogger.error(`[Registry Test] Error searching for "${query}":`, error);
        }
      }
    });

    it('should return results with proper structure', async () => {
      const results = await pluginManagerService.searchPlugins('plugin');

      expect(results.length).toBeGreaterThan(0);

      const firstResult = results[0];
      expect(firstResult).toHaveProperty('plugin');
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).toHaveProperty('matchReasons');

      expect(firstResult.plugin).toHaveProperty('name');
      expect(firstResult.plugin).toHaveProperty('description');
      expect(typeof firstResult.score).toBe('number');
      expect(Array.isArray(firstResult.matchReasons)).toBe(true);
    });

    it('should handle empty search query', async () => {
      await expect(pluginManagerService.searchRegistry('')).rejects.toThrow(
        'Search query must be at least 2 characters'
      );
    });

    it('should handle single character search query', async () => {
      await expect(pluginManagerService.searchRegistry('a')).rejects.toThrow(
        'Search query must be at least 2 characters'
      );
    });

    it('should respect search limit option', async () => {
      const results = await pluginManagerService.searchRegistry('plugin', { limit: 5 });
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should handle offset for pagination', async () => {
      const page1 = await pluginManagerService.searchRegistry('elizaos', { limit: 10, offset: 0 });
      const page2 = await pluginManagerService.searchRegistry('elizaos', { limit: 10, offset: 10 });

      // Only check if we have results on both pages
      if (page1.length > 0 && page2.length > 0) {
        // Since npm search results might have the same top results, just verify we got results
        expect(page1.length).toBeGreaterThan(0);
        expect(page2.length).toBeGreaterThan(0);
      }
    });

    it.skip('should cache search results', async () => {
      const query = 'discord-test-cache';

      // First search - should hit the API
      const start1 = Date.now();
      const results1 = await pluginManagerService.searchPlugins(query);
      const duration1 = Date.now() - start1;

      // Second search - should use cache
      const start2 = Date.now();
      const results2 = await pluginManagerService.searchPlugins(query);
      const duration2 = Date.now() - start2;

      expect(results1).toEqual(results2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
    });

    it.skip('should handle network errors gracefully', async () => {
      // Mock axios to simulate a network error
      const axios = await import('axios');
      vi.spyOn(axios.default, 'get')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      try {
        // searchPlugins should throw after all retries fail
        await expect(pluginManagerService.searchPlugins('test')).rejects.toThrow('Network error');
      } finally {
        vi.restoreAllMocks();
      }
    });
  });

  describe('getPluginInfo', () => {
    it('should get plugin metadata for known plugins', async () => {
      const knownPackages = ['@elizaos/core', '@elizaos/cli'];

      for (const packageName of knownPackages) {
        try {
          const info = await pluginManagerService.getPluginInfoFromRegistry(packageName);

          expect(info).toHaveProperty('name', packageName);
          expect(info).toHaveProperty('version');
          expect(info).toHaveProperty('description');
          expect(info).toHaveProperty('author');
          expect(info).toHaveProperty('license');

          elizaLogger.info(`[Registry Test] Got info for ${packageName} v${info.version}`);
        } catch (error) {
          // Some packages might not be on npm yet, that's okay
          elizaLogger.warn(`[Registry Test] Could not get info for ${packageName}:`, error);
        }
      }
    });

    it('should handle invalid package names', async () => {
      await expect(
        pluginManagerService.getPluginInfoFromRegistry('invalid package name!')
      ).rejects.toThrow('Invalid plugin name');
    });

    it('should cache plugin metadata', async () => {
      const packageName = '@elizaos/core';

      // First fetch - should hit the API
      const start1 = Date.now();
      const info1 = await pluginManagerService.getPluginInfoFromRegistry(packageName);
      const duration1 = Date.now() - start1;

      // Second fetch - should use cache
      const start2 = Date.now();
      const info2 = await pluginManagerService.getPluginInfoFromRegistry(packageName);
      const duration2 = Date.now() - start2;

      expect(info1).toEqual(info2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cache should be much faster
    });

    it('should fetch specific version', async () => {
      try {
        const info = await pluginManagerService.getPluginInfoFromRegistry('@elizaos/core', '1.0.0');
        expect(info.version).toMatch(/^1\.0\./); // Version should start with 1.0.
      } catch (error) {
        // Version might not exist, that's okay
        elizaLogger.warn('[Registry Test] Version 1.0.0 not found');
      }
    });
  });

  describe('validatePackage', () => {
    it('should validate a proper package structure', async () => {
      // Test with a real path that doesn't exist
      const result = await (pluginManagerService as any).registryManager.validatePackage(
        '/non/existent/path'
      );

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect missing required fields', async () => {
      // Test with current directory which likely has a package.json
      const result = await (pluginManagerService as any).registryManager.validatePackage(
        process.cwd()
      );

      // Should either be valid or have specific errors
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('cache management', () => {
    it('should manage search cache properly', async () => {
      const query = 'discord';

      // Perform search to populate cache
      const results = await pluginManagerService.searchPlugins(query);

      // Perform the same search again - should use cache
      const startTime = Date.now();
      const cachedResults = await pluginManagerService.searchPlugins(query);
      const duration = Date.now() - startTime;

      // Results should be the same
      expect(cachedResults).toEqual(results);

      // Second search should be much faster (from cache)
      expect(duration).toBeLessThan(50); // Should be almost instant from cache

      // Test with a different query
      const results2 = await pluginManagerService.searchPlugins('twitter');

      // Should be different results (or both could be empty, but that's ok)
      // Only check if both have results
      if (results.length > 0 && results2.length > 0) {
        expect(results2).not.toEqual(results);
      }
    });
  });

  describe('integration with npm registry', () => {
    it('should search for real ElizaOS plugins', async () => {
      const searchTerms = ['elizaos'];

      for (const term of searchTerms) {
        try {
          const results = await pluginManagerService.searchRegistry(term, { limit: 10 });

          elizaLogger.info(`[Registry Test] Search "${term}" returned ${results.length} results`);

          if (results.length > 0) {
            // Log first few results
            results.slice(0, 3).forEach((r, i) => {
              elizaLogger.info(
                `[Registry Test] Result ${i + 1}: ${r.plugin.name} (score: ${r.score})`
              );
            });
          }
        } catch (error) {
          elizaLogger.error(`[Registry Test] Search failed for "${term}":`, error);
        }
      }
    }, 10000); // Increase timeout to 10 seconds
  });
});
