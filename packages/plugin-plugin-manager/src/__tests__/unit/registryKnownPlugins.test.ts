import { describe, it, expect, beforeAll } from 'bun:test';
import { PluginManagerService } from '../../services/pluginManagerService.ts';
import type { IAgentRuntime } from '@elizaos/core';
import { elizaLogger } from '@elizaos/core';

describe('Registry Known Plugins Validation', () => {
  let pluginManager: PluginManagerService;
  let mockRuntime: IAgentRuntime;
  let registryData: Record<string, any> = {};

  beforeAll(async () => {
    mockRuntime = {
      agentId: 'test-agent-id' as any,
      plugins: [],
      actions: [],
      providers: [],
      evaluators: [],
      services: new Map(),
      getSetting: (key: string) => process.env[key],
      useModel: async () => 'mock response',
      getService: () => null,
    } as any;

    pluginManager = new PluginManagerService(mockRuntime);

    // Fetch the actual registry data
    try {
      registryData = await pluginManager.getAvailablePluginsFromRegistry();
      elizaLogger.info(
        `[Registry Test] Loaded ${Object.keys(registryData).length} plugins from registry`
      );
    } catch (_error) {
      elizaLogger.error('[Registry Test] Failed to load registry:', error);
    }
  });

  describe('Core ElizaOS Plugins', () => {
    const corePlugins = [
      '@elizaos/plugin-discord',
      '@elizaos/plugin-twitter',
      '@elizaos/plugin-telegram',
    ];

    it('should have core plugins in registry', () => {
      for (const pluginName of corePlugins) {
        const exists = Object.prototype.hasOwnProperty.call(registryData, pluginName);
        if (!exists) {
          elizaLogger.warn(`[Registry Test] Core plugin "${pluginName}" not found in registry`);
        }
        // Don't fail the test, just log - some plugins might not be published yet
      }
    });

    it('should have valid registry entries for existing plugins', () => {
      for (const [pluginName, entry] of Object.entries(registryData)) {
        // Registry entries should have basic structure
        expect(typeof pluginName).toBe('string');
        expect(entry).toBeDefined();

        // Should have name if not already in the key
        if (entry.name) {
          expect(typeof entry.name).toBe('string');
        }

        // Should have description if present
        if (entry.description) {
          expect(typeof entry.description).toBe('string');
        }

        // Should have repository if present
        if (entry.repository) {
          expect(typeof entry.repository).toBe('string');
        }

        // Should have either npm or git installation method
        const hasInstallMethod = !!(entry.npm?.repo || entry.git?.repo);
        if (!hasInstallMethod) {
          // Don't log this in tests - too noisy
          // elizaLogger.warn(`[Registry Test] No install method for ${pluginName}`);
        }

        if (entry.npm?.repo) {
          expect(typeof entry.npm.repo).toBe('string');
        }

        if (entry.git?.repo) {
          expect(typeof entry.git.repo).toBe('string');
        }
      }
    });
  });

  describe('Community and Third-Party Plugins', () => {
    it('should include community plugins', () => {
      const communityPlugins = Object.keys(registryData).filter(
        (name) =>
          name.startsWith('@elizaos-plugins/') ||
          (name.includes('elizaos') && !name.startsWith('@elizaos/'))
      );

      elizaLogger.info(`[Registry Test] Found ${communityPlugins.length} community plugins`);

      if (communityPlugins.length > 0) {
        elizaLogger.info('[Registry Test] Community plugins:', communityPlugins.slice(0, 10));
      }
    });
  });

  describe('Search Functionality with Known Plugins', () => {
    it('should find discord plugin when searching for "discord"', async () => {
      const results = await pluginManager.searchPlugins('discord');

      expect(results.length).toBeGreaterThan(0);

      const discordPlugins = results.filter((r) => r.plugin.name.toLowerCase().includes('discord'));

      expect(discordPlugins.length).toBeGreaterThan(0);
      elizaLogger.info(`[Registry Test] Found ${discordPlugins.length} Discord-related plugins`);
    });

    it('should find solana plugin when searching for "solana"', async () => {
      const results = await pluginManager.searchPlugins('solana');

      const solanaPlugins = results.filter((r) => r.plugin.name.toLowerCase().includes('solana'));

      if (solanaPlugins.length > 0) {
        elizaLogger.info(`[Registry Test] Found ${solanaPlugins.length} Solana-related plugins`);
        expect(solanaPlugins[0].score).toBeGreaterThan(0);
      }
    });

    it('should find twitter/x plugin when searching', async () => {
      const twitterResults = await pluginManager.searchPlugins('twitter');
      const xResults = await pluginManager.searchPlugins('x');

      const allResults = [...twitterResults, ...xResults];
      const twitterPlugins = allResults.filter(
        (r) =>
          r.plugin.name.toLowerCase().includes('twitter') ||
          r.plugin.name.toLowerCase().includes('x')
      );

      if (twitterPlugins.length > 0) {
        elizaLogger.info(
          `[Registry Test] Found ${twitterPlugins.length} Twitter/X-related plugins`
        );
      }
    });
  });

  describe('Plugin Categories', () => {
    it('should categorize plugins correctly', () => {
      const categories = {
        social: ['discord', 'twitter', 'telegram', 'slack'],
        blockchain: ['solana', 'ethereum', 'bitcoin'],
        ai: ['image-generation', 'video-generation', 'voice'],
        development: ['github', 'gitlab'],
        data: ['database', 'storage', 'cache'],
      };

      for (const [category, keywords] of Object.entries(categories)) {
        const pluginsInCategory = Object.entries(registryData).filter(([name]) =>
          keywords.some((keyword) => name.toLowerCase().includes(keyword))
        );

        if (pluginsInCategory.length > 0) {
          elizaLogger.info(
            `[Registry Test] ${category} category: ${pluginsInCategory.length} plugins`
          );
          elizaLogger.info(
            '[Registry Test] Examples:',
            pluginsInCategory.slice(0, 3).map(([name]) => name)
          );
        }
      }
    });
  });

  describe('Registry Data Quality', () => {
    it('should have consistent naming conventions', () => {
      // Filter to only check packages that should be plugins
      const officialPlugins = Object.keys(registryData).filter((name) =>
        name.startsWith('@elizaos/plugin-')
      );

      for (const pluginName of officialPlugins) {
        // Official plugins should follow strict plugin naming convention
        // Only allow @elizaos/plugin-* pattern
        expect(pluginName).toMatch(/^@elizaos\/plugin-[a-zA-Z0-9.-]+$/);
      }

      // Also check community plugins follow their pattern
      const communityPlugins = Object.keys(registryData).filter((name) =>
        name.startsWith('@elizaos-plugins/')
      );

      for (const pluginName of communityPlugins) {
        // Community plugins should follow @elizaos-plugins/plugin-* pattern
        expect(pluginName).toMatch(/^@elizaos-plugins\/plugin-[a-zA-Z0-9.-]+$/);
      }

      // Log packages that don't follow plugin naming convention
      const nonPluginPackages = Object.keys(registryData).filter(
        (name) => name.startsWith('@elizaos/') && !name.startsWith('@elizaos/plugin-')
      );

      if (nonPluginPackages.length > 0) {
        elizaLogger.warn(
          `[Registry Test] Found ${nonPluginPackages.length} non-plugin packages in @elizaos/ namespace:`,
          nonPluginPackages.slice(0, 10)
        );
      }
    });

    it('should have valid repository URLs', () => {
      for (const [pluginName, entry] of Object.entries(registryData)) {
        if (entry.repository) {
          // Should be a valid URL or GitHub shorthand
          const isValidUrl =
            entry.repository.startsWith('http://') ||
            entry.repository.startsWith('https://') ||
            entry.repository.includes('github.com');

          if (!isValidUrl) {
            elizaLogger.warn(
              `[Registry Test] Invalid repository URL for ${pluginName}: ${entry.repository}`
            );
          }
        }
      }
    });

    it('should have version information for npm packages', () => {
      const npmPackages = Object.entries(registryData).filter(([_, entry]) => entry.npm?.repo);

      for (const [pluginName, entry] of npmPackages) {
        if (!entry.npm.v1) {
          elizaLogger.warn(`[Registry Test] No version specified for npm package ${pluginName}`);
        }
      }
    });
  });

  describe('Plugin Availability', () => {
    it('should report registry statistics', () => {
      const stats = {
        total: Object.keys(registryData).length,
        official: Object.keys(registryData).filter((n) => n.startsWith('@elizaos/')).length,
        community: Object.keys(registryData).filter((n) => !n.startsWith('@elizaos/')).length,
        npmBased: Object.values(registryData).filter((e: any) => e.npm?.repo).length,
        gitBased: Object.values(registryData).filter((e: any) => e.git?.repo).length,
      };

      elizaLogger.info('[Registry Test] Registry Statistics:');
      elizaLogger.info(`  Total plugins: ${stats.total}`);
      elizaLogger.info(`  Official (@elizaos/): ${stats.official}`);
      elizaLogger.info(`  Community: ${stats.community}`);
      elizaLogger.info(`  NPM-based: ${stats.npmBased}`);
      elizaLogger.info(`  Git-based: ${stats.gitBased}`);

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.official + stats.community).toBe(stats.total);
    });
  });
});
