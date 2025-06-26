/**
 * Platform Registry Actions for ElizaOS
 * Enhanced actions for managing plugins, MCPs, and workflows
 */

import {
  type Action,
  type IAgentRuntime,
  type Memory,
  type State,
  type HandlerCallback,
  type ActionResult,
  elizaLogger
} from '@elizaos/core';
import { PlatformRegistryService } from '../services/PlatformRegistryService.js';
import type {
  CreateRegistryItemRequest,
  UpdateRegistryItemRequest,
  RegistryQuery,
  RegistryBuildRequest
} from '../types/registry.js';

// Create registry item action
export const createPlatformRegistryItemAction: Action = {
  name: 'CREATE_PLATFORM_REGISTRY_ITEM',
  description: 'Create a new item in the ElizaOS platform registry (plugin, MCP, or workflow)',
  similes: [
    'register platform item',
    'create registry entry',
    'publish to platform',
    'submit to registry'
  ],
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'I want to register my weather plugin in the platform registry'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: 'I\'ll help you register your weather plugin in the ElizaOS platform registry. Let me gather the necessary information.',
          actions: ['CREATE_PLATFORM_REGISTRY_ITEM']
        }
      }
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Submit my MCP server for GitHub integration to the registry'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: 'I\'ll register your GitHub integration MCP server in the platform registry.',
          actions: ['CREATE_PLATFORM_REGISTRY_ITEM']
        }
      }
    ]
  ],

  validate: async (runtime: IAgentRuntime) => {
    const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
    return !!registryService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
      if (!registryService) {
        throw new Error('Platform Registry service not available');
      }

      // Parse the request using AI
      const messageText = message.content.text || '';
      const response = await runtime.useModel('TEXT_LARGE', {
        prompt: `
Extract registry item creation information from this message: "${messageText}"

Please identify:
1. Type: plugin, mcp, or workflow
2. Name: the item name
3. Description: what it does
4. Version: semantic version (default 1.0.0)
5. Category: appropriate category
6. Tags: relevant tags
7. License: license type (default MIT)

For plugins, also extract:
- Actions: list of action names
- Providers: list of provider names
- Services: list of service names
- Dependencies: required packages

For MCPs, also extract:
- Protocol: stdio, http, or sse
- Tools: available tools
- Resources: available resources

For workflows, also extract:
- Platform: n8n, zapier, etc.
- Triggers: trigger types
- Integrations: required services

Respond with a JSON object containing the extracted information.
`,
        temperature: 0.1,
        maxTokens: 2000
      });

      let parsedRequest: CreateRegistryItemRequest;
      try {
        const parsed = JSON.parse(response);
        parsedRequest = {
          type: parsed.type || 'plugin',
          name: parsed.name || 'unnamed-item',
          description: parsed.description || 'No description provided',
          version: parsed.version || '1.0.0',
          tags: parsed.tags || [],
          category: parsed.category || 'utilities',
          visibility: 'public',
          license: parsed.license || 'MIT',
          metadata: {
            createdBy: 'ai-assistant',
            source: 'platform-chat'
          }
        };

        // Add type-specific data
        if (parsedRequest.type === 'plugin') {
          parsedRequest.pluginData = {
            entryPoint: 'index.js',
            dependencies: parsed.dependencies || [],
            engines: {
              node: '>=18.0.0',
              elizaos: '>=1.0.0'
            },
            capabilities: {
              actions: parsed.actions || [],
              providers: parsed.providers || [],
              services: parsed.services || [],
              evaluators: []
            },
            configuration: {
              required: false
            },
            testing: {
              hasTests: false,
              framework: 'vitest'
            }
          };
        } else if (parsedRequest.type === 'mcp') {
          parsedRequest.mcpData = {
            protocol: parsed.protocol || 'stdio',
            connection: {
              command: parsed.command || 'node',
              args: parsed.args || ['server.js']
            },
            capabilities: {
              tools: parsed.tools || [],
              resources: parsed.resources || [],
              prompts: []
            },
            authenticationRequired: false,
            performance: {
              averageResponseTime: 100
            }
          };
        } else if (parsedRequest.type === 'workflow') {
          parsedRequest.workflowData = {
            platform: parsed.platform || 'n8n',
            workflowFormat: 'json',
            triggers: parsed.triggers || [],
            actions: parsed.actions || [],
            integrations: parsed.integrations || [],
            complexity: 'beginner',
            estimatedSetupTime: 30,
            requiresCredentials: []
          };
        }
      } catch (_parseError) {
        throw new Error(`Failed to parse registry item request: ${_parseError}`);
      }

      // Create the registry item
      const authorId = message.entityId || 'anonymous';
      const registryItem = await registryService.createItem(parsedRequest, authorId);

      const responseText = `✅ **Successfully created ${registryItem.type} registry item!**

**📦 ${registryItem.displayName || registryItem.name}** v${registryItem.version}
${registryItem.description}

**Details:**
- **ID**: ${registryItem.id}
- **Type**: ${registryItem.type}
- **Category**: ${registryItem.category}
- **Status**: ${registryItem.status}
- **Visibility**: ${registryItem.visibility}
- **Tags**: ${registryItem.tags.join(', ')}

**Next Steps:**
${registryItem.status === 'draft' ? '- Use BUILD_PLATFORM_ITEM to start the build process' : ''}
- Use UPDATE_PLATFORM_REGISTRY_ITEM to modify details
- Use GET_PLATFORM_REGISTRY_STATS to see platform statistics

Your item is now part of the ElizaOS platform registry! 🚀`;

      await callback?.({
        text: responseText,
        action: 'CREATE_PLATFORM_REGISTRY_ITEM',
        metadata: {
          registryItemId: registryItem.id,
          registryItemType: registryItem.type,
          status: registryItem.status
        }
      });

      return {
        text: responseText,
        data: { registryItem },
        values: {
          registryItemId: registryItem.id,
          registryItemType: registryItem.type,
          status: registryItem.status
        }
      };

    } catch (error) {
      elizaLogger.error('Error in CREATE_PLATFORM_REGISTRY_ITEM:', error);

      const errorText = `❌ **Failed to create registry item**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please ensure you provide:
- Clear item name and description
- Valid item type (plugin, mcp, or workflow)
- Appropriate category and tags`;

      await callback?.({
        text: errorText,
        action: 'CREATE_PLATFORM_REGISTRY_ITEM'
      });

      throw error;
    }
  }
};

// Search registry items action
export const searchPlatformRegistryAction: Action = {
  name: 'SEARCH_PLATFORM_REGISTRY',
  description: 'Search and discover items in the ElizaOS platform registry',
  similes: [
    'find platform items',
    'search registry',
    'discover plugins',
    'browse platform'
  ],
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Find weather-related plugins in the registry'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: 'I\'ll search the platform registry for weather-related plugins.',
          actions: ['SEARCH_PLATFORM_REGISTRY']
        }
      }
    ],
    [
      {
        name: 'User',
        content: {
          text: 'Show me the most popular MCPs'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: 'Let me find the most popular MCP servers in the registry.',
          actions: ['SEARCH_PLATFORM_REGISTRY']
        }
      }
    ]
  ],

  validate: async (runtime: IAgentRuntime) => {
    const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
    return !!registryService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
      if (!registryService) {
        throw new Error('Platform Registry service not available');
      }

      // Parse search query using AI
      const messageText = message.content.text || '';
      const response = await runtime.useModel('TEXT_LARGE', {
        prompt: `
Parse this search request: "${messageText}"

Extract:
1. Search terms: keywords to search for
2. Type filter: plugin, mcp, or workflow (if specified)
3. Category filter: specific category (if mentioned)
4. Sort preference: popularity, newest, rating, name
5. Tags: specific tags mentioned
6. Limit: number of results desired

Respond with a JSON object containing the search parameters.
`,
        temperature: 0.1,
        maxTokens: 1000
      });

      let query: RegistryQuery;
      try {
        const parsed = JSON.parse(response);
        query = {
          search: parsed.searchTerms,
          type: parsed.type,
          category: parsed.category,
          tags: parsed.tags,
          sortBy: parsed.sortBy || 'downloads',
          sortOrder: 'desc',
          limit: Math.min(parsed.limit || 10, 20) // Cap at 20 results
        };
      } catch (_parseError) {
        // Fallback to simple text search
        const messageText = message.content.text || '';
        query = {
          search: messageText,
          sortBy: 'downloads',
          sortOrder: 'desc',
          limit: 10
        };
      }

      const searchResult = await registryService.searchItems(query);

      let responseText = '🔍 **Platform Registry Search Results**\n\n';

      if (searchResult.total === 0) {
        responseText += 'No items found matching your search criteria.\n\n';
        responseText += '**Suggestions:**\n';
        responseText += '- Try broader search terms\n';
        responseText += '- Browse by category or type\n';
        responseText += '- Check out trending items with GET_PLATFORM_REGISTRY_STATS';
      } else {
        responseText += `Found **${searchResult.total}** items (showing ${searchResult.items.length})\n\n`;

        searchResult.items.forEach((item, index) => {
          responseText += `**${index + 1}. ${item.displayName || item.name}** (${item.type})\n`;
          responseText += `   ${item.description}\n`;
          responseText += `   📊 ${item.stats.downloads} downloads • ⭐ ${item.stats.averageRating.toFixed(1)} rating\n`;
          responseText += `   🏷️ ${item.tags.join(', ')}\n`;
          responseText += `   📅 Updated ${item.updatedAt.toLocaleDateString()}\n\n`;
        });

        if (searchResult.hasMore) {
          responseText += `... and ${searchResult.total - searchResult.items.length} more results.\n\n`;
        }

        responseText += '**Popular Categories:**\n';
        Object.entries(searchResult.aggregations.categories)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5)
          .forEach(([category, count]) => {
            responseText += `- ${category}: ${count} items\n`;
          });
      }

      await callback?.({
        text: responseText,
        action: 'SEARCH_PLATFORM_REGISTRY',
        metadata: {
          totalResults: searchResult.total,
          searchQuery: query
        }
      });

      return {
        text: responseText,
        data: { searchResult },
        values: {
          totalResults: searchResult.total,
          itemsShown: searchResult.items.length
        }
      };

    } catch (error) {
      elizaLogger.error('Error in SEARCH_PLATFORM_REGISTRY:', error);

      const errorText = `❌ **Registry search failed**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Try searching with simpler terms or browse the registry categories.`;

      await callback?.({
        text: errorText,
        action: 'SEARCH_PLATFORM_REGISTRY'
      });

      throw error;
    }
  }
};

// Build platform item action
export const buildPlatformItemAction: Action = {
  name: 'BUILD_PLATFORM_ITEM',
  description: 'Start building/generating a platform registry item using AutoCoder',
  similes: [
    'build platform item',
    'generate code',
    'start build process',
    'create implementation'
  ],
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Build my weather plugin that I registered in the platform'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: 'I\'ll start the build process for your weather plugin using the AutoCoder system.',
          actions: ['BUILD_PLATFORM_ITEM']
        }
      }
    ]
  ],

  validate: async (runtime: IAgentRuntime) => {
    const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
    const autocoderService = runtime.getService('autocoder'); // Check if autocoder is available
    return !!registryService && !!autocoderService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
      if (!registryService) {
        throw new Error('Platform Registry service not available');
      }

      // Parse build request
      const messageText = message.content.text || '';
      const response = await runtime.useModel('TEXT_LARGE', {
        prompt: `
Parse this build request: "${messageText}"

Extract:
1. Item identifier: name or ID of the registry item to build
2. Build type: test or publish
3. Any specific requirements or instructions

Respond with a JSON object.
`,
        temperature: 0.1,
        maxTokens: 500
      });

      let _itemIdentifier: string;
      let buildType: 'test' | 'publish' = 'test';

      try {
        const parsed = JSON.parse(response);
        _itemIdentifier = parsed.itemIdentifier;
        buildType = parsed.buildType || 'test';
      } catch {
        // Fallback: extract from message text
        const messageText = message.content.text || '';
        _itemIdentifier = messageText.toLowerCase().includes('publish') ? 'latest' : 'draft';
      }

      // Find the registry item (simplified - in real implementation, search by name/ID)
      const authorId = message.entityId || 'anonymous';
      const userItems = await registryService.getItemsByAuthor(authorId);

      if (userItems.length === 0) {
        throw new Error('No registry items found for your account. Please create one first using CREATE_PLATFORM_REGISTRY_ITEM.');
      }

      // For simplicity, use the most recent item
      const item = userItems[userItems.length - 1];

      // Request build
      const buildRequest: RegistryBuildRequest = {
        itemId: item.id,
        authorId,
        buildType,
        sandboxConfig: {
          timeout: 600000, // 10 minutes
          resources: {
            cpu: '2',
            memory: '4Gi',
            disk: '10Gi'
          }
        }
      };

      const buildJob = await registryService.requestBuild(buildRequest);

      const responseText = `🚀 **Build Started for ${item.displayName || item.name}**

**Build Details:**
- **Job ID**: ${buildJob.jobId}
- **Item**: ${item.name} v${item.version}
- **Type**: ${item.type}
- **Build Type**: ${buildType}
- **Status**: ${buildJob.status}

**Next Steps:**
The AutoCoder system will now:
1. 🔄 Generate code based on your registry item specifications
2. 🧪 Run comprehensive tests and validation
3. 📦 Package the final implementation
4. ✅ Update the registry with build results

**Monitoring:**
- Use GET_BUILD_STATUS to check progress
- You'll receive updates as the build progresses
- Estimated completion: 5-10 minutes

Your ${item.type} is being built in a secure sandbox environment! ⚡`;

      await callback?.({
        text: responseText,
        action: 'BUILD_PLATFORM_ITEM',
        metadata: {
          buildJobId: buildJob.jobId,
          itemId: item.id,
          buildStatus: buildJob.status
        }
      });

      // TODO: Actually trigger AutoCoder build process
      // This would integrate with plugin-autocoder to start the actual build

      return {
        text: responseText,
        data: { buildJob, item },
        values: {
          buildJobId: buildJob.jobId,
          itemId: item.id,
          buildStatus: buildJob.status
        }
      };

    } catch (error) {
      elizaLogger.error('Error in BUILD_PLATFORM_ITEM:', error);

      const errorText = `❌ **Build failed to start**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please ensure:
- You have a registry item to build
- The AutoCoder service is available
- Your item has valid specifications`;

      await callback?.({
        text: errorText,
        action: 'BUILD_PLATFORM_ITEM'
      });

      throw error;
    }
  }
};

// Get platform registry statistics
export const getPlatformRegistryStatsAction: Action = {
  name: 'GET_PLATFORM_REGISTRY_STATS',
  description: 'Get comprehensive statistics about the ElizaOS platform registry',
  similes: [
    'platform statistics',
    'registry stats',
    'platform overview',
    'registry metrics'
  ],
  examples: [
    [
      {
        name: 'User',
        content: {
          text: 'Show me the platform registry statistics'
        }
      },
      {
        name: 'Assistant',
        content: {
          text: 'Here are the current ElizaOS platform registry statistics.',
          actions: ['GET_PLATFORM_REGISTRY_STATS']
        }
      }
    ]
  ],

  validate: async (runtime: IAgentRuntime) => {
    const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
    return !!registryService;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const registryService = runtime.getService<PlatformRegistryService>('platform-registry');
      if (!registryService) {
        throw new Error('Platform Registry service not available');
      }

      const stats = await registryService.getStats();

      const responseText = `📊 **ElizaOS Platform Registry Statistics**

**📈 Overview**
- **Total Items**: ${stats.totalItems.toLocaleString()}
- **Total Downloads**: ${stats.totalDownloads.toLocaleString()}
- **Active Authors**: ${stats.activeAuthors}/${stats.totalAuthors}

**🔧 By Type**
- **Plugins**: ${stats.itemsByType.plugin} (${((stats.itemsByType.plugin / stats.totalItems) * 100).toFixed(1)}%)
- **MCPs**: ${stats.itemsByType.mcp} (${((stats.itemsByType.mcp / stats.totalItems) * 100).toFixed(1)}%)
- **Workflows**: ${stats.itemsByType.workflow} (${((stats.itemsByType.workflow / stats.totalItems) * 100).toFixed(1)}%)

**📊 Growth (Recent)**
- **Today**: +${stats.growth.daily} new items
- **This Week**: +${stats.growth.weekly} new items  
- **This Month**: +${stats.growth.monthly} new items

**🏆 Top Categories**
${Object.entries(stats.itemsByCategory)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([category, count], index) => `${index + 1}. **${category}**: ${count} items`)
    .join('\n')}

**⭐ Most Downloaded**
${stats.topItems.mostDownloaded.slice(0, 3).map((item, index) =>
    `${index + 1}. **${item.displayName || item.name}** - ${item.stats.downloads.toLocaleString()} downloads`
  ).join('\n')}

**🔥 Highest Rated**
${stats.topItems.highestRated.slice(0, 3).map((item, index) =>
    `${index + 1}. **${item.displayName || item.name}** - ⭐ ${item.stats.averageRating.toFixed(1)}/5`
  ).join('\n')}

**🏗️ Build System**
- **Total Builds**: ${stats.buildMetrics.totalBuilds}
- **Success Rate**: ${(stats.buildMetrics.successRate * 100).toFixed(1)}%
- **Average Build Time**: ${Math.round(stats.buildMetrics.averageBuildTime / 1000 / 60)} minutes
- **Active Builds**: ${stats.buildMetrics.activeBuilds}

**💡 Platform Health**: ${stats.totalItems > 100 ? '🟢 Thriving' : stats.totalItems > 50 ? '🟡 Growing' : '🔴 Early Stage'}`;

      await callback?.({
        text: responseText,
        action: 'GET_PLATFORM_REGISTRY_STATS',
        metadata: stats
      });

      return {
        text: responseText,
        data: { stats },
        values: {
          totalItems: stats.totalItems,
          totalDownloads: stats.totalDownloads,
          buildSuccessRate: stats.buildMetrics.successRate
        }
      };

    } catch (error) {
      elizaLogger.error('Error in GET_PLATFORM_REGISTRY_STATS:', error);

      const errorText = `❌ **Failed to retrieve platform statistics**

Error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      await callback?.({
        text: errorText,
        action: 'GET_PLATFORM_REGISTRY_STATS'
      });

      throw error;
    }
  }
};

export const platformRegistryActions = [
  createPlatformRegistryItemAction,
  searchPlatformRegistryAction,
  buildPlatformItemAction,
  getPlatformRegistryStatsAction
];
