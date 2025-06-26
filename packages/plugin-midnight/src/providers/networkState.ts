import {
  type Provider,
  type ProviderResult,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { MidnightNetworkService } from '../services/MidnightNetworkService.js';
import { AgentDiscoveryService } from '../services/AgentDiscoveryService.js';
import { type NetworkState, type MidnightNetworkConnection } from '../types/index.js';

/**
 * Provider for Midnight Network state and connectivity information
 */
export const networkStateProvider: Provider = {
  name: 'MIDNIGHT_NETWORK_STATE',
  description:
    'Provides information about the Midnight Network state, connectivity, and network participants',

  get: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined
  ): Promise<ProviderResult> => {
    try {
      logger.debug('Getting Midnight Network state information');

      const midnightService = runtime.getService<MidnightNetworkService>('midnight-network');
      const discoveryService = runtime.getService<AgentDiscoveryService>('agent-discovery');

      if (!midnightService || !discoveryService) {
        return {
          text: 'Midnight Network services not available',
          values: {
            isConnected: false,
            error: 'Services not initialized',
          },
          data: {},
        };
      }

      // Get network state (take current value from observable)
      const networkState = await new Promise<NetworkState>((resolve) => {
        const subscription = midnightService.getNetworkState().subscribe({
          next: (state) => {
            subscription.unsubscribe();
            resolve(state);
          },
          error: (_error) => {
            subscription.unsubscribe();
            resolve({
              blockHeight: 0,
              networkId: 'unknown',
              connectedPeers: 0,
              totalAgents: 0,
              activeContracts: 0,
              lastBlockTime: new Date(),
            });
          },
        });
      });

      // Get connection state
      const connectionState = await new Promise<MidnightNetworkConnection>((resolve) => {
        const subscription = midnightService.getConnectionState().subscribe({
          next: (state) => {
            subscription.unsubscribe();
            resolve(state);
          },
          error: (_error) => {
            subscription.unsubscribe();
            resolve({
              networkUrl: 'unknown',
              indexerUrl: 'unknown',
              proofServerUrl: 'unknown',
              networkId: 'unknown',
              isConnected: false,
              lastPing: new Date(),
            });
          },
        });
      });

      // Get discovered agents count
      const onlineAgents = await new Promise((resolve) => {
        const subscription = discoveryService.getOnlineAgents().subscribe({
          next: (agents) => {
            subscription.unsubscribe();
            resolve(agents.length);
          },
          error: (_error) => {
            subscription.unsubscribe();
            resolve(0);
          },
        });
      });

      // Get deployed contracts
      const deployedContracts = midnightService.getDeployedContracts();

      // Calculate uptime
      const now = new Date();
      const lastPing = new Date(connectionState.lastPing);
      const timeSinceLastPing = Math.floor((now.getTime() - lastPing.getTime()) / 1000);

      // Create network status summary
      const networkSummary = [
        '🌐 **Midnight Network Status**',
        `Network: ${networkState.networkId}`,
        `Connection: ${connectionState.isConnected ? '🟢 Connected' : '🔴 Disconnected'}`,
        `Block Height: ${networkState.blockHeight.toLocaleString()}`,
        `Connected Peers: ${networkState.connectedPeers}`,
        `Online Agents: ${onlineAgents}`,
        `Active Contracts: ${deployedContracts.length}`,
        `Last Ping: ${timeSinceLastPing}s ago`,
      ].join('\n');

      // Add contract summary if any
      let contractSummary = '';
      if (deployedContracts.length > 0) {
        contractSummary = `\n\n**My Deployed Contracts:**\n${deployedContracts
          .slice(0, 3)
          .map((contract, index) => {
            const statusEmoji =
              contract.status === 'active' ? '✅' : contract.status === 'deploying' ? '⏳' : '❌';
            return `${index + 1}. ${contract.contractType} ${statusEmoji} (${contract.address.slice(0, 8)}...)`;
          })
          .join('\n')}`;

        if (deployedContracts.length > 3) {
          contractSummary += `\n   ... and ${deployedContracts.length - 3} more`;
        }
      }

      const fullText = networkSummary + contractSummary;

      return {
        text: fullText,
        values: {
          isConnected: connectionState.isConnected,
          networkId: networkState.networkId,
          blockHeight: networkState.blockHeight,
          connectedPeers: networkState.connectedPeers,
          onlineAgents,
          activeContracts: deployedContracts.length,
          timeSinceLastPing,
          hasActiveContracts: deployedContracts.length > 0,
        },
        data: {
          networkState,
          connectionState,
          deployedContracts: deployedContracts.map((contract) => ({
            id: contract.contractId,
            address: contract.address,
            type: contract.contractType,
            status: contract.status,
            deployedAt: contract.deployedAt.toISOString(),
          })),
          onlineAgentCount: onlineAgents,
        },
      };
    } catch (error) {
      logger.error('Error getting Midnight Network state:', error);

      return {
        text: 'Unable to retrieve network state information',
        values: {
          isConnected: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },
};
