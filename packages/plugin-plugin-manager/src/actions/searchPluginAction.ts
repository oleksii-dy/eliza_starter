import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  elizaLogger,
  ActionExample,
  HandlerCallback,
  ActionResult,
} from '@elizaos/core';
import { PluginManagerService } from '../services/pluginManagerService.ts';
import { PluginManagerServiceType } from '../types.ts';
import { AgentContext, SearchResult } from '../types.ts';

const logger = elizaLogger;

export const searchPluginAction: Action = {
  name: 'SEARCH_PLUGINS',
  description: 'Search for plugins in the registry based on keywords or capabilities',

  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    // Simply check if the plugin manager service is available
    const pluginManager = runtime.getService(
      PluginManagerServiceType.PLUGIN_MANAGER
    ) as PluginManagerService;
    return !!pluginManager;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      const pluginManager = runtime.getService(
        PluginManagerServiceType.PLUGIN_MANAGER
      ) as PluginManagerService;

      if (!pluginManager) {
        logger.error('[searchPluginAction] Plugin Manager service not available');
        const errorMessage = 'Plugin search functionality is not available at the moment.';
        if (callback) {
          callback({
            text: errorMessage,
            error: true,
          });
        }
        return {
          text: errorMessage,
        };
      }

      // Get search query from structured data, not from parsing text
      const searchQuery =
        (message.content as any)?.searchQuery ||
        state?.searchQuery ||
        options?.searchQuery ||
        (message.content as any)?.query;

      if (!searchQuery) {
        const helpMessage = 'Please specify what kind of plugin you are looking for.';
        if (callback) {
          callback({
            text: helpMessage,
          });
        }
        return {
          text: helpMessage,
        };
      }

      logger.info(`[searchPluginAction] Searching for plugins: ${searchQuery}`);

      // Build agent context for contextual search
      const context: AgentContext = {
        recentActions: state?.recentActions || []
        currentCapabilities: getCurrentCapabilities(runtime),
        failedActions: state?.failedActions || []
        userIntent: searchQuery,
      };

      // Perform search
      const searchResults = await pluginManager.searchPlugins(searchQuery, context);

      if (searchResults.length === 0) {
        const noResultsMessage = `No plugins found matching "${searchQuery}". Try different keywords or browse all available plugins.`;
        if (callback) {
          callback({
            text: noResultsMessage,
          });
        }
        return {
          text: noResultsMessage,
          data: {
            query: searchQuery,
            resultsCount: 0,
          },
        };
      }

      // Format results
      const formattedResults = formatSearchResults(searchResults, searchQuery);

      if (callback) {
        callback({
          text: formattedResults,
        });
      }

      // Store search results in state for potential follow-up actions
      if (state) {
        state.lastPluginSearch = {
          query: searchQuery,
          results: searchResults.map((r) => ({
            name: r.plugin.name,
            description: r.plugin.description,
            score: r.score,
          })),
          timestamp: Date.now(),
        };
      }

      return {
        text: formattedResults,
        data: {
          query: searchQuery,
          resultsCount: searchResults.length,
          results: searchResults.map((r) => ({
            name: r.plugin.name,
            description: r.plugin.description,
            score: r.score,
            matchReasons: r.matchReasons,
            tags: r.plugin.tags,
          })),
        },
      };
    } catch (error) {
      logger.error('[searchPluginAction] Error searching plugins:', error);
      const errorMessage = 'An error occurred while searching for plugins. Please try again.';
      if (callback) {
        callback({
          text: errorMessage,
          error: true,
        });
      }
      return {
        text: errorMessage,
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Search for weather plugins',
          actions: ['SEARCH_PLUGINS'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I found 2 plugins related to "weather":\n\n1. **@elizaos/plugin-weather** (Score: 100)\n   Weather information and forecasting plugin\n   - Matches: Exact name match, Matches tags: weather\n\n2. **@elizaos/plugin-climate** (Score: 50)\n   Climate data and analysis plugin\n   - Matches: Matches keywords: weather\n\nWould you like to install any of these plugins?',
          actions: ['SEARCH_PLUGINS'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'I need a plugin to work with databases',
          actions: ['SEARCH_PLUGINS'],
        },
      },
      {
        name: '{{agentName}}',
        content: {
          text: 'I found 3 database-related plugins:\n\n1. **@elizaos/plugin-sql** (Score: 80)\n   SQL database operations and queries\n   - Matches: Matches tags: database, sql\n\n2. **@elizaos/plugin-mongodb** (Score: 70)\n   MongoDB database integration\n   - Matches: Matches tags: database, nosql\n\n3. **@elizaos/plugin-redis** (Score: 60)\n   Redis cache and database operations\n   - Matches: Description contains query\n\nWhich database plugin would you like to know more about?',
          actions: ['SEARCH_PLUGINS'],
        },
      },
    ],
  ],
};

// Helper functions

function getCurrentCapabilities(runtime: IAgentRuntime): string[] {
  const capabilities: string[] = [];

  // Get action names as capabilities
  if (runtime.actions) {
    for (const action of runtime.actions) {
      capabilities.push(action.name.toLowerCase());
    }
  }

  // Get service types as capabilities
  if (runtime.services) {
    for (const [serviceType] of runtime.services) {
      capabilities.push(serviceType.toLowerCase());
    }
  }

  return capabilities;
}

function formatSearchResults(results: SearchResult[] query: string): string {
  const topResults = results.slice(0, 5); // Show top 5 results

  let response = `I found ${results.length} plugin${results.length !== 1 ? 's' : ''} related to "${query}":\n\n`;

  topResults.forEach((result, index) => {
    response += `${index + 1}. **${result.plugin.name}**`;
    if (result.score) {
      response += ` (Score: ${result.score})`;
    }
    response += `\n   ${result.plugin.description}`;

    if (result.matchReasons && result.matchReasons.length > 0) {
      response += `\n   - Matches: ${result.matchReasons.join(', ')}`;
    }

    if (result.plugin.tags && result.plugin.tags.length > 0) {
      response += `\n   - Tags: ${result.plugin.tags.join(', ')}`;
    }

    response += '\n\n';
  });

  if (results.length > 5) {
    response += `...and ${results.length - 5} more results.\n\n`;
  }

  response += 'Would you like to install any of these plugins or get more information about them?';

  return response;
}
