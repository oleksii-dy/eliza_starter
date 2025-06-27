import {
  type Action,
  type ActionExample,
  type ActionResult,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { AgentDiscoveryService } from '../services/AgentDiscoveryService';
import { MidnightNetworkError } from '../types/index';

export const discoverAgentsAction: Action = {
  name: 'DISCOVER_AGENTS',
  similes: ['FIND_AGENTS', 'SEARCH_AGENTS', 'LIST_AGENTS', 'BROWSE_AGENTS'],
  description:
    'Discover other agents on the Midnight Network and view their capabilities and services',

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    try {
      const discoveryService = runtime.getService<AgentDiscoveryService>('agent-discovery');
      if (!discoveryService) {
        return false;
      }

      const content = message.content.text?.toLowerCase() || '';
      return (
        (content.includes('discover') ||
          content.includes('find') ||
          content.includes('search') ||
          content.includes('list') ||
          content.includes('browse')) &&
        (content.includes('agents') || content.includes('agent') || content.includes('peers'))
      );
    } catch (error) {
      logger.error('Error validating discover agents action:', error);
      return false;
    }
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State | undefined,
    options: any,
    callback?: HandlerCallback
  ): Promise<ActionResult> => {
    try {
      logger.info('Processing discover agents action');

      const discoveryService = runtime.getService<AgentDiscoveryService>('agent-discovery');
      if (!discoveryService) {
        throw new MidnightNetworkError(
          'Agent discovery service not available',
          'SERVICE_NOT_FOUND'
        );
      }

      // Parse search criteria
      const capabilities = parseCapabilities(message.content.text || '');
      const onlineOnly = message.content.text?.toLowerCase().includes('online') || false;

      // Discover agents
      const result = await discoveryService.discoverAgents(capabilities);

      if (result.success && result.data?.agents) {
        let agents = result.data.agents;

        // Filter for online agents if requested
        if (onlineOnly) {
          agents = agents.filter((agent) => agent.isOnline);
        }

        if (agents.length === 0) {
          const noAgentsContent: Content = {
            text:
              capabilities.length > 0
                ? `No agents found with capabilities: ${capabilities.join(', ')}`
                : 'No agents discovered on the network',
            actions: ['DISCOVER_AGENTS'],
            source: message.content.source,
          };

          if (callback) {
            await callback(noAgentsContent);
          }

          return {
            text: noAgentsContent.text,
            data: { agents: [] },
            values: { success: true, agentCount: 0 },
          };
        }

        // Format agent list
        const agentList = agents
          .slice(0, 10) // Limit to top 10 results
          .map((agent, index) => {
            const onlineStatus = agent.isOnline ? '🟢 Online' : '🔴 Offline';
            const reputation = '⭐'.repeat(Math.ceil(agent.reputation / 20));
            const services =
              agent.services.length > 0
                ? ` | Services: ${agent.services.map((s) => s.name).join(', ')}`
                : '';

            return `${index + 1}. **${agent.name}** ${onlineStatus} ${reputation}\n   Capabilities: ${agent.capabilities.join(', ')}${services}`;
          })
          .join('\n\n');

        const summaryText = `Found ${agents.length} agent${agents.length === 1 ? '' : 's'} on Midnight Network:`;
        const responseText = `${summaryText}\n\n${agentList}`;

        const responseContent: Content = {
          text: responseText,
          actions: ['DISCOVER_AGENTS'],
          source: message.content.source,
        };

        if (callback) {
          await callback(responseContent);
        }

        return {
          text: responseContent.text,
          data: {
            agents,
            totalFound: agents.length,
            onlineCount: agents.filter((a) => a.isOnline).length,
          },
          values: {
            success: true,
            agentCount: agents.length,
            onlineAgents: agents.filter((a) => a.isOnline).length,
          },
        };
      } else {
        const errorContent: Content = {
          text: `❌ ${result.message}`,
          actions: ['DISCOVER_AGENTS'],
          source: message.content.source,
        };

        if (callback) {
          await callback(errorContent);
        }

        return {
          text: errorContent.text,
          data: { error: result.data?.error },
          values: { success: false, errorType: 'discovery_failed' },
        };
      }
    } catch (error) {
      logger.error('Error in discover agents action:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorContent: Content = {
        text: `❌ Failed to discover agents: ${errorMessage}`,
        actions: ['DISCOVER_AGENTS'],
        source: message.content.source,
      };

      if (callback) {
        await callback(errorContent);
      }

      return {
        text: errorContent.text,
        data: { error: errorMessage },
        values: { success: false, errorType: 'system_error' },
      };
    }
  },

  examples: [
    [
      {
        name: '{{user}}',
        content: {
          text: 'Discover agents on the network',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Found 5 agents on Midnight Network:\n\n1. **Agent_Alice** 🟢 Online ⭐⭐⭐⭐⭐\n   Capabilities: messaging, payments\n\n2. **Agent_Bob** 🟢 Online ⭐⭐⭐⭐\n   Capabilities: messaging, data-analysis',
          actions: ['DISCOVER_AGENTS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Find agents with payment capabilities',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Found 3 agents with payment capabilities:\n\n1. **PaymentBot** 🟢 Online ⭐⭐⭐⭐⭐\n   Services: Payment Processing, Invoice Management',
          actions: ['DISCOVER_AGENTS'],
        },
      },
    ],
    [
      {
        name: '{{user}}',
        content: {
          text: 'Search for online agents with messaging services',
        },
      },
      {
        name: '{{agent}}',
        content: {
          text: 'Found 4 online agents with messaging capabilities:\n\n1. **SecureMessenger** 🟢 Online ⭐⭐⭐⭐⭐\n   Services: Secure Messaging, Group Chat',
          actions: ['DISCOVER_AGENTS'],
        },
      },
    ],
  ] as ActionExample[][],
};

function parseCapabilities(text: string): string[] {
  const capabilities: string[] = [];
  const lowerText = text.toLowerCase();

  // Common capability keywords
  const capabilityMap = {
    messaging: ['messaging', 'message', 'chat', 'communication'],
    payments: ['payment', 'pay', 'money', 'transfer', 'financial'],
    'data-analysis': ['data', 'analysis', 'analytics', 'insights'],
    'file-sharing': ['file', 'sharing', 'upload', 'download'],
    automation: ['automation', 'auto', 'workflow'],
    ai: ['ai', 'artificial intelligence', 'machine learning', 'ml'],
    trading: ['trading', 'trade', 'exchange', 'market'],
    storage: ['storage', 'store', 'database', 'persistence'],
    security: ['security', 'secure', 'encryption', 'privacy'],
    social: ['social', 'networking', 'community'],
  };

  // Check for capability mentions
  for (const [capability, keywords] of Object.entries(capabilityMap)) {
    if (keywords.some((keyword) => lowerText.includes(keyword))) {
      capabilities.push(capability);
    }
  }

  // Remove duplicates
  return Array.from(new Set(capabilities));
}
